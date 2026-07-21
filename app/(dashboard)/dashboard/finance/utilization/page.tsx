import Link from 'next/link'
import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import PageHeader from '@/components/dashboard/PageHeader'

interface SearchParams {
  period?: string
}

interface PeriodOption {
  key: '30' | '90' | '365'
  label: string
  days: number
}

const PERIODS: readonly PeriodOption[] = [
  { key: '30', label: 'Last 30 days', days: 30 },
  { key: '90', label: 'Last 90 days', days: 90 },
  { key: '365', label: 'Last 12 months', days: 365 },
] as const

const DEFAULT_PERIOD: PeriodOption['key'] = '90'

interface ReservationRow {
  id: string
  car_id: number | null
  pickup_date: string | null
  return_date: string | null
  status: string | null
  total_amount: number | null
}

interface CarRow {
  id: number
  make: string | null
  model: string | null
  model_full: string | null
  daily_rate: number | null
  status: string | null
}

function parseDate(value: string): Date {
  return new Date(`${value}T00:00:00Z`)
}

function dayDiffInclusive(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime()
  return Math.floor(ms / (1000 * 60 * 60 * 24)) + 1
}

function overlapDays(
  pickup: string | null,
  ret: string | null,
  windowStart: Date,
  windowEnd: Date,
): number {
  if (!pickup) return 0
  const start = parseDate(pickup)
  // In-progress rentals have no return_date → treat as ongoing through the
  // window end (today). Previously these were dropped, undercounting exactly
  // the cars that are out on rental right now.
  const end = ret ? parseDate(ret) : windowEnd
  if (end < windowStart || start > windowEnd) return 0
  const overlapStart = start > windowStart ? start : windowStart
  const overlapEnd = end < windowEnd ? end : windowEnd
  return Math.max(0, dayDiffInclusive(overlapStart, overlapEnd))
}

function utilizationColor(pct: number): string {
  if (pct >= 80) return 'bg-emerald-400'
  if (pct >= 60) return 'bg-yellow-400'
  if (pct >= 40) return 'bg-orange-400'
  return 'bg-red-400'
}

function fmtCurrency(amount: number): string {
  return amount.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  })
}

function fmtPct(pct: number): string {
  return `${pct.toFixed(0)}%`
}

