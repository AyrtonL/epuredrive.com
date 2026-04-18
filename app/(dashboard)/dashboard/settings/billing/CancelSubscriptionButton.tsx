'use client'

import { useState } from 'react'
import { cancelSubscription } from './actions'

interface Props {
  plan: string
}

export default function CancelSubscriptionButton({ plan }: Props) {
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  if (plan === 'free' || plan === 'deactivated') return null

  if (done) {
    return (
      <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Subscription will cancel at end of billing period.
      </div>
    )
  }

  if (confirming) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <span className="text-amber-400 text-xs font-bold">Cancel your {plan} subscription?</span>
          <button
            onClick={async () => {
              setLoading(true)
              setError(null)
              try {
                const result = await cancelSubscription()
                if (result.error) {
                  setError(result.error)
                } else {
                  setDone(true)
                }
              } catch {
                setError('Something went wrong.')
              } finally {
                setLoading(false)
              }
            }}
            disabled={loading}
            className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50"
          >
            {loading ? 'Cancelling…' : 'Yes, cancel'}
          </button>
          <button
            onClick={() => { setConfirming(false); setError(null) }}
            disabled={loading}
            className="bg-white/5 hover:bg-white/10 text-white/60 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
          >
            Keep plan
          </button>
        </div>
        <p className="text-white/30 text-[10px]">You&apos;ll keep access until the end of your current billing period.</p>
        {error && <p className="text-red-400 text-xs">{error}</p>}
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-white/30 text-[10px] font-bold uppercase tracking-widest hover:text-white/50 transition-colors underline underline-offset-4"
    >
      Cancel subscription
    </button>
  )
}
