// lib/telematics/ingest.ts
// Provider-neutral ingest helpers. Called from the webhook route after
// parseWebhookPayload turns a raw Bouncie body into ProviderEvent[] and the
// route resolves { device_id, car_id } for the IMEI.
//
// Immutability: we never mutate incoming ctx/event objects; each insert/update
// builds a fresh payload object.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { TelematicsSeverity } from '@/lib/supabase/types'
import { dispatchAlert, safeErrorMessage } from './alerts'
import type { ProviderEvent } from './types'

export interface IngestContext {
  tenant_id: string
  device_id: string
  car_id: number | null
  event: ProviderEvent
}

/**
 * Record a live-position event: insert a `telematics_positions` row, bump
 * `telematics_devices.last_seen_at/online`, and (when a car is linked) refresh
 * `cars.last_lat/lon/last_seen_at/mileage`.
 *
 * The monotonic-mileage trigger (`cars_mileage_monotonic_trg`) on `cars`
 * prevents mileage from ever decreasing, so we can safely write the raw
 * odometer reading here without a read-then-write race.
 */
export async function ingestLocationUpdate(
  supabase: SupabaseClient,
  ctx: IngestContext,
): Promise<void> {
  const { tenant_id, device_id, car_id, event } = ctx

  // No lat/lon → nothing useful to store (and telematics_positions requires lat/lon NOT NULL).
  if (event.lat === null || event.lon === null) return

  const heading = typeof event.payload.heading === 'number' ? event.payload.heading : null
  const ignition = typeof event.payload.ignition === 'boolean' ? event.payload.ignition : null

  // Idempotent write: Bouncie can redeliver webhooks, and the
  // (device_id, recorded_at) unique index guarantees we only store each
  // position once. ignoreDuplicates:true makes redeliveries a no-op
  // instead of returning a 23505 error.
  const { error: posErr } = await supabase
    .from('telematics_positions')
    .upsert(
      {
        tenant_id,
        device_id,
        car_id,
        recorded_at: event.occurred_at,
        lat: event.lat,
        lon: event.lon,
        speed_mph: event.speed_mph,
        heading,
        odometer_mi: event.odometer_mi,
        ignition,
      },
      { onConflict: 'device_id,recorded_at', ignoreDuplicates: true },
    )
  if (posErr) {
    console.warn(
      '[telematics] positions upsert failed',
      safeErrorMessage(posErr),
    )
  }

  const { error: devErr } = await supabase
    .from('telematics_devices')
    .update({
      last_seen_at: event.occurred_at,
      online: true,
    })
    .eq('id', device_id)
  if (devErr) {
    console.warn('[telematics] devices update failed', safeErrorMessage(devErr))
  }

  if (car_id !== null) {
    // Build patch immutably; only include mileage when we actually have one.
    const basePatch: Record<string, unknown> = {
      last_lat: event.lat,
      last_lon: event.lon,
      last_seen_at: event.occurred_at,
    }
    const patch =
      event.odometer_mi !== null
        ? { ...basePatch, mileage: Math.round(event.odometer_mi) }
        : basePatch

    const { error: carErr } = await supabase
      .from('cars')
      .update(patch)
      .eq('id', car_id)
    if (carErr) {
      console.warn('[telematics] cars update failed', safeErrorMessage(carErr))
    }
  }
}

