/* eslint-disable no-console */
/**
 * One-time manual backfill: sends the tenant product-feedback request email
 * to every current active tenant right now, bypassing the tenant-feedback
 * cron's normal 14-45 day signup-age window (which only fires going
 * forward for newly-eligible tenants).
 *
 * Reuses the exact same template, send function, and recipient-resolution
 * RPC as app/api/cron/tenant-feedback/route.ts — this is a one-off manual
 * trigger of that same logic, not a separate send path.
 *
 * Usage:
 *   npx tsx scripts/send-tenant-feedback-backfill.ts
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function loadEnvLocal() {
  const path = join(process.cwd(), '.env.local')
  try {
    const content = readFileSync(path, 'utf8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      let value = trimmed.slice(eq + 1).trim()
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      if (!process.env[key]) process.env[key] = value
    }
  } catch {
    // ignore — user may rely on ambient env
  }
}
loadEnvLocal()

import { createAdminClient } from '../lib/supabase/admin'
import { sendEmail } from '../lib/email/resend'
import { tenantFeedbackRequestEmail } from '../lib/email/templates/platform'

async function main() {
  const supabase = createAdminClient()

  const { data: ownerRows, error: ownersError } = await supabase.rpc('get_tenant_owners')
  if (ownersError) {
    console.error('get_tenant_owners failed:', ownersError.message)
    process.exit(1)
  }
  const ownerMap = new Map(
    (ownerRows ?? []).map((o: { tenant_id: string; owner_name: string | null; owner_email: string | null }) => [
      o.tenant_id,
      { name: o.owner_name, email: o.owner_email },
    ]),
  )

  const { data: tenants, error } = await supabase
    .from('tenants')
    .select('id, name, status, feedback_email_sent_at')
    .is('feedback_email_sent_at', null)
    .eq('status', 'active')

  if (error) {
    console.error('select failed:', error.message)
    process.exit(1)
  }

  console.log(`Found ${tenants?.length ?? 0} active tenant(s) with no feedback email sent yet.\n`)

  let sent = 0
  for (const t of tenants ?? []) {
    const owner = ownerMap.get(t.id)
    if (!owner?.email) {
      console.log(`SKIP  ${t.name} (${t.id}) — no resolvable owner email`)
      continue
    }

    const res = await sendEmail({
      to: owner.email,
      replyTo: 'info@epuredrive.com',
      ...tenantFeedbackRequestEmail({ operatorName: owner.name || 'there' }),
    }).catch((err) => ({ error: err instanceof Error ? err.message : 'send failed', id: null }))

    if (res && !res.error) {
      await supabase.from('tenants').update({ feedback_email_sent_at: new Date().toISOString() }).eq('id', t.id)
      sent += 1
      console.log(`SENT  ${t.name} -> ${owner.email}`)
    } else {
      console.log(`FAIL  ${t.name} -> ${owner.email}: ${res?.error}`)
    }
  }

  console.log(`\nDone. Sent ${sent}/${tenants?.length ?? 0}.`)
}

main()
