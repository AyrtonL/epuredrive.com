// app/dashboard/page.tsx
import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import Link from 'next/link'
import StatCard from '@/components/dashboard/StatCard'
import UtilizationPanel from '@/components/dashboard/UtilizationPanel'
import TodayPanel, { type OpenRecall, type TodayItem } from '@/components/dashboard/TodayPanel'
import CopyRef from '@/components/dashboard/CopyRef'
import NotificationBell from '@/components/dashboard/NotificationBell'
import MaintenanceAlerts from './maintenance/MaintenanceAlerts'
import type { Reservation, Car, CarService } from '@/lib/supabase/types'
import { overlapsRange, inclusiveDays, daysAgoISO, todayISO, startOfMonthISO } from '@/lib/finance/revenue'
import { carDisplayName } from '@/lib/utils/car-display-name'
import {
  dailyCarsOutSeries,
  dailyRevenueSeries,
  formatDateRange,
  monthToDateRevenue,
  sameDayLastMonthISO,
} from '@/lib/dashboard/overview-metrics'

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'text-emerald-300 bg-emerald-500/10',
  pending: 'text-yellow-300 bg-yellow-500/10',
  active: 'text-blue-300 bg-blue-500/10',
  completed: 'text-white/55 bg-white/[0.06]',
  cancelled: 'text-red-300 bg-red-500/10',
}

const WINDOW_DAYS = 30
const RECENT_BOOKINGS_LIMIT = 7
const RECALLS_LIMIT = 5
const TABLE_COLS = 'lg:grid-cols-[96px_minmax(0,1.1fr)_minmax(0,1.2fr)_150px_90px_96px]'

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const AVATAR_COLORS = [
  'bg-violet-500/20 text-violet-300',
  'bg-blue-500/20 text-blue-300',
  'bg-emerald-500/20 text-emerald-300',
  'bg-amber-500/20 text-amber-300',
  'bg-rose-500/20 text-rose-300',
  'bg-cyan-500/20 text-cyan-300',
]

function avatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

const money = (n: number): string => `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`

