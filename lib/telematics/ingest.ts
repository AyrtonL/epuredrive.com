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
