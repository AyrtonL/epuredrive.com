// lib/telematics/kpi.ts
// KPI loader for the Telematics dashboard.
//
// Returns the 4 numbers the Live Map header displays:
//   onlineCount / totalCount : devices online out of tenant total
//   unackedAlerts            : telematics_events rows with acknowledged_at is null
//   milesToday               : sum across devices of (max - min) odometer today
//   avgSpeedToday            : mean of today's position speeds, rounded, or null
//
// "Today" is UTC midnight → now. All queries are tenant-scoped so the caller
// can pass either an RLS-authenticated client (server page) or an admin
// client (server action / cron). Counts use HEAD + exact so we don't
// transfer row payloads.
import type { SupabaseClient } from '@supabase/supabase-js'

export interface TelematicsKpi {
  onlineCount: number
  totalCount: number
  unackedAlerts: number
  milesToday: number
  avgSpeedToday: number | null
}

interface PositionSlice {
  device_id: string
  speed_mph: number | null
  odometer_mi: number | null
}

function startOfTodayIso(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function computeMilesToday(positions: PositionSlice[]): number {
  // Per-device min/max odometer; sum (max-min). Ignores rows with null odometer.
  const perDevice = new Map<string, { min: number; max: number }>()
  for (const p of positions) {
    if (p.odometer_mi === null || p.odometer_mi === undefined) continue
    const cur = perDevice.get(p.device_id)
    if (!cur) {
      perDevice.set(p.device_id, { min: p.odometer_mi, max: p.odometer_mi })
    } else {
      perDevice.set(p.device_id, {
        min: Math.min(cur.min, p.odometer_mi),
        max: Math.max(cur.max, p.odometer_mi),
      })
    }
  }
  let miles = 0
  perDevice.forEach((v) => {
    miles += v.max - v.min
  })
  return Math.round(miles)
}

function computeAvgSpeed(positions: PositionSlice[]): number | null {
  const speeds = positions
    .map((p) => p.speed_mph)
    .filter((v): v is number => typeof v === 'number' && !Number.isNaN(v))
  if (speeds.length === 0) return null
  const sum = speeds.reduce((a, b) => a + b, 0)
  return Math.round(sum / speeds.length)
}

export async function loadTelematicsKpi(
  sb: SupabaseClient,
  tenantId: string,
): Promise<TelematicsKpi> {
  const todayIso = startOfTodayIso()

  const [
    { count: total },
    { count: online },
    { count: unacked },
    { data: positionsToday },
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
      .is('acknowledged_at', null),
    sb
      .from('telematics_positions')
      .select('device_id, speed_mph, odometer_mi')
      .eq('tenant_id', tenantId)
      .gte('recorded_at', todayIso),
  ])

  const slices = (positionsToday as PositionSlice[] | null) ?? []

  return {
    totalCount: total ?? 0,
    onlineCount: online ?? 0,
    unackedAlerts: unacked ?? 0,
    milesToday: computeMilesToday(slices),
    avgSpeedToday: computeAvgSpeed(slices),
  }
}
