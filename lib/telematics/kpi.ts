// lib/telematics/kpi.ts
// KPI loader for the Telematics dashboard.
//
// Returns the 4 numbers the Live Map header displays:
//   onlineCount / totalCount : devices online out of tenant total
//   unackedAlerts            : unacknowledged warning/critical telematics_events
//                              (info rows like trip_start/trip_end aren't alerts)
//   milesToday               : sum across devices of (max - min) odometer today
//   avgSpeedToday            : mean of today's position speeds, rounded, or null
//
// "Today" is New York midnight → now (the app's timezone, see APP_TZ). All
// queries are tenant-scoped so the caller
// can pass either an RLS-authenticated client (server page) or an admin
// client (server action / cron). Counts use HEAD + exact so we don't
// transfer row payloads.
import type { SupabaseClient } from '@supabase/supabase-js'
import { APP_TZ } from '@/lib/finance/revenue'

// PostgREST caps every response at 1000 rows. A busy day has thousands of
// positions, so never load "all of today" in one select — that silently
// returned a sample with almost no odometer readings (Miles today = 0).
const PAGE_SIZE = 1000
const MAX_SPEED_PAGES = 20

export interface TelematicsKpi {
  onlineCount: number
  totalCount: number
  unackedAlerts: number
  milesToday: number
  avgSpeedToday: number | null
}

export interface OdometerEndpoints {
  first: number | null
  last: number | null
}

/** Midnight today in the app timezone, as a UTC ISO string. */
export function startOfAppDayIso(now: Date = new Date(), tz: string = APP_TZ): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hourCycle: 'h23',
    })
      .formatToParts(now)
      .map((p) => [p.type, Number(p.value)]),
  )
  const wallAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
  const offsetMs = Math.round((wallAsUtc - now.getTime()) / 60_000) * 60_000
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day) - offsetMs).toISOString()
}

/** Miles driven = last − first odometer of the day, per device, summed. */
export function milesFromOdometerEndpoints(devices: readonly OdometerEndpoints[]): number {
  const miles = devices.reduce((sum, d) => {
    if (d.first == null || d.last == null) return sum
    return sum + Math.max(0, Number(d.last) - Number(d.first))
  }, 0)
  return Math.round(miles)
}

async function odometerEndpoints(
  sb: SupabaseClient,
  tenantId: string,
  deviceId: string,
  sinceIso: string,
): Promise<OdometerEndpoints> {
  const base = () =>
    sb
      .from('telematics_positions')
      .select('odometer_mi')
      .eq('tenant_id', tenantId)
      .eq('device_id', deviceId)
      .gte('recorded_at', sinceIso)
      .not('odometer_mi', 'is', null)
      .limit(1)
  const [{ data: first }, { data: last }] = await Promise.all([
    base().order('recorded_at', { ascending: true }),
    base().order('recorded_at', { ascending: false }),
  ])
  return {
    first: (first as { odometer_mi: number }[] | null)?.[0]?.odometer_mi ?? null,
    last: (last as { odometer_mi: number }[] | null)?.[0]?.odometer_mi ?? null,
  }
}

async function averageSpeedSince(sb: SupabaseClient, tenantId: string, sinceIso: string): Promise<number | null> {
  let sum = 0
  let count = 0
  for (let page = 0; page < MAX_SPEED_PAGES; page++) {
    const { data, error } = await sb
      .from('telematics_positions')
      .select('speed_mph')
      .eq('tenant_id', tenantId)
      .gte('recorded_at', sinceIso)
      .not('speed_mph', 'is', null)
      .order('recorded_at', { ascending: true })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)
    if (error) throw new Error(`load speeds: ${error.message}`)
    const rows = (data as { speed_mph: number }[] | null) ?? []
    for (const r of rows) {
      const v = Number(r.speed_mph)
      if (!Number.isNaN(v)) {
        sum += v
        count += 1
      }
    }
    if (rows.length < PAGE_SIZE) break
  }
  return count > 0 ? Math.round(sum / count) : null
}

export async function loadTelematicsKpi(
  sb: SupabaseClient,
  tenantId: string,
): Promise<TelematicsKpi> {
  const todayIso = startOfAppDayIso()

  const [
    { count: total },
    { count: online },
    { count: unacked },
    { data: devices },
  ] = await Promise.all([
    sb
      .from('telematics_devices')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId),
    sb
      .from('telematics_devices')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('online', true),
    sb
      .from('telematics_events')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .in('severity', ['warning', 'critical'])
      .is('acknowledged_at', null),
    sb.from('telematics_devices').select('id').eq('tenant_id', tenantId),
  ])

  const deviceIds = ((devices as { id: string }[] | null) ?? []).map((d) => d.id)
  const [endpoints, avgSpeedToday] = await Promise.all([
    Promise.all(deviceIds.map((id) => odometerEndpoints(sb, tenantId, id, todayIso))),
    averageSpeedSince(sb, tenantId, todayIso),
  ])

  return {
    totalCount: total ?? 0,
    onlineCount: online ?? 0,
    unackedAlerts: unacked ?? 0,
    milesToday: milesFromOdometerEndpoints(endpoints),
    avgSpeedToday,
  }
}
