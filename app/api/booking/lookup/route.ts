import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Customers receive a booking code like "E-W2X37" in their emails. Accept that
// (with or without the "E-" prefix, any case) and, for older links, the
// numeric reservation id.
function parseRef(raw: string): { id: number } | { code: string } | null {
  const ref = raw.trim().toUpperCase().replace(/\s+/g, '')
  if (/^\d+$/.test(ref)) return { id: Number(ref) }
  const code = ref.startsWith('E-') ? ref : `E-${ref}`
  return /^E-[A-Z0-9]{3,12}$/.test(code) ? { code } : null
}

const rateLimitStore = new Map<string, number[]>()

/**
 * GET /api/booking/lookup?ref=E-W2X37&email=foo@bar.com&tenantId=uuid
 * (legacy: ?id=123 with the numeric reservation id)
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
  const rawRef = searchParams.get('ref') ?? searchParams.get('id')
  const email = searchParams.get('email')?.trim().toLowerCase()
  const tenantId = searchParams.get('tenantId')

  const ref = rawRef ? parseRef(rawRef) : null
  if (!ref || !email || !tenantId || !UUID_RE.test(tenantId)) {
    return NextResponse.json({ error: 'Booking reference, email, and tenantId are required' }, { status: 400 })
  }

  // Server-side client: anon has no SELECT policy on reservations (by design),
  // so the old anon-key query could never find a booking. Access is still
  // scoped to tenant + booking ref + matching email, and only public-safe
  // fields are returned.
  const supabase = createAdminClient()
  let query = supabase
    .from('reservations')
    .select('id, booking_code, customer_email, customer_name, pickup_date, return_date, pickup_time, return_time, pickup_location, total_amount, status, car_id')
    .eq('tenant_id', tenantId)
  query = 'id' in ref ? query.eq('id', ref.id) : query.eq('booking_code', ref.code)
  const { data, error } = await query.maybeSingle()

  // Compare emails case-insensitively — some stored emails have capitals.
  if (error || !data || data.customer_email?.trim().toLowerCase() !== email) {
    // Return generic not-found — don't reveal whether the booking exists
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
      bookingCode: data.booking_code,
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
