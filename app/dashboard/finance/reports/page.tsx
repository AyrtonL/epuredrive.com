import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/dashboard/PageHeader'
import StatCard from '@/components/dashboard/StatCard'
import EmptyState from '@/components/dashboard/EmptyState'
import type { Reservation } from '@/lib/supabase/types'

export default async function ReportsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user!.id).single()

  const { data: reservations } = await supabase
    .from('reservations')
    .select('pickup_date, total_amount, status')
    .eq('tenant_id', profile!.tenant_id)
    .not('total_amount', 'is', null)
    .order('pickup_date', { ascending: false })

  const rows = (reservations as Reservation[]) ?? []

  const totalRevenue = rows
    .filter((r) => r.status === 'completed')
    .reduce((s, r) => s + (Number(r.total_amount) || 0), 0)

  const byMonth: Record<string, number> = {}
  rows
    .filter((r) => r.status === 'completed' && r.pickup_date)
    .forEach((r) => {
      const month = r.pickup_date!.slice(0, 7)
      byMonth[month] = (byMonth[month] ?? 0) + (Number(r.total_amount) || 0)
    })

  const months = Object.entries(byMonth).sort(([a], [b]) => b.localeCompare(a)).slice(0, 6)

  return (
    <div className="max-w-5xl">
      <PageHeader title="Reports" description="Revenue overview." />
      <div className="grid grid-cols-2 gap-4 mb-8">
        <StatCard label="Total revenue (completed)" value={`$${totalRevenue.toFixed(0)}`} />
        <StatCard label="Completed bookings" value={rows.filter((r) => r.status === 'completed').length} />
      </div>
      {months.length === 0 ? (
        <EmptyState message="No completed reservations yet." />
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-white/60 mb-4 uppercase tracking-wider">Revenue by month</h2>
          <div className="space-y-3">
            {months.map(([month, amount]) => {
              const pct = totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0
              return (
                <div key={month}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white/70">{new Date(month + '-01').toLocaleDateString('en', { month: 'long', year: 'numeric' })}</span>
                    <span className="text-white font-medium">${amount.toFixed(0)}</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-white/40 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
