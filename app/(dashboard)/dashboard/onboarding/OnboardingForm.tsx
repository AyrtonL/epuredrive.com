'use client'

import { useState, useTransition } from 'react'
import { completeOnboarding } from './actions'

export default function OnboardingForm({ email }: { email: string }) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    setError('')
    startTransition(async () => {
      const result = await completeOnboarding(firstName, lastName)
      if (result?.error) setError(result.error)
    })
  }

  const inputCls =
    'w-full bg-white/5 border border-white/[0.08] rounded-xl py-3 px-4 text-sm text-white placeholder:text-white/20 focus:ring-1 focus:ring-white/20 outline-none transition-all'

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Welcome card */}
      <div className="glass border border-white/10 rounded-2xl p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4 text-xl">
            👋
          </div>
          <h1 className="text-white font-bold text-lg">Welcome to éPure Drive</h1>
          <p className="text-white/30 text-xs leading-relaxed">
            You&apos;ve been invited. Before you continue, tell us your name.
          </p>
          <p className="text-white/20 text-[10px]">{email}</p>
        </div>

        <div className="section-divider" />

        {/* Form */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-black text-white/30 uppercase tracking-widest">
                First name
              </label>
              <input
                type="text"
                placeholder="Maria"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                disabled={isPending}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                className={inputCls}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-black text-white/30 uppercase tracking-widest">
                Last name
              </label>
              <input
                type="text"
                placeholder="García"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                disabled={isPending}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                className={inputCls}
              />
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-xs font-medium">{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={isPending || !firstName.trim() || !lastName.trim()}
            className="w-full bg-white text-black font-bold text-xs py-3 rounded-xl hover:bg-white/90 transition-all disabled:opacity-30 disabled:cursor-not-allowed mt-1"
          >
            {isPending ? 'Saving…' : 'Continue to dashboard →'}
          </button>
        </div>
      </div>
    </div>
  )
}
