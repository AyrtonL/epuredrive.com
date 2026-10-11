/**
 * POST /api/cron/recall-check
 * Daily via Supabase pg_cron (net.http_post). Checks every non-retired car of
 * every tenant against NHTSA's public recall database, stores new campaigns in
 * car_recalls, then emails / in-app notifies each tenant once about them.
 *
 * Protected by Authorization: Bearer {CRON_SECRET}
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sweepRecalls } from '@/lib/recalls/check'
import { notifyNewRecalls } from '@/lib/recalls/notify'

export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  try {
    const sweep = await sweepRecalls(supabase)
    const notify = await notifyNewRecalls(supabase)
    return NextResponse.json({ ...sweep, ...notify })
  } catch (err) {
    console.error('[cron/recall-check]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Recall check failed' }, { status: 500 })
  }
}
