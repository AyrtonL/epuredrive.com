'use client'

import { useState, useTransition } from 'react'
import type { Profile } from '@/lib/supabase/types'
import { updateMemberRole, removeMember } from './actions'

interface Props {
  members: Profile[]
  currentUserId: string
}

const ROLE_STYLES: Record<string, string> = {
  admin:   'bg-white/10 text-white border-white/20',
  staff:   'bg-blue-500/20 text-blue-300 border-blue-500/20',
  finance: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/20',
}

export default function TeamManager({ members, currentUserId }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleRoleChange(profileId: string, newRole: string) {
    startTransition(async () => {
      await updateMemberRole(profileId, newRole as 'admin' | 'staff' | 'finance')
    })
  }

  function handleRemove(profileId: string, name: string) {
    if (!confirm(`Remove ${name} from your team? They will lose dashboard access.`)) return
    startTransition(async () => { await removeMember(profileId) })
  }

  return (
    <div>
      <div className="mb-6 p-4 bg-white/5 rounded-2xl border border-white/10 text-xs text-white/40 leading-relaxed">
        To <strong className="text-white/60">invite a new member</strong>, have them sign up at your dashboard URL and then assign them a role here.
        Roles: <span className="text-white font-bold">Admin</span> (full access) · <span className="text-blue-300 font-bold">Staff</span> (operations only) · <span className="text-yellow-300 font-bold">Finance</span> (finance tabs only).
      </div>

      {members.length === 0 ? (
        <p className="text-white/30 text-sm py-8 text-center">No team members yet.</p>
      ) : (
        <div className="space-y-2">
          {members.map(m => {
            const isCurrentUser = m.id === currentUserId
            const displayName = m.full_name || m.id.slice(0, 12) + '...'

            return (
              <div key={m.id} className="flex items-center justify-between gap-4 py-3 px-4 bg-white/5 hover:bg-white/[0.08] rounded-2xl transition-colors group">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {displayName.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-white font-medium text-sm truncate">
                      {displayName}
                      {isCurrentUser && <span className="ml-2 text-[10px] text-white/30 font-normal">(you)</span>}
                    </div>
                    <div className="text-white/30 text-xs">
                      Joined {m.created_at ? new Date(m.created_at).toLocaleDateString() : '—'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <select
                    value={m.role ?? 'admin'}
                    onChange={e => handleRoleChange(m.id, e.target.value)}
                    disabled={isPending || isCurrentUser}
                    className={`text-xs font-bold px-3 py-1.5 rounded-full border bg-transparent cursor-pointer focus:outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed ${ROLE_STYLES[m.role ?? 'admin'] ?? 'bg-white/5 text-white/40 border-white/10'}`}
                  >
                    <option value="admin" className="bg-[#0d0d0d] text-white">Admin</option>
                    <option value="staff" className="bg-[#0d0d0d] text-white">Staff</option>
                    <option value="finance" className="bg-[#0d0d0d] text-white">Finance</option>
                  </select>

                  {!isCurrentUser && (
                    <button
                      onClick={() => handleRemove(m.id, displayName)}
                      disabled={isPending}
                      className="text-white/20 hover:text-red-400 transition-colors text-xs disabled:opacity-20 opacity-0 group-hover:opacity-100"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
