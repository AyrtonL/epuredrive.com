// lib/telematics/ingest.ts
// Provider-neutral ingest helpers. Called from the webhook route after
// parseWebhookPayload turns a raw Bouncie body into ProviderEvent[] and the
// route resolves { device_id, car_id } for the IMEI.
//
// Immutability: we never mutate incoming ctx/event objects; each insert/update
// builds a fresh payload object.

import type { SupabaseClient } from '@supabase/supabase-js'
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

  await supabase.from('telematics_positions').insert({
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
  })

  await supabase
    .from('telematics_devices')
    .update({
      last_seen_at: event.occurred_at,
      online: true,
    })
    .eq('id', device_id)

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

    await supabase.from('cars').update(patch).eq('id', car_id)
  }
}

// ── Trip end ──────────────────────────────────────────────────────────────

interface BouncieTripPayload {
  transactionId?: string
  startTime?: string
  endTime?: string
  distance?: number
  maxSpeed?: number
  duration?: number
  hardBrakingCount?: number
  hardAccelerationCount?: number
  fuelConsumed?: number
  gpsTrail?: Array<{ lat: number; lon: number }>
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function str(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function firstTrailPoint(
  trail: Array<{ lat: number; lon: number }> | undefined,
): { lat: number; lon: number } | null {
  if (!trail || trail.length === 0) return null
  const p = trail[0]
  return typeof p.lat === 'number' && typeof p.lon === 'number' ? p : null
}

function lastTrailPoint(
  trail: Array<{ lat: number; lon: number }> | undefined,
): { lat: number; lon: number } | null {
  if (!trail || trail.length === 0) return null
  const p = trail[trail.length - 1]
  return typeof p.lat === 'number' && typeof p.lon === 'number' ? p : null
}

/**
 * Upsert a completed trip into `telematics_trips` and best-effort match it to
 * a reservation (same tenant + car, with the trip start date falling inside
 * the reservation's pickup/return window).
 *
 * The unique (tenant_id, bouncie_trip_id) constraint plus onConflict upsert
 * make this safe to call repeatedly for the same provider trip.
 */
export async function ingestTripEnd(
  supabase: SupabaseClient,
  ctx: IngestContext,
): Promise<void> {
  const { tenant_id, device_id, car_id, event } = ctx
  const p = event.payload as BouncieTripPayload

  const transactionId = str(p.transactionId)
  const startTime = str(p.startTime)
  if (!transactionId || !startTime) return

  // Attempt reservation match when we know which car this trip belongs to.
  // reservations.id is uuid in this schema → reservation_id is a string.
  let reservation_id: string | null = null
  if (car_id !== null) {
    const startDate = startTime.slice(0, 10) // YYYY-MM-DD
    const { data: res } = await supabase
      .from('reservations')
      .select('id')
      .eq('tenant_id', tenant_id)
      .eq('car_id', car_id)
      .lte('pickup_date', startDate)
      .gte('return_date', startDate)
      .maybeSingle()
    const matchedId = (res as { id?: unknown } | null)?.id
    reservation_id = typeof matchedId === 'string' ? matchedId : null
  }

  const first = firstTrailPoint(p.gpsTrail)
  const last = lastTrailPoint(p.gpsTrail)

  await supabase.from('telematics_trips').upsert(
    {
      tenant_id,
      device_id,
      car_id,
      reservation_id,
      started_at: startTime,
      ended_at: str(p.endTime),
      start_lat: first?.lat ?? null,
      start_lon: first?.lon ?? null,
      end_lat: last?.lat ?? null,
      end_lon: last?.lon ?? null,
      distance_mi: num(p.distance) ?? 0,
      duration_s: num(p.duration),
      max_speed_mph: num(p.maxSpeed),
      hard_braking_count: num(p.hardBrakingCount) ?? 0,
      hard_accel_count: num(p.hardAccelerationCount) ?? 0,
      fuel_consumed_gal: num(p.fuelConsumed),
      bouncie_trip_id: transactionId,
    },
    { onConflict: 'tenant_id,bouncie_trip_id' },
  )
}
