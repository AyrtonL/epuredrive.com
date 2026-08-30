/**
 * GET /api/cron/poll-turo-emails
 * Scheduled every 15 min via Netlify (thin wrapper calls this route).
 * Reads all active turo_email_syncs, polls Gmail / iCloud for new Turo and
 * Upcar booking emails (from noreply@mail.turo.com and support@upcar.ai),
 * and upserts reservations into the DB.
 *
 * Protected by Authorization: Bearer {CRON_SECRET}
 */

export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  CURSOR_LOOKBACK_MS,
  refreshAccessToken,
  gmailFetch,
  getMessageBody,
  getImapBody,
  claimSync,
  releaseSync,
  processEmail,
} from '@/lib/email-sync/shared'
import { parseTuroEmail } from '@/lib/email-sync/turo'
import { parseUpcarEmail } from '@/lib/email-sync/upcar'
import type { EmailSync, PollConfig } from '@/lib/email-sync/types'

// Provider search configs. Turo emails arrive from noreply@mail.turo.com; Upcar host
// notifications from support@upcar.ai. Each poll runs one Gmail search per config.
const TURO_CONFIG: PollConfig = { fromAddress: 'noreply@mail.turo.com', parse: parseTuroEmail }
const UPCAR_CONFIG: PollConfig = { fromAddress: 'support@upcar.ai', parse: parseUpcarEmail }

// ── Auth ──────────────────────────────────────────────────────────────────────

function verifyCronSecret(request: Request): boolean {
  const auth = request.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return auth === `Bearer ${secret}`
}

// ── Provider pollers ──────────────────────────────────────────────────────────

async function pollGmail(sync: EmailSync, config: PollConfig, msgErrors?: string[]): Promise<number> {
  // Always force a fresh access token before searching, rather than reusing a cached one
  // until it 401s. A cached token has twice now been observed to keep authenticating (200 OK)
  // while silently returning an empty/stale messages.list result set — no error, no 401, just
  // nothing new ever found. A forced refresh each run is one extra token-endpoint call every
  // 15 min and eliminates that entire failure mode.
  await refreshAccessToken(sync)

  const checkedAt = sync.last_checked
    ? new Date(new Date(sync.last_checked).getTime() - CURSOR_LOOKBACK_MS)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const afterTimestamp = Math.floor(checkedAt.getTime() / 1000)
  const query = `from:${config.fromAddress} after:${afterTimestamp}`

  const messages: { id: string }[] = []
  let pageToken: string | undefined
  do {
    const qs = `/messages?q=${encodeURIComponent(query)}&maxResults=50${pageToken ? `&pageToken=${pageToken}` : ''}`
    const pageResult = await gmailFetch(qs, sync)
    if (pageResult.messages) messages.push(...pageResult.messages)
    pageToken = pageResult.nextPageToken
  } while (pageToken)

  if (!messages.length) return 0

  // Gmail returns newest-first; process oldest-first so the most recent email for a
  // booking (e.g. a cancellation after a confirmation) is applied last and wins.
  messages.reverse()

  let synced = 0
  for (const msg of messages) {
    try {
      const full = await gmailFetch(`/messages/${msg.id}?format=full`, sync)
      const subject = full.payload?.headers?.find((h: { name: string }) => h.name.toLowerCase() === 'subject')?.value || ''
      const body = getMessageBody(full.payload)
      const parsed = config.parse(body, subject, msg.id)
      if (!parsed) continue
      await processEmail(parsed, sync)
      synced++
    } catch (err: unknown) {
      const m = err instanceof Error ? err.message : String(err)
      console.error(`[poll-turo-emails] Gmail message ${msg.id} failed:`, m)
      msgErrors?.push(`${msg.id}: ${m.slice(0, 300)}`)
    }
  }
  return synced
}

