// lib/telematics/bouncie/types.ts
// Raw Bouncie API response shapes. These are internal to the adapter —
// never imported outside lib/telematics/bouncie/.

export interface BouncieTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number   // seconds
  token_type: 'Bearer'
  scope?: string
}

// Matches https://docs.bouncie.dev/openapi.json's GET /v1/vehicles response
// exactly (verified against the raw spec, not just the rendered docs page).
export interface BouncieVehicle {
  imei: string
  vin: string | null
  nickName: string | null
  model: { year: number; make: string; name: string } | null
  stats: {
    lastUpdated: string
    location: { lat: number; lon: number } | null
    odometer: number | null
    fuelLevel?: number | null
    // Battery status lives under stats.mil.battery, not as a top-level
    // field — Bouncie only ever exposes a status enum, never a raw
    // voltage (ProviderVehicle.battery_voltage stays null via this path;
    // the `battery` webhook event is the only battery signal we surface).
    mil?: {
      milOn: boolean
      lastUpdated?: string | null
      qualifiedDtcList?: Array<{ code: string; name: string[] }> | null
      battery?: { status: 'normal' | 'low' | 'critical'; lastUpdated: string } | null
    } | null
  } | null
}

export interface BouncieTrip {
  transactionId: string
  imei: string
  startTime: string
  endTime: string | null
  startOdometer: number | null
  endOdometer: number | null
  distance: number
  duration: number | null
  gpsTrail?: Array<{ lat: number; lon: number; timestamp: string; speed: number | null }>
  hardBrakingCount?: number
  hardAccelerationCount?: number
  maxSpeed?: number
  fuelConsumed?: number
}

// Real webhook payload shapes, from https://docs.bouncie.dev/ openapi.json
// `webhooks` section. Each delivery is a single flat object — NOT the
// generic { eventType, imei, timestamp, data } envelope the original
// implementation assumed (that shape doesn't exist in Bouncie's API).

interface BouncieWebhookBase {
  imei: string
  vin: string
}

export interface BouncieConnectWebhook extends BouncieWebhookBase {
  eventType: 'connect'
  connect: { timestamp: string; timeZone: string; latitude: number; longitude: number }
}

export interface BouncieDisconnectWebhook extends BouncieWebhookBase {
  eventType: 'disconnect'
  disconnect: { timestamp: string; timeZone: string; latitude: number; longitude: number }
}

export interface BouncieBatteryWebhook extends BouncieWebhookBase {
  eventType: 'battery'
  battery: { timestamp: string; value: 'normal' | 'low' | 'critical' }
}

export interface BouncieMilWebhook extends BouncieWebhookBase {
  eventType: 'mil'
  mil: { timestamp: string; value: 'ON'; codes: string }
}

export interface BouncieVinChangeWebhook extends BouncieWebhookBase {
  eventType: 'vinChange'
  vinChange: { timestamp: string; timeZone: string; oldVin: string | null; newVin: string }
}

export interface BouncieTripStartWebhook extends BouncieWebhookBase {
  eventType: 'tripStart'
  transactionId: string
  start: { timestamp: string; timeZone: string; odometer: number }
}

export interface BouncieTripDataWebhook extends BouncieWebhookBase {
  eventType: 'tripData'
  transactionId: string
  data: Array<{
    timestamp: string
    speed?: number
    gps: { lat: number; lon: number; heading: number }
    fuelLevelInput?: number
  }>
}

export interface BouncieTripMetricsWebhook extends BouncieWebhookBase {
  eventType: 'tripMetrics'
  transactionId: string
  metrics: {
    timestamp: string
    tripTime: number
    tripDistance: number
    totalIdlingTime: number
    maxSpeed: number
    averageDriveSpeed: number
    hardBrakingCounts: number
    hardAccelerationCounts: number
  }
}

export interface BouncieTripEndWebhook extends BouncieWebhookBase {
  eventType: 'tripEnd'
  transactionId: string
  end: { timestamp: string; timeZone: string; odometer: number; fuelConsumed: number }
}

export interface BouncieGeozoneWebhook extends BouncieWebhookBase {
  eventType: 'applicationGeozone' | 'userGeozone'
  transactionId: string
  geozone: {
    id: string
    name: string
    event: 'ENTER' | 'EXIT'
    timestamp: string
    location: { lat: number; lon: number; heading: number }
  }
}

export type BouncieWebhookEvent =
  | BouncieConnectWebhook
  | BouncieDisconnectWebhook
  | BouncieBatteryWebhook
  | BouncieMilWebhook
  | BouncieVinChangeWebhook
  | BouncieTripStartWebhook
  | BouncieTripDataWebhook
  | BouncieTripMetricsWebhook
  | BouncieTripEndWebhook
  | BouncieGeozoneWebhook
