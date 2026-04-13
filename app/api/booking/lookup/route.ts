import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const rateLimitStore = new Map<string, number[]>()

/**
 * GET /api/booking/lookup?id=123&email=foo@bar.com&tenantId=uuid
 * Returns public-safe reservation details so a customer can check their booking status.
 */
export async function GET(request: NextRequest) {
  // Rate limit: 10 lookups per IP per 10 minutes
  const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown'
  const now = Date.now()
  const windowMs = 10 * 60 * 1000
  const timestamps = (rateLimitStore.get(ip) ?? []).filter((t) => now - t < windowMs)
  if (timestamps.length >= 10) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }
  rateLimitStore.set(ip, [...timestamps, now])

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const email = searchParams.get('email')
  const tenantId = searchParams.get('tenantId')

  if (!id || !email || !tenantId || isNaN(Number(id))) {
    return NextResponse.json({ error: 'id, email, and tenantId are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('reservations')
    .select('id, customer_name, pickup_date, return_date, pickup_time, return_time, pickup_location, total_amount, status, car_id')
    .eq('id', Number(id))
    .eq('tenant_id', tenantId)
    .eq('customer_email', email.trim().toLowerCase())
    .single()

  if (error || !data) {
    // Return generic not-found — don't reveal whether the ID exists
    return NextResponse.json({ error: 'No reservation found matching those details.' }, { status: 404 })
  }

  // Fetch car name
  const { data: car } = await supabase
    .from('cars')
    .select('make, model, model_full')
    .eq('id', data.car_id)
    .single()

  const vehicleName = car ? `${car.make} ${car.model_full || car.model}` : 'Vehicle'

  return NextResponse.json({
    reservation: {
      id: data.id,
      vehicleName,
      customerName: data.customer_name,
      pickupDate: data.pickup_date,
      returnDate: data.return_date,
      pickupTime: data.pickup_time,
      returnTime: data.return_time,
      pickupLocation: data.pickup_location,
      totalAmount: data.total_amount,
      status: data.status,
    },
  })
}
