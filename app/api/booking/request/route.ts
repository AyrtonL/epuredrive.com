import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

  // Validate required fields
  if (
    typeof data.tenant_id !== 'string' ||
    typeof data.customer_name !== 'string' ||
    !data.customer_name.trim() ||
    typeof data.customer_email !== 'string' ||
    !data.customer_email.trim() ||
    typeof data.pickup_date !== 'string' ||
    typeof data.return_date !== 'string'
  ) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Verify tenant exists
  const { data: tenant, error: tenantErr } = await supabase
    .from('tenants')
    .select('id')
    .eq('id', data.tenant_id)
    .single()

  if (tenantErr || !tenant) {
    return NextResponse.json({ error: 'Invalid tenant' }, { status: 400 })
  }

  // Verify car exists and belongs to tenant
  if (typeof data.car_id !== 'number') {
    return NextResponse.json({ error: 'Invalid car' }, { status: 400 })
  }

  const { data: car, error: carErr } = await supabase
    .from('cars')
    .select('id')
    .eq('id', data.car_id)
    .eq('tenant_id', data.tenant_id)
    .single()

  if (carErr || !car) {
    return NextResponse.json({ error: 'Invalid car' }, { status: 400 })
  }

  const { error } = await supabase.from('reservations').insert({
    tenant_id: data.tenant_id,
    car_id: data.car_id,
    customer_name: String(data.customer_name).trim().slice(0, 200),
    customer_email: String(data.customer_email).trim().slice(0, 200),
    customer_phone: typeof data.customer_phone === 'string' ? data.customer_phone.trim().slice(0, 50) : null,
    pickup_date: String(data.pickup_date),
    pickup_time: typeof data.pickup_time === 'string' ? data.pickup_time : null,
    return_date: String(data.return_date),
    return_time: typeof data.return_time === 'string' ? data.return_time : null,
    pickup_location: typeof data.pickup_location === 'string' ? data.pickup_location.trim().slice(0, 200) : null,
    total_amount: typeof data.total_amount === 'number' ? data.total_amount : null,
    status: 'pending',
    source: 'website',
    notes: typeof data.notes === 'string' ? data.notes.trim().slice(0, 2000) : null,
  })

  if (error) {
    return NextResponse.json({ error: 'Failed to create reservation' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
