import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/dashboard/PageHeader'
import StatCard from '@/components/dashboard/StatCard'
import CarsTable from './CarsTable'
import EmptyState from '@/components/dashboard/EmptyState'
import type { Car } from '@/lib/supabase/types'

export default async function FleetPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user!.id)
    .single()

  const { data: cars } = await supabase
    .from('cars')
    .select('*')
    .eq('tenant_id', profile!.tenant_id)
    .order('id')

  const rows = (cars as Car[]) ?? []
  const active = rows.filter((c) => c.status !== 'retired').length
  const avgRate = rows.length > 0
    ? rows.reduce((s, c) => s + (Number(c.daily_rate) || 0), 0) / rows.length
    : 0

  return (
    <div className="max-w-6xl">
      <PageHeader title="Fleet" description="Manage your cars." />

      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="Total cars" value={rows.length} />
        <StatCard label="Active" value={active} />
        <StatCard label="Avg rate/day" value={`$${avgRate.toFixed(0)}`} />
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        {rows.length === 0 ? (
          <EmptyState message="No cars added yet." />
        ) : (
          <CarsTable cars={rows} />
        )}
      </div>
    </div>
  )
}
