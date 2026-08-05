import { NextRequest, NextResponse } from 'next/server'
import { Currency } from 'square'
import { getSquareClient } from '@/lib/square/client'
import { refreshSquareToken } from '@/lib/square/oauth'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rate-limit'
import { decryptSquareToken, encryptSquareToken } from '@/lib/square/token-crypto'
import { calculateCardSurcharge, getCardSurchargeRate } from '@/lib/pricing/cardSurcharge'
import crypto from 'crypto'

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false
  try {
    const { hostname } = new URL(origin)
    if (hostname === 'epuredrive.com' || hostname.endsWith('.epuredrive.com')) return true
    if (hostname === 'localhost' || hostname === '127.0.0.1') return true
    return false
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  // Rate limit: 10 requests per minute per IP
  const rateLimited = rateLimit(request, 'square-checkout', { windowMs: 60_000, max: 10 })
  if (rateLimited) return rateLimited

  // Origin validation
  const origin = request.headers.get('origin')
  if (!isAllowedOrigin(origin)) {
    console.error('[square-checkout] Blocked origin:', origin)
    return NextResponse.json({ error: `Forbidden: origin ${origin} not allowed` }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const data = body as Record<string, unknown>

  const carId = Number(data.car_id)
  const tenantId = String(data.tenant_id || '')
  const startDate = String(data.start_date || '')
  const endDate = String(data.end_date || '')
  const customerName = String(data.customer_name || '').trim().slice(0, 200)
  const customerEmail = String(data.customer_email || '').trim().slice(0, 200)
  const customerPhone = typeof data.customer_phone === 'string' ? data.customer_phone.trim().slice(0, 50) : null
  const pickupTime = typeof data.pickup_time === 'string' ? data.pickup_time : null
  const returnTime = typeof data.return_time === 'string' ? data.return_time : null
  const pickupLocation = typeof data.pickup_location === 'string' ? data.pickup_location.trim().slice(0, 200) : null
  const totalAmount = typeof data.total_amount === 'number' ? data.total_amount : null

  if (!carId || !tenantId || !startDate || !endDate || !customerName || !customerEmail) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const start = new Date(startDate)
  const end = new Date(endDate)
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
    return NextResponse.json({ error: 'Invalid date range' }, { status: 400 })
  }

  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  if (days < 1 || days > 365) {
    return NextResponse.json({ error: 'Invalid rental duration' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Fetch car
  const { data: car } = await supabase
    .from('cars')
    .select('id, make, model, daily_rate, tenant_id, image_url')
    .eq('id', carId)
    .eq('tenant_id', tenantId)
    .single()

  if (!car || !car.daily_rate) {
    return NextResponse.json({ error: 'Vehicle not found or pricing not set' }, { status: 404 })
  }

  // Fetch tenant with Square credentials
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, brand_name, slug, plan, square_merchant_id, square_access_token, square_refresh_token, square_token_expires_at, square_location_id, card_surcharge_rate')
    .eq('id', tenantId)
    .single()

  if (!tenant?.square_merchant_id || !tenant?.square_access_token || !tenant?.square_location_id) {
    return NextResponse.json({ error: 'Square payments are not configured for this operator' }, { status: 400 })
  }

  // Decrypt stored tokens and check if refresh is needed
  let accessToken: string
  try {
    accessToken = decryptSquareToken(tenant.square_access_token)
  } catch {
    return NextResponse.json({ error: 'Square credentials corrupted. Please reconnect.' }, { status: 500 })
  }

  if (tenant.square_token_expires_at && new Date(tenant.square_token_expires_at) <= new Date()) {
    try {
      const decryptedRefresh = decryptSquareToken(tenant.square_refresh_token)
      const refreshed = await refreshSquareToken(decryptedRefresh)
      accessToken = refreshed.access_token
      // Update encrypted tokens in DB
      await supabase.from('tenants').update({
        square_access_token: encryptSquareToken(refreshed.access_token),
        square_refresh_token: encryptSquareToken(refreshed.refresh_token),
        square_token_expires_at: refreshed.expires_at,
      }).eq('id', tenantId)
    } catch (err) {
      console.error('[square-checkout] Token refresh failed:', err)
      return NextResponse.json({ error: 'Square authentication expired. Please reconnect.' }, { status: 401 })
    }
  }

  // Validate and calculate extras
  interface ExtraInput { extra_id: string; name: string; pricing_type: string; unit_price: number; quantity: number; subtotal: number }
  const clientExtras = Array.isArray(data.extras) ? (data.extras as ExtraInput[]) : []
  let validatedExtras: ExtraInput[] = []
  let extrasCents = 0

  if (clientExtras.length > 0) {
    const extraIds = clientExtras.map(e => e.extra_id)
    const { data: dbExtras } = await supabase
      .from('rental_extras')
      .select('id, name, pricing_type, price')
      .in('id', extraIds)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)

    for (const dbExtra of dbExtras ?? []) {
      const qty = dbExtra.pricing_type === 'per_day' ? days : 1
      const unitCents = Math.round(Number(dbExtra.price) * 100)
      extrasCents += unitCents * qty

      validatedExtras.push({
        extra_id: dbExtra.id,
        name: dbExtra.name,
        pricing_type: dbExtra.pricing_type,
        unit_price: Number(dbExtra.price),
        quantity: qty,
        subtotal: (unitCents * qty) / 100,
      })
    }
  }

  const rentalCents = Math.round(car.daily_rate * days * 100)
  const subtotalCents = rentalCents + extrasCents

  // Card payment surcharge — computed server-side from the tenant's configured rate
  const surchargeRate = getCardSurchargeRate(tenant.card_surcharge_rate)
  const surchargeCents = calculateCardSurcharge(subtotalCents, tenant.card_surcharge_rate)
  const totalCents = subtotalCents + surchargeCents

  const redirectOrigin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const carName = `${car.make} ${car.model}`

  // Insert pending_checkout to preserve booking metadata for the webhook
  const { data: pendingCheckout, error: pcError } = await supabase
    .from('pending_checkouts')
    .insert({
      tenant_id: tenantId,
      car_id: carId,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      pickup_date: startDate,
      return_date: endDate,
      pickup_time: pickupTime,
      return_time: returnTime,
      pickup_location: pickupLocation,
      total_amount: totalCents / 100,
      extras: validatedExtras.length > 0 ? validatedExtras : null,
    })
    .select('id')
    .single()

  if (pcError || !pendingCheckout) {
    console.error('[square-checkout] Failed to create pending checkout:', pcError?.message)
    return NextResponse.json({ error: 'Failed to prepare checkout' }, { status: 500 })
  }

  try {
    console.log('[square-checkout] Creating payment link:', { carName, days, totalCents, locationId: tenant.square_location_id, pendingCheckoutId: pendingCheckout.id })
    const client = getSquareClient(accessToken)
    const idempotencyKey = crypto.randomUUID()

    const orderLineItems = [
      {
        name: `${carName} — ${days}-day rental`,
        quantity: '1',
        basePriceMoney: {
          amount: BigInt(subtotalCents),
          currency: Currency.Usd,
        },
      },
      ...(surchargeCents > 0
        ? [{
            name: `Card payment surcharge (${(surchargeRate * 100).toFixed(2).replace(/\.?0+$/, '')}%)`,
            quantity: '1',
            basePriceMoney: {
              amount: BigInt(surchargeCents),
              currency: Currency.Usd,
            },
          }]
        : []),
    ]

    const result = await client.checkout.paymentLinks.create({
      idempotencyKey,
      order: {
        locationId: tenant.square_location_id,
        lineItems: orderLineItems,
      },
      checkoutOptions: {
        redirectUrl: `${redirectOrigin}/sites/${tenant.slug}/${carId}?booked=true`,
        askForShippingAddress: false,
      },
      prePopulatedData: {
        buyerEmail: customerEmail,
      },
    })

    const paymentLink = result.paymentLink
    if (!paymentLink?.url) {
      console.error('[square-checkout] No payment link URL in response:', JSON.stringify(result))
      return NextResponse.json({ error: 'Failed to create payment link' }, { status: 500 })
    }

    // Store the Square order ID so the webhook can look up this pending checkout
    const orderId = paymentLink.orderId || paymentLink.id
    if (orderId) {
      await supabase
        .from('pending_checkouts')
        .update({ square_order_id: orderId })
        .eq('id', pendingCheckout.id)
    }

    console.log('[square-checkout] Payment link created:', paymentLink.url, 'orderId:', orderId)
    return NextResponse.json({ url: paymentLink.url })
  } catch (err: unknown) {
    console.error('[square-checkout] Payment link creation failed:', err)
    // Extract Square API error details
    const errObj = err as { errors?: Array<{ category?: string; code?: string; detail?: string }> }
    if (errObj.errors?.length) {
      const details = errObj.errors.map(e => e.detail || e.code).join('; ')
      console.error('[square-checkout] Square API errors:', JSON.stringify(errObj.errors))
      return NextResponse.json({ error: `Square error: ${details}` }, { status: 500 })
    }
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: `Square checkout failed: ${message}` }, { status: 500 })
  }
}
