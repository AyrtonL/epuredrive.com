import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getStripe } from '@/lib/stripe'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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

  const totalCents = Math.round(car.daily_rate * days * 100)
  const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const carName = `${car.make} ${car.model}`
  const tenantName = tenant.brand_name || tenant.name

  // Platform transaction fee by plan tier
  const plan = tenant.plan || 'free'
  const feeRate = ['max', 'enterprise'].includes(plan) ? 0.02 : plan === 'pro' ? 0.05 : 0.08
  const applicationFeeCents = Math.round(totalCents * feeRate)

  const session = await stripe.checkout.sessions.create(
    {
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${carName} — ${days}-day rental`,
              description: `${startDate} to ${endDate} · ${tenantName}`,
              ...(car.image_url ? { images: [car.image_url] } : {}),
            },
            unit_amount: totalCents,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: applicationFeeCents,
      },
      automatic_tax: { enabled: true },
      customer_email: customerEmail,
      metadata: {
        tenant_id: tenantId,
        car_id: String(carId),
        start_date: startDate,
        end_date: endDate,
        days: String(days),
        customer_name: customerName,
      },
      success_url: `${origin}/sites/${tenant.slug}/${carId}?booked=true`,
      cancel_url: `${origin}/sites/${tenant.slug}/${carId}`,
    },
    {
      stripeAccount: tenant.stripe_account_id,
    }
  )

  return NextResponse.json({ url: session.url })
}
