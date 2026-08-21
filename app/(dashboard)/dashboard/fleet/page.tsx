import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import PageHeader from '@/components/dashboard/PageHeader'
import StatCard from '@/components/dashboard/StatCard'
import FleetManager from './FleetManager'
import type { Car } from '@/lib/supabase/types'

export default async function FleetPage() {
  const { supabase, tenantId } = await requireTenantId()

  const { data: cars } = await supabase
    .from('cars')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('id')

  const { data: consignedCars } = await supabase
    .from('consignments')
    .select('car_id')
    .eq('tenant_id', tenantId)

  const consignedCarIds = new Set(
    (consignedCars ?? []).map((c) => c.car_id).filter((id): id is number => id != null)
  )

  // Owned vehicles first, consignment vehicles after (stable sort keeps id order within each group)
  const rows = [...((cars as Car[]) ?? [])].sort((a, b) => {
    const aConsigned = consignedCarIds.has(a.id) ? 1 : 0
    const bConsigned = consignedCarIds.has(b.id) ? 1 : 0
    return aConsigned - bConsigned
  })
  const active = rows.filter((c) => c.status === 'active' || c.status === 'available').length
  const maintenance = rows.filter((c) => c.status === 'maintenance').length
  const retired = rows.filter((c) => c.status === 'retired' || c.status === 'inactive').length

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader title="Fleet Management" description="Manage your vehicles, pricing, and availability." />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard label="Total Vehicles" value={rows.length} />
        <StatCard label="Active Fleet" value={active} sub="available or rented" />
        <StatCard label="In Maintenance" value={maintenance} />
        <StatCard label="Retired / Inactive" value={retired} />
      </div>

      <div className="glass border border-white/10 rounded-3xl p-6 md:p-8">
        <FleetManager initialCars={rows} consignedCarIds={Array.from(consignedCarIds)} />
      </div>
    </div>
  )
}