async function pollIcloud(sync: EmailSync): Promise<number> {
  const { ImapFlow } = await import('imapflow')

  const client = new ImapFlow({
    host: 'imap.mail.me.com',
    port: 993,
    secure: true,
    auth: { user: sync.gmail_address, pass: sync.app_specific_password! },
    logger: false,
  })

  try {
    await client.connect()
    const lock = await client.getMailboxLock('INBOX')
    try {
      const checkedAt = sync.last_checked
        ? new Date(new Date(sync.last_checked).getTime() - CURSOR_LOOKBACK_MS)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

      const allUids: number[] = (await client.search(
        { from: 'noreply@mail.turo.com', since: checkedAt },
        { uid: true }
      )) || []

      // Step 1: filter by subject (envelope only) to avoid downloading all bodies
      const relevantUids: number[] = []
      for (const uid of allUids) {
        try {
          const msg = await client.fetchOne(String(uid), { envelope: true }, { uid: true })
          if (!msg) continue
          const subject: string = msg.envelope?.subject || ''
          if (/booked|cancel|modif|updated.*trip|trip.*updated|has returned/i.test(subject)) {
            relevantUids.push(uid)
          }
        } catch { /* skip */ }
      }

      // Step 2: fetch full source for relevant emails only
      let synced = 0
      for (const uid of relevantUids) {
        try {
          const msg = await client.fetchOne(String(uid), { source: true }, { uid: true })
          if (!msg || !msg.source) continue
          const raw: string = msg.source.toString('utf-8')
          const subject = raw.match(/^Subject:\s*(.+)$/mi)?.[1]?.trim() || ''
          const body = getImapBody(raw)
          const parsed = parseTuroEmail(body, subject, `icloud-${uid}`)
          if (!parsed) continue
          await processEmail(parsed, sync)
          synced++
        } catch (err: unknown) {
          console.error(`[poll-turo-emails] iCloud UID ${uid} failed:`, err instanceof Error ? err.message : err)
        }
      }
      return synced
    } finally {
      lock.release()
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (/authenticationfailed|invalid credentials|auth/i.test(msg)) {
      throw new Error(`403: iCloud auth failed — ${msg}`)
    }
    throw err
  } finally {
    await client.logout().catch(() => {})
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────
// Supports two auth modes:
//   1. Authorization: Bearer {CRON_SECRET}  → cron mode (syncs all tenants)
//   2. Authorization: Bearer {supabase-jwt} → manual mode (syncs caller's tenant only)

export async function GET(request: Request) {
  const supabase = createAdminClient()
  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()

  let tenantFilter: string | null = null // null = all tenants (cron mode)

  if (verifyCronSecret(request)) {
    // Cron mode: sync all tenants
    tenantFilter = null
  } else if (token) {
    // Manual mode: resolve caller's tenant from JWT
    const { data: userData, error: userError } = await supabase.auth.getUser(token)
    if (userError || !userData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', userData.user.id)
      .single()
    if (!profile?.tenant_id) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 403 })
    }
    tenantFilter = profile.tenant_id
  } else {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let query = supabase.from('turo_email_syncs').select('*').eq('active', true)
  if (tenantFilter) query = query.eq('tenant_id', tenantFilter)

  const { data: syncs, error } = await query

  if (error) {
    console.error('[poll-turo-emails] Failed to load syncs:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!syncs?.length) {
    return NextResponse.json({ totalSynced: 0, errors: 0, noActiveSync: true })
  }

  let totalSynced = 0
  let errors = 0
  let lockSkipped = 0
  const errorDetails: string[] = []

  for (const sync of syncs) {
    if (!(await claimSync(sync.id))) {
      lockSkipped++
      console.info(`[poll-turo-emails] Sync ${sync.id} already running elsewhere, skipping`)
      continue
    }
    try {
      const synced =
        sync.provider === 'icloud'
          ? await pollIcloud(sync)
          : (await pollGmail(sync, TURO_CONFIG, errorDetails)) +
            (await pollGmail(sync, UPCAR_CONFIG, errorDetails))

      await supabase
        .from('turo_email_syncs')
        .update({ last_checked: new Date().toISOString() })
        .eq('id', sync.id)

      totalSynced += synced
      console.info(`[poll-turo-emails] Tenant ${sync.tenant_id}: ${synced} processed`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[poll-turo-emails] Sync ${sync.id} failed:`, msg)
      if (/token refresh failed|403|access.?denied|insufficient.?permission|authenticationfailed/i.test(msg)) {
        await supabase.from('turo_email_syncs').update({ active: false }).eq('id', sync.id)
      }
      errorDetails.push(msg.slice(0, 500))
      errors++
    } finally {
      await releaseSync(sync.id)
    }
  }

  console.info(`[poll-turo-emails] Done: ${totalSynced} synced, ${errors} error(s), ${lockSkipped} skipped (locked)`)
  return NextResponse.json({
    totalSynced,
    errors,
    ...(lockSkipped ? { lockSkipped } : {}),
    ...(errorDetails.length ? { errorDetails } : {}),
  })
}
