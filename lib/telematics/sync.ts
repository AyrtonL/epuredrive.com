// lib/telematics/sync.ts
// Per-connection pull sync. Runs from the 5-minute Netlify cron
// (netlify/functions/telematics-sync.ts) and — later — from the
// per-tenant syncNowAction server action scoped to a single tenant.
//
// Behavior (spec §5.4):
//   1. Refresh OAuth token if it expires within 60s.
//      On refresh failure → mark connection 'expired' and emit a
//      connection_expired critical event.
//   2. Call provider.listVehicles(accessToken).
//   3. For each returned vehicle, look up the matching telematics_devices
//      row by (tenant_id, imei). When the provider's last_seen_at is newer
//      than the device's and lat/lon are present, feed a synthetic
//      ProviderEvent into ingestLocationUpdate (which upserts a position,
//      refreshes device.last_seen_at, and bumps the linked car).
//   4. On success → bump last_sync_at, clear error_message.
//   5. On any thrown error during vehicle fetch → status='error',
//      error_message=safe(err).
//
// Security (audit #7 + #8):
//   - We NEVER log raw `err` objects or response bodies (bearer tokens and
//     URLs leak otherwise). safeErr() strips anything but the message,
//     redacts bearer tokens defensively, and clamps to 500 chars.
//   - The helper accepts an already-scoped SupabaseClient so syncNowAction
//     (Task 23) can call it with a tenant-scoped client and never leak
//     cross-tenant side effects.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { TelematicsConnection } from '@/lib/supabase/types'
import { getProvider } from './registry'
import { ingestLocationUpdate } from './ingest'
import type { ProviderEvent } from './types'

const TOKEN_REFRESH_SKEW_MS = 60_000 // refresh when <60s remain
const MAX_ERR_MSG_LEN = 500

/**
 * Sanitize an unknown error into a short string safe for DB storage/logs.
 * Redacts bearer tokens defensively in case an error message echoes one
 * from a fetch failure.
 */
export function safeErr(err: unknown): string {
  const raw =
    err instanceof Error
      ? err.message
      : typeof err === 'string'
        ? err
        : 'unknown error'
  return raw
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [redacted]')
    .slice(0, MAX_ERR_MSG_LEN)
}

function needsRefresh(expiresAt: string | null): boolean {
  if (!expiresAt) return false
  const ts = new Date(expiresAt).getTime()
  if (Number.isNaN(ts)) return false
  return ts < Date.now() + TOKEN_REFRESH_SKEW_MS
}

function nowIso(): string {
  return new Date().toISOString()
}

function synthesizeLocationEvent(v: {
  imei: string
  last_seen_at: string
  last_lat: number
  last_lon: number
  odometer_mi: number | null
}): ProviderEvent {
  return {
    provider_event_id: null,
    imei: v.imei,
    type: 'location_update',
    occurred_at: v.last_seen_at,
    lat: v.last_lat,
    lon: v.last_lon,
    speed_mph: null,
    odometer_mi: v.odometer_mi,
    payload: {},
  }
}

/**
 * Pull-sync a single telematics_connections row.
 * Returns nothing — all outcomes are persisted via supabase side effects.
 */
export async function syncConnection(
  supabase: SupabaseClient,
  connection: TelematicsConnection,
): Promise<void> {
  const provider = getProvider('bouncie')
  let accessToken = connection.access_token ?? ''

  // ── Step 1: refresh if near expiry ────────────────────────────────
  if (needsRefresh(connection.token_expires_at)) {
    try {
      const refreshed = await provider.refreshAccessToken(
        connection.refresh_token ?? '',
      )
      accessToken = refreshed.access_token
      await supabase
        .from('telematics_connections')
        .update({
          access_token: refreshed.access_token,
          refresh_token: refreshed.refresh_token,
          token_expires_at: refreshed.expires_at,
          scope: refreshed.scope,
          status: 'active',
          error_message: null,
        })
        .eq('id', connection.id)
    } catch (err: unknown) {
      const message = safeErr(err)
      await supabase
        .from('telematics_connections')
        .update({
          status: 'expired',
          error_message: message,
        })
        .eq('id', connection.id)
      await supabase.from('telematics_events').insert({
        tenant_id: connection.tenant_id,
        event_type: 'connection_expired',
        severity: 'critical',
        occurred_at: nowIso(),
        payload: { reason: 'refresh_failed', message },
      })
      // Sanitized log only — never raw err (audit #7).
      console.warn('[telematics/sync] token refresh failed', {
        connection_id: connection.id,
        msg: message,
      })
      return
    }
  }

  // ── Steps 2-4: list vehicles and forward location updates ────────
  try {
    const vehicles = await provider.listVehicles(accessToken)

    for (const v of vehicles) {
      const { data: dev } = await supabase
        .from('telematics_devices')
        .select('id, car_id, last_seen_at')
        .eq('tenant_id', connection.tenant_id)
        .eq('imei', v.imei)
        .maybeSingle()

      if (!dev) continue // device not yet linked to this tenant — skip
      const devRow = dev as {
        id: string
        car_id: number | null
        last_seen_at: string | null
      }

      const provSeen = v.last_seen_at
      const devSeen = devRow.last_seen_at
      const fresher =
        provSeen !== null && (devSeen === null || provSeen > devSeen)

      if (!fresher) continue
      if (v.last_lat === null || v.last_lon === null) continue

      await ingestLocationUpdate(supabase, {
        tenant_id: connection.tenant_id,
        device_id: devRow.id,
        car_id: devRow.car_id,
        event: synthesizeLocationEvent({
          imei: v.imei,
          last_seen_at: provSeen,
          last_lat: v.last_lat,
          last_lon: v.last_lon,
          odometer_mi: v.odometer_mi,
        }),
      })
    }

    await supabase
      .from('telematics_connections')
      .update({ last_sync_at: nowIso(), error_message: null })
      .eq('id', connection.id)
  } catch (err: unknown) {
    const message = safeErr(err)
    await supabase
      .from('telematics_connections')
      .update({
        status: 'error',
        error_message: message,
      })
      .eq('id', connection.id)
    console.warn('[telematics/sync] listVehicles failed', {
      connection_id: connection.id,
      msg: message,
    })
  }
}
