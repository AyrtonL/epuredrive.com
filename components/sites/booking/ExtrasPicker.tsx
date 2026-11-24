'use client'

import { useState } from 'react'
import type { RentalExtra } from '@/lib/supabase/types'
import { CHOICE } from './styles'

interface Props {
  extras: RentalExtra[]
  selected: Record<string, boolean>
  onToggle: (id: string) => void
}

const priceLabel = (e: RentalExtra): string =>
  e.pricing_type === 'per_day' ? `+$${Number(e.price).toFixed(0)}/day` : `+$${Number(e.price).toFixed(0)}`

/** Optional add-ons, collapsed by default so they don't stand between the customer and "Reserve". */
export default function ExtrasPicker({ extras, selected, onToggle }: Props) {
  const count = extras.filter((e) => selected[e.id]).length
  const [open, setOpen] = useState(count > 0)

  if (extras.length === 0) return null

  return (
    <div className="rounded-2xl border border-white/10 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-white/[0.03] transition-colors"
      >
        <span className="text-sm font-semibold text-white">
          Add extras <span className="text-white/50 font-normal">(optional)</span>
        </span>
        <span className="flex items-center gap-2 text-xs text-white/60">
          {count > 0 && <span className="px-2 py-0.5 rounded-full bg-white/15 text-white font-bold">{count} added</span>}
          <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {open && (
        <div className="p-3 pt-0 space-y-2">
          {extras.map((extra) => {
            const checked = !!selected[extra.id]
            return (
              <button
                key={extra.id}
                type="button"
                role="checkbox"
                aria-checked={checked}
                onClick={() => onToggle(extra.id)}
                className={`w-full flex items-start gap-3 p-3.5 text-left ${CHOICE(checked)}`}
              >
                <span
                  className={`mt-0.5 w-5 h-5 shrink-0 rounded-md border flex items-center justify-center ${
                    checked ? 'bg-white border-white' : 'border-white/30'
                  }`}
                >
                  {checked && (
                    <svg className="w-3.5 h-3.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold">{extra.name}</span>
                  {extra.description && <span className="block text-xs text-white/50 mt-0.5 leading-snug">{extra.description}</span>}
                </span>
                <span className="text-sm font-semibold text-white/80 shrink-0">{priceLabel(extra)}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
