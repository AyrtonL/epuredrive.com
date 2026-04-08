import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/dashboard/PageHeader'
import type { Profile, Tenant } from '@/lib/supabase/types'

async function requireSuperuser() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'superuser') redirect('/dashboard')
  return supabase
}

export default async function AllUsersPage() {
  const supabase = await requireSuperuser()

  const [{ data: profiles }, { data: tenants }] = await Promise.all([
    supabase.from('profiles').select('id, full_name, role, tenant_id, created_at').order('created_at', { ascending: false }),
    supabase.from('tenants').select('id, name, brand_name'),
  ])

  const rows = (profiles as Profile[]) ?? []
  const tenantMap: Record<string, string> = {}
  for (const t of (tenants as Tenant[]) ?? []) {
    tenantMap[t.id] = t.brand_name || t.name
  }

  const ROLE_COLORS: Record<string, string> = {
    superuser: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
    admin: 'text-white bg-white/10 border-white/20',
    manager: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    staff: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    finance: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-32">
      <PageHeader title="All Users" description={`${rows.length} registered users across all tenants.`} />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass border border-amber-500/10 rounded-2xl p-4">
          <div className="text-[10px] font-bold text-amber-400/40 uppercase tracking-widest mb-2">Total Users</div>
          <div className="text-2xl font-bold text-white">{rows.length}</div>
        </div>
        <div className="glass border border-amber-500/10 rounded-2xl p-4">
          <div className="text-[10px] font-bold text-amber-400/40 uppercase tracking-widest mb-2">Superusers</div>
          <div className="text-2xl font-bold text-amber-400">{rows.filter(r => r.role === 'superuser').length}</div>
        </div>
        <div className="glass border border-amber-500/10 rounded-2xl p-4">
          <div className="text-[10px] font-bold text-amber-400/40 uppercase tracking-widest mb-2">Admins</div>
          <div className="text-2xl font-bold text-white">{rows.filter(r => r.role === 'admin').length}</div>
        </div>
        <div className="glass border border-amber-500/10 rounded-2xl p-4">
          <div className="text-[10px] font-bold text-amber-400/40 uppercase tracking-widest mb-2">No Tenant</div>
          <div className="text-2xl font-bold text-red-400">{rows.filter(r => !r.tenant_id).length}</div>
        </div>
      </div>

      {/* Users Table */}
      <div className="glass border border-white/10 rounded-3xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] font-bold uppercase tracking-widest text-white/30 border-b border-white/10 bg-black/20">
              <th className="px-6 py-4">User</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">Tenant</th>
              <th className="px-6 py-4">Joined</th>
              <th className="px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((u) => (
              <tr key={u.id} className="hover:bg-white/[0.03] transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/30 text-xs font-bold uppercase">
                      {(u.full_name ?? 'U')[0]}
                    </div>
                    <div className="text-white font-medium">{u.full_name ?? 'Unnamed'}</div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-block px-2.5 py-1 text-[10px] font-bold tracking-widest rounded-full uppercase border ${ROLE_COLORS[u.role ?? 'staff'] ?? ROLE_COLORS.staff}`}>
                    {u.role ?? 'staff'}
                  </span>
                </td>
                <td className="px-6 py-4 text-white/50 text-xs">
                  {u.tenant_id ? tenantMap[u.tenant_id] ?? 'Unknown' : <span className="text-red-400/60">Unassigned</span>}
                </td>
                <td className="px-6 py-4 text-white/30 text-xs">
                  {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-1.5 rounded-lg bg-white/5 text-white/40 text-xs hover:text-white hover:bg-white/10 transition-colors">
                      Edit Role
                    </button>
                    <button className="px-3 py-1.5 rounded-lg bg-white/5 text-white/40 text-xs hover:text-amber-400 hover:bg-amber-500/10 transition-colors">
                      Reset Password
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className="text-center py-16 text-white/30 text-sm">No users found.</div>
        )}
      </div>
    </div>
  )
}
