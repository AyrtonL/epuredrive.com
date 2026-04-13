import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/availability?carId=123&tenantId=uuid
 * Returns booked date ranges for a specific car so the UI can block unavailable dates.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const carId = searchParams.get('carId')
  const tenantId = searchParams.get('tenantId')

  if (!carId || !tenantId || isNaN(Number(carId))) {
    return NextResponse.json({ error: 'carId and tenantId are required' }, { status: 400 })
  }

  // Fetch active reservations 30 days back and 365 days forward
  const today = new Date()
  const from = new Date(today)
  from.setDate(from.getDate() - 30)
  const until = new Date(today)
  until.setDate(until.getDate() + 365)

  const supabase = createAdminClient()

  // Verify the car actually belongs to this tenant before returning any data
  const { data: carCheck } = await supabase
    .from('cars')
    .select('id')
    .eq('id', Number(carId))
    .eq('tenant_id', tenantId)
    .single()

  if (!carCheck) {
    return NextResponse.json({ bookedRanges: [] })
  }

  const { data, error } = await supabase
    .from('reservations')
    .select('pickup_date, return_date')
    .eq('car_id', Number(carId))
    .eq('tenant_id', tenantId)
    .in('status', ['pending', 'confirmed'])
    .gte('return_date', from.toISOString().split('T')[0])
    .lte('pickup_date', until.toISOString().split('T')[0])
    .order('pickup_date', { ascending: true })

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 })
  }

  const bookedRanges = (data ?? []).map((r) => ({
    from: r.pickup_date as string,
    to: r.return_date as string,
  }))

  return NextResponse.json({ bookedRanges }, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30' },
  })
}
