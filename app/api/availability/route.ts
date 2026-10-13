import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rate-limit'
import { getBusyRanges } from '@/lib/booking/availability'
import { todayISO } from '@/lib/finance/revenue'

/**
 * GET /api/availability?carId=123&tenantId=uuid
 * Returns booked/blocked date ranges for a car so the booking widget can grey
 * them out. Uses the service-role client (anon cannot read reservations — it
 * used to silently return [] for every car) and returns dates only, no
 * customer data.
 */
export async function GET(request: NextRequest) {
  const limited = rateLimit(request, 'availability', { windowMs: 60_000, max: 30 })
  if (limited) return limited
  const { searchParams } = new URL(request.url)
  const carId = Number(searchParams.get('carId'))
  const tenantId = searchParams.get('tenantId')

  if (!tenantId || !Number.isInteger(carId) || carId <= 0) {
    return NextResponse.json({ error: 'carId and tenantId are required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Only answer for a car of this tenant
  const { data: carCheck } = await supabase
    .from('cars')
    .select('id')
    .eq('id', carId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!carCheck) {
    return NextResponse.json({ bookedRanges: [] })
  }

  try {
    const bookedRanges = await getBusyRanges(supabase, tenantId, carId, todayISO())
    return NextResponse.json({ bookedRanges }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30' },
    })
  } catch (err) {
    console.error('[availability]', err)
    return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 })
  }
}