export default async function UtilizationPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { supabase, tenantId } = await requireTenantId()
  const params = await searchParams

  const periodKey = (PERIODS.find((p) => p.key === params.period)?.key ?? DEFAULT_PERIOD) as PeriodOption['key']
  const period = PERIODS.find((p) => p.key === periodKey)!
  const periodEnd = new Date()
  periodEnd.setUTCHours(0, 0, 0, 0)
  const periodStart = new Date(periodEnd)
  periodStart.setUTCDate(periodEnd.getUTCDate() - (period.days - 1))
  const periodStartStr = periodStart.toISOString().split('T')[0]
  const periodEndStr = periodEnd.toISOString().split('T')[0]

  const [{ data: cars }, { data: reservations }] = await Promise.all([
    supabase
      .from('cars')
      .select('id, make, model, model_full, daily_rate, status')
      .eq('tenant_id', tenantId),
    // Pull anything that overlaps the period — both active and completed count
    // toward utilization. NOTE: no `.gte('return_date', ...)` filter — that
    // excluded in-progress rentals with a null return_date. Overlap is computed
    // in JS (overlapDays), which handles open-ended rentals correctly.
    supabase
      .from('reservations')
      .select('id, car_id, pickup_date, return_date, status, total_amount')
      .eq('tenant_id', tenantId)
      .in('status', ['active', 'completed'])
      .lte('pickup_date', periodEndStr),
  ])

  const carRows = (cars as CarRow[]) ?? []
  const resRows = (reservations as ReservationRow[]) ?? []

  // Aggregate per-vehicle: rented days, bookings count, revenue (prorated by overlap)
  const stats = new Map<
    number,
    { daysRented: number; bookings: number; revenue: number }
  >()

  for (const r of resRows) {
    if (r.car_id == null) continue
    const days = overlapDays(r.pickup_date, r.return_date, periodStart, periodEnd)
    if (days <= 0) continue
    const existing = stats.get(r.car_id) ?? { daysRented: 0, bookings: 0, revenue: 0 }
    // Open-ended rentals prorate over pickup → today.
    const totalDays = r.pickup_date
      ? dayDiffInclusive(parseDate(r.pickup_date), r.return_date ? parseDate(r.return_date) : periodEnd)
      : 0
    const proratedRevenue =
      r.total_amount != null && totalDays > 0
        ? (Number(r.total_amount) || 0) * (days / totalDays)
        : 0
    stats.set(r.car_id, {
      daysRented: existing.daysRented + days,
      bookings: existing.bookings + 1,
      revenue: existing.revenue + proratedRevenue,
    })
  }

  const periodDays = period.days

  // Per-vehicle utilization rows, sorted by utilization desc
  const rows = carRows
    .map((car) => {
      const s = stats.get(car.id) ?? { daysRented: 0, bookings: 0, revenue: 0 }
      const cappedDays = Math.min(s.daysRented, periodDays)
      const pct = periodDays > 0 ? (cappedDays / periodDays) * 100 : 0
      const dailyRate = Number(car.daily_rate) || 0
      const potentialRevenue = dailyRate * periodDays
      return {
        car,
        daysRented: cappedDays,
        bookings: s.bookings,
        revenue: s.revenue,
        utilization: pct,
        potentialRevenue,
      }
    })
    .sort((a, b) => b.utilization - a.utilization)

  // Fleet totals
  const fleetSize = carRows.length
  const fleetAvailableDays = fleetSize * periodDays
  const fleetRentedDays = rows.reduce((sum, r) => sum + r.daysRented, 0)
  const fleetUtilization = fleetAvailableDays > 0 ? (fleetRentedDays / fleetAvailableDays) * 100 : 0
  const fleetRevenue = rows.reduce((sum, r) => sum + r.revenue, 0)
  // Capture rate = actual revenue ÷ theoretical max if every car rented every
  // day at its daily rate. The single best "money left on the table" signal.
  const fleetPotentialRevenue = rows.reduce((sum, r) => sum + r.potentialRevenue, 0)
  const captureRate = fleetPotentialRevenue > 0 ? (fleetRevenue / fleetPotentialRevenue) * 100 : 0

  const summaryCards = [
    {
      label: 'Fleet utilization',
      value: fmtPct(fleetUtilization),
      color: fleetUtilization >= 60 ? 'text-emerald-400' : fleetUtilization >= 40 ? 'text-yellow-400' : 'text-red-400',
    },
    { label: 'Days rented', value: `${fleetRentedDays}`, color: 'text-white' },
    {
      label: 'Revenue capture',
      value: fmtPct(captureRate),
      color: captureRate >= 60 ? 'text-emerald-400' : captureRate >= 35 ? 'text-yellow-400' : 'text-red-400',
    },
    { label: 'Revenue (period)', value: fmtCurrency(fleetRevenue), color: 'text-emerald-400' },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Fleet Utilization"
        description="Rented days vs available days per vehicle, with prorated revenue for the selected window."
      />

      {/* Period selector */}
      <div className="flex flex-wrap items-center gap-2">
        {PERIODS.map((p) => {
          const isActive = p.key === periodKey
          return (
            <Link
              key={p.key}
              href={`/dashboard/finance/utilization?period=${p.key}`}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest border transition-colors ${
                isActive
                  ? 'bg-white text-black border-white'
                  : 'bg-white/[0.04] border-white/[0.10] text-white/60 hover:border-white/25 hover:text-white'
              }`}
            >
              {p.label}
            </Link>
          )
        })}
        <span className="text-[11px] text-white/40 ml-auto font-light">
          {periodStartStr} → {periodEndStr}
        </span>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <div key={card.label} className="glass border border-white/[0.14] rounded-2xl p-4">
            <div className="text-[10px] font-bold text-white/55 uppercase tracking-widest mb-2">
              {card.label}
            </div>
            <div className={`text-xl font-bold ${card.color}`}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Per-vehicle table */}
      {rows.length === 0 ? (
        <div className="empty-state">No vehicles in your fleet yet.</div>
      ) : (
        <div className="data-table rounded-2xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-bold uppercase tracking-widest text-white/55 border-b border-white/[0.10] bg-white/[0.04]">
                <th className="px-6 py-4">Vehicle</th>
                <th className="px-6 py-4">Daily rate</th>
                <th className="px-6 py-4">Bookings</th>
                <th className="px-6 py-4">Days rented</th>
                <th className="px-6 py-4 w-[24%]">Utilization</th>
                <th className="px-6 py-4 text-emerald-400 font-bold">Revenue (period)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.07]">
              {rows.map((row) => {
                const carLabel = `${row.car.make ?? ''} ${row.car.model_full || row.car.model || ''}`.trim()
                return (
                  <tr key={row.car.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4 text-white font-medium">
                      <Link
                        href={`/dashboard/fleet/${row.car.id}`}
                        className="hover:underline underline-offset-2"
                      >
                        {carLabel || `Vehicle #${row.car.id}`}
                      </Link>
                      {row.car.status && row.car.status !== 'available' && (
                        <div className="text-[10px] text-white/40 uppercase tracking-widest mt-1">
                          {row.car.status}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-white/65 tabular-nums">
                      {row.car.daily_rate != null ? fmtCurrency(Number(row.car.daily_rate)) : '—'}
                    </td>
                    <td className="px-6 py-4 text-white/65 tabular-nums">{row.bookings}</td>
                    <td className="px-6 py-4 text-white/85 tabular-nums">
                      {row.daysRented} / {periodDays}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-white/[0.06] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${utilizationColor(row.utilization)}`}
                            style={{ width: `${row.utilization.toFixed(1)}%` }}
                          />
                        </div>
                        <span className="text-[12px] font-bold text-white/80 tabular-nums w-12 text-right">
                          {fmtPct(row.utilization)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-emerald-400 bg-white/[0.02] group-hover:bg-transparent transition-colors tabular-nums">
                      {fmtCurrency(row.revenue)}
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
