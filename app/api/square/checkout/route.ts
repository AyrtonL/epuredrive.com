import { NextRequest, NextResponse } from 'next/server'
import { getSquareClient } from '@/lib/square/client'
import { refreshSquareToken } from '@/lib/square/oauth'
import { createAdminClient } from '@/lib/supabase/admin'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
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
    .select('id, name, brand_name, slug, plan, square_merchant_id, square_access_token, square_refresh_token, square_token_expires_at, square_location_id')
    .eq('id', tenantId)
    .single()

  if (!tenant?.square_merchant_id || !tenant?.square_access_token || !tenant?.square_location_id) {
    return NextResponse.json({ error: 'Square payments are not configured for this operator' }, { status: 400 })
  }

  // Check if token needs refresh
  let accessToken = tenant.square_access_token
  if (tenant.square_token_expires_at && new Date(tenant.square_token_expires_at) <= new Date()) {
    try {
      const refreshed = await refreshSquareToken(tenant.square_refresh_token)
      accessToken = refreshed.access_token
      // Update tokens in DB
      await supabase.from('tenants').update({
        square_access_token: refreshed.access_token,
        square_refresh_token: refreshed.refresh_token,
        square_token_expires_at: refreshed.expires_at,
      }).eq('id', tenantId)
    } catch (err) {
      console.error('[square-checkout] Token refresh failed:', err)
      return NextResponse.json({ error: 'Square authentication expired. Please reconnect.' }, { status: 401 })
    }
  }

  const totalCents = Math.round(car.daily_rate * days * 100)
  const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const carName = `${car.make} ${car.model}`

  try {
    const client = getSquareClient(accessToken)
    const idempotencyKey = crypto.randomUUID()

    const result = await client.checkout.paymentLinks.create({
      idempotencyKey,
      quickPay: {
        name: `${carName} — ${days}-day rental`,
        priceMoney: {
          amount: BigInt(totalCents),
          currency: 'USD',
        },
        locationId: tenant.square_location_id,
      },
      checkoutOptions: {
        redirectUrl: `${origin}/sites/${tenant.slug}/${carId}?booked=true`,
        askForShippingAddress: false,
      },
      prePopulatedData: {
        buyerEmail: customerEmail,
      },
    })

    const paymentLink = result.paymentLink
    if (!paymentLink?.url) {
      return NextResponse.json({ error: 'Failed to create payment link' }, { status: 500 })
    }

    return NextResponse.json({ url: paymentLink.url })
  } catch (err: unknown) {
    console.error('[square-checkout] Payment link creation failed:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: `Square checkout failed: ${message}` }, { status: 500 })
  }
}
