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
    supabase.from('cars').select('id, make, model, model_full, mileage').eq('tenant_id', tenantId).order('make'),
  ])

  const rows = (services as CarService[]) ?? []
  const carRows = (cars as Car[]) ?? []
  const totalCost = rows.reduce((s, r) => s + (Number(r.cost) || 0), 0)
  const now = new Date()
  const in30Days = new Date(now); in30Days.setDate(now.getDate() + 30)
  const overdue = rows.filter(s => s.next_service_date && new Date(s.next_service_date) < now).length
  const upcoming = rows.filter(s => s.next_service_date && new Date(s.next_service_date) >= now && new Date(s.next_service_date) <= in30Days).length

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <PageHeader title="Maintenance" description="Service and repair records." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Service Records" value={rows.length} />
        <StatCard label="Total Cost" value={`$${totalCost.toLocaleString()}`} />
        <StatCard label="Overdue" value={overdue} sub={upcoming > 0 ? `${upcoming} due in 30 days` : undefined} />
        <StatCard label="Fleet Mileage" value={`${carRows.reduce((acc, car) => acc + (car.mileage || 0), 0).toLocaleString()} mi`} />
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
