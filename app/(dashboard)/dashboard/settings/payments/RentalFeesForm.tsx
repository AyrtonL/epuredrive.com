'use client'

import { useState, useTransition } from 'react'
import { updateRentalFees } from '@/app/(dashboard)/dashboard/settings/actions'

interface Props {
  initialValue: number | null
}

export default function RentalFeesForm({ initialValue }: Props) {
  const [value, setValue] = useState<string>(initialValue != null ? String(initialValue) : '')
  const [isPending, startTransition] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = value === '' ? null : parseFloat(value)
    startTransition(async () => {
      const result = await updateRentalFees({ fuel_charge_per_level: parsed })
      setMsg(result.error ? `Error: ${result.error}` : 'Saved')
      setTimeout(() => setMsg(null), 3000)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">
          Fuel Charge Per Level
        </label>
        <div className="flex items-center gap-2 max-w-xs">
          <span className="text-white/40 text-sm">$</span>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="20.00"
            value={value}
            onChange={e => setValue(e.target.value)}
            className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white"
          />
        </div>
        <p className="text-[11px] text-white/30">
          Charged per fuel level missing at return (e.g. Full → 1/2 = 2 levels). Leave blank to use $20 default.
        </p>
      </div>
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={isPending}
          className="bg-white/10 hover:bg-white/15 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors disabled:opacity-50"
        >
          {isPending ? 'Saving...' : 'Save'}
        </button>
        {msg && (
          <span className={`text-sm ${msg.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'}`}>
            {msg}
          </span>
        )}
      </div>
    </form>
  )
}