export default async function DashboardPage() {
  const { supabase, tenantId } = await requireTenantId()

  const today = todayISO()
  const firstOfMonth = startOfMonthISO()
  const windowStart = daysAgoISO(WINDOW_DAYS - 1)
  const firstOfLastMonth = `${sameDayLastMonthISO(today).slice(0, 7)}-01`
  // Earliest date any metric below needs: last month's comparison window or the 30-day sparklines.
  const historyStart = firstOfLastMonth < windowStart ? firstOfLastMonth : windowStart

  const [
    { data: tenant },
    { data: cars },
    { data: historyRes },
    { data: services },
    { data: activeRentals },
    { data: recentReservations },
    { data: thisMonthCustomers },
    { data: pendingRes },
    { data: pickupsToday },
    { data: returnsToday },
    { data: openRecalls },
  ] = await Promise.all([
    supabase.from('tenants').select('slug').eq('id', tenantId).single(),
    supabase.from('cars').select('id, make, model, model_full, status, mileage').eq('tenant_id', tenantId),
    // Completed + active rentals touching the history window → revenue, utilization, sparklines
    supabase.from('reservations').select('id, car_id, pickup_date, return_date, status, total_amount').eq('tenant_id', tenantId).in('status', ['completed', 'active']).lte('pickup_date', today).or(`return_date.is.null,return_date.gte.${historyStart}`),
    supabase.from('car_services').select('cost, next_service_date').eq('tenant_id', tenantId),
    supabase.from('reservations').select('car_id').eq('tenant_id', tenantId).not('status', 'in', '(completed,cancelled)').lte('pickup_date', today).gte('return_date', today),
    supabase.from('reservations').select('id, booking_code, customer_name, car_id, pickup_date, return_date, status, total_amount').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(RECENT_BOOKINGS_LIMIT),
    supabase.from('reservations').select('customer_name').eq('tenant_id', tenantId).gte('created_at', firstOfMonth),
    supabase.from('reservations').select('id').eq('tenant_id', tenantId).eq('status', 'pending'),
    supabase.from('reservations').select('id, booking_code, customer_name, car_id, pickup_time').eq('tenant_id', tenantId).eq('pickup_date', today).in('status', ['pending', 'confirmed', 'active']).order('pickup_time', { ascending: true }),
    supabase.from('reservations').select('id, booking_code, customer_name, car_id, return_time').eq('tenant_id', tenantId).eq('return_date', today).eq('status', 'active').order('return_time', { ascending: true }),
    supabase.from('car_recalls').select('id, car_id, component, park_it').eq('tenant_id', tenantId).eq('status', 'open').order('park_it', { ascending: false }).limit(RECALLS_LIMIT),
  ])

  const carRows = (cars ?? []) as Car[]
  const svcRows = (services ?? []) as CarService[]
  const historyRows = (historyRes ?? []) as Reservation[]
  const recentRows = (recentReservations ?? []) as Reservation[]

  const carMap: Record<string, string> = {}
  for (const c of carRows) carMap[c.id] = carDisplayName(c)
  const carName = (id: number | null | undefined): string => (id != null ? carMap[id] ?? `Car #${id}` : 'Unassigned')

  // --- Stat calculations ---
  const revenue = monthToDateRevenue(historyRows, today)
  const revenueSeries = dailyRevenueSeries(historyRows, windowStart, today)

  const inFleetCars = carRows.filter((c) => c.status !== 'retired')
  const rentedCarIds = new Set((activeRentals ?? []).map((r) => r.car_id))
  const utilPct = inFleetCars.length > 0 ? Math.round((rentedCarIds.size / inFleetCars.length) * 100) : 0
  const utilSeries = dailyCarsOutSeries(historyRows, windowStart, today).map((n) =>
    inFleetCars.length > 0 ? Math.round((n / inFleetCars.length) * 100) : 0
  )

  const uniqueCustomers = new Set((thisMonthCustomers ?? []).map((r) => r.customer_name)).size
  const pendingCount = (pendingRes ?? []).length

  const alertsCount = svcRows.filter(
    (s) => s.next_service_date && s.next_service_date.slice(0, 10) < today
  ).length

  // --- Real per-car utilization over the trailing window ---
  // Utilization % = rented days in the window ÷ window length. Computed
  // from actual reservation date overlaps — never estimated or randomised.
  const rentedDaysByCar: Record<number, number> = {}
  for (const r of historyRows) {
    if (r.car_id == null || !r.pickup_date) continue
    if (!overlapsRange(r, windowStart, today)) continue
    const start = r.pickup_date > windowStart ? r.pickup_date : windowStart
    const end = (r.return_date ?? today) < today ? (r.return_date ?? today) : today
    if (end < start) continue
    rentedDaysByCar[r.car_id] = (rentedDaysByCar[r.car_id] ?? 0) + inclusiveDays(start, end)
  }
  const carUtilization = inFleetCars
    .map((c) => ({
      name: carMap[c.id],
      percentage: Math.min(100, Math.round(((rentedDaysByCar[c.id] ?? 0) / WINDOW_DAYS) * 100)),
    }))
    .sort((a, b) => b.percentage - a.percentage)

  // --- Today ---
  const toTodayItem = (r: { id: number; booking_code: string | null; customer_name: string | null; car_id: number | null }, time: string | null): TodayItem => ({
    id: r.id,
    customer: r.customer_name || 'Unknown',
    vehicle: carName(r.car_id),
    time,
    bookingCode: r.booking_code,
  })
  const pickups = (pickupsToday ?? []).map((r) => toTodayItem(r, r.pickup_time))
  const returns = (returnsToday ?? []).map((r) => toTodayItem(r, r.return_time))
  const recalls: OpenRecall[] = (openRecalls ?? []).map((r) => ({
    id: r.id,
    carId: r.car_id,
    vehicle: carName(r.car_id),
    component: r.component,
    parkIt: r.park_it,
  }))

  const hasRevenue = revenue.current > 0 || revenue.previous > 0

  return (
    <div className="max-w-screen-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Overview</h1>
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          {/* Opens Bookings with the search applied (name, email, ref #, vehicle). */}
          <form action="/dashboard/bookings" method="get" role="search" className="relative w-full md:w-auto">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8" />
              <path strokeLinecap="round" d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="search"
              name="q"
              enterKeyHint="search"
              aria-label="Search bookings"
              placeholder="Search bookings, customers, vehicles..."
              className="w-full md:w-64 lg:w-80 bg-white/[0.04] border border-white/[0.08] rounded-xl py-2.5 pl-10 pr-4 text-sm text-white/80 placeholder:text-white/40 focus:outline-none focus:border-white/20 focus:bg-white/[0.06] transition-all"
            />
          </form>
          <NotificationBell />
          {tenant?.slug && (
            <Link
              href={`/sites/${tenant.slug}`}
              target="_blank"
              className="flex-1 md:flex-none justify-center flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-white/[0.12] text-white/80 hover:text-white hover:bg-white/[0.06] transition-all shrink-0"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              View Site
            </Link>
          )}
          <Link
            href="/dashboard/bookings"
            className="flex-1 md:flex-none text-center bg-white text-black px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-white/90 transition-all shrink-0"
          >
            + New booking
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard
          label="Revenue · Month to date"
          value={hasRevenue ? money(revenue.current) : '—'}
          trend={revenue.trendPct}
          sub={
            hasRevenue
              ? `${money(revenue.earned)} earned · ${money(revenue.inProgress)} in progress`
              : 'No rentals yet this month'
          }
          variant="primary"
          sparkline={revenueSeries}
          sparklineLabel={`Daily revenue, last ${WINDOW_DAYS} days`}
        />
        <StatCard
          label="Fleet out today"
          value={`${utilPct}%`}
          sub={`${rentedCarIds.size} of ${inFleetCars.length} vehicles on rental`}
          sparkline={utilSeries}
          sparklineLabel={`Share of fleet out, last ${WINDOW_DAYS} days`}
        />
        <StatCard
          label="Customers · This month"
          value={uniqueCustomers}
          sub="booked this month"
        />
        <StatCard
          label="Needs confirmation"
          value={pendingCount}
          sub={pendingCount > 0 ? 'pending bookings' : 'All caught up'}
        />
      </div>
      {revenue.trendPct != null && (
        <p className="-mt-5 text-[12px] text-white/45">
          Revenue change compares {formatDateRange(firstOfMonth, today, today)} with the same days last month.
        </p>
      )}

      {/* Maintenance Alerts */}
      {alertsCount > 0 && (
        <MaintenanceAlerts services={svcRows} cars={carRows} />
      )}

      {/* Main Content: Bookings Table + Today / Utilization */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6 items-start">
        {/* Bookings Table */}
        <div className="glass rounded-2xl border border-white/[0.10] overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-4 border-b border-white/[0.06]">
            <div>
              <h3 className="text-white font-bold text-sm">Recent bookings</h3>
              <div className="text-[12px] text-white/55 mt-0.5">Newest first</div>
            </div>
            <Link
              href="/dashboard/bookings"
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white/[0.08] border border-white/[0.12] text-[13px] text-white/85 font-medium hover:bg-white/[0.14] hover:text-white transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 5h18M6 12h12M10 19h4" />
              </svg>
              Filter &amp; export
            </Link>
          </div>

          {/* Table Header */}
          <div className={`hidden lg:grid ${TABLE_COLS} gap-3 px-6 py-2.5 text-[11px] font-semibold text-white/50 border-b border-white/[0.04]`}>
            <div>Ref</div>
            <div>Customer</div>
            <div>Vehicle</div>
            <div>Dates</div>
            <div className="text-right">Total</div>
            <div className="text-right">Status</div>
          </div>

          {/* Rows — each opens the booking; the ref copies itself */}
          <div className="divide-y divide-white/[0.04]">
            {recentRows.length > 0 ? (
              recentRows.map((r) => {
                const name = r.customer_name || 'Unknown'
                const dates = formatDateRange(r.pickup_date, r.return_date, today)
                const total = r.total_amount != null ? Number(r.total_amount) : null
                const perDay = total != null && r.pickup_date && r.return_date
                  ? total / inclusiveDays(r.pickup_date, r.return_date)
                  : null
                const ref = r.booking_code ?? `#${r.id}`

                return (
                  <div
                    key={r.id}
                    className={`relative grid grid-cols-[minmax(0,1fr)_auto] ${TABLE_COLS} gap-x-3 gap-y-1 items-center px-4 lg:px-6 py-3 hover:bg-white/[0.04] transition-colors group`}
                  >
                    <Link
                      href={`/dashboard/bookings?q=${encodeURIComponent(r.booking_code ?? name)}`}
                      className="absolute inset-0"
                      aria-label={`Open booking ${ref} for ${name}`}
                    />
                    <div className="hidden lg:block">
                      <CopyRef value={ref} />
                    </div>
                    <div className="flex items-center gap-3 min-w-0 max-lg:row-start-1 max-lg:col-start-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${avatarColor(name)}`}>
                        {getInitials(name)}
                      </div>
                      <span className="text-sm text-white font-medium truncate">{name}</span>
                    </div>
                    <div className="text-[13px] text-white/70 truncate max-lg:row-start-2 max-lg:col-start-1 max-lg:pl-11 max-lg:text-xs" title={carName(r.car_id)}>
                      {carName(r.car_id)}<span className="lg:hidden text-white/50"> · {dates}</span>
                    </div>
                    <div className="text-[13px] text-white/65 hidden lg:block tabular-nums">{dates}</div>
                    <div className="text-right max-lg:row-start-1 max-lg:col-start-2">
                      <div className="text-sm text-white/85 font-medium tabular-nums">{total != null ? money(total) : '—'}</div>
                      {perDay != null && (
                        <div className="hidden lg:block text-[11px] text-white/45 tabular-nums">{money(perDay)}/day</div>
                      )}
                    </div>
                    <div className="text-right max-lg:row-start-2 max-lg:col-start-2">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider inline-block ${STATUS_COLORS[r.status ?? ''] ?? 'text-white/55 bg-white/[0.06]'}`}>
                        {r.status ?? '—'}
                      </span>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="px-6 py-8 text-center text-white/50 text-sm">No bookings yet</div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 md:px-6 py-2 border-t border-white/[0.06] text-right">
            <Link href="/dashboard/bookings" className="inline-block px-3 py-2 -mr-3 rounded-lg text-[13px] text-white/65 hover:text-white hover:bg-white/[0.06] transition-colors font-medium">
              View all bookings &rarr;
            </Link>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <TodayPanel pickups={pickups} returns={returns} recalls={recalls} />
          <UtilizationPanel cars={carUtilization} windowDays={WINDOW_DAYS} />
        </div>
      </div>
    </div>
  )
}
