'use client'

import { useTransition, useState } from 'react'
import { createCheckoutSession } from './actions'

interface Props {
  planName: string
  isCurrent: boolean
}

export default function UpgradeButton({ planName, isCurrent }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  if (isCurrent) {
    return (
      <button
        disabled
        className="w-full py-3 rounded-xl text-sm font-bold bg-white/5 text-white/30 cursor-default border border-white/5"
      >
        Current Plan
      </button>
    )
  }

  if (planName === 'free') {
    return (
      <button
        disabled
        className="w-full py-3 rounded-xl text-sm font-bold bg-white/5 text-white/30 cursor-default border border-white/5"
      >
        Free
      </button>
    )
  }

  return (
    <div>
      <button
        onClick={() => {
          setError(null)
          startTransition(async () => {
            const result = await createCheckoutSession(planName.toLowerCase())
            if (result.error) setError(result.error)
          })
        }}
        disabled={isPending}
        className="w-full py-3 rounded-xl text-sm font-bold bg-white text-black hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
      >
        {isPending ? 'Redirecting...' : 'Upgrade'}
      </button>
      {error && (
        <p className="text-red-400 text-xs mt-2 text-center">{error}</p>
      )}
    </div>
  )
}
