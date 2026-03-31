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
    <div className="max-w-4xl">
      <PageHeader title={`Welcome, ${displayName}`} description="Your fleet at a glance." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Cars listed" value={carCount ?? 0} />
        <StatCard label="Recent revenue" value={`${revenue.toFixed(0)}`} sub="last 5 bookings" />
        <StatCard
          label="Your fleet URL"
          value=""
          sub={fleetUrl}
        />
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <Link href="/dashboard/bookings" className="block bg-white/5 border border-white/10 hover:border-white/20 rounded-2xl p-6 transition-all group">
          <div className="text-lg font-bold text-white mb-1">Bookings →</div>
          <p className="text-sm text-white/40">View and manage reservations.</p>
        </Link>
        <Link href="/dashboard/fleet" className="block bg-white/5 border border-white/10 hover:border-white/20 rounded-2xl p-6 transition-all group">
          <div className="text-lg font-bold text-white mb-1">Fleet →</div>
          <p className="text-sm text-white/40">Edit cars and availability.</p>
        </Link>
        <a href={fleetUrl} target="_blank" rel="noopener noreferrer" className="block bg-white/5 border border-white/10 hover:border-white/20 rounded-2xl p-6 transition-all group">
          <div className="text-lg font-bold text-white mb-1">View public page ↗</div>
          <p className="text-sm text-white/40 break-all">{fleetUrl}</p>
        </a>
      </div>
    </div>
  )
}
