// netlify/functions/telematics-positions-prune.ts
// Scheduled daily at 03:00 UTC (see netlify.toml).
// Deletes telematics_positions rows older than 90 days — retention policy
// from spec §4.4. Positions are high-volume (one per webhook ping), so the
// unbounded table would grow without this prune.

import { createAdminClient } from '@/lib/supabase/admin'

const RETENTION_DAYS = 90
const RETENTION_MS = RETENTION_DAYS * 24 * 3600 * 1000

type HandlerResponse = { statusCode: number; body: string }
type Handler = () => Promise<HandlerResponse>

export const handler: Handler = async () => {
  const supabase = createAdminClient()
  const cutoff = new Date(Date.now() - RETENTION_MS).toISOString()

  const { error, count } = await supabase
    .from('telematics_positions')
    .delete({ count: 'exact' })
    .lt('recorded_at', cutoff)

  if (error) {
    console.warn(
      '[telematics-positions-prune] delete failed',
      error.message,
    )
    return { statusCode: 500, body: 'prune_failed' }
  }

  console.log(
    `[telematics-positions-prune] deleted ${count ?? 0} positions older than ${cutoff}`,
  )
  return { statusCode: 200, body: `pruned:${count ?? 0}` }
}
