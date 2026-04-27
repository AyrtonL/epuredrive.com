import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getEffectivePlan } from '@/lib/plan/effective-plan'
import PageHeader from '@/components/dashboard/PageHeader'
import type { Profile } from '@/lib/supabase/types'
import InviteModal from './InviteModal'

const ROLE_CONFIG: Record<string, { color: string; description: string; permissions: string[]; displayName?: string }> = {
  superuser: {
    color: 'text-white bg-white/10 border-white/20',
    description: 'Full access to all features, settings, and team management.',
    permissions: ['All operations', 'Financial data', 'Team management', 'Settings', 'Integrations'],
    displayName: 'Admin',
  },
  admin: {
    color: 'text-white bg-white/10 border-white/20',
    description: 'Full access to all features, settings, and team management.',
    permissions: ['All operations', 'Financial data', 'Team management', 'Settings', 'Integrations'],
  },
  manager: {
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    description: 'Manage operations and view financial data, but cannot modify settings.',
    permissions: ['All operations', 'Financial data (view)', 'Team (view)'],
  },
  staff: {
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    description: 'Day-to-day operations only. No access to financial data or clients.',
    permissions: ['Calendar', 'Bookings', 'Fleet', 'Maintenance'],
  },
  finance: {
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    description: 'Financial operations only. No access to maintenance or integrations.',
    permissions: ['Bookings', 'Fleet (view)', 'All finance modules', 'Clients'],
  },
}

interface PendingInvite {
  id: string
  email: string
  role: string
  invitedAt: string
}

export default async function RolesPage() {
  const { supabase, tenantId } = await requireTenantId()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch tenant plan
  const { data: tenant } = await supabase
    .from('tenants')
    .select('plan')
    .eq('id', tenantId)
    .single()
  const effectivePlan = getEffectivePlan(tenant?.plan)
  const canInvite = effectivePlan === 'pro' || effectivePlan === 'max'

  // Active team members: profiles that have completed onboarding (full_name set)
  const { data: members } = await supabase
    .from('profiles')
    .select('id, full_name, role, created_at')
    .eq('tenant_id', tenantId)
    .not('full_name', 'is', null)
    .order('created_at')

  const rows = ((members as Profile[]) ?? []).filter(m => m.role !== 'superuser')

  // Pending invites: invited to this tenant but haven't completed onboarding yet.
  // Uses admin client scoped to this tenant via user_metadata (set at invite time).
  const adminClient = createAdminClient()
  const { data: { users: allUsers } } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
  const activeIds = new Set(rows.map(r => r.id))
  const pending: PendingInvite[] = allUsers
    .filter(u =>
      u.user_metadata?.tenant_id === tenantId &&
      u.invited_at &&
      !activeIds.has(u.id)
    )
    .map(u => ({
      id: u.id,
      email: u.email ?? '',
      role: u.user_metadata?.role ?? 'staff',
      invitedAt: u.invited_at!,
    }))

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-fade-in pb-32">
      <PageHeader title="Team & Roles" description="Manage team members, invite new users, and configure role-based access." />

      {/* Role Definitions */}
      <div>
        <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-4 px-1">Role Permissions</h3>
        <div className="grid md:grid-cols-2 gap-4">
          {Object.entries(ROLE_CONFIG).filter(([roleName]) => roleName !== 'superuser').map(([roleName, config]) => (
            <div key={roleName} className="glass border border-white/[0.06] rounded-2xl p-5 hover:border-white/10 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <span className={`inline-block px-2.5 py-1 text-[10px] font-bold tracking-widest rounded-full uppercase border ${config.color}`}>
                  {roleName}
                </span>
              </div>
              <p className="text-xs text-white/40 mb-3">{config.description}</p>
              <div className="flex flex-wrap gap-1.5">
                {config.permissions.map((p) => (
                  <span key={p} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/40 border border-white/5">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Team Members */}
      <div className="glass border border-white/10 rounded-3xl p-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white font-bold">Team Members</h3>
          <InviteModal canInvite={canInvite} />
        </div>

        <div className="space-y-2">
          {/* Active members */}
          {rows.map((member) => {
            const isCurrentUser = member.id === user?.id
            const roleConfig = ROLE_CONFIG[member.role ?? 'staff'] ?? ROLE_CONFIG.staff
            return (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.04] transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 text-sm font-bold uppercase">
                    {(member.full_name ?? 'U')[0]}
                  </div>
                  <div>
                    <div className="text-white text-sm font-medium flex items-center gap-2">
                      {member.full_name ?? 'Unnamed'}
                      {isCurrentUser && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-white/40 font-bold uppercase tracking-wider">You</span>
                      )}
                    </div>
                    <div className="text-white/30 text-xs mt-0.5">
                      Joined {member.created_at ? new Date(member.created_at).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                </div>
                <span className={`inline-block px-2.5 py-1 text-[10px] font-bold tracking-widest rounded-full uppercase border ${roleConfig.color}`}>
                  {roleConfig.displayName ?? member.role ?? 'staff'}
                </span>
              </div>
            )
          })}

          {/* Pending invites */}
          {pending.map((invite) => {
            const roleConfig = ROLE_CONFIG[invite.role] ?? ROLE_CONFIG.staff
            return (
              <div
                key={invite.id}
                className="flex items-center justify-between p-4 rounded-xl bg-white/[0.01] border border-white/[0.03] border-dashed transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-white/[0.03] border border-dashed border-white/10 flex items-center justify-center text-white/20 text-sm font-bold">
                    ?
                  </div>
                  <div>
                    <div className="text-white/50 text-sm font-medium">{invite.email}</div>
                    <div className="text-white/20 text-xs mt-0.5">
                      Invited {new Date(invite.invitedAt).toLocaleDateString()} · Pending acceptance
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-block px-2.5 py-1 text-[10px] font-bold tracking-widest rounded-full uppercase border opacity-50 ${roleConfig.color}`}>
                    {invite.role}
                  </span>
                  <span className="inline-block px-2.5 py-1 text-[10px] font-bold tracking-widest rounded-full uppercase border text-yellow-400/70 bg-yellow-500/5 border-yellow-500/15">
                    Pending
                  </span>
                </div>
              </div>
            )
          })}

          {rows.length === 0 && pending.length === 0 && (
            <div className="text-center py-12">
              <p className="text-white/30 text-sm">No team members found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