// ── Trips ────────────────────────────────────────────────────────────────
// Bouncie assembles a single trip out of up to four separate webhook
// deliveries, correlated by `transactionId` (our `bouncie_trip_id`):
//   tripStart → tripData (0..n, GPS/speed samples) → tripMetrics → tripEnd
// Each ingest*  function below only writes the columns it actually knows,
// so a partial delivery never clobbers fields set by another one.

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function str(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

/** Best-effort mileage bump — safe to call with a null car/odometer. */
async function bumpCarMileage(
  supabase: SupabaseClient,
  car_id: number | null,
  odometer_mi: number | null,
): Promise<void> {
  if (car_id === null || odometer_mi === null) return
  const { error } = await supabase
    .from('cars')
    .update({ mileage: Math.round(odometer_mi) })
    .eq('id', car_id)
  if (error) {
    console.warn('[telematics] car mileage update failed', safeErrorMessage(error))
  }
}

/**
 * tripStart: creates the telematics_trips row. Idempotent via the unique
 * (tenant_id, bouncie_trip_id) constraint — a retried delivery just re-sets
 * the same starting fields.
 */
export async function ingestTripStart(
  supabase: SupabaseClient,
  ctx: IngestContext,
): Promise<void> {
  const { tenant_id, device_id, car_id, event } = ctx
  const transactionId = str(event.payload.transactionId)
  if (!transactionId) return

  const { error } = await supabase.from('telematics_trips').upsert(
    {
      tenant_id,
      device_id,
      car_id,
      started_at: event.occurred_at,
      hard_braking_count: 0,
      hard_accel_count: 0,
      bouncie_trip_id: transactionId,
    },
    { onConflict: 'tenant_id,bouncie_trip_id' },
  )
  if (error) {
    console.warn('[telematics] trip start upsert failed', safeErrorMessage(error))
  }

  await bumpCarMileage(supabase, car_id, event.odometer_mi)
}

/**
 * tripMetrics: patches the aggregate stats onto an existing trip row. A
 * plain update (not upsert) — if tripStart hasn't been ingested yet
 * (out-of-order delivery), this is a harmless no-op; the trip's numbers
 * just stay unset for this cycle.
 */
export async function ingestTripMetrics(
  supabase: SupabaseClient,
  ctx: IngestContext,
): Promise<void> {
  const { tenant_id, event } = ctx
  const transactionId = str(event.payload.transactionId)
  if (!transactionId) return

  const duration = num(event.payload.tripTime)
  const distance = num(event.payload.tripDistance)
  const maxSpeed = num(event.payload.maxSpeed)
  const hardBraking = num(event.payload.hardBrakingCounts)
  const hardAccel = num(event.payload.hardAccelerationCounts)

  const patch: Record<string, unknown> = {}
  if (duration !== null) patch.duration_s = Math.round(duration)
  if (distance !== null) patch.distance_mi = distance
  if (maxSpeed !== null) patch.max_speed_mph = maxSpeed
  if (hardBraking !== null) patch.hard_braking_count = hardBraking
  if (hardAccel !== null) patch.hard_accel_count = hardAccel
  if (Object.keys(patch).length === 0) return

  const { error } = await supabase
    .from('telematics_trips')
    .update(patch)
    .eq('tenant_id', tenant_id)
    .eq('bouncie_trip_id', transactionId)
  if (error) {
    console.warn('[telematics] trip metrics update failed', safeErrorMessage(error))
  }
}

/**
 * tripEnd: closes out the trip row, best-effort matches it to a reservation
 * (same tenant + car, with the trip's *start* date inside the reservation's
 * pickup/return window), and bumps the car's mileage from the end odometer.
 */
export async function ingestTripEnd(
  supabase: SupabaseClient,
  ctx: IngestContext,
): Promise<void> {
  const { tenant_id, car_id, event } = ctx
  const transactionId = str(event.payload.transactionId)
  if (!transactionId) return

  const fuelConsumed = num(event.payload.fuelConsumed)
  const patch: Record<string, unknown> = { ended_at: event.occurred_at }
  if (fuelConsumed !== null) patch.fuel_consumed_gal = fuelConsumed

  const { data: row, error } = await supabase
    .from('telematics_trips')
    .update(patch)
    .eq('tenant_id', tenant_id)
    .eq('bouncie_trip_id', transactionId)
    .select('id, started_at')
    .maybeSingle()
  if (error) {
    console.warn('[telematics] trip end update failed', safeErrorMessage(error))
  }

  const tripRow = row as { id: string; started_at: string } | null
  if (car_id !== null && tripRow) {
    const startDate = tripRow.started_at.slice(0, 10) // YYYY-MM-DD
    const { data: res } = await supabase
      .from('reservations')
      .select('id')
      .eq('tenant_id', tenant_id)
      .eq('car_id', car_id)
      .lte('pickup_date', startDate)
      .gte('return_date', startDate)
      .maybeSingle()
    const reservationId = (res as { id?: unknown } | null)?.id
    if (typeof reservationId === 'string') {
      await supabase
        .from('telematics_trips')
        .update({ reservation_id: reservationId })
        .eq('id', tripRow.id)
    }
  }

  await bumpCarMileage(supabase, car_id, event.odometer_mi)
}

// ── Generic event + classification + alert dispatch ───────────────────────

interface Classification {
  severity: TelematicsSeverity
  shouldNotify: boolean
}

/**
 * Insert a telematics_events row with the classified severity, and dispatch
 * an alert when classification says we should notify.
 *
 * telematics_events.event_type has a CHECK constraint that excludes
 * 'location_update' — those are stored in telematics_positions, not here.
 */
export async function ingestEvent(
  supabase: SupabaseClient,
  ctx: IngestContext,
): Promise<void> {
  const { tenant_id, device_id, car_id, event } = ctx

  // location_update belongs in positions, not events. Route accordingly.
  if (event.type === 'location_update') {
    await ingestLocationUpdate(supabase, ctx)
    return
  }

  const { severity, shouldNotify } = await classifyEvent(supabase, tenant_id, event)

  const { data: row, error } = await supabase
    .from('telematics_events')
    .insert({
      tenant_id,
      device_id,
      car_id,
      event_type: event.type,
      severity,
      occurred_at: event.occurred_at,
      payload: event.payload,
    })
    .select('id')
    .single()

  if (error || !row) {
    if (error) {
      console.warn(
        '[telematics] events insert failed',
        safeErrorMessage(error),
      )
    }
    return
  }
  const eventId = (row as { id?: unknown }).id
  if (typeof eventId !== 'string') return

  if (shouldNotify) {
    // dispatchAlert writes a notifications row (can fail on transient DB
    // issues) and then emails (already guarded). A failure here must NOT
    // abort the webhook's outer event loop — subsequent events in the
    // batch must still be processed, so we log and swallow.
    try {
      await dispatchAlert(supabase, {
        tenant_id,
        car_id,
        event_id: eventId,
        event,
        severity,
      })
    } catch (err: unknown) {
      console.warn(
        '[telematics] dispatchAlert failed',
        safeErrorMessage(err),
      )
    }
  }
}

/**
 * Map a ProviderEvent type to a severity, and decide whether to dispatch an
 * alert. Per spec §8 the severity matrix is:
 *   - geofence_enter(forbidden) / geofence_exit(forbidden) / connection_expired → critical
 *   - geofence_exit(allowed) / speed_exceeded / dtc_new / battery_low / offline → warning
 *   - everything else → info, no notification
 *
 * SECURITY (audit finding #10): geofence kind is resolved from the DB
 * (telematics_geofences.kind) using the payload's geofence_id, NEVER from
 * attacker-controllable payload fields like `geofence_kind`.
 */
async function classifyEvent(
  supabase: SupabaseClient,
  tenant_id: string,
  event: ProviderEvent,
): Promise<Classification> {
  switch (event.type) {
    case 'geofence_enter':
    case 'geofence_exit': {
      const geofenceId =
        typeof event.payload.geofence_id === 'string' ? event.payload.geofence_id : null

      let kind: 'allowed' | 'forbidden' = 'allowed'
      if (geofenceId) {
        const { data } = await supabase
          .from('telematics_geofences')
          .select('kind')
          .eq('tenant_id', tenant_id)
          .eq('id', geofenceId)
          .maybeSingle()
        const dbKind = (data as { kind?: unknown } | null)?.kind
        if (dbKind === 'forbidden') kind = 'forbidden'
      }

      if (event.type === 'geofence_enter') {
        return kind === 'forbidden'
          ? { severity: 'critical', shouldNotify: true }
          : { severity: 'info', shouldNotify: false }
      }
      // geofence_exit
      return kind === 'forbidden'
        ? { severity: 'critical', shouldNotify: true }
        : { severity: 'warning', shouldNotify: true }
    }

    case 'connection_expired':
      return { severity: 'critical', shouldNotify: true }

    case 'speed_exceeded':
    case 'dtc_new':
    case 'battery_low':
    case 'offline':
    case 'vin_changed':
      return { severity: 'warning', shouldNotify: true }

    case 'hard_braking':
    case 'hard_accel':
    case 'dtc_cleared':
    case 'online':
    case 'ignition_on':
    case 'ignition_off':
    case 'trip_start':
    case 'trip_end':
      return { severity: 'info', shouldNotify: false }

    default:
      return { severity: 'info', shouldNotify: false }
  }
}
