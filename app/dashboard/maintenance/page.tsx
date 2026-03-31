import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/dashboard/PageHeader'
import StatCard from '@/components/dashboard/StatCard'
import MaintenanceTable from './MaintenanceTable'
import type { CarService, Car } from '@/lib/supabase/types'

export default async function MaintenancePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user!.id).single()
  const tenantId = profile!.tenant_id

  const [{ data: services }, { data: cars }] = await Promise.all([
    supabase.from('car_services').select('*').eq('tenant_id', tenantId).order('service_date', { ascending: false }),
    supabase.from('cars').select('id, make, model, model_full').eq('tenant_id', tenantId),
  ])

  const rows = (services as CarService[]) ?? []
  const carRows = (cars as Car[]) ?? []
  const totalCost = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0)

  return (
    <div className="max-w-6xl">
      <PageHeader title="Maintenance" description="Service and repair records." />
      <div className="grid grid-cols-2 gap-4 mb-8">
        <StatCard label="Total records" value={rows.length} />
        <StatCard label="Total cost" value={`$${totalCost.toFixed(0)}`} />
      </div>
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <MaintenanceTable services={rows} cars={carRows} />
      </div>
    </div>
  )
}
