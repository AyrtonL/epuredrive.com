// app/api/telematics/live/route.ts
// Lightweight polling endpoint used by the Live Map. Returns only the fields
// the map needs (id, plate, coords, last_seen_at, status) to keep the payload
// small — we poll every 15s from every open Live Map tab.
//
// Defense-in-depth:
//   1. Require auth (createClient() → getUser).
//   2. Require a tenant (never trust a query param).
//   3. Require the bouncie_telematics feature flag (matches the dashboard
//      layout gate; the API would still be usable without this check but
//      belt-and-suspenders is cheap).
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isFeatureEnabled } from '@/lib/supabase/feature-flags'
import { computeVehicleStatus, type MapVehicle } from '@/components/telematics/types'

interface CarRow {
  id: number
  plate: string | null
  make: string | null
  model: string | null
  last_lat: number | null
  last_lon: number | null
  last_seen_at: string | null
  telematics_device_id: string | null
}

interface DeviceRow {
  id: string
  online: boolean
}

export async function GET(): Promise<NextResponse> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()
  const tenantId = profile?.tenant_id as string | undefined
  if (!tenantId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const enabled = await isFeatureEnabled(tenantId, 'bouncie_telematics')
  if (!enabled) {
    return NextResponse.json({ error: 'Feature not enabled' }, { status: 403 })
  }

  const { data: cars } = await supabase
    .from('cars')
    .select('id, plate, make, model, last_lat, last_lon, last_seen_at, telematics_device_id')
    .eq('tenant_id', tenantId)
    .not('telematics_device_id', 'is', null)

  const carRows = (cars as CarRow[] | null) ?? []

  // We need online flag per device to compute status. One batch query.
  const deviceIds = Array.from(
    new Set(carRows.map((c) => c.telematics_device_id).filter((v): v is string => !!v)),
  )
  let onlineById = new Map<string, boolean>()
  if (deviceIds.length > 0) {
    const { data: devices } = await supabase
      .from('telematics_devices')
      .select('id, online')
      .eq('tenant_id', tenantId)
      .in('id', deviceIds)
    for (const d of (devices as DeviceRow[] | null) ?? []) {
      onlineById.set(d.id, d.online)
    }
  }

  const vehicles: MapVehicle[] = carRows.map((c) => ({
    id: c.id,
    plate: c.plate,
    make: c.make,
    model: c.model,
    lat: c.last_lat,
    lon: c.last_lon,
    last_seen_at: c.last_seen_at,
    status: computeVehicleStatus(
      c.last_seen_at,
      null, // speed_mph not in cars; derived from last_seen_at freshness only
      c.telematics_device_id ? (onlineById.get(c.telematics_device_id) ?? null) : null,
    ),
  }))

  return NextResponse.json({ vehicles })
}
