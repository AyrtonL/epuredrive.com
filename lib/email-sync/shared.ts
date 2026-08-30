import { createAdminClient } from '@/lib/supabase/admin'
import { generateBookingCode } from '@/lib/booking-code'
import type { EmailSync, ParsedEmail, ExistingReservation } from './types'

export const GMAIL_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me'
export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

// Re-scan window applied to the `last_checked` cursor. Turo emails reach the synced
// mailbox via iCloud→Gmail forwarding, which can lag by minutes. Because the poll
// advances the cursor to now() each run, an email that lands *after* a run but carries
// an earlier internalDate would fall before the cursor and be skipped forever (this is
// exactly how Stephane's 7/19 trip-change was missed). Re-scanning a few days on every
// run closes that gap; reprocessing is idempotent (dedup by Turo reservation id + the
// uniq_turo_res_id index), so the only cost is fetching a few extra low-volume emails.
export const CURSOR_LOOKBACK_MS = 3 * 24 * 60 * 60 * 1000

export async function refreshAccessToken(sync: EmailSync): Promise<string> {
  const supabase = createAdminClient()
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: sync.refresh_token,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: 'refresh_token',
    }).toString(),
  })
  const data = await res.json()
  if (!res.ok || !data.access_token) {
    throw new Error(`Token refresh failed: ${JSON.stringify(data)}`)
  }
  sync.access_token = data.access_token
  await supabase.from('turo_email_syncs').update({ access_token: data.access_token }).eq('id', sync.id)
  return data.access_token
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// The dashboard's manual "Sync Now" button hits this same route as the 15-min pg_cron
// job. When both land close together they each refresh the Gmail access token for the
// same sync row concurrently, and Google's token-verification edge sometimes rejects a
// just-minted token before it has propagated — the gmailFetch retry/backoff doesn't
// always cover it. Claim the row before polling so only one invocation runs it at a
// time; a stale claim (a run that crashed without releasing) expires after 2 minutes.
export const SYNC_LOCK_STALE_MS = 2 * 60 * 1000

export async function claimSync(syncId: string): Promise<boolean> {
  const supabase = createAdminClient()
  const staleBefore = new Date(Date.now() - SYNC_LOCK_STALE_MS).toISOString()
  const { data, error } = await supabase
    .from('turo_email_syncs')
    .update({ sync_started_at: new Date().toISOString() })
    .eq('id', syncId)
    .or(`sync_started_at.is.null,sync_started_at.lt.${staleBefore}`)
    .select('id')
  if (error) throw new Error(`Failed to claim sync lock: ${error.message}`)
  return !!data?.length
}

export async function releaseSync(syncId: string): Promise<void> {
  const supabase = createAdminClient()
  await supabase.from('turo_email_syncs').update({ sync_started_at: null }).eq('id', syncId)
}

export async function gmailFetch(path: string, sync: EmailSync, attempt = 0): Promise<any> {
  const res = await fetch(`${GMAIL_BASE}${path}`, {
    headers: { Authorization: `Bearer ${sync.access_token}` },
  })
  // A just-refreshed token has occasionally still 401'd here — Google's token-verification
  // edge doesn't always see a brand-new token as valid within the first moment it's minted.
  // Back off briefly and retry a couple of times before treating it as a real auth failure.
  if (res.status === 401 && attempt < 2) {
    await sleep(500 * (attempt + 1))
    await refreshAccessToken(sync)
    return gmailFetch(path, sync, attempt + 1)
  }
  if (!res.ok) throw new Error(`Gmail API ${path} → ${res.status}: ${await res.text()}`)
  return res.json()
}

// ── Email body extraction ─────────────────────────────────────────────────────

export interface GmailPart {
  mimeType?: string
  body?: { data?: string }
  parts?: GmailPart[]
}

