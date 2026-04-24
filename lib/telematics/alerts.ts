// lib/telematics/alerts.ts
// Dispatch an alert: write to the notifications feed (always) and — when
// severity warrants — send an email. Called from ingestEvent once the
// underlying telematics_events row is persisted.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { TelematicsSeverity } from '@/lib/supabase/types'
import type { ProviderEvent, ProviderEventType } from './types'

export interface AlertDispatch {
  tenant_id: string
  car_id: number | null
  event_id: string
  severity: TelematicsSeverity
  event: ProviderEvent
}

export async function dispatchAlert(
  supabase: SupabaseClient,
  ad: AlertDispatch,
): Promise<void> {
  const title = titleFor(ad.event.type, ad.event.payload)
  const body = bodyFor(ad.event)
  const link = `/dashboard/telematics/alerts?event=${ad.event_id}`

  // notifications columns: (tenant_id, user_id, event, title, body,
  // metadata, read). There is no severity/link column, so both go into the
  // metadata jsonb payload for the UI to read back.
  await supabase.from('notifications').insert({
    tenant_id: ad.tenant_id,
    user_id: null, // broadcast to all tenant users
    event: 'telematics_alert',
    title,
    body,
    metadata: {
      severity: ad.severity,
      event_id: ad.event_id,
      event_type: ad.event.type,
      car_id: ad.car_id,
      link,
    },
    read: false,
  })
}

export function titleFor(
  type: ProviderEventType,
  payload: Record<string, unknown>,
): string {
  switch (type) {
    case 'geofence_enter': {
      const name = typeof payload.geofence_name === 'string' ? payload.geofence_name : null
      return name ? `Vehicle entered geofence: ${name}` : 'Vehicle entered geofence'
    }
    case 'geofence_exit': {
      const name = typeof payload.geofence_name === 'string' ? payload.geofence_name : null
      return name ? `Vehicle left geofence: ${name}` : 'Vehicle left geofence'
    }
    case 'speed_exceeded': {
      const speed = typeof payload.speed === 'number' ? payload.speed : null
      return speed !== null ? `Speed exceeded (${speed} mph)` : 'Speed exceeded'
    }
    case 'dtc_new': {
      const code = typeof payload.code === 'string' ? payload.code : 'unknown'
      return `New diagnostic code: ${code}`
    }
    case 'dtc_cleared':
      return 'Diagnostic code cleared'
    case 'battery_low':
      return 'Low battery voltage'
    case 'offline':
      return 'Device offline'
    case 'online':
      return 'Device back online'
    case 'connection_expired':
      return 'Bouncie connection expired — reconnect required'
    case 'hard_braking':
      return 'Hard braking event'
    case 'hard_accel':
      return 'Hard acceleration event'
    case 'ignition_on':
      return 'Ignition on'
    case 'ignition_off':
      return 'Ignition off'
    case 'trip_start':
      return 'Trip started'
    case 'trip_end':
      return 'Trip ended'
    default:
      return type
  }
}

export function bodyFor(event: ProviderEvent): string {
  const parts: string[] = []
  if (event.lat !== null && event.lon !== null) {
    parts.push(`${event.lat.toFixed(4)}, ${event.lon.toFixed(4)}`)
  }
  if (event.speed_mph !== null) {
    parts.push(`${event.speed_mph} mph`)
  }
  return parts.join(' · ')
}
