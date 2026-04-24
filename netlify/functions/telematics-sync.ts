// netlify/functions/telematics-sync.ts
// Scheduled every 5 min (see netlify.toml). For each active
// telematics_connections row, refresh tokens (if needed), pull latest
// vehicle positions from the provider, and upsert into telematics_positions.
//
// All heavy lifting lives in lib/telematics/sync.ts so it's reusable from
// syncNowAction (Task 23) and from unit tests.

import { createAdminClient } from '@/lib/supabase/admin'
import { syncConnection } from '@/lib/telematics/sync'
import type { TelematicsConnection } from '@/lib/supabase/types'

// Minimal handler typing — avoids a runtime dep on @netlify/functions while
// matching the shape Netlify expects for scheduled functions.
type HandlerResponse = { statusCode: number; body: string }
type Handler = () => Promise<HandlerResponse>

export const handler: Handler = async () => {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('telematics_connections')
    .select('*')
    .eq('status', 'active')

  if (error) {
    console.warn(
      '[telematics-sync] failed to list active connections',
      error.message,
    )
    return { statusCode: 500, body: 'query_failed' }
  }

  const connections = (data ?? []) as TelematicsConnection[]
  for (const c of connections) {
    try {
      await syncConnection(supabase, c)
    } catch (err: unknown) {
      // syncConnection already persists its failure modes; this guard just
      // keeps one bad tenant from aborting the whole cron run.
      console.warn(
        '[telematics-sync] connection sync threw',
        err instanceof Error ? err.message : 'unknown',
      )
    }
  }

  console.log(
    `[telematics-sync] processed ${connections.length} active connection(s)`,
  )
  return { statusCode: 200, body: 'ok' }
}
