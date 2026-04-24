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

export interface BouncieWebhookEvent {
  eventType: string
  imei: string
  timestamp: string
  data?: Record<string, unknown>
}
