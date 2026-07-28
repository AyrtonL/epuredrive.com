/**
 * GET /api/cron/poll-turo-emails
 * Scheduled every 15 min via Netlify (thin wrapper calls this route).
 * Reads all active turo_email_syncs, polls Gmail / iCloud for new Turo
 * emails, and upserts reservations into the DB.
 *
 * Protected by Authorization: Bearer {CRON_SECRET}
 */

export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateBookingCode } from '@/lib/booking-code'

const GMAIL_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

// Re-scan window applied to the `last_checked` cursor. Turo emails reach the synced
// mailbox via iCloud→Gmail forwarding, which can lag by minutes. Because the poll
// advances the cursor to now() each run, an email that lands *after* a run but carries
// an earlier internalDate would fall before the cursor and be skipped forever (this is
// exactly how Stephane's 7/19 trip-change was missed). Re-scanning a few days on every
// run closes that gap; reprocessing is idempotent (dedup by Turo reservation id + the
// uniq_turo_res_id index), so the only cost is fetching a few extra low-volume emails.
const CURSOR_LOOKBACK_MS = 3 * 24 * 60 * 60 * 1000

// ── Auth ──────────────────────────────────────────────────────────────────────

function verifyCronSecret(request: Request): boolean {
  const auth = request.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return auth === `Bearer ${secret}`
}

// ── Gmail helpers ─────────────────────────────────────────────────────────────

interface EmailSync {
  id: string
  tenant_id: string
  gmail_address: string
  access_token: string
  refresh_token: string
  app_specific_password?: string
  provider?: string
  last_checked?: string
}

async function refreshAccessToken(sync: EmailSync): Promise<string> {
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

async function gmailFetch(path: string, sync: EmailSync, retried = false): Promise<any> {
  const res = await fetch(`${GMAIL_BASE}${path}`, {
    headers: { Authorization: `Bearer ${sync.access_token}` },
  })
  if (res.status === 401 && !retried) {
    await refreshAccessToken(sync)
    return gmailFetch(path, sync, true)
  }
  if (!res.ok) throw new Error(`Gmail API ${path} → ${res.status}: ${await res.text()}`)
  return res.json()
}

// ── Email body extraction ─────────────────────────────────────────────────────

interface GmailPart {
  mimeType?: string
  body?: { data?: string }
  parts?: GmailPart[]
}

function getMessageBody(payload: GmailPart): string {
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

  const plain = findPlain(payload)
  if (plain) return plain

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

  return findHtml(payload) || ''
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
    return plainText || htmlText || ''
  }

  const bodyStart = raw.indexOf('\r\n\r\n')
  return bodyStart >= 0 ? raw.slice(bodyStart + 4).trim() : raw.trim()
}

function getImapBody(rawEmail: string | Buffer): string {
  const raw = typeof rawEmail === 'string' ? rawEmail : rawEmail.toString('utf-8')
  return extractMimeParts(raw)
}

// ── Turo email parsing ────────────────────────────────────────────────────────

const MONTH_MAP: Record<string, string> = {
  January: '01', February: '02', March: '03', April: '04',
  May: '05', June: '06', July: '07', August: '08',
  September: '09', October: '10', November: '11', December: '12',
}

function parseTuroDate(str: string): string | null {
  const m = str.match(/(\w+)\s+(\d{1,2}),\s+(\d{4})/)
  if (!m || !MONTH_MAP[m[1]]) return null
  return `${m[3]}-${MONTH_MAP[m[1]]}-${String(m[2]).padStart(2, '0')}`
}

interface ParsedEmail {
  type: 'confirm' | 'modify' | 'cancel'
  messageId: string
  reservationId: string | null
  customer_name: string | null
  vehicle_name?: string
  pickup_date: string | null
  return_date: string | null
  total_amount?: number | null
  source?: string
  status?: string
}

// M/D/YY or M/D/YYYY (Turo's structured footer) → ISO YYYY-MM-DD
function parseSlashDate(str: string): string | null {
  const m = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/)
  if (!m) return null
  const yyyy = m[3].length === 2 ? `20${m[3]}` : m[3]
  return `${yyyy}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`
}

