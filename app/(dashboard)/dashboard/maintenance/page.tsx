import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import PageHeader from '@/components/dashboard/PageHeader'
import StatCard from '@/components/dashboard/StatCard'
import MaintenanceTable from './MaintenanceTable'
import MaintenanceAlerts from './MaintenanceAlerts'
import FleetMileagePanel from './FleetMileagePanel'
import type { CarService, Car } from '@/lib/supabase/types'

export default async function MaintenancePage() {
  const { supabase, tenantId } = await requireTenantId()

  const [{ data: services }, { data: cars }] = await Promise.all([
    supabase.from('car_services').select('*').eq('tenant_id', tenantId).order('service_date', { ascending: false }),
    supabase.from('cars').select('id, make, model, model_full, mileage, telematics_device_id').eq('tenant_id', tenantId).order('make'),
  ])

  const rows = (services as CarService[]) ?? []
  const carRows = (cars as Car[]) ?? []
  const totalCost = rows.reduce((s, r) => s + (Number(r.cost) || 0), 0)
  const now = new Date()
  const in30Days = new Date(now); in30Days.setDate(now.getDate() + 30)
  // Parse date-only strings as local midnight (avoids UTC off-by-one near boundaries)
  const parseLocal = (d: string) => new Date(d + 'T00:00:00')
  const upcoming = rows.filter(s => s.next_service_date && parseLocal(s.next_service_date) >= now && parseLocal(s.next_service_date) <= in30Days).length

  // "Overdue" counts VEHICLES that are past due by DATE or by MILEAGE, so the
  // headline agrees with the mileage-aware alerts below it (previously it only
  // counted date-overdue and silently ignored mileage-overdue cars).
  const soonestDueMileageByCar = new Map<number, number>()
  for (const s of rows) {
    if (s.car_id != null && s.next_service_mileage != null) {
      const prev = soonestDueMileageByCar.get(s.car_id)
      if (prev == null || s.next_service_mileage < prev) soonestDueMileageByCar.set(s.car_id, s.next_service_mileage)
    }
  }
  const carHasDateOverdue = new Set(
    rows.filter(s => s.car_id != null && s.next_service_date && parseLocal(s.next_service_date) < now).map(s => s.car_id as number)
  )
  const overdue = carRows.filter(c => {
    if (carHasDateOverdue.has(c.id)) return true
    const dueMi = soonestDueMileageByCar.get(c.id)
    return dueMi != null && (c.mileage ?? 0) >= dueMi
  }).length

  const trackedCars = carRows.filter(c => (c.mileage ?? 0) > 0)
  const avgMileage = trackedCars.length > 0
    ? Math.round(trackedCars.reduce((acc, car) => acc + (car.mileage || 0), 0) / trackedCars.length)
    : 0

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <PageHeader title="Maintenance" description="Service and repair records." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Service Records" value={rows.length} />
        <StatCard label="Total Cost" value={`$${totalCost.toLocaleString()}`} />
        <StatCard label="Overdue" value={overdue} sub={upcoming > 0 ? `${upcoming} due in 30 days` : 'by date or mileage'} />
        <StatCard label="Avg Mileage" value={`${avgMileage.toLocaleString()} mi`} sub={trackedCars.length > 0 ? `across ${trackedCars.length} vehicles` : undefined} />
      </div>

      <MaintenanceAlerts services={rows} cars={carRows} />

      {/* Fleet Mileage — overview of all vehicles with mileage tracking */}
      <FleetMileagePanel cars={carRows} services={rows} />

      {/* Maintenance Log — full service history */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-6 glass">
        <div className="mb-6">
          <h3 className="text-sm font-bold text-white tracking-wide">Maintenance Log</h3>
          <p className="text-[11px] text-white/40 mt-0.5">Complete service history — search to filter instantly</p>
        </div>
        <MaintenanceTable services={rows} cars={carRows} />
      </div>
    </div>
  )
}
