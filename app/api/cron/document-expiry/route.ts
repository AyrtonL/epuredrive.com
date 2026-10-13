/**
 * POST /api/cron/document-expiry
 * Daily via Supabase pg_cron (net.http_post). Alerts each tenant once per
 * threshold (30 / 7 / 0 days) when a car's registration or insurance is
 * about to expire or has expired (lib/fleet/notify-expiry.ts).
 *
 * Protected by Authorization: Bearer {CRON_SECRET}
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { todayISO } from '@/lib/finance/revenue'
import { notifyDocumentExpiry } from '@/lib/fleet/notify-expiry'

export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await notifyDocumentExpiry(createAdminClient(), todayISO())
    return NextResponse.json(result, { status: result.failed > 0 ? 500 : 200 })
  } catch (err) {
    console.error('[cron/document-expiry]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Document expiry check failed' }, { status: 500 })
  }
}
