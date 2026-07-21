'use client'

import { useState, useTransition } from 'react'
import { updateUserRole, assignUserTenant } from '../actions'
import type { Profile, Tenant } from '@/lib/supabase/types'

interface Props {
  profiles: Profile[]
  tenants: Tenant[]
}

const ROLES = ['superuser', 'admin', 'manager', 'staff', 'finance', 'owner'] as const

const ROLE_COLORS: Record<string, string> = {
  superuser: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
  admin: 'text-white bg-white/10 border-white/20',
  manager: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  owner: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  staff: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  finance: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
}

export default function UsersManager({ profiles, tenants }: Props) {
  const [isPending, startTransition] = useTransition()
  const [msg, setMsg] = useState('')
  const [editingRole, setEditingRole] = useState<string | null>(null)
  const [editingTenant, setEditingTenant] = useState<string | null>(null)

  const tenantMap: Record<string, string> = {}
  for (const t of tenants) {
    tenantMap[t.id] = t.brand_name || t.name
  }

  function handleRoleChange(profileId: string, role: string) {
    // Granting full platform access is high-stakes — confirm explicitly.
    if (role === 'superuser' && !confirm('Grant SUPERUSER access? This gives full control of the entire platform, including every tenant. Continue?')) {
      return
    }
    setMsg('')
    startTransition(async () => {
      const result = await updateUserRole(profileId, role)
      if (result.error) setMsg(result.error)
      else {
        setMsg('Role updated.')
        setEditingRole(null)
      }
    })
  }

  function handleTenantChange(profileId: string, tenantId: string) {
    setMsg('')
    startTransition(async () => {
      const result = await assignUserTenant(profileId, tenantId || null)
      if (result.error) setMsg(result.error)
      else {
        setMsg('Tenant assignment updated.')
        setEditingTenant(null)
      }
    })
  }

  return (
    <div className="space-y-6">
      {msg && (
        <div className={`p-3 rounded-xl text-sm border ${msg.includes('error') || msg.includes('Error') ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'}`}>
          {msg}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass border border-amber-500/10 rounded-2xl p-4">
          <div className="text-[10px] font-bold text-amber-400/40 uppercase tracking-widest mb-2">Total Users</div>
          <div className="text-2xl font-bold text-white">{profiles.length}</div>
        </div>
        <div className="glass border border-amber-500/10 rounded-2xl p-4">
          <div className="text-[10px] font-bold text-amber-400/40 uppercase tracking-widest mb-2">Superusers</div>
          <div className="text-2xl font-bold text-amber-400">{profiles.filter(r => r.role === 'superuser').length}</div>
        </div>
        <div className="glass border border-amber-500/10 rounded-2xl p-4">
          <div className="text-[10px] font-bold text-amber-400/40 uppercase tracking-widest mb-2">Admins</div>
          <div className="text-2xl font-bold text-white">{profiles.filter(r => r.role === 'admin').length}</div>
        </div>
        <div className="glass border border-amber-500/10 rounded-2xl p-4">
          <div className="text-[10px] font-bold text-amber-400/40 uppercase tracking-widest mb-2">No Tenant</div>
          <div className="text-2xl font-bold text-red-400">{profiles.filter(r => !r.tenant_id).length}</div>
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
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {profiles.map((u) => (
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
                  {editingRole === u.id ? (
                    <select
                      defaultValue={u.role ?? 'staff'}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      disabled={isPending}
                      className="bg-white/10 border border-white/10 rounded-lg py-1 px-2 text-xs text-white outline-none"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  ) : (
                    <button
                      onClick={() => setEditingRole(u.id)}
                      className={`inline-block px-2.5 py-1 text-[10px] font-bold tracking-widest rounded-full uppercase border cursor-pointer hover:opacity-80 transition-opacity ${ROLE_COLORS[u.role ?? 'staff'] ?? ROLE_COLORS.staff}`}
                    >
                      {u.role ?? 'staff'}
                    </button>
                  )}
                </td>
                <td className="px-6 py-4">
                  {editingTenant === u.id ? (
                    <select
                      defaultValue={u.tenant_id ?? ''}
                      onChange={(e) => handleTenantChange(u.id, e.target.value)}
                      disabled={isPending}
                      className="bg-white/10 border border-white/10 rounded-lg py-1 px-2 text-xs text-white outline-none max-w-[180px]"
                    >
                      <option value="">Unassigned</option>
                      {tenants.map((t) => (
                        <option key={t.id} value={t.id}>{t.brand_name || t.name}</option>
                      ))}
                    </select>
                  ) : (
                    <button
                      onClick={() => setEditingTenant(u.id)}
                      className="text-white/50 text-xs hover:text-white transition-colors cursor-pointer"
                    >
                      {u.tenant_id ? tenantMap[u.tenant_id] ?? 'Unknown' : <span className="text-red-400/60">Unassigned</span>}
                    </button>
                  )}
                </td>
                <td className="px-6 py-4 text-white/30 text-xs">
                  {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {profiles.length === 0 && (
          <div className="text-center py-16 text-white/30 text-sm">No users found.</div>
        )}
      </div>
    </div>
  )
}
