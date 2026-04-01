import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/dashboard/PageHeader'
import type { Reservation, Car, CarService, Consignment, Transaction } from '@/lib/supabase/types'

function fmt(n: number) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default async function ROIPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user!.id).single()
  const tenantId = profile!.tenant_id

  const [
    { data: reservations },
    { data: cars },
    { data: services },
    { data: consignments },
    { data: transactions },
  ] = await Promise.all([
    supabase.from('reservations').select('car_id, total_amount, status').eq('tenant_id', tenantId).eq('status', 'completed'),
    supabase.from('cars').select('id, make, model, model_full, daily_rate').eq('tenant_id', tenantId),
    supabase.from('car_services').select('car_id, amount').eq('tenant_id', tenantId),
    supabase.from('consignments').select('car_id, owner_percentage, owner_name').eq('tenant_id', tenantId),
    supabase.from('transactions').select('amount, category').eq('tenant_id', tenantId),
  ])

  const rows = (reservations as Reservation[]) ?? []
  const carRows = (cars as Car[]) ?? []
  const serviceRows = (services as CarService[]) ?? []
  const consignmentRows = (consignments as Consignment[]) ?? []
  const txRows = (transactions as Transaction[]) ?? []

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

  // Fleet-wide totals
  const fleetGross = Object.values(revenueMap).reduce((s, v) => s + v, 0)
  const fleetMaint = Object.values(maintenanceMap).reduce((s, v) => s + v, 0)
  const fleetOwnerPayouts = sorted.reduce((s, c) => {
    const gross = revenueMap[c.id] ?? 0
    const consignment = consignmentRows.find((con) => con.car_id === c.id)
    return s + (consignment?.owner_percentage ? gross * (consignment.owner_percentage / 100) : 0)
  }, 0)
  const generalExpenses = txRows.reduce((s, t) => s + (Number(t.amount) || 0), 0)
  const fleetNet = fleetGross - fleetMaint - fleetOwnerPayouts - generalExpenses

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader title="Return on Investment" description="Revenue vs Maintenance & Owner Splits per vehicle." />

      {/* Fleet Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Gross Revenue', value: fmt(fleetGross), color: 'text-white' },
          { label: 'Maintenance Cost', value: fmt(fleetMaint), color: 'text-red-400' },
          { label: 'Owner Payouts', value: fmt(fleetOwnerPayouts), color: 'text-orange-400' },
          { label: 'Business Expenses', value: fmt(generalExpenses), color: 'text-red-400/80' },
          { label: 'Fleet Net Profit', value: fmt(fleetNet), color: fleetNet >= 0 ? 'text-emerald-400' : 'text-red-400' },
        ].map((s) => (
          <div key={s.label} className="glass border border-white/10 rounded-2xl p-4">
            <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">{s.label}</div>
            <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

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

                const consignment = consignmentRows.find((con) => con.car_id === c.id)
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
                    <td className="px-6 py-4 text-white font-medium">{fmt(gross)}</td>
                    <td className="px-6 py-4 text-red-400/80">
                      {maint > 0 ? `-${fmt(maint)}` : '—'}
                    </td>
                    <td className="px-6 py-4 text-orange-400/80">
                      {ownerPayout > 0 ? `-${fmt(ownerPayout)} (${consignment?.owner_percentage}%)` : '—'}
                    </td>
                    <td className={`px-6 py-4 font-bold bg-white/[0.02] group-hover:bg-transparent transition-colors ${netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {fmt(netProfit)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* General expenses footer note */}
          {generalExpenses > 0 && (
            <div className="px-6 py-4 border-t border-white/10 bg-black/20 flex items-center justify-between">
              <span className="text-[11px] text-white/40 uppercase tracking-widest font-bold">
                General Business Expenses (not per-vehicle — deducted from fleet net)
              </span>
              <span className="text-red-400/80 font-medium text-sm">-{fmt(generalExpenses)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
