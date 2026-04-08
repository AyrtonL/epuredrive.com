import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/dashboard/PageHeader'

async function requireSuperuser() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'superuser') redirect('/dashboard')
  return supabase
}

export default async function PlatformStatsPage() {
  const supabase = await requireSuperuser()

  const [
    { count: tenantCount },
    { count: userCount },
    { count: carCount },
    { count: bookingCount },
    { data: reservations },
  ] = await Promise.all([
    supabase.from('tenants').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('cars').select('*', { count: 'exact', head: true }),
    supabase.from('reservations').select('*', { count: 'exact', head: true }),
    supabase.from('reservations').select('total_amount, status').eq('status', 'completed'),
  ])

  const totalPlatformRevenue = (reservations ?? []).reduce(
    (sum, r) => sum + (Number(r.total_amount) || 0), 0
  )

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
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 text-center">
            <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">MRR</div>
            <div className="text-3xl font-black text-white/40">$0</div>
            <div className="text-[10px] text-white/20 mt-1">No paid plans yet</div>
          </div>
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 text-center">
            <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">Avg Revenue / Tenant</div>
            <div className="text-3xl font-black text-white/60">
              ${tenantCount && tenantCount > 0 ? Math.round(totalPlatformRevenue / tenantCount).toLocaleString() : '0'}
            </div>
          </div>
        </div>
      </div>

      {/* Growth placeholder */}
      <div className="glass border border-white/[0.06] rounded-3xl p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-white/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
            <polyline points="16 7 22 7 22 13" />
          </svg>
        </div>
        <h3 className="text-white font-bold mb-2">Growth Analytics</h3>
        <p className="text-white/30 text-sm">Charts and trend analysis will appear here as the platform scales.</p>
      </div>
    </div>
  )
}
