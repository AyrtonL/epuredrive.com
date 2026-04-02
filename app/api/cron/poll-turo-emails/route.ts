/**
 * GET /api/cron/poll-turo-emails
 * Scheduled every 15 min via Netlify (thin wrapper calls this route).
 * Reads all active turo_email_syncs, polls Gmail / iCloud for new Turo
 * emails, and upserts reservations into the DB.
 *
 * Protected by Authorization: Bearer {CRON_SECRET}
 */

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const GMAIL_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

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
  customer_name: string | null
  vehicle_name?: string
  pickup_date: string | null
  return_date: string | null
  total_amount?: number | null
  notes?: string
  source?: string
  status?: string
}

function parseTuroEmail(body: string, subject: string, messageId: string): ParsedEmail | null {
  const fullText = subject + ' ' + body

  const isCancelled = /cancel/i.test(subject)
  const isModified = /modif|updated.*trip|trip.*updated/i.test(subject)
  const isConfirmed = /cha.?ching|trip.*booked|booked.*trip/i.test(fullText)

  if (!isConfirmed && !isCancelled && !isModified) return null

  if (isCancelled) {
    const cancelGuestMatch =
      body.match(/(.+?)'s trip with your/i) ||
      body.match(/trip (?:for|with) (.+?) has been cancel/i)
    const cancelDatesMatch = body.match(/(?:from|booked from) (.+?\d{4}).+? to (.+?\d{4})/i)
    return {
      type: 'cancel',
      messageId,
      customer_name: cancelGuestMatch?.[1]?.trim() ?? null,
      pickup_date: cancelDatesMatch ? parseTuroDate(cancelDatesMatch[1]) : null,
      return_date: cancelDatesMatch ? parseTuroDate(cancelDatesMatch[2]) : null,
    }
  }

  const guestMatch =
    body.match(/Cha-?ching!\s*(.+?)[\u2019']s trip with your/i) ||
    body.match(/(.+?)[\u2019']s trip with your/i)
  if (!guestMatch) return null

  const vehicleMatch = body.match(/trip with your (.+?) is (?:booked|confirmed|modified)/i)
  const datesMatch = body.match(/booked from (.+?\d{4}).+? to (.+?\d{4})/i)
  if (!datesMatch) return null

  const pickupDate = parseTuroDate(datesMatch[1])
  const returnDate = parseTuroDate(datesMatch[2])
  if (!pickupDate || !returnDate) return null

  const amountMatch = body.match(/You[''\u2019]ll earn \$([0-9,]+(?:\.\d{2})?)/i)

  return {
    type: isModified ? 'modify' : 'confirm',
    messageId,
    customer_name: guestMatch[1].trim(),
    vehicle_name: vehicleMatch?.[1]?.trim() ?? '',
    pickup_date: pickupDate,
    return_date: returnDate,
    total_amount: amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : null,
    notes: `Turo #${messageId}`,
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

async function processEmail(parsed: ParsedEmail, sync: EmailSync): Promise<void> {
  const supabase = createAdminClient()

  if (parsed.type === 'cancel') {
    if (parsed.customer_name && parsed.pickup_date) {
      const { data: matches } = await supabase
        .from('reservations')
        .select('id')
        .eq('tenant_id', sync.tenant_id)
        .eq('customer_name', parsed.customer_name)
        .eq('pickup_date', parsed.pickup_date)
        .eq('source', 'turo')

      for (const r of matches ?? []) {
        await supabase.from('reservations').update({ status: 'cancelled' }).eq('id', r.id)
      }
    }
    return
  }

  const { data: existing } = await supabase
    .from('reservations')
    .select('id')
    .eq('tenant_id', sync.tenant_id)
    .like('notes', `%Turo #${parsed.messageId}%`)

  const carId = await findCarId(sync.tenant_id, parsed.vehicle_name)
  const notes = carId
    ? parsed.notes!
    : `${parsed.notes} [vehicle: ${parsed.vehicle_name || 'unknown'}]`

  const reservationData = {
    tenant_id: sync.tenant_id,
    car_id: carId,
    customer_name: parsed.customer_name,
    pickup_date: parsed.pickup_date,
    return_date: parsed.return_date,
    total_amount: parsed.total_amount,
    status: parsed.status,
    source: parsed.source,
    notes,
  }

  if (existing && existing.length > 0) {
    await supabase
      .from('reservations')
      .update({
        pickup_date: parsed.pickup_date,
        return_date: parsed.return_date,
        total_amount: parsed.total_amount,
        status: parsed.status,
      })
      .eq('id', existing[0].id)
  } else {
    await supabase.from('reservations').insert(reservationData)
  }
}

// ── Provider pollers ──────────────────────────────────────────────────────────

async function pollGmail(sync: EmailSync): Promise<number> {
  const checkedAt = sync.last_checked
    ? new Date(sync.last_checked)
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
      console.error(`[poll-turo-emails] Gmail message ${msg.id} failed:`, err instanceof Error ? err.message : err)
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
        ? new Date(sync.last_checked)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

      const allUids: number[] = await client.search(
        { from: 'noreply@mail.turo.com', since: checkedAt },
        { uid: true }
      )

      // Step 1: filter by subject (envelope only) to avoid downloading all bodies
      const relevantUids: number[] = []
      for (const uid of allUids) {
        try {
          const msg = await client.fetchOne(String(uid), { envelope: true }, { uid: true })
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
    return NextResponse.json({ synced: 0, errors: 0 })
  }

  let totalSynced = 0
  let errors = 0

  for (const sync of syncs) {
    try {
      const synced =
        sync.provider === 'icloud'
          ? await pollIcloud(sync)
          : await pollGmail(sync)

      await supabase
        .from('turo_email_syncs')
        .update({ last_checked: new Date().toISOString() })
        .eq('id', sync.id)

      totalSynced += synced
      console.log(`[poll-turo-emails] Tenant ${sync.tenant_id} (${sync.gmail_address}) [${sync.provider || 'gmail'}]: ${synced} processed`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[poll-turo-emails] Sync ${sync.id} failed:`, msg)
      if (/token refresh failed|403|access.?denied|insufficient.?permission|authenticationfailed/i.test(msg)) {
        await supabase.from('turo_email_syncs').update({ active: false }).eq('id', sync.id).catch(() => {})
      }
      errors++
    }
  }

  console.log(`[poll-turo-emails] Done: ${totalSynced} synced, ${errors} error(s)`)
  return NextResponse.json({ totalSynced, errors })
}
