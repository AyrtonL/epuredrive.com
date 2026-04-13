'use client'

import { useState, useTransition } from 'react'
import { inviteTeamMember } from './actions'

const ROLES = [
  { value: 'admin', label: 'Admin', desc: 'Full access including settings and team management' },
  { value: 'manager', label: 'Manager', desc: 'Operations + financial data, no settings' },
  { value: 'staff', label: 'Staff', desc: 'Day-to-day operations only' },
  { value: 'finance', label: 'Finance', desc: 'Financial modules only' },
]

export default function InviteModal() {
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

  const inputCls = 'w-full bg-white/5 border border-white/5 rounded-2xl py-3 px-4 text-sm text-white placeholder:text-white/20 focus:ring-1 focus:ring-white/20 outline-none transition-all'
  const labelCls = 'block text-[10px] font-black text-white/30 uppercase tracking-widest mb-2'

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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) handleClose() }}
        >
          <div className="glass border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl space-y-6 animate-fade-in">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-white font-bold text-lg">Invite Team Member</h2>
                <p className="text-white/40 text-xs mt-1">They&apos;ll receive an email to set their password.</p>
              </div>
              <button
                onClick={handleClose}
                className="text-white/30 hover:text-white/60 transition-colors text-xl leading-none"
              >
                ×
              </button>
            </div>

            {result?.success ? (
              <div className="text-center py-6 space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-white font-bold text-sm">Invitation sent!</p>
                <p className="text-white/40 text-xs">They&apos;ll receive a link valid for 24 hours.</p>
                <button
                  onClick={handleClose}
                  className="mt-2 text-white/40 text-xs font-bold uppercase tracking-widest hover:text-white/60 transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div>
                    <label className={labelCls}>Email address</label>
                    <input
                      type="email"
                      placeholder="colleague@company.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className={inputCls}
                      disabled={isPending}
                      onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Role</label>
                    <div className="space-y-2">
                      {ROLES.map(r => (
                        <button
                          key={r.value}
                          type="button"
                          onClick={() => setRole(r.value)}
                          className={`w-full text-left p-4 rounded-2xl border transition-all ${
                            role === r.value
                              ? 'bg-white/10 border-white/20 text-white'
                              : 'bg-white/[0.02] border-white/[0.04] text-white/40 hover:border-white/10'
                          }`}
                        >
                          <div className="text-xs font-bold">{r.label}</div>
                          <div className="text-[10px] mt-0.5 opacity-60">{r.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {result?.error && (
                  <p className="text-red-400 text-xs font-bold px-1">{result.error}</p>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={isPending || !email.trim()}
                  className="w-full bg-white text-black font-black uppercase tracking-[0.15em] text-[11px] py-4 rounded-2xl hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
                >
                  {isPending ? 'Sending…' : 'Send Invitation'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
