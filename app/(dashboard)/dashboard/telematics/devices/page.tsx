// app/(dashboard)/dashboard/telematics/devices/page.tsx
// Devices management — §6.6 of the telematics design spec.
// - List Bouncie devices for the tenant
// - Link / unlink each to a car via a dropdown (server action)
// - Surface auto-link suggestions when a device's VIN matches a car's VIN
// - Tabs: All / Linked / Unlinked
// - "Refresh from Bouncie" button triggers a pull-sync server-side
import Link from 'next/link'
import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import PageHeader from '@/components/dashboard/PageHeader'
import DeviceRow, { type DeviceRowData } from '@/components/telematics/DeviceRow'
import DevicesToolbar, { type DeviceFilter } from '@/components/telematics/DevicesToolbar'
import type { CarOption } from '@/components/telematics/LinkCarDropdown'

interface DeviceRaw {
  id: string
  imei: string
  vin: string | null
  nickname: string | null
  online: boolean
  battery_voltage: number | null
  last_seen_at: string | null
  car_id: number | null
}

interface CarRaw {
  id: number
  make: string | null
  model: string | null
  plate: string | null
  vin: string | null
  telematics_device_id: string | null
}

interface Props {
  searchParams: { filter?: string }
}

function parseFilter(raw: string | undefined): DeviceFilter {
  if (raw === 'linked' || raw === 'unlinked') return raw
  return 'all'
}

function carLabel(car: CarRaw): string {
  const name = [car.make, car.model].filter(Boolean).join(' ') || `Car ${car.id}`
  return car.plate ? `${name} (${car.plate})` : name
}

export const dynamic = 'force-dynamic'

export default async function TelematicsDevicesPage({ searchParams }: Props) {
  const { supabase, tenantId } = await requireTenantId()
  const filter = parseFilter(searchParams?.filter)

  const [{ data: devices }, { data: cars }] = await Promise.all([
    supabase
      .from('telematics_devices')
      .select('id, imei, vin, nickname, online, battery_voltage, last_seen_at, car_id')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false }),
    supabase
      .from('cars')
      .select('id, make, model, plate, vin, telematics_device_id')
      .eq('tenant_id', tenantId)
      .order('id'),
  ])

  const allDevices = (devices as DeviceRaw[] | null) ?? []
  const allCars = (cars as CarRaw[] | null) ?? []

  const filteredDevices = allDevices.filter((d) => {
    if (filter === 'linked') return d.car_id !== null
    if (filter === 'unlinked') return d.car_id === null
    return true
  })

  const totalCount = allDevices.length
  const linkedCount = allDevices.filter((d) => d.car_id !== null).length

  const carOptions: CarOption[] = allCars.map((c) => ({ id: c.id, label: carLabel(c) }))

  // Auto-link suggestions: unlinked device whose VIN matches an unlinked car.
  const carsByVin = new Map<string, CarRaw>()
  for (const c of allCars) {
    if (c.vin && !c.telematics_device_id) carsByVin.set(c.vin.toUpperCase(), c)
  }
  const suggestions = allDevices
    .filter((d) => d.car_id === null && d.vin)
    .map((d) => {
      const match = d.vin ? carsByVin.get(d.vin.toUpperCase()) : undefined
      return match ? { device: d, car: match } : null
    })
    .filter((s): s is { device: DeviceRaw; car: CarRaw } => s !== null)

  const subtitle =
    totalCount === 0
      ? 'No devices yet'
      : `${totalCount} total · ${linkedCount} linked to cars`

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader title="Devices" description={subtitle} />

      <DevicesToolbar current={filter} />

      {suggestions.length > 0 && (
        <AutoLinkBanner suggestions={suggestions} />
      )}

      {totalCount === 0 ? (
        <EmptyState />
      ) : (
        <div className="glass border border-white/[0.06] rounded-3xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-white/[0.03] text-[10px] font-bold uppercase tracking-widest text-white/40">
              <tr>
                <th className="text-left py-3 px-4 font-bold">Device</th>
                <th className="text-left py-3 px-4 font-bold">Status</th>
                <th className="text-left py-3 px-4 font-bold">Linked car</th>
                <th className="text-left py-3 px-4 font-bold">VIN</th>
              </tr>
            </thead>
            <tbody>
              {filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-white/40 text-sm">
                    No devices match this filter.
                  </td>
                </tr>
              ) : (
                filteredDevices.map((d) => (
                  <DeviceRow
                    key={d.id}
                    device={d as DeviceRowData}
                    cars={carOptions}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function AutoLinkBanner({
  suggestions,
}: {
  suggestions: { device: DeviceRaw; car: CarRaw }[]
}) {
  return (
    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-4">
      <div className="text-emerald-200 text-sm font-bold mb-1">
        Auto-link suggestions
      </div>
      <div className="text-emerald-100/80 text-xs mb-3">
        These devices share a VIN with a car in your fleet. Use the dropdown in the
        table below to confirm the link.
      </div>
      <ul className="text-xs text-emerald-100/90 space-y-1">
        {suggestions.map((s) => (
          <li key={s.device.id}>
            <span className="font-mono text-emerald-200">{s.device.vin}</span>{' '}
            &rarr; {carLabel(s.car)}
          </li>
        ))}
      </ul>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="glass border border-white/[0.06] rounded-3xl p-12 text-center">
      <h3 className="text-white font-bold text-lg mb-2">No devices yet</h3>
      <p className="text-white/40 text-sm max-w-md mx-auto">
        Connect your Bouncie account and install devices to see them here.
      </p>
      <Link
        href="/dashboard/integrations/bouncie"
        className="inline-block mt-6 bg-white text-black hover:bg-white/90 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors"
      >
        Connect Bouncie
      </Link>
    </div>
  )
}
