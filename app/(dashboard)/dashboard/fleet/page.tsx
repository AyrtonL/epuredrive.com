import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import PageHeader from '@/components/dashboard/PageHeader'
import StatCard from '@/components/dashboard/StatCard'
import FleetManager from './FleetManager'
import type { Car, Reservation } from '@/lib/supabase/types'
import { daysAgoISO, todayISO } from '@/lib/finance/revenue'
import { carStatus, rentedDaysByCar, type FleetCarInsight } from '@/lib/fleet/car-status'
import { expiryStatus } from '@/lib/fleet/document-expiry'

const WINDOW_DAYS = 30

/** "Registration expired 3 days ago" / "Insurance expires in 7 days" — most urgent first. */
function documentWarning(c: Car, today: string): string | null {
  const docs = [
    { name: 'Registration', s: expiryStatus(c.registration_expiry, today) },
    { name: 'Insurance', s: expiryStatus(c.insurance_expiry, today) },
  ].filter((d) => d.s.state === 'expired' || d.s.state === 'soon')
  if (docs.length === 0) return null
  const worst = docs.sort((a, b) => (a.s.daysLeft ?? 0) - (b.s.daysLeft ?? 0))[0]
  return `${worst.name} ${worst.s.label.charAt(0).toLowerCase()}${worst.s.label.slice(1)}`
}

export default async function FleetPage() {
  const { supabase, tenantId } = await requireTenantId()

  const { data: cars } = await supabase
    .from('cars')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('id')

  const today = todayISO()
  const windowStart = daysAgoISO(WINDOW_DAYS - 1)

  const [{ data: consignedCars }, { data: reservations }] = await Promise.all([
    supabase.from('consignments').select('car_id').eq('tenant_id', tenantId),
    // Rentals in the 30-day window plus everything current/upcoming
    supabase
      .from('reservations')
      .select('id, car_id, customer_name, pickup_date, return_date, status, total_amount')
      .eq('tenant_id', tenantId)
      .neq('status', 'cancelled')
      .or(`return_date.is.null,return_date.gte.${windowStart}`),
  ])
  const resRows = (reservations ?? []) as Reservation[]
  const rentedDays = rentedDaysByCar(resRows, windowStart, today)

  const consignedCarIds = new Set(
    (consignedCars ?? []).map((c) => c.car_id).filter((id): id is number => id != null)
  )

  // Owned vehicles first, consignment vehicles after (stable sort keeps id order within each group)
  const rows = [...((cars as Car[]) ?? [])].sort((a, b) => {
    const aConsigned = consignedCarIds.has(a.id) ? 1 : 0
    const bConsigned = consignedCarIds.has(b.id) ? 1 : 0
    return aConsigned - bConsigned
  })
  const insights: Record<number, FleetCarInsight> = {}
  for (const c of rows) {
    insights[c.id] = {
      status: carStatus(c.status, resRows.filter((r) => r.car_id === c.id), today),
      utilizationPct: Math.min(100, Math.round(((rentedDays.get(c.id) ?? 0) / WINDOW_DAYS) * 100)),
      documentWarning: documentWarning(c, today),
    }
  }
  const inFleet = rows.filter((c) => c.status !== 'retired')
  const onRent = inFleet.filter((c) => ['on_rent', 'overdue'].includes(insights[c.id].status.kind)).length
  const overdue = inFleet.filter((c) => insights[c.id].status.kind === 'overdue').length
  const available = inFleet.filter((c) => insights[c.id].status.kind === 'available').length
  const maintenance = inFleet.filter((c) => insights[c.id].status.kind === 'maintenance').length
  const avgUtilization = inFleet.length
    ? Math.round(inFleet.reduce((sum, c) => sum + insights[c.id].utilizationPct, 0) / inFleet.length)
    : 0

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader title="Fleet Management" description="Where every vehicle is right now, how often it rents, and what is next." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="On rent now" value={onRent} sub={overdue > 0 ? `${overdue} overdue` : `of ${inFleet.length} vehicles`} />
        <StatCard label="Available" value={available} sub={maintenance > 0 ? `${maintenance} in maintenance` : 'ready to rent'} />
        <StatCard label="Utilization · 30d" value={`${avgUtilization}%`} sub="days rented, fleet average" />
        <StatCard label="Vehicles" value={inFleet.length} sub={`${consignedCarIds.size} on consignment`} />
      </div>

      <div className="glass border border-white/10 rounded-3xl p-6 md:p-8">
        <FleetManager initialCars={rows} consignedCarIds={Array.from(consignedCarIds)} insights={insights} />
      </div>
    </div>
  )
}
