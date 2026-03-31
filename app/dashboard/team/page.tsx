import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/dashboard/PageHeader'
import EmptyState from '@/components/dashboard/EmptyState'
import type { Profile } from '@/lib/supabase/types'

export default async function TeamPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user!.id).single()

  const { data: members } = await supabase
    .from('profiles')
    .select('id, full_name, role, created_at')
    .eq('tenant_id', profile!.tenant_id)
    .order('created_at')

  const rows = (members as Profile[]) ?? []

  const ROLE_COLORS: Record<string, string> = {
    admin: 'bg-white/10 text-white',
    staff: 'bg-blue-500/20 text-blue-400',
    finance: 'bg-yellow-500/20 text-yellow-400',
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title="Team" description="Members with dashboard access." />
      {rows.length === 0 ? (
        <EmptyState message="No team members." />
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-white/40 border-b border-white/10">
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Role</th>
                <th className="px-6 py-4 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((m) => (
                <tr key={m.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 text-white font-medium">{m.full_name ?? m.id.slice(0, 8)}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full capitalize ${ROLE_COLORS[m.role ?? ''] ?? 'bg-white/5 text-white/40'}`}>
                      {m.role ?? 'member'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-white/40 text-xs">
                    {m.created_at ? new Date(m.created_at).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
