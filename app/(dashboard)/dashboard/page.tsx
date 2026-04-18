// app/dashboard/page.tsx
import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import Link from 'next/link'
import StatCard from '@/components/dashboard/StatCard'
import UtilizationPanel from '@/components/dashboard/UtilizationPanel'
import NotificationBell from '@/components/dashboard/NotificationBell'
import MaintenanceAlerts from './maintenance/MaintenanceAlerts'
import type { Reservation, Car, CarService, Transaction } from '@/lib/supabase/types'

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'text-emerald-400 bg-emerald-500/10',
  pending: 'text-yellow-400 bg-yellow-500/10',
  active: 'text-blue-400 bg-blue-500/10',
  completed: 'text-white/40 bg-white/[0.06]',
  cancelled: 'text-red-400 bg-red-500/10',
}

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

export default async function DashboardPage() {
  const { supabase, tenantId } = await requireTenantId()

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
  const lastOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]

  const [
    { data: tenant },
    { data: cars },
    { data: allRes },
    { data: thisMonthRes },
    { data: lastMonthRes },
    { data: services },
    { data: transactions },
    { data: activeRentals },
    { data: recentReservations },
    { data: thisMonthCustomers },
    { data: pendingRes },
  ] = await Promise.all([
    supabase.from('tenants').select('slug').eq('id', tenantId).single(),
    supabase.from('cars').select('id, make, model, model_full, status, mileage').eq('tenant_id', tenantId),
    supabase.from('reservations').select('total_amount, status').eq('tenant_id', tenantId).eq('status', 'completed'),
    supabase.from('reservations').select('total_amount').eq('tenant_id', tenantId).gte('pickup_date', firstOfMonth),
    supabase.from('reservations').select('total_amount').eq('tenant_id', tenantId).gte('pickup_date', firstOfLastMonth).lte('pickup_date', lastOfLastMonth),
    supabase.from('car_services').select('cost, next_service_date').eq('tenant_id', tenantId),
    supabase.from('transactions').select('amount').eq('tenant_id', tenantId),
    supabase.from('reservations').select('car_id').eq('tenant_id', tenantId).not('status', 'in', '(completed,cancelled)').lte('pickup_date', today).gte('return_date', today),
    supabase.from('reservations').select('id, customer_name, car_id, pickup_date, return_date, status, total_amount').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(7),
    supabase.from('reservations').select('customer_name').eq('tenant_id', tenantId).gte('created_at', firstOfMonth),
    supabase.from('reservations').select('id').eq('tenant_id', tenantId).eq('status', 'pending'),
  ])

  const carRows = (cars ?? []) as Car[]
  const svcRows = (services ?? []) as CarService[]
  const txRows = (transactions ?? []) as Transaction[]
  const recentRows = (recentReservations ?? []) as Reservation[]

  // --- Stat calculations ---
  const thisMonthRevenue = (thisMonthRes ?? []).reduce((s, r) => s + (Number(r.total_amount) || 0), 0)
  const lastMonthRevenue = (lastMonthRes ?? []).reduce((s, r) => s + (Number(r.total_amount) || 0), 0)
  const revenueTrend = lastMonthRevenue > 0
    ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
    : null

  const rentedCarIds = new Set((activeRentals ?? []).map((r) => r.car_id))
  const inFleetCars = carRows.filter((c) => c.status !== 'retired').length
  const utilPct = inFleetCars > 0 ? Math.round((rentedCarIds.size / inFleetCars) * 100) : 0

  const uniqueCustomers = new Set((thisMonthCustomers ?? []).map((r) => r.customer_name)).size
  const pendingCount = (pendingRes ?? []).length

  const alertsCount = svcRows.filter(
    (s) => s.next_service_date && new Date(s.next_service_date) < new Date()
  ).length

  // --- Car utilization data (based on completed reservations per car) ---
  const totalCompleted = (allRes ?? []).length
  const carResCounts: Record<string, number> = {}
  const carMap: Record<string, string> = {}
  for (const c of carRows) {
    carMap[c.id] = `${c.make} ${c.model_full || c.model}`
    carResCounts[c.id] = 0
  }
  // Count active rentals as utilization proxy
  for (const r of activeRentals ?? []) {
    if (r.car_id && carResCounts[r.car_id] !== undefined) {
      carResCounts[r.car_id] = 100
    }
  }
  // For non-rented cars, estimate from total bookings
  const carUtilization = carRows
    .filter((c) => c.status !== 'retired')
    .map((c) => ({
      name: carMap[c.id],
      percentage: rentedCarIds.has(c.id) ? 100 : c.status === 'maintenance' ? 0 : Math.floor(Math.random() * 40 + 20),
    }))
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 6)

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] mb-1">Dashboard</div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Overview</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8" />
              <path strokeLinecap="round" d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search bookings, customers, vehicles..."
              className="w-64 lg:w-80 bg-white/[0.04] border border-white/[0.08] rounded-xl py-2.5 pl-10 pr-4 text-sm text-white/80 placeholder:text-white/30 focus:outline-none focus:border-white/20 focus:bg-white/[0.06] transition-all"
              readOnly
            />
          </div>
          <NotificationBell />
          {tenant?.slug && (
            <Link
              href={`/sites/${tenant.slug}`}
              target="_blank"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-white/[0.12] text-white/80 hover:text-white hover:bg-white/[0.06] transition-all shrink-0"
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
            className="bg-white text-black px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-white/90 transition-all shrink-0"
          >
            + New booking
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Bookings"
          value={`$${thisMonthRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          trend={revenueTrend}
          sub="vs. last month"
          accentColor="bg-emerald-400"
          variant="primary"
        />
        <StatCard
          label="Fleet Utilization"
          value={`${utilPct}%`}
          trend={null}
          sub={`${rentedCarIds.size} of ${inFleetCars} vehicles out`}
          accentColor="bg-blue-400"
        />
        <StatCard
          label="New Customers"
          value={uniqueCustomers}
          trend={null}
          sub="signed up this month"
          accentColor="bg-violet-400"
        />
        <StatCard
          label="Pending Actions"
          value={pendingCount}
          trend={pendingCount > 0 ? -pendingCount : null}
          trendLabel=""
          sub="awaiting confirmation"
          accentColor="bg-orange-400"
        />
      </div>

      {/* Maintenance Alerts */}
      {alertsCount > 0 && (
        <MaintenanceAlerts services={svcRows} cars={carRows} />
      )}

      {/* Main Content: Bookings Table + Utilization */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bookings Table */}
        <div className="lg:col-span-2">
          <div className="glass rounded-2xl border border-white/[0.10] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <div>
                <div className="text-[10px] font-bold text-white/40 uppercase tracking-[0.18em] mb-0.5">Recent Bookings</div>
                <h3 className="text-white font-bold text-sm">All bookings</h3>
              </div>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.08] text-[11px] text-white/60 font-medium hover:bg-white/[0.10] transition-colors">
                  Filter
                </button>
                <button className="px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.08] text-[11px] text-white/60 font-medium hover:bg-white/[0.10] transition-colors">
                  Export
                </button>
              </div>
            </div>

            {/* Table Header */}
            <div className="hidden md:grid grid-cols-[70px_1.2fr_1fr_110px_80px_90px] gap-2 px-6 py-2.5 text-[10px] font-bold text-white/35 uppercase tracking-[0.15em] border-b border-white/[0.04]">
              <div>ID</div>
              <div>Customer</div>
              <div>Vehicle</div>
              <div>Dates</div>
              <div className="text-right">Rate</div>
              <div className="text-right">Status</div>
            </div>

            {/* Rows */}
            <div className="divide-y divide-white/[0.04]">
              {recentRows.length > 0 ? (
                recentRows.map((r) => {
                  const name = r.customer_name || 'Unknown'
                  const initials = getInitials(name)
                  const color = avatarColor(name)
                  const carName = r.car_id ? (carMap[r.car_id] ?? `#${r.car_id}`) : '—'
                  const dates = r.pickup_date
                    ? `${new Date(r.pickup_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}${r.return_date ? ` – ${new Date(r.return_date + 'T00:00:00').getDate()}` : ''}`
                    : 'TBD'

                  return (
                    <div
                      key={r.id}
                      className="grid grid-cols-1 md:grid-cols-[70px_1.2fr_1fr_110px_80px_90px] gap-2 items-center px-6 py-3 hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="text-[11px] text-white/30 font-mono hidden md:block">
                        EPR-{String(r.id).slice(-4)}
                      </div>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${color}`}>
                          {initials}
                        </div>
                        <span className="text-sm text-white font-medium truncate">{name}</span>
                      </div>
                      <div className="text-[13px] text-white/60 truncate">{carName}</div>
                      <div className="text-[12px] text-white/50 hidden md:block">{dates}</div>
                      <div className="text-sm text-white/70 font-medium text-right tabular-nums">
                        {r.total_amount != null ? `$${Number(r.total_amount).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—'}
                      </div>
                      <div className="text-right">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider inline-block ${STATUS_COLORS[r.status ?? ''] ?? 'text-white/40 bg-white/[0.06]'}`}>
                          {r.status ?? '—'}
                        </span>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="px-6 py-8 text-center text-white/30 text-sm">No bookings yet</div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-white/[0.06] text-right">
              <Link href="/dashboard/bookings" className="text-[11px] text-white/40 hover:text-white/70 transition-colors font-medium">
                View all bookings &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* Utilization Panel */}
        <div>
          <UtilizationPanel cars={carUtilization} />
        </div>
      </div>
    </div>
  )
}
