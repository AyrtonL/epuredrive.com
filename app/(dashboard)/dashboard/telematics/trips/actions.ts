'use server'

// app/(dashboard)/dashboard/telematics/trips/actions.ts
// Server actions for the Trips page:
//   - getTripPositionsAction : returns the ordered (lat,lon,recorded_at)
//     position points for a single trip, scoped to the caller's tenant.
//     Used by <TripDetailModal /> to render the polyline on a mini-map.
//
// Security:
//   - requireTenantId (session → tenant_id)
//   - isFeatureEnabled (defense-in-depth; RLS would also block)
//   - Zod-validated trip_id
//   - Tenant-scoped query: we fetch the trip row first to pin the window +
//     device_id, then read positions strictly by tenant + device + window.
//     (telematics_positions has SELECT RLS scoped to tenant, but we still
//     filter explicitly so a leaked/mistaken bypass cannot exfiltrate.)

import { z } from 'zod'
import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { isFeatureEnabled } from '@/lib/supabase/feature-flags'

const BOUNCIE_FLAG = 'bouncie_telematics'
const MAX_POINTS = 2000 // cap row payload for the modal polyline

export interface TripPositionPoint {
  lat: number
  lon: number
  recorded_at: string
  speed_mph: number | null
}

export interface TripPositionsResult {
  ok: boolean
  error: string | null
  points: TripPositionPoint[]
}

interface TripRow {
  id: string
  tenant_id: string
  device_id: string
  started_at: string
  ended_at: string | null
}

interface PositionRow {
  lat: number | null
  lon: number | null
  recorded_at: string
  speed_mph: number | null
}

export async function getTripPositionsAction(
  tripId: unknown,
): Promise<TripPositionsResult> {
  const parsed = z.string().uuid().safeParse(tripId)
  if (!parsed.success) {
    return { ok: false, error: 'Invalid trip id.', points: [] }
  }

  const { tenantId } = await requireTenantId()

  const enabled = await isFeatureEnabled(tenantId, BOUNCIE_FLAG)
  if (!enabled) {
    return {
      ok: false,
      error: 'Bouncie telematics is not enabled for this workspace.',
      points: [],
    }
  }

  const admin = createAdminClient()

  const { data: trip, error: tripErr } = await admin
    .from('telematics_trips')
    .select('id, tenant_id, device_id, started_at, ended_at')
    .eq('id', parsed.data)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (tripErr || !trip) {
    return { ok: false, error: 'Trip not found.', points: [] }
  }
  const tripRow = trip as TripRow

  const endedAt = tripRow.ended_at ?? new Date().toISOString()

  const { data: positions, error: posErr } = await admin
    .from('telematics_positions')
    .select('lat, lon, recorded_at, speed_mph')
    .eq('tenant_id', tenantId)
    .eq('device_id', tripRow.device_id)
    .gte('recorded_at', tripRow.started_at)
    .lte('recorded_at', endedAt)
    .order('recorded_at', { ascending: true })
    .limit(MAX_POINTS)

  if (posErr) {
    return { ok: false, error: 'Could not load trip route.', points: [] }
  }

  const rows = (positions as PositionRow[] | null) ?? []
  const points: TripPositionPoint[] = rows
    .filter((r): r is PositionRow & { lat: number; lon: number } =>
      r.lat !== null && r.lon !== null,
    )
    .map((r) => ({
      lat: r.lat,
      lon: r.lon,
      recorded_at: r.recorded_at,
      speed_mph: r.speed_mph,
    }))

  return { ok: true, error: null, points }
}
