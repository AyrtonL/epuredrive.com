// app/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import PageHeader from '@/components/dashboard/PageHeader'
import StatCard from '@/components/dashboard/StatCard'
import type { Tenant } from '@/lib/supabase/types'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user!.id)
    .single()

  const tenantId = profile!.tenant_id

  const [{ data: tenant }, { count: carCount }, { data: recentBookings }] = await Promise.all([
    supabase.from('tenants').select('name, slug, brand_name, logo_url').eq('id', tenantId).single(),
    supabase.from('cars').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    supabase.from('reservations')
      .select('id, status, total_amount, customer_name, pickup_date')
      .eq('tenant_id', tenantId)
      .order('pickup_date', { ascending: false })
      .limit(5),
  ])

  const t = tenant as Tenant
  const displayName = t.brand_name || t.name
  const fleetUrl = `https://${t.slug}.epuredrive.com`

  const revenue = ((recentBookings ?? []) as { status: string; total_amount: number | null }[])
    .filter((r) => r.status === 'completed')
    .reduce((s, r) => s + (Number(r.total_amount) || 0), 0)

  return (
    <div className="max-w-5xl mx-auto space-y-12">
      <PageHeader title={`Welcome, ${displayName}`} description="Your fleet at a glance." />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-up animation-delay-100">
        <StatCard label="Cars listed" value={carCount ?? 0} />
        <StatCard label="Recent revenue" value={`$${revenue.toFixed(0)}`} sub="last 5 bookings" />
        <StatCard
          label="Your fleet URL"
          value=""
          sub={fleetUrl}
        />
      </div>

      <div className="animate-fade-in-up animation-delay-200">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center">
          Quick Actions <span className="ml-3 h-px flex-1 bg-gradient-to-r from-surfaceBorder to-transparent" />
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          <Link href="/dashboard/bookings" className="glass rounded-3xl p-8 transition-all duration-500 hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_8px_30px_rgba(255,255,255,0.05)] group relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10 flex items-center justify-between mb-4">
              <div className="text-2xl font-bold text-white group-hover:text-glow transition-all duration-300">Bookings</div>
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all duration-300">→</div>
            </div>
            <p className="text-sm text-white/50 font-light relative z-10">Review and manage your incoming reservations meticulously.</p>
          </Link>

          <Link href="/dashboard/fleet" className="glass rounded-3xl p-8 transition-all duration-500 hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_8px_30px_rgba(255,255,255,0.05)] group relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10 flex items-center justify-between mb-4">
              <div className="text-2xl font-bold text-white group-hover:text-glow transition-all duration-300">Fleet</div>
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all duration-300">→</div>
            </div>
            <p className="text-sm text-white/50 font-light relative z-10">Curate your vehicles, edit details, and dial in availability.</p>
          </Link>

          <a href={fleetUrl} target="_blank" rel="noopener noreferrer" className="glass rounded-3xl p-8 transition-all duration-500 hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_8px_30px_rgba(255,255,255,0.05)] group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10 flex items-center justify-between mb-4">
              <div className="text-2xl font-bold text-white group-hover:text-glow transition-all duration-300">Public Page</div>
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all duration-300">↗</div>
            </div>
            <p className="text-[13px] text-white/50 font-light break-all relative z-10">{fleetUrl}</p>
          </a>
        </div>
      </div>
    </div>
  )
}
