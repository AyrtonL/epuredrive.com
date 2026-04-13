'use client'

import { useState, useTransition } from 'react'
import { inviteTeamMember } from './actions'

const ROLES = [
  { value: 'admin',   label: 'Admin',   desc: 'Full access' },
  { value: 'manager', label: 'Manager', desc: 'Ops + finance' },
  { value: 'staff',   label: 'Staff',   desc: 'Operations only' },
  { value: 'finance', label: 'Finance', desc: 'Finance only' },
]

export default function InviteModal({ canInvite }: { canInvite: boolean }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('staff')
  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleOpen() {
    setOpen(true)
    setEmail('')
    setRole('staff')
    setResult(null)
  }

  function handleClose() {
    setOpen(false)
    setResult(null)
  }

  function handleSubmit() {
    startTransition(async () => {
      const res = await inviteTeamMember(email.trim(), role)
      setResult(res)
      if (res.success) {
        setEmail('')
        setRole('staff')
      }
    })
  }

  if (!canInvite) {
    return (
      <a
        href="/dashboard/settings/billing"
        className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-amber-500/15 transition-all"
      >
        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        Upgrade to Pro
      </a>
    )
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="bg-white text-black px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-white/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
      >
        Invite Member
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) handleClose() }}
        >
          <div className="w-full max-w-sm bg-[#111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-fade-in">

            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-5 border-b border-white/[0.06]">
              <div>
                <h2 className="text-white font-bold text-sm">Invite team member</h2>
                <p className="text-white/30 text-[11px] mt-0.5">They&apos;ll get an email with a sign-in link.</p>
              </div>
              <button
                onClick={handleClose}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all text-base leading-none"
              >
                ×
              </button>
            </div>

            {result?.success ? (
              <div className="px-6 py-10 text-center space-y-3">
                <div className="w-10 h-10 mx-auto rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-white font-bold text-sm">Invitation sent</p>
                <p className="text-white/30 text-xs">Link expires in 24 hours.</p>
                <button
                  onClick={handleClose}
                  className="mt-1 text-white/30 text-xs font-bold uppercase tracking-widest hover:text-white/50 transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="px-6 py-5 space-y-5">

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-white/30 uppercase tracking-widest">Email</label>
                  <input
                    type="email"
                    placeholder="colleague@company.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    disabled={isPending}
                    onKeyDown={e => e.key === 'Enter' && email.trim() && handleSubmit()}
                    className="w-full bg-white/5 border border-white/[0.08] rounded-xl py-2.5 px-3.5 text-sm text-white placeholder:text-white/20 focus:ring-1 focus:ring-white/20 outline-none transition-all"
                  />
                </div>

                {/* Role — 2×2 grid */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-white/30 uppercase tracking-widest">Role</label>
                  <div className="grid grid-cols-2 gap-2">
                    {ROLES.map(r => (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => setRole(r.value)}
                        className={`text-left px-3.5 py-3 rounded-xl border transition-all ${
                          role === r.value
                            ? 'bg-white/10 border-white/25 text-white'
                            : 'bg-white/[0.02] border-white/[0.05] text-white/40 hover:border-white/10 hover:text-white/60'
                        }`}
                      >
                        <div className="text-xs font-bold">{r.label}</div>
                        <div className="text-[10px] mt-0.5 opacity-60 leading-snug">{r.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {result?.error && (
                  <p className="text-red-400 text-xs font-medium">{result.error}</p>
                )}

                {/* Footer */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleClose}
                    className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-white/40 text-xs font-bold hover:text-white/60 hover:border-white/15 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isPending || !email.trim()}
                    className="flex-1 py-2.5 bg-white text-black font-bold text-xs rounded-xl hover:bg-white/90 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {isPending ? 'Sending…' : 'Send invite'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
