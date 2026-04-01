import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/dashboard/PageHeader'
import StatCard from '@/components/dashboard/StatCard'
import type { Reservation, Car, CarService, Consignment } from '@/lib/supabase/types'

export default async function ROIPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user!.id).single()
  const tenantId = profile!.tenant_id

  const [{ data: reservations }, { data: cars }, { data: services }, { data: consignments }] = await Promise.all([
    supabase.from('reservations').select('car_id, total_amount, status').eq('tenant_id', tenantId).eq('status', 'completed'),
    supabase.from('cars').select('id, make, model, model_full, daily_rate').eq('tenant_id', tenantId),
    supabase.from('car_services').select('car_id, amount').eq('tenant_id', tenantId),
    supabase.from('consignments').select('car_id, owner_percentage, owner_name').eq('tenant_id', tenantId)
  ])

  const rows = (reservations as Reservation[]) ?? []
  const carRows = (cars as Car[]) ?? []
  const serviceRows = (services as CarService[]) ?? []
  const consignmentRows = (consignments as Consignment[]) ?? []

  const revenueMap: Record<number, number> = {}
  const maintenanceMap: Record<number, number> = {}

  rows.forEach((r) => {
    if (r.car_id != null) {
      revenueMap[r.car_id] = (revenueMap[r.car_id] ?? 0) + (Number(r.total_amount) || 0)
    }
  })

  serviceRows.forEach((s) => {
    if (s.car_id != null) {
      maintenanceMap[s.car_id] = (maintenanceMap[s.car_id] ?? 0) + (Number(s.amount) || 0)
    }
  })

  const sorted = [...carRows].sort((a, b) => {
    const aRev = (revenueMap[a.id] ?? 0) - (maintenanceMap[a.id] ?? 0)
    const bRev = (revenueMap[b.id] ?? 0) - (maintenanceMap[b.id] ?? 0)
    return bRev - aRev
  })

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader title="Return on Investment" description="Revenue vs Maintenance & Owner Splits per vehicle." />
      
      {sorted.length === 0 ? (
        <div className="text-white/30 text-sm py-12 text-center bg-white/5 rounded-2xl border border-white/5">
          No fleet data or completed bookings found.
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden glass">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-bold uppercase tracking-widest text-white/40 border-b border-white/10 bg-black/20">
                <th className="px-6 py-4">Vehicle</th>
                <th className="px-6 py-4">Completed Bookings</th>
                <th className="px-6 py-4">Gross Revenue</th>
                <th className="px-6 py-4">Maintenance</th>
                <th className="px-6 py-4">Consignment Split</th>
                <th className="px-6 py-4 text-emerald-400 font-bold">Net Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sorted.map((c) => {
                const bookings = rows.filter((r) => r.car_id === c.id).length
                const gross = revenueMap[c.id] ?? 0
                const maint = maintenanceMap[c.id] ?? 0
                
                const consignment = consignmentRows.find(con => con.car_id === c.id)
                let ownerPayout = 0
                
                if (consignment?.owner_percentage) {
                  ownerPayout = gross * (consignment.owner_percentage / 100)
                }

                const netProfit = gross - maint - ownerPayout

                return (
                  <tr key={c.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4 text-white font-medium">
                      {c.make} {c.model_full || c.model}
                      {consignment && (
                        <div className="text-[10px] text-primary/80 uppercase tracking-widest mt-1">
                          Owned by: {consignment.owner_name}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-white/50">{bookings} bookings</td>
                    <td className="px-6 py-4 text-white font-medium">${gross.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-6 py-4 text-red-400/80">
                      {maint > 0 ? `-$${maint.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                    </td>
                    <td className="px-6 py-4 text-orange-400/80">
                      {ownerPayout > 0 ? `-$${ownerPayout.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${consignment?.owner_percentage}%)` : '—'}
                    </td>
                    <td className="px-6 py-4 text-emerald-400 font-bold bg-white/[0.02] group-hover:bg-transparent transition-colors">
                      ${netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
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
