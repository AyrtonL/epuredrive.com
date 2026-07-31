// lib/telematics/bouncie/webhook-parser.ts
// Translates a raw Bouncie webhook payload into neutral ProviderEvent[].
//
// Each Bouncie webhook delivery is a single flat JSON object (not an array,
// not a generic { eventType, imei, timestamp, data } envelope) — see the
// `webhooks` section of https://docs.bouncie.dev/openapi.json. A `tripData`
// delivery is the one exception: it carries an array of GPS/speed samples,
// which we fan out into one location_update ProviderEvent per sample.
//
// Unknown event types / malformed bodies are dropped (not thrown) so a
// Bouncie API addition never breaks the whole batch.

import type { ProviderEvent, ProviderEventType } from '../types'
import type { BouncieWebhookEvent } from './types'

function toNumber(v: unknown): number | null {
  return typeof v === 'number' && !Number.isNaN(v) ? v : null
}

export function parseBouncieWebhook(rawBody: string): ProviderEvent[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(rawBody)
  } catch {
    return []
  }

  // Bouncie sends one object per delivery, but tolerate an array wrapper
  // defensively (harmless if it never happens in practice).
  const items: unknown[] = Array.isArray(parsed) ? parsed : [parsed]
  const out: ProviderEvent[] = []

  for (const item of items) {
    out.push(...parseOne(item))
  }
  return out
}

function parseOne(item: unknown): ProviderEvent[] {
  if (!item || typeof item !== 'object') return []
  const body = item as Partial<BouncieWebhookEvent> & { eventType?: unknown; imei?: unknown }
  if (typeof body.eventType !== 'string' || typeof body.imei !== 'string') return []
  const imei = body.imei

  switch (body.eventType) {
    case 'connect': {
      const d = (body as { connect?: Record<string, unknown> }).connect
      if (!d || typeof d.timestamp !== 'string') return []
      return [
        event(imei, 'online', d.timestamp, {
          lat: toNumber(d.latitude),
          lon: toNumber(d.longitude),
        }),
      ]
    }

    case 'disconnect': {
      const d = (body as { disconnect?: Record<string, unknown> }).disconnect
      if (!d || typeof d.timestamp !== 'string') return []
      return [
        event(imei, 'offline', d.timestamp, {
          lat: toNumber(d.latitude),
          lon: toNumber(d.longitude),
        }),
      ]
    }

    case 'battery': {
      const d = (body as { battery?: Record<string, unknown> }).battery
      if (!d || typeof d.timestamp !== 'string') return []
      // Bouncie fires this on every battery reading, not just transitions —
      // only surface it as an alert when it's actually degraded.
      if (d.value === 'normal') return []
      return [event(imei, 'battery_low', d.timestamp, {}, { value: d.value })]
    }

    case 'mil': {
      const d = (body as { mil?: Record<string, unknown> }).mil
      if (!d || typeof d.timestamp !== 'string') return []
      return [event(imei, 'dtc_new', d.timestamp, {}, { code: d.codes })]
    }

    case 'vinChange': {
      const d = (body as { vinChange?: Record<string, unknown> }).vinChange
      if (!d || typeof d.timestamp !== 'string') return []
      return [
        event(imei, 'vin_changed', d.timestamp, {}, {
          oldVin: d.oldVin ?? null,
          newVin: d.newVin ?? null,
        }),
      ]
    }

    case 'tripStart': {
      const d = (body as { start?: Record<string, unknown> }).start
      const transactionId = (body as { transactionId?: unknown }).transactionId
      if (!d || typeof d.timestamp !== 'string' || typeof transactionId !== 'string') return []
      return [
        event(imei, 'trip_start', d.timestamp, { odometer_mi: toNumber(d.odometer) }, {
          transactionId,
        }),
      ]
    }

    case 'tripData': {
      const transactionId = (body as { transactionId?: unknown }).transactionId
      const points = (body as { data?: unknown }).data
      if (typeof transactionId !== 'string' || !Array.isArray(points)) return []
      const out: ProviderEvent[] = []
      for (const p of points) {
        if (!p || typeof p !== 'object') continue
        const point = p as Record<string, unknown>
        if (typeof point.timestamp !== 'string') continue
        const gps = point.gps as Record<string, unknown> | undefined
        out.push(
          event(imei, 'location_update', point.timestamp, {
            lat: toNumber(gps?.lat),
            lon: toNumber(gps?.lon),
            speed_mph: toNumber(point.speed),
          }, {
            transactionId,
            heading: toNumber(gps?.heading),
            fuelLevelInput: toNumber(point.fuelLevelInput),
          }),
        )
      }
      return out
    }

    case 'tripMetrics': {
      const d = (body as { metrics?: Record<string, unknown> }).metrics
      const transactionId = (body as { transactionId?: unknown }).transactionId
      if (!d || typeof d.timestamp !== 'string' || typeof transactionId !== 'string') return []
      return [
        event(imei, 'trip_metrics', d.timestamp, {}, {
          transactionId,
          tripTime: toNumber(d.tripTime),
          tripDistance: toNumber(d.tripDistance),
          totalIdlingTime: toNumber(d.totalIdlingTime),
          maxSpeed: toNumber(d.maxSpeed),
          averageDriveSpeed: toNumber(d.averageDriveSpeed),
          hardBrakingCounts: toNumber(d.hardBrakingCounts),
          hardAccelerationCounts: toNumber(d.hardAccelerationCounts),
        }),
      ]
    }

    case 'tripEnd': {
      const d = (body as { end?: Record<string, unknown> }).end
      const transactionId = (body as { transactionId?: unknown }).transactionId
      if (!d || typeof d.timestamp !== 'string' || typeof transactionId !== 'string') return []
      return [
        event(imei, 'trip_end', d.timestamp, { odometer_mi: toNumber(d.odometer) }, {
          transactionId,
          fuelConsumed: toNumber(d.fuelConsumed),
        }),
      ]
    }

    case 'applicationGeozone':
    case 'userGeozone': {
      const d = (body as { geozone?: Record<string, unknown> }).geozone
      if (!d || typeof d.timestamp !== 'string') return []
      const type = d.event === 'EXIT' ? 'geofence_exit' : 'geofence_enter'
      const loc = d.location as Record<string, unknown> | undefined
      return [
        event(imei, type, d.timestamp, {
          lat: toNumber(loc?.lat),
          lon: toNumber(loc?.lon),
        }, {
          geofence_id: d.id,
          geofence_name: d.name,
        }),
      ]
    }

    default:
      return []
  }
}

function event(
  imei: string,
  type: ProviderEventType,
  occurred_at: string,
  fields: { lat?: number | null; lon?: number | null; speed_mph?: number | null; odometer_mi?: number | null },
  payload: Record<string, unknown> = {},
): ProviderEvent {
  return {
    provider_event_id: null,
    imei,
    type,
    occurred_at,
    lat: fields.lat ?? null,
    lon: fields.lon ?? null,
    speed_mph: fields.speed_mph ?? null,
    odometer_mi: fields.odometer_mi ?? null,
    payload,
  }
}
