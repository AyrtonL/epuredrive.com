import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/dashboard/PageHeader'
import EmptyState from '@/components/dashboard/EmptyState'
import type { Reservation, Car } from '@/lib/supabase/types'

export default async function ROIPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user!.id).single()
  const tenantId = profile!.tenant_id

  const [{ data: reservations }, { data: cars }] = await Promise.all([
    supabase.from('reservations').select('car_id, total_amount, status').eq('tenant_id', tenantId).eq('status', 'completed'),
    supabase.from('cars').select('id, make, model, model_full, daily_rate').eq('tenant_id', tenantId),
  ])

  const rows = (reservations as Reservation[]) ?? []
  const carRows = (cars as Car[]) ?? []

  const revenueMap: Record<number, number> = {}
  rows.forEach((r) => {
    if (r.car_id != null) {
      revenueMap[r.car_id] = (revenueMap[r.car_id] ?? 0) + (Number(r.total_amount) || 0)
    }
  })

  const sorted = [...carRows].sort((a, b) => (revenueMap[b.id] ?? 0) - (revenueMap[a.id] ?? 0))

  return (
    <div className="max-w-5xl">
      <PageHeader title="ROI" description="Revenue per car (completed bookings)." />
      {sorted.length === 0 ? (
        <EmptyState message="No cars or completed bookings yet." />
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-white/40 border-b border-white/10">
                <th className="px-6 py-4 font-medium">Car</th>
                <th className="px-6 py-4 font-medium">Bookings</th>
                <th className="px-6 py-4 font-medium">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sorted.map((c) => {
                const bookings = rows.filter((r) => r.car_id === c.id).length
                const revenue = revenueMap[c.id] ?? 0
                return (
                  <tr key={c.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 text-white font-medium">{c.make} {c.model_full || c.model}</td>
                    <td className="px-6 py-4 text-white/60">{bookings}</td>
                    <td className="px-6 py-4 text-white font-bold">${revenue.toFixed(0)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
