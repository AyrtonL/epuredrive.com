/**
 * POST /api/cron/daily-schedule
 * Via Supabase pg_cron (net.http_post) at 11:00 and 12:00 UTC; only the run
 * that is 7am in New York sends (see isDigestHour), so DST needs no
 * reschedule. Emails + in-app/push notifies each tenant that has pickups or
 * returns today. `?force=1` skips the hour check for manual runs.
 *
 * Protected by Authorization: Bearer {CRON_SECRET}
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isDigestHour } from '@/lib/daily-schedule/build'
import { sendDailySchedules } from '@/lib/daily-schedule/notify'

export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const force = request.nextUrl.searchParams.get('force') === '1'
  if (!force && !isDigestHour()) {
    return NextResponse.json({ skipped: 'not 7am in New York' })
  }

  try {
    const result = await sendDailySchedules(createAdminClient())
    return NextResponse.json(result)
  } catch (err) {
    console.error('[cron/daily-schedule]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Daily schedule failed' }, { status: 500 })
  }
}
