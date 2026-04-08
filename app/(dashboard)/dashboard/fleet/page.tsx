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

  const rows = (cars as Car[]) ?? []
  const active = rows.filter((c) => c.status !== 'maintenance' && c.status !== 'retired').length
  const avgRate = rows.length > 0
    ? rows.reduce((s, c) => s + (Number(c.daily_rate) || 0), 0) / rows.length
    : 0

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader title="Fleet Management" description="Manage your vehicles, pricing, and availability." />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="Total Vehicles" value={rows.length} />
        <StatCard label="Active Fleet" value={active} />
        <StatCard label="Avg Rate/Day" value={`$${avgRate.toFixed(2)}`} />
      </div>

      <div className="glass border border-white/10 rounded-3xl p-6 md:p-8">
        <FleetManager initialCars={rows} />
      </div>
    </div>
  )
}
