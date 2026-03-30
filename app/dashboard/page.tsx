// app/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server'
import type { Tenant } from '@/lib/supabase/types'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user!.id)
    .single()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, slug, brand_name, logo_url')
    .eq('id', profile!.tenant_id)
    .single()

  const { count: carCount } = await supabase
    .from('cars')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', profile!.tenant_id)

  const t = tenant as Tenant
  const displayName = t.brand_name || t.name
  const fleetUrl = `https://${t.slug}.epuredrive.com`

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-white mb-1">Welcome, {displayName}</h1>
      <p className="text-white/40 text-sm mb-8">Here&apos;s your fleet at a glance.</p>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="text-3xl font-bold text-white">{carCount ?? 0}</div>
          <div className="text-sm text-white/40 mt-1">Cars listed</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="text-3xl font-bold text-white">—</div>
          <div className="text-sm text-white/40 mt-1">Views this month</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 md:col-span-1 col-span-2">
          <div className="text-sm font-semibold text-white mb-2">Your fleet page</div>
          <a
            href={fleetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-white/50 hover:text-white transition-colors break-all"
          >
            {fleetUrl} ↗
          </a>
        </div>
      </div>

      {/* CTAs */}
      <div className="grid md:grid-cols-2 gap-4">
        <a
          href="/dashboard/fleet"
          className="block bg-white/5 border border-white/10 hover:border-white/20 rounded-2xl p-6 transition-all group"
        >
          <div className="text-lg font-bold text-white mb-1 group-hover:text-white">Customize fleet page →</div>
          <p className="text-sm text-white/40">Edit your logo, name, and listed cars.</p>
        </a>
        <a
          href="/admin/dashboard.html"
          className="block bg-white/5 border border-white/10 hover:border-white/20 rounded-2xl p-6 transition-all group"
        >
          <div className="text-lg font-bold text-white mb-1">Full dashboard →</div>
          <p className="text-sm text-white/40">Manage reservations, calendars, and more.</p>
        </a>
      </div>
    </div>
  )
}
