'use client'

import { useState, useTransition } from 'react'
import { applySuggestedRate } from './actions'

export default function ApplyRateButton({ carId, rate, current }: { carId: number; rate: number; current: number | null }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  if (current === rate) {
    return <span className="text-[11px] text-emerald-400/80 font-bold uppercase tracking-widest">Applied</span>
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          const from = current != null ? `$${current}` : 'no price'
          if (!window.confirm(`Change the daily rate from ${from} to $${rate}? New bookings on your site will use it.`)) return
          setError(null)
          startTransition(async () => {
            const res = await applySuggestedRate(carId, rate)
            if (res.error) setError(res.error)
          })
        }}
        className="px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-widest border border-white/[0.14] bg-white/[0.06] text-white/85 hover:bg-white hover:text-black transition-colors disabled:opacity-50"
      >
        {pending ? 'Saving…' : `Use $${rate}`}
      </button>
      {error && <span className="text-[11px] text-red-400">{error}</span>}
    </div>
  )
}
