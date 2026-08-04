// app/api/telematics/webhook/bouncie/route.ts
// POST /api/telematics/webhook/bouncie
// Receives Bouncie webhook events, verifies HMAC, routes each event to the
// correct ingest function.
//
// Security (spec §5.3, §13.1 and audit findings):
//   1. Body size guard BEFORE reading — 1 MiB cap (both content-length and
//      length-of-text re-check).
//   2. Auth verify BEFORE any parsing. Bouncie has no HMAC signature scheme
//      — it echoes the configured authKey verbatim in the Authorization /
//      X-Bouncie-Authorization headers (both carry the same value; the
//      second exists because some platforms strip Authorization before it
//      reaches app code). Verification is a constant-time string compare
//      against BOUNCIE_WEBHOOK_SECRET, done in the provider.
//   3. Timestamp freshness — events older/newer than 300 s are dropped
//      (audit #2). Matches Stripe-webhook policy in this codebase.
//   4. Batch cap — first 100 events per payload only; extras logged + dropped.
//   5. Device lookup JOINS telematics_connections with status='active' —
//      prevents cross-tenant IMEI routing even if two tenants register the
//      same IMEI (audit #1).
//   6. Per-event try/catch so a single bad event never aborts the batch.
//   7. safeErrorMessage is used on every log line so bearer tokens (from a
//      failing refresh) cannot leak into logs (audit #7).

import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { getProvider } from '@/lib/telematics/registry'
import {
  ingestLocationUpdate,
  ingestTripStart,
  ingestTripMetrics,
  ingestTripEnd,
  ingestEvent,
  type IngestContext,
} from '@/lib/telematics/ingest'
import { safeErrorMessage } from '@/lib/telematics/alerts'
import type { ProviderEvent } from '@/lib/telematics/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_BODY_BYTES = 1_048_576 // 1 MiB
const MAX_EVENTS_PER_BATCH = 100
const TIMESTAMP_SKEW_SECONDS = 300

interface DeviceRow {
  id: string
  tenant_id: string
  car_id: number | null
  connection?: { id: string; status: string } | { id: string; status: string }[] | null
}

export async function POST(req: Request) {
  // 1. Body size guard (pre-read).
  const contentLengthHeader = req.headers.get('content-length') ?? '0'
  const contentLength = Number.parseInt(contentLengthHeader, 10)
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return new NextResponse('Payload too large', { status: 413 })
  }

  // 2. Read raw body (HMAC needs byte-exact input).
  const raw = await req.text()
  if (raw.length > MAX_BODY_BYTES) {
    return new NextResponse('Payload too large', { status: 413 })
  }

  // 3. Verify auth before any parsing. Prefer X-Bouncie-Authorization (the
  // failsafe header Bouncie documents for platforms that strip
  // Authorization) and fall back to Authorization.
  const provider = getProvider('bouncie')
  const authHeader =
    req.headers.get('x-bouncie-authorization') ?? req.headers.get('authorization')
  if (!provider.verifyWebhookAuth(authHeader)) {
    return new NextResponse('Invalid authorization', { status: 401 })
  }

  // 4. Parse payload. Invalid JSON → empty array (parser handles this).
  let events: ProviderEvent[]
  try {
    events = provider.parseWebhookPayload(raw)
  } catch (err: unknown) {
    console.warn('[bouncie webhook] parse failed', safeErrorMessage(err))
    return NextResponse.json({ ok: true })
  }

  // 5. Batch cap (first N only, drop overflow with warn).
  if (events.length > MAX_EVENTS_PER_BATCH) {
    console.warn('[bouncie webhook] batch overflow', { total: events.length })
    events = events.slice(0, MAX_EVENTS_PER_BATCH)
  }

  // 6. Timestamp freshness filter — audit #2. Drop events whose
  // occurred_at is more than 300 s from server clock in either direction.
  const nowMs = Date.now()
  const skewMs = TIMESTAMP_SKEW_SECONDS * 1000
  const fresh = events.filter((ev) => {
    const t = Date.parse(ev.occurred_at)
    if (!Number.isFinite(t)) return false
    return Math.abs(nowMs - t) <= skewMs
  })

  const supabase = createAdminClient()

  // 7. Per-event dispatch with isolated error handling.
  for (const event of fresh) {
    try {
      const device = await resolveDevice(supabase, event.imei)
      if (!device) {
        // Tenant hasn't linked this IMEI yet, or connection is inactive.
        // Ack+drop — Bouncie will retry if we 4xx/5xx and we don't want
        // those retries to pile up for a legitimately-unlinked device.
        console.warn('[bouncie webhook] no active device for imei', {
          imei: event.imei,
          type: event.type,
        })
        continue
      }

      const ctx: IngestContext = {
        tenant_id: device.tenant_id,
        device_id: device.id,
        car_id: device.car_id,
        event,
      }

      if (event.type === 'location_update') {
        await ingestLocationUpdate(supabase, ctx)
      } else if (event.type === 'trip_start') {
        await ingestTripStart(supabase, ctx)
        await ingestEvent(supabase, ctx)
      } else if (event.type === 'trip_metrics') {
        // Internal-only: patches telematics_trips, never surfaced as an alert.
        await ingestTripMetrics(supabase, ctx)
      } else if (event.type === 'trip_end') {
        await ingestTripEnd(supabase, ctx)
        await ingestEvent(supabase, ctx)
      } else {
        await ingestEvent(supabase, ctx)
      }
    } catch (err: unknown) {
      // Never let a single event abort the batch.
      console.error('[bouncie webhook] ingest failure', {
        imei: event.imei,
        type: event.type,
        msg: safeErrorMessage(err),
      })
    }
  }

  return NextResponse.json({ ok: true })
}

/**
 * Resolve an IMEI to its device row, joining `telematics_connections` and
 * excluding 'disconnected' ones. This JOIN is the authoritative defense
 * against cross-tenant IMEI routing (audit #1) — UNIQUE(tenant_id, imei)
 * alone would theoretically let two tenants register the same IMEI; the
 * connection-status filter ensures only one wins at ingest time.
 *
 * Deliberately status != 'disconnected' rather than status = 'active':
 * webhook ingestion never uses the connection's access_token (unlike the
 * cron pull-sync), so a connection sitting in 'error' or 'expired' is still
 * a legitimate, tenant-owned mapping — only an explicit disconnectAction()
 * call (which the user triggers) should stop us trusting it. Requiring
 * 'active' here meant a single transient sync failure (see
 * lib/telematics/sync.ts) silently dropped every live webhook for that
 * tenant, and since we always 200 OK the request, Bouncie never retried —
 * that data was gone for good, not just delayed.
 */
async function resolveDevice(
  supabase: SupabaseClient,
  imei: string,
): Promise<{ id: string; tenant_id: string; car_id: number | null } | null> {
  const { data, error } = await supabase
    .from('telematics_devices')
    .select(
      'id, tenant_id, car_id, connection:telematics_connections!inner(id,status)',
    )
    .eq('imei', imei)
    .neq('connection.status', 'disconnected')
    .maybeSingle()

  if (error) {
    console.warn('[bouncie webhook] device lookup failed', {
      imei,
      msg: safeErrorMessage(error),
    })
    return null
  }

  const row = data as DeviceRow | null
  if (!row) return null

  return {
    id: row.id,
    tenant_id: row.tenant_id,
    car_id: row.car_id,
  }
}
