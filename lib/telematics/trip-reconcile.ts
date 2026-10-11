// lib/telematics/trip-reconcile.ts
// Pull-side safety net for trips. The webhook path (tripStart → tripMetrics
// → tripEnd) silently loses data whenever a delivery is dropped or arrives
// out of order: a missing tripEnd/tripMetrics leaves a trip with no
// ended_at/distance, and a missing tripStart drops the whole trip (metrics
// and end are update-only). In production (Oct 2026) ~1 in 3 trips on one
// device had no miles while Bouncie's /trips API had every one complete.
//
// reconcileTrips() asks Bouncie for a device's completed trips in a window
// and upserts any that we're missing or that are still incomplete, keyed on
// the same (tenant_id, bouncie_trip_id) unique constraint as the webhook.
// Trips already complete in our DB are skipped, so a steady-state cycle
// does one SELECT and zero writes.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { TelematicsProvider } from './provider'
import type { ProviderTrip } from './types'
import { linkTripToReservation } from './ingest'
import { safeErrorMessage } from './alerts'

export interface ReconcileDevice {
  tenant_id: string
  device_id: string
  car_id: number | null
  imei: string
}

export interface ReconcileResult {
  fetched: number
  written: number
}

interface ExistingTrip {
  bouncie_trip_id: string
  ended_at: string | null
  distance_mi: number | null
}

/** Build the upsert row, omitting nulls so we never clobber webhook data
 *  (e.g. start/end coordinates the /trips response doesn't carry). */
export function tripRow(
  device: ReconcileDevice,
  trip: ProviderTrip,
): Record<string, unknown> {
  const optional: Record<string, unknown> = {
    ended_at: trip.ended_at,
    start_lat: trip.start_lat,
    start_lon: trip.start_lon,
    end_lat: trip.end_lat,
    end_lon: trip.end_lon,
    duration_s: trip.duration_s,
    max_speed_mph: trip.max_speed_mph,
    fuel_consumed_gal: trip.fuel_consumed_gal,
  }
  const present = Object.fromEntries(
    Object.entries(optional).filter(([, v]) => v !== null && v !== undefined),
  )
  return {
    tenant_id: device.tenant_id,
    device_id: device.device_id,
    car_id: device.car_id,
    bouncie_trip_id: trip.provider_trip_id,
    started_at: trip.started_at,
    distance_mi: trip.distance_mi,
    hard_braking_count: trip.hard_braking_count,
    hard_accel_count: trip.hard_accel_count,
    ...present,
  }
}

function isComplete(row: ExistingTrip | undefined): boolean {
  return !!row && row.ended_at !== null && row.distance_mi !== null
}

export async function reconcileTrips(
  supabase: SupabaseClient,
  provider: Pick<TelematicsProvider, 'listTrips'>,
  accessToken: string,
  device: ReconcileDevice,
  since: Date,
  until: Date = new Date(),
): Promise<ReconcileResult> {
  const trips = (
    await provider.listTrips(accessToken, device.imei, since, until)
  ).filter((t) => t.ended_at !== null) // in-progress trips: webhook owns them

  if (trips.length === 0) return { fetched: 0, written: 0 }

  const { data: existing, error: selErr } = await supabase
    .from('telematics_trips')
    .select('bouncie_trip_id, ended_at, distance_mi')
    .eq('tenant_id', device.tenant_id)
    .in('bouncie_trip_id', trips.map((t) => t.provider_trip_id))
  if (selErr) throw new Error(safeErrorMessage(selErr))

  const byId = new Map(
    ((existing ?? []) as ExistingTrip[]).map((r) => [r.bouncie_trip_id, r]),
  )
  const toWrite = trips.filter((t) => !isComplete(byId.get(t.provider_trip_id)))
  if (toWrite.length === 0) return { fetched: trips.length, written: 0 }

  const { data: written, error: upErr } = await supabase
    .from('telematics_trips')
    .upsert(toWrite.map((t) => tripRow(device, t)), {
      onConflict: 'tenant_id,bouncie_trip_id',
    })
    .select('id, started_at, reservation_id')
  if (upErr) throw new Error(safeErrorMessage(upErr))

  const rows = (written ?? []) as Array<{
    id: string
    started_at: string
    reservation_id: string | null
  }>
  for (const row of rows) {
    if (row.reservation_id === null) {
      await linkTripToReservation(supabase, device.tenant_id, device.car_id, row)
    }
  }

  return { fetched: trips.length, written: rows.length }
}
