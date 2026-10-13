import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe'
import { rateLimit } from '@/lib/rate-limit'
import { getPlatformFeeRate } from '@/lib/plan/effective-plan'
import { getCardSurchargeRate } from '@/lib/pricing/cardSurcharge'
import { isAllowedBookingOrigin } from '@/lib/booking/origin'
import { prepareBooking } from '@/lib/booking/prepare'
import type { PickupLocation } from '@/lib/supabase/types'

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, 'checkout', { windowMs: 60_000, max: 10 })
  if (limited) return limited

  const supabase = createAdminClient()
  if (!(await isAllowedBookingOrigin(request.headers.get('origin'), supabase))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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
  const customerPhone = typeof data.customer_phone === 'string' ? data.customer_phone.trim().slice(0, 50) : ''

  if (!carId || !tenantId || !startDate || !endDate || !customerName || !customerEmail) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
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
    .select('id, name, brand_name, stripe_account_id, slug, plan, payment_processor, card_surcharge_rate, pickup_locations')
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

  const prepared = await prepareBooking(supabase, {
    tenantId,
    carId,
    dailyRate: Number(car.daily_rate),
    pickupLocations: tenant.pickup_locations as PickupLocation[] | null,
    surchargeRate: tenant.card_surcharge_rate,
    card: true,
    pickupDate: startDate,
    returnDate: endDate,
    pickupTime: data.pickup_time,
    returnTime: data.return_time,
    pickupLocation: data.pickup_location,
    extras: data.extras,
  })
  if (!prepared.ok) {
    return NextResponse.json({ error: prepared.error }, { status: prepared.status })
  }
  const { days, quote, pickupTime, returnTime, pickupLocation } = prepared.booking

  const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const carName = `${car.make} ${car.model}`
  const tenantName = tenant.brand_name || tenant.name

  interface LineItem {
    price_data: { currency: string; product_data: { name: string; description?: string }; unit_amount: number }
    quantity: number
  }
  const item = (name: string, unitCents: number, quantity = 1, description?: string): LineItem => ({
    price_data: { currency: 'usd', product_data: description ? { name, description } : { name }, unit_amount: unitCents },
    quantity,
  })

  // Line items from the server-side quote (rental, pickup fee, extras, surcharge)
  const surchargeRate = getCardSurchargeRate(tenant.card_surcharge_rate)
  const lineItems: LineItem[] = [
    item(`${carName} — ${days}-day rental`, quote.rentalCents, 1, `${startDate} to ${endDate} · ${tenantName}`),
    ...(quote.locationCents > 0 ? [item(`Pickup / delivery: ${pickupLocation}`, quote.locationCents)] : []),
    ...quote.extras.map((e) =>
      item(e.name, Math.round(e.unit_price * 100), e.quantity,
        e.pricing_type === 'per_day' ? `$${e.unit_price}/day × ${e.quantity} days` : 'Flat fee')),
    ...(quote.surchargeCents > 0
      ? [item(`Card payment surcharge (${(surchargeRate * 100).toFixed(2).replace(/\.?0+$/, '')}%)`, quote.surchargeCents)]
      : []),
  ]
  const totalCents = quote.totalCents

  // Platform transaction fee — by plan tier, or flat 1% during free launch
  const feeRate = getPlatformFeeRate(tenant.plan)
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
          customer_phone: customerPhone,
          pickup_time: pickupTime ?? '',
          return_time: returnTime ?? '',
          pickup_location: pickupLocation ?? '',
          extras: quote.extras.length > 0 ? JSON.stringify(quote.extras) : '',
          payment_method: 'card',
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
