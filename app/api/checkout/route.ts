import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, 'checkout', { windowMs: 60_000, max: 10 })
  if (limited) return limited
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

  // Validate dates
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

  // Fetch car and tenant
  const { data: car } = await supabase
    .from('cars')
    .select('id, make, model, daily_rate, tenant_id, image_url')
    .eq('id', carId)
    .eq('tenant_id', tenantId)
    .single()

  if (!car || !car.daily_rate) {
    return NextResponse.json({ error: 'Vehicle not found or pricing not set' }, { status: 404 })
  }

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, brand_name, stripe_account_id, slug, plan, payment_processor')
    .eq('id', tenantId)
    .single()

  // Route to Square if that's the tenant's payment processor
  if (tenant?.payment_processor === 'square') {
    return NextResponse.json(
      { error: 'This operator uses Square for payments', processor: 'square' },
      { status: 422 }
    )
  }

  if (!tenant?.stripe_account_id) {
    return NextResponse.json({ error: 'Online payments are not available for this operator' }, { status: 400 })
  }

  const stripe = getStripe()
  if (!stripe) {
    return NextResponse.json({ error: 'Payment system not configured' }, { status: 500 })
  }

  const rentalCents = Math.round(car.daily_rate * days * 100)
  const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const carName = `${car.make} ${car.model}`
  const tenantName = tenant.brand_name || tenant.name

  // Build line items: base rental + extras
  interface LineItem {
    price_data: { currency: string; product_data: { name: string; description?: string }; unit_amount: number }
    quantity: number
  }

  const lineItems: LineItem[] = [
    {
      price_data: {
        currency: 'usd',
        product_data: {
          name: `${carName} — ${days}-day rental`,
          description: `${startDate} to ${endDate} · ${tenantName}`,
        },
        unit_amount: rentalCents,
      },
      quantity: 1,
    },
  ]

  // Validate and add extras as separate line items (server-side price verification)
  interface ExtraInput { extra_id: string; name: string; pricing_type: string; unit_price: number; quantity: number; subtotal: number }
  const clientExtras = Array.isArray(data.extras) ? (data.extras as ExtraInput[]) : []
  const validatedExtras: ExtraInput[] = []

  if (clientExtras.length > 0) {
    // Re-fetch prices from DB to prevent tampering
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
      const subtotal = (unitCents * qty) / 100

      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: dbExtra.name,
            description: dbExtra.pricing_type === 'per_day' ? `$${dbExtra.price}/day × ${qty} days` : 'Flat fee',
          },
          unit_amount: unitCents,
        },
        quantity: qty,
      })

      validatedExtras.push({
        extra_id: dbExtra.id,
        name: dbExtra.name,
        pricing_type: dbExtra.pricing_type,
        unit_price: Number(dbExtra.price),
        quantity: qty,
        subtotal,
      })
    }
  }

  // Calculate total for fee
  const totalCents = lineItems.reduce((sum, li) => sum + li.price_data.unit_amount * li.quantity, 0)

  // Platform transaction fee by plan tier
  const plan = tenant.plan || 'free'
  const FEE_BY_PLAN: Record<string, number> = { max: 0, enterprise: 0, pro: 0.01, starter: 0.015, free: 0.02 }
  const feeRate = FEE_BY_PLAN[plan] ?? 0.02
  const applicationFeeCents = Math.round(totalCents * feeRate)

  try {
    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        line_items: lineItems,
        payment_intent_data: {
          application_fee_amount: applicationFeeCents,
        },
        customer_email: customerEmail,
        metadata: {
          tenant_id: tenantId,
          car_id: String(carId),
          start_date: startDate,
          end_date: endDate,
          days: String(days),
          customer_name: customerName,
          extras: validatedExtras.length > 0 ? JSON.stringify(validatedExtras) : '',
        },
        success_url: `${origin}/sites/${tenant.slug}/${carId}?booked=true`,
        cancel_url: `${origin}/sites/${tenant.slug}/${carId}`,
      },
      {
        stripeAccount: tenant.stripe_account_id,
      }
    )

    return NextResponse.json({ url: session.url })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Stripe session creation failed'
    console.error('Stripe checkout error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
