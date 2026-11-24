'use client'

import type { PriceLine } from '@/lib/booking/priceLines'
import { formatMoney } from '@/lib/utils/format'

interface Props {
  lines: PriceLine[]
  totalCents: number
  hasDates: boolean
}

const money = (cents: number): string => formatMoney(cents / 100, { cents: 'always' })

/** Itemized total so the customer can see where every dollar comes from. */
export default function PriceSummary({ lines, totalCents, hasDates }: Props) {
  if (!hasDates) {
    return (
      <div className="rounded-2xl border border-dashed border-white/15 px-4 py-4 text-sm text-white/60 text-center">
        Choose your dates to see the total price.
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-4 space-y-2.5" aria-live="polite">
      {lines.map((line) => (
        <div key={line.label} className="flex items-start justify-between gap-4 text-sm">
          <span className="text-white/65">{line.label}</span>
          <span className="text-white/85 tabular-nums shrink-0">{money(line.cents)}</span>
        </div>
      ))}
      <div className="flex items-baseline justify-between gap-4 pt-3 mt-1 border-t border-white/10">
        <span className="text-sm font-bold text-white">Total</span>
        <span className="text-2xl font-black text-white tracking-tight tabular-nums">{money(totalCents)}</span>
      </div>
    </div>
  )
}
