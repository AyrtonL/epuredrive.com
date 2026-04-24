// lib/telematics/bouncie/webhook-parser.ts
// Translates a raw Bouncie webhook payload into neutral ProviderEvent[].
// Unknown event types are dropped (not thrown) so Bouncie adding a new type
// doesn't break the whole batch.

import type { ProviderEvent, ProviderEventType } from '../types'

const BOUNCIE_TO_INTERNAL: Record<string, ProviderEventType> = {
  'location-update':   'location_update',
  'trip-start':        'trip_start',
  'trip-end':          'trip_end',
  'ignition-on':       'ignition_on',
  'ignition-off':      'ignition_off',
  'mil-on':            'dtc_new',
  'mil-off':           'dtc_cleared',
  'hard-braking':      'hard_braking',
  'hard-acceleration': 'hard_accel',
  'speeding':          'speed_exceeded',
  'battery':           'battery_low',
  'device-offline':    'offline',
  'device-online':     'online',
  'geofence-entered':  'geofence_enter',
  'geofence-exited':   'geofence_exit',
}

interface RawEvent {
  eventType: string
  imei: string
  timestamp: string
  data?: Record<string, unknown>
}

function toNumber(v: unknown): number | null {
  return typeof v === 'number' && !isNaN(v) ? v : null
}

export function parseBouncieWebhook(rawBody: string): ProviderEvent[] {
  let parsed: unknown
  try { parsed = JSON.parse(rawBody) } catch { return [] }

  const items: RawEvent[] = Array.isArray(parsed)
    ? (parsed as RawEvent[])
    : [parsed as RawEvent]
  const out: ProviderEvent[] = []

  for (const it of items) {
    if (!it || typeof it.eventType !== 'string' || typeof it.imei !== 'string' || typeof it.timestamp !== 'string') {
      continue
    }
    const type = BOUNCIE_TO_INTERNAL[it.eventType]
    if (!type) continue
    const data = (it.data ?? {}) as Record<string, unknown>
    out.push({
      provider_event_id: typeof data.eventId === 'string' ? data.eventId : null,
      imei: it.imei,
      type,
      occurred_at: it.timestamp,
      lat: toNumber(data.lat),
      lon: toNumber(data.lon),
      speed_mph: toNumber(data.speed),
      odometer_mi: toNumber(data.odometer),
      payload: data,
    })
  }
  return out
}
