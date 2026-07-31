// lib/telematics/types.ts
// Provider-neutral DTOs. Every dashboard page/ingest function talks in these
// types. Provider-specific shapes stay inside lib/telematics/bouncie/.

import type { TelematicsEventType } from '@/lib/supabase/types'

export interface OAuthTokens {
  access_token: string
  refresh_token: string
  expires_at: string  // ISO
  scope: string | null
  account_email: string | null
}

export interface ProviderVehicle {
  imei: string
  vin: string | null
  nickname: string | null
  online: boolean
  last_seen_at: string | null
  last_lat: number | null
  last_lon: number | null
  odometer_mi: number | null
  battery_voltage: number | null
}

export interface ProviderTrip {
  provider_trip_id: string
  imei: string
  started_at: string
  ended_at: string | null
  start_lat: number | null
  start_lon: number | null
  end_lat: number | null
  end_lon: number | null
  distance_mi: number
  duration_s: number | null
  max_speed_mph: number | null
  hard_braking_count: number
  hard_accel_count: number
  fuel_consumed_gal: number | null
}

// `location_update` and `trip_metrics` are ingestion-only event types (they
// update telematics_positions / telematics_trips, never telematics_events
// directly). All other types persist as telematics_events rows.
export type ProviderEventType = TelematicsEventType | 'location_update' | 'trip_metrics'

export interface ProviderEvent {
  provider_event_id: string | null
  imei: string
  type: ProviderEventType
  occurred_at: string
  lat: number | null
  lon: number | null
  speed_mph: number | null
  odometer_mi: number | null
  payload: Record<string, unknown>
}
