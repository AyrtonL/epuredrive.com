import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/dashboard/PageHeader'
import type { Tenant } from '@/lib/supabase/types'

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

export default async function TenantsPage() {
  const supabase = await requireSuperuser()

  const { data: tenants } = await supabase
    .from('tenants')
    .select('*')
    .order('name')

  const rows = (tenants as Tenant[]) ?? []

  const { data: profileCounts } = await supabase
    .from('profiles')
    .select('tenant_id')

  const memberCountMap: Record<string, number> = {}
  for (const p of profileCounts ?? []) {
    if (p.tenant_id) {
      memberCountMap[p.tenant_id] = (memberCountMap[p.tenant_id] ?? 0) + 1
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-32">
      <PageHeader
        title="Tenants"
        description={`${rows.length} organizations on the platform.`}
        action={
          <button className="bg-amber-400 text-black px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-amber-300 transition-all hover:scale-[1.02] active:scale-[0.98]">
            Create Tenant
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Tenants', value: rows.length },
          { label: 'Active', value: rows.length },
          { label: 'Free Plan', value: rows.filter(t => !t.plan || t.plan === 'free').length },
          { label: 'Paid Plans', value: rows.filter(t => t.plan && t.plan !== 'free').length },
        ].map((s) => (
          <div key={s.label} className="glass border border-amber-500/10 rounded-2xl p-4">
            <div className="text-[10px] font-bold text-amber-400/40 uppercase tracking-widest mb-2">{s.label}</div>
            <div className="text-2xl font-bold text-white">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tenant List */}
      <div className="glass border border-white/10 rounded-3xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] font-bold uppercase tracking-widest text-white/30 border-b border-white/10 bg-black/20">
              <th className="px-6 py-4">Organization</th>
              <th className="px-6 py-4">Slug</th>
              <th className="px-6 py-4">Plan</th>
              <th className="px-6 py-4">Members</th>
              <th className="px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((t) => (
              <tr key={t.id} className="hover:bg-white/[0.03] transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    {t.logo_url ? (
                      <img src={t.logo_url} alt="" className="w-8 h-8 rounded-lg object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/30 text-xs font-bold">
                        {(t.brand_name || t.name || '?')[0].toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="text-white font-medium">{t.brand_name || t.name}</div>
                      <div className="text-white/30 text-xs">{t.name}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-white/50 font-mono text-xs">{t.slug || '—'}</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-block px-2.5 py-1 text-[10px] font-bold tracking-widest rounded-full uppercase border ${
                    t.plan === 'enterprise' ? 'text-violet-400 bg-violet-500/10 border-violet-500/20'
                    : t.plan === 'pro' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20'
                    : 'text-white/40 bg-white/5 border-white/10'
                  }`}>
                    {t.plan || 'free'}
                  </span>
                </td>
                <td className="px-6 py-4 text-white/50">
                  {memberCountMap[t.id] ?? 0}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-1.5 rounded-lg bg-white/5 text-white/40 text-xs hover:text-white hover:bg-white/10 transition-colors">
                      Impersonate
                    </button>
                    <button className="px-3 py-1.5 rounded-lg bg-white/5 text-white/40 text-xs hover:text-amber-400 hover:bg-amber-500/10 transition-colors">
                      Edit
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className="text-center py-16 text-white/30 text-sm">No tenants found.</div>
        )}
      </div>
    </div>
  )
}
