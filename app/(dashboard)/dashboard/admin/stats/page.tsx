import { requireSuperuser } from '@/lib/supabase/admin-auth'
import PageHeader from '@/components/dashboard/PageHeader'
import { computeStripeMrr } from '@/lib/stripe/mrr'

export default async function PlatformStatsPage() {
  const { supabase } = await requireSuperuser()

  const [
    { count: tenantCount },
    { count: userCount },
    { count: carCount },
    { count: bookingCount },
    { data: reservations },
    { data: tenants },
    stripeMrr,
  ] = await Promise.all([
    supabase.from('tenants').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('cars').select('*', { count: 'exact', head: true }),
    supabase.from('reservations').select('*', { count: 'exact', head: true }),
    supabase.from('reservations').select('total_amount, status').eq('status', 'completed'),
    supabase.from('tenants').select('plan'),
    computeStripeMrr(),
  ])

  const totalPlatformRevenue = (reservations ?? []).reduce(
    (sum, r) => sum + (Number(r.total_amount) || 0), 0
  )

  const planCounts: Record<string, number> = {}
  for (const t of tenants ?? []) {
    const p = t.plan || 'free'
    planCounts[p] = (planCounts[p] ?? 0) + 1
  }

  // Plan tiers incl. Starter (present in Stripe but previously invisible here).
  const PLAN_PRICES: Record<string, number> = { free: 0, starter: 0, pro: 19, max: 39 }

  // Prefer REAL MRR from live Stripe subscriptions. Fall back to the plan-column
  // estimate only if Stripe is unreachable, and label it clearly as an estimate.
  const estimatedMrr = Object.entries(planCounts).reduce(
    (sum, [plan, count]) => sum + (PLAN_PRICES[plan] ?? 0) * count, 0
  )
  const mrr = stripeMrr?.mrr ?? estimatedMrr
  const mrrIsReal = stripeMrr != null

  const stats = [
    { label: 'Total Tenants', value: tenantCount ?? 0, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/10' },
    { label: 'Total Users', value: userCount ?? 0, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/10' },
    { label: 'Total Vehicles', value: carCount ?? 0, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/10' },
    { label: 'Total Bookings', value: bookingCount ?? 0, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/10' },
  ]

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-fade-in pb-32">
      <PageHeader title="Platform Stats" description="Global metrics across all tenants." />

      {/* Primary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className={`glass border rounded-2xl p-5 ${s.bg}`}>
            <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-3">{s.label}</div>
            <div className={`text-3xl font-black ${s.color}`}>{s.value.toLocaleString()}</div>
          </div>
        ))}
      </div>

      {/* Revenue */}
      <div className="glass border border-white/10 rounded-3xl p-8">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-white font-bold">Platform Revenue</h3>
          <div className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-bold">All Tenants Combined</div>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 text-center">
            <div className="text-[10px] font-bold text-emerald-400/50 uppercase tracking-widest mb-2">Gross Booking Revenue</div>
            <div className="text-3xl font-black text-emerald-400">${totalPlatformRevenue.toLocaleString()}</div>
          </div>
          <div className="p-6 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-center">
            <div className="text-[10px] font-bold text-amber-400/50 uppercase tracking-widest mb-2">
              MRR {mrrIsReal ? '(Stripe)' : '(Estimated)'}
            </div>
            <div className="text-3xl font-black text-amber-400">${mrr.toLocaleString()}</div>
            <div className="text-[10px] text-white/20 mt-1">
              {mrrIsReal
                ? `${stripeMrr!.activeSubscriptions} active subscription${stripeMrr!.activeSubscriptions === 1 ? '' : 's'}`
                : 'Stripe unavailable — estimated from plans'}
            </div>
          </div>
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 text-center">
            <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">Lifetime Rev / Tenant</div>
            <div className="text-3xl font-black text-white/60">
              ${tenantCount && tenantCount > 0 ? Math.round(totalPlatformRevenue / tenantCount).toLocaleString() : '0'}
            </div>
          </div>
        </div>
      </div>

      {/* Plan Distribution */}
      <div className="glass border border-white/10 rounded-3xl p-8">
        <h3 className="text-white font-bold mb-6">Plan Distribution</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {Object.entries(PLAN_PRICES).map(([plan, price]) => {
            const count = planCounts[plan] ?? 0
            const pct = (tenantCount ?? 0) > 0 ? Math.round((count / (tenantCount ?? 1)) * 100) : 0
            return (
              <div key={plan} className="text-center">
                <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-3 capitalize">{plan}</div>
                <div className="text-2xl font-black text-white">{count}</div>
                <div className="mt-2 w-full h-2 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${plan === 'max' ? 'bg-violet-400' : plan === 'pro' ? 'bg-blue-400' : 'bg-white/20'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="text-[10px] text-white/20 mt-1">{pct}%</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