function parseTuroEmail(body: string, subject: string, messageId: string): ParsedEmail | null {
  const fullText = subject + ' ' + body

  const isCancelled = /cancel/i.test(subject)
  const isModified = /changed their trip|modif|updated.*trip|trip.*updated/i.test(subject)
  const isConfirmed = /is booked|cha.?ching|trip.*booked|booked.*trip/i.test(fullText)

  if (!isConfirmed && !isCancelled && !isModified) return null

  // The Turo Reservation ID is stable across the confirm / modify / cancel emails for the
  // same booking - use it as the primary key so those emails all update the one row.
  const resIdMatch = fullText.match(/Reservation ID #?(\d+)/i) || subject.match(/\((\d{6,})\)/)
  const reservationId = resIdMatch?.[1] ?? null

  // Guest name: the subject is the most reliable source across all three email types.
  const subjGuest =
    subject.match(/^(.+?)[’']s trip with your/i) ||
    subject.match(/^(.+?) has (?:changed|canceled|cancelled)/i)
  const bodyGuest =
    body.match(/Cha-?ching!\s*(.+?)[’']s trip with your/i) ||
    body.match(/(.+?)[’']s trip with your/i)
  const guestName = (subjGuest?.[1] || bodyGuest?.[1] || '').trim() || null

  if (isCancelled) {
    return { type: 'cancel', messageId, reservationId, customer_name: guestName, pickup_date: null, return_date: null }
  }

  // Turo sometimes appends the delivery location ("Audi A3 at Fort Lauderdale ... Airport").
  // Strip the " at <location>" suffix so the vehicle name matches a fleet car.
  const vehicleMatch = body.match(/trip with your (.+?) is (?:booked|confirmed|modified)/i)
  const vehicleName = vehicleMatch?.[1]?.replace(/\s+at\s+.+$/i, '').trim() ?? ''

  // Dates: prose ("booked from ... to ...") for confirmations; structured footer
  // ("Trip start: 7/10/26 ... Trip end: ...") for modifications and as a fallback.
  const datesMatch = body.match(/booked from (.+?\d{4}).+? to (.+?\d{4})/i)
  let pickupDate = datesMatch ? parseTuroDate(datesMatch[1]) : null
  let returnDate = datesMatch ? parseTuroDate(datesMatch[2]) : null
  if (!pickupDate) {
    const m = body.match(/Trip start:?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i)
    if (m) pickupDate = parseSlashDate(m[1])
  }
  if (!returnDate) {
    const m = body.match(/Trip end:?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i)
    if (m) returnDate = parseSlashDate(m[1])
  }
  if (!pickupDate || !returnDate) return null

  const amountMatch =
    body.match(/You[’']ll earn \$([0-9,]+(?:\.\d{2})?)/i) ||
    body.match(/total earnings will be \$([0-9,]+(?:\.\d{2})?)/i) ||
    body.match(/You earn:?\s*\$([0-9,]+(?:\.\d{2})?)/i)

  return {
    type: isModified ? 'modify' : 'confirm',
    messageId,
    reservationId,
    customer_name: guestName,
    vehicle_name: vehicleName,
    pickup_date: pickupDate,
    return_date: returnDate,
    total_amount: amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : null,
    source: 'turo',
    status: 'confirmed',
  }
}

// ── Car matching ──────────────────────────────────────────────────────────────

async function findCarId(tenantId: string, vehicleName: string | undefined): Promise<number | null> {
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

interface ExistingReservation {
  id: string
  status: string | null
}

// Locate the existing row for a Turo booking: by Turo reservation id first (stable across
// the confirm / modify / cancel emails of one booking), then by gmail message id so that
// re-fetching the same email — and rows synced before res-ids were stored — still dedupe.
async function findExistingReservation(
  parsed: ParsedEmail,
  tenantId: string,
): Promise<ExistingReservation | null> {
  const supabase = createAdminClient()
  if (parsed.reservationId) {
    const { data } = await supabase
      .from('reservations')
      .select('id, status')
      .eq('tenant_id', tenantId)
      .like('notes', `%Turo-Res #${parsed.reservationId}%`)
      .limit(1)
    if (data?.[0]) return data[0]
  }
  const { data } = await supabase
    .from('reservations')
    .select('id, status')
    .eq('tenant_id', tenantId)
    .like('notes', `%Turo #${parsed.messageId}%`)
    .limit(1)
  return data?.[0] ?? null
}

// Lifecycle statuses that a Turo confirm/modify email must never overwrite. Once a trip is
// picked up (active) or finished (completed), re-processing an old confirm email — which the
// 3-day cursor lookback does every poll — must NOT regress it back to "confirmed". Manual
// operator changes to these terminal/forward states are preserved. (Stephane Karim Pierre's
// finished 7/20 trip kept flipping back to confirmed before this guard.)
const PROTECTED_STATUSES = new Set(['active', 'completed'])

async function processEmail(parsed: ParsedEmail, sync: EmailSync): Promise<void> {
  const supabase = createAdminClient()

  if (parsed.type === 'cancel') {
    const existing = await findExistingReservation(parsed, sync.tenant_id)
    if (existing) {
      await supabase.from('reservations').update({ status: 'cancelled' }).eq('id', existing.id)
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

// ── Provider pollers ──────────────────────────────────────────────────────────

async function pollGmail(sync: EmailSync, msgErrors?: string[]): Promise<number> {
  const checkedAt = sync.last_checked
    ? new Date(new Date(sync.last_checked).getTime() - CURSOR_LOOKBACK_MS)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const afterTimestamp = Math.floor(checkedAt.getTime() / 1000)
  const query = `from:noreply@mail.turo.com after:${afterTimestamp}`

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
      const parsed = parseTuroEmail(body, subject, msg.id)
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
          if (/booked|cancel|modif|updated.*trip|trip.*updated/i.test(subject)) {
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

  // TEMP diagnostic (read-only): ?debug=1 reports the built Gmail query, how many
  // messages it returns, and whether the first few parse — without mutating last_checked.
  if (new URL(request.url).searchParams.get('debug') === '1') {
    const s = syncs[0] as EmailSync
    const checkedAt = s.last_checked
      ? new Date(new Date(s.last_checked).getTime() - CURSOR_LOOKBACK_MS)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const afterTimestamp = Math.floor(checkedAt.getTime() / 1000)
    const query = `from:noreply@mail.turo.com after:${afterTimestamp}`
    const page = await gmailFetch(`/messages?q=${encodeURIComponent(query)}&maxResults=50`, s)
    const ids: string[] = (page.messages || []).map((m: { id: string }) => m.id)
    const apply = new URL(request.url).searchParams.get('apply') === '1'
    const samples: { id: string; subject: string; parsed: boolean; processResult?: string }[] = []
    for (const id of ids.slice(0, 16)) {
      const full = await gmailFetch(`/messages/${id}?format=full`, s)
      const subject = full.payload?.headers?.find((h: { name: string }) => h.name.toLowerCase() === 'subject')?.value || ''
      const body = getMessageBody(full.payload)
      const parsed = parseTuroEmail(body, subject, id)
      const entry: { id: string; subject: string; parsed: boolean; processResult?: string } = { id, subject, parsed: !!parsed }
      if (parsed && apply) {
        try {
          await processEmail(parsed, s)
          entry.processResult = 'ok'
        } catch (err: unknown) {
          entry.processResult = `error: ${err instanceof Error ? err.message : String(err)}`
        }
      }
      samples.push(entry)
    }
    return NextResponse.json({
      debug: true, provider: s.provider ?? null, last_checked: s.last_checked, access_token_len: s.access_token?.length ?? 0,
      afterTimestamp, query, rawCount: ids.length, resultSizeEstimate: page.resultSizeEstimate, samples,
    })
  }

  let totalSynced = 0
  let errors = 0
  const errorDetails: string[] = []

  for (const sync of syncs) {
    try {
      const synced =
        sync.provider === 'icloud'
          ? await pollIcloud(sync)
          : await pollGmail(sync, errorDetails)

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
    }
  }

  console.info(`[poll-turo-emails] Done: ${totalSynced} synced, ${errors} error(s)`)
  return NextResponse.json({ totalSynced, errors, ...(errorDetails.length ? { errorDetails } : {}) })
}
