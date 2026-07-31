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

export interface BouncieVehicle {
  imei: string
  vin: string | null
  nickName: string | null
  model: { year: number; make: string; model: string } | null
  stats: {
    lastUpdated: string
    location: { lat: number; lon: number } | null
    odometer: number | null
    fuelLevel?: number | null
    batteryStatus?: 'normal' | 'low' | null
    mil?: { milOn: boolean; lastUpdated?: string | null; qualifiedEvent?: boolean | null } | null
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