export function getMessageBody(payload: GmailPart): string {
  function findPlain(p: GmailPart): string | null {
    if (p.mimeType === 'text/plain' && p.body?.data) {
      return Buffer.from(p.body.data, 'base64url').toString('utf-8')
    }
    if (p.parts) {
      for (const child of p.parts) {
        const found = findPlain(child)
        if (found) return found
      }
    }
    return null
  }

  function findHtml(p: GmailPart): string | null {
    if (p.mimeType === 'text/html' && p.body?.data) {
      return Buffer.from(p.body.data, 'base64url')
        .toString('utf-8')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
    }
    if (p.parts) {
      for (const child of p.parts) {
        const found = findHtml(child)
        if (found) return found
      }
    }
    return null
  }

  // Some Turo templates (e.g. "has returned your <car>") ship a text/plain part whose
  // labels ("Total paid", "Returned to") have no values next to them — the amounts only
  // render in the HTML table cells. Append the HTML-stripped body so field-extraction
  // regexes can fall back to it instead of silently finding nothing.
  const plain = findPlain(payload)
  const html = findHtml(payload)
  return [plain, html].filter(Boolean).join('\n')
}

// ── IMAP raw email body extractor ─────────────────────────────────────────────

function decodeMimePart(body: string, headers: string): string {
  if (/Content-Transfer-Encoding:\s*quoted-printable/i.test(headers)) {
    const qp = body
      .replace(/=\r?\n/g, '')
      .replace(/=([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    return Buffer.from(qp, 'latin1').toString('utf-8')
  }
  if (/Content-Transfer-Encoding:\s*base64/i.test(headers)) {
    return Buffer.from(body.replace(/\s/g, ''), 'base64').toString('utf-8')
  }
  return body
}

function extractMimeParts(raw: string): string {
  const boundaryMatch =
    raw.match(/Content-Type:\s*multipart\/[^;]+;\s*boundary="([^"]+)"/i) ||
    raw.match(/Content-Type:\s*multipart\/[^;]+;\s*boundary=([^\s;]+)/i)

  if (boundaryMatch) {
    const boundary = boundaryMatch[1]
    const escaped = boundary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const parts = raw.split(new RegExp(`--${escaped}`))
    let plainText: string | null = null
    let htmlText: string | null = null

    for (const part of parts) {
      const headerEnd = part.indexOf('\r\n\r\n')
      if (headerEnd < 0) continue
      const headers = part.slice(0, headerEnd)
      const body = part.slice(headerEnd + 4)

      if (/Content-Type:\s*multipart\//i.test(headers)) {
        const nested = extractMimeParts(part.trim())
        if (nested && !plainText) plainText = nested
        continue
      }

      const decoded = decodeMimePart(body, headers)
      if (/Content-Type:\s*text\/plain/i.test(headers) && !plainText) {
        plainText = decoded.trim()
      } else if (/Content-Type:\s*text\/html/i.test(headers) && !htmlText) {
        htmlText = decoded
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
      }
    }
    // See the matching comment in getMessageBody(): some Turo templates omit values from
    // their plain-text part entirely, so fall back to (or supplement with) the HTML-stripped
    // body rather than dropping it once a plain part is found.
    return [plainText, htmlText].filter(Boolean).join('\n')
  }

  const bodyStart = raw.indexOf('\r\n\r\n')
  return bodyStart >= 0 ? raw.slice(bodyStart + 4).trim() : raw.trim()
}

export function getImapBody(rawEmail: string | Buffer): string {
  const raw = typeof rawEmail === 'string' ? rawEmail : rawEmail.toString('utf-8')
  return extractMimeParts(raw)
}

// ── Car matching ──────────────────────────────────────────────────────────────

export async function findCarId(tenantId: string, vehicleName: string | undefined): Promise<number | null> {
  if (!vehicleName) return null
  const supabase = createAdminClient()

  const yearMatch = vehicleName.match(/\b(\d{4})\b/)
  const year = yearMatch?.[1]
  const nameWithoutYear = vehicleName.replace(/\b\d{4}\b/, '').trim().toLowerCase()

  const { data: cars } = await supabase
    .from('cars')
    .select('id, make, model, model_full, year')
    .eq('tenant_id', tenantId)

  if (!cars) return null

  for (const car of cars) {
    const carName = `${car.make} ${car.model_full || car.model}`.toLowerCase()
    if (carName.includes(nameWithoutYear) && (!year || String(car.year) === year)) return car.id
  }

  const parts = nameWithoutYear.split(/\s+/).filter(Boolean)
  for (const car of cars) {
    const carName = `${car.make} ${car.model_full || car.model}`.toLowerCase()
    if (parts.every((p: string) => carName.includes(p))) return car.id
  }

  return null
}

// ── Shared email processor ────────────────────────────────────────────────────

// Locate the existing row for a Turo booking: by Turo reservation id first (stable across
// the confirm / modify / cancel emails of one booking), then by gmail message id so that
// re-fetching the same email — and rows synced before res-ids were stored — still dedupe.
export async function findExistingReservation(
  parsed: ParsedEmail,
  tenantId: string,
): Promise<ExistingReservation | null> {
  const supabase = createAdminClient()
  if (parsed.reservationId) {
    const { data, error } = await supabase
      .from('reservations')
      .select('id, status')
      .eq('tenant_id', tenantId)
      .like('notes', `%Turo-Res #${parsed.reservationId}%`)
      .limit(1)
    // A lookup failure must not be treated as "no existing row" — that silently sends this
    // message down the insert path and throws a permanent duplicate-key error on every
    // future re-scan (found 2026-08-07: message 19fd408b43226c36 / Turo-Res #60079137 kept
    // failing this way for 8+ hours even though the row existed and the same query worked
    // fine outside the deployed function — root cause unconfirmed, but silently swallowing
    // the error made it un-debuggable and turned a one-off blip into a permanent loop).
    if (error) throw new Error(`Existing-reservation lookup by Turo-Res # failed: ${error.message}`)
    if (data?.[0]) return data[0]
  }
  const { data, error } = await supabase
    .from('reservations')
    .select('id, status')
    .eq('tenant_id', tenantId)
    .like('notes', `%Turo #${parsed.messageId}%`)
    .limit(1)
  if (error) throw new Error(`Existing-reservation lookup by Gmail message id failed: ${error.message}`)
  return data?.[0] ?? null
}

// Lifecycle statuses that a Turo confirm/modify email must never overwrite. Once a trip is
// picked up (active) or finished (completed), re-processing an old confirm email — which the
// 3-day cursor lookback does every poll — must NOT regress it back to "confirmed". Manual
// operator changes to these terminal/forward states are preserved. (Stephane Karim Pierre's
// finished 7/20 trip kept flipping back to confirmed before this guard.)
export const PROTECTED_STATUSES = new Set(['active', 'completed'])

export async function processEmail(parsed: ParsedEmail, sync: EmailSync): Promise<void> {
  const supabase = createAdminClient()

  if (parsed.type === 'cancel') {
    const existing = await findExistingReservation(parsed, sync.tenant_id)
    if (existing) {
      await supabase.from('reservations').update({ status: 'cancelled' }).eq('id', existing.id)
    }
    return
  }

  if (parsed.type === 'return') {
    // Only refreshes total_amount with the settled figure - no matching reservation means
    // the confirm email hasn't been processed yet (or was missed); nothing to attach it to.
    const existing = await findExistingReservation(parsed, sync.tenant_id)
    if (existing && parsed.total_amount != null) {
      await supabase.from('reservations').update({ total_amount: parsed.total_amount }).eq('id', existing.id)
    }
    return
  }

  const existing = await findExistingReservation(parsed, sync.tenant_id)
  const carId = await findCarId(sync.tenant_id, parsed.vehicle_name)
  const ref = `Turo #${parsed.messageId}${parsed.reservationId ? ` Turo-Res #${parsed.reservationId}` : ''}`
  const notes = carId ? ref : `${ref} [vehicle: ${parsed.vehicle_name || 'unknown'}]`

  if (existing) {
    // Refresh trip details from the email but never regress the lifecycle: a re-scanned
    // confirm/modify email must not flip an active/completed trip back to confirmed.
    const preserveStatus = PROTECTED_STATUSES.has(existing.status ?? '')
    await supabase
      .from('reservations')
      .update({
        pickup_date: parsed.pickup_date,
        return_date: parsed.return_date,
        total_amount: parsed.total_amount,
        notes,
        ...(preserveStatus ? {} : { status: parsed.status }),
        ...(carId ? { car_id: carId } : {}),
      })
      .eq('id', existing.id)
  } else {
    const { error: insertError } = await supabase.from('reservations').insert({
      tenant_id: sync.tenant_id,
      car_id: carId,
      customer_name: parsed.customer_name,
      pickup_date: parsed.pickup_date,
      return_date: parsed.return_date,
      total_amount: parsed.total_amount,
      status: parsed.status,
      source: parsed.source,
      notes,
      booking_code: generateBookingCode(),
    })
    if (insertError) {
      throw new Error(`Insert failed for ${parsed.messageId}: ${insertError.message}`)
    }
  }
}
