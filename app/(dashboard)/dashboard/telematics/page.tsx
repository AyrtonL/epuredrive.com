// app/(dashboard)/dashboard/telematics/page.tsx
// Live Map — §6.2 of the telematics design spec.
// Loads server-side:
//   - All tenant cars linked to a telematics device (plate, coords, last_seen_at)
//   - Online flags from telematics_devices (for status coloring)
//   - Aggregate KPIs via loadTelematicsKpi()
// Hands data to <LiveMapClient /> which owns the 15s polling loop.
import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import PageHeader from '@/components/dashboard/PageHeader'
import KpiRow from '@/components/telematics/KpiRow'
import LiveMapClient from '@/components/telematics/LiveMapClient'
import { loadTelematicsKpi } from '@/lib/telematics/kpi'
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

export const dynamic = 'force-dynamic'

export default async function TelematicsLiveMapPage() {
  const { supabase, tenantId } = await requireTenantId()

  const [kpi, { data: cars }] = await Promise.all([
    loadTelematicsKpi(supabase, tenantId),
    supabase
      .from('cars')
      .select('id, plate, make, model, last_lat, last_lon, last_seen_at, telematics_device_id')
      .eq('tenant_id', tenantId)
      .not('telematics_device_id', 'is', null),
  ])

  const carRows = (cars as CarRow[] | null) ?? []

  const deviceIds = Array.from(
    new Set(carRows.map((c) => c.telematics_device_id).filter((v): v is string => !!v)),
  )
  const onlineById = new Map<string, boolean>()
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

  const initialVehicles: MapVehicle[] = carRows.map((c) => ({
    id: c.id,
    plate: c.plate,
    make: c.make,
    model: c.model,
    lat: c.last_lat,
    lon: c.last_lon,
    last_seen_at: c.last_seen_at,
    status: computeVehicleStatus(
      c.last_seen_at,
      null,
      c.telematics_device_id ? (onlineById.get(c.telematics_device_id) ?? null) : null,
    ),
  }))

  const subtitle =
    kpi.totalCount === 0
      ? 'No telematics devices connected yet'
      : `${kpi.onlineCount} of ${kpi.totalCount} vehicles online`

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader title="Live Map" description={subtitle} />

      <KpiRow kpi={kpi} />

      {initialVehicles.length === 0 ? (
        <EmptyState />
      ) : (
        <LiveMapClient initialVehicles={initialVehicles} />
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="glass border border-white/[0.06] rounded-3xl p-12 text-center">
      <h3 className="text-white font-bold text-lg mb-2">No tracked vehicles yet</h3>
      <p className="text-white/40 text-sm max-w-md mx-auto">
        Link a Bouncie device to one of your cars to start tracking it on the map.
      </p>
      <a
        href="/dashboard/telematics/devices"
        className="inline-block mt-6 bg-white text-black hover:bg-white/90 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors"
      >
        Go to Devices
      </a>
    </div>
  )
}
