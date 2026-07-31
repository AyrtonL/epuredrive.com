/**
 * GET /api/cron/telematics-sync
 * Scheduled every 5 min via Supabase pg_cron (net.http_get).
 * For each active telematics_connections row, refresh tokens (if needed)
 * and pull latest vehicle positions from the provider.
 *
 * Ports netlify/functions/telematics-sync.ts, which relied on Netlify's
 * scheduled-function trigger — that trigger silently stopped firing on
 * 2026-07-15 (see netlify.toml), so this cron went unnoticed for weeks.
 * Every other cron in this app already moved to this pg_cron pattern.
 *
 * Protected by Authorization: Bearer {CRON_SECRET}
 */

export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { syncConnection } from '@/lib/telematics/sync'
import type { TelematicsConnection } from '@/lib/supabase/types'

function verifyCronSecret(request: Request): boolean {
  const auth = request.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return auth === `Bearer ${secret}`
}

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('telematics_connections')
    .select('*')
    .eq('status', 'active')

  if (error) {
    console.warn('[cron/telematics-sync] failed to list active connections', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const connections = (data ?? []) as TelematicsConnection[]
  let synced = 0
  for (const c of connections) {
    try {
      await syncConnection(supabase, c)
      synced++
    } catch (err: unknown) {
      // syncConnection already persists its own failure modes; this guard
      // just keeps one bad tenant from aborting the whole cron run.
      console.warn(
        '[cron/telematics-sync] connection sync threw',
        err instanceof Error ? err.message : 'unknown',
      )
    }
  }

  return NextResponse.json({ processed: connections.length, synced })
}
