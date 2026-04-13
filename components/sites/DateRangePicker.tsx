'use client'

import { useState, useRef, useEffect } from 'react'
import { DayPicker, type DateRange } from 'react-day-picker'
import 'react-day-picker/style.css'

interface DisabledRange {
  from: string // 'YYYY-MM-DD'
  to: string   // 'YYYY-MM-DD'
}

interface Props {
  pickDate: string   // 'YYYY-MM-DD' or ''
  retDate: string    // 'YYYY-MM-DD' or ''
  onPickDate: (d: string) => void
  onRetDate: (d: string) => void
  disabledRanges: DisabledRange[]
}

function toDate(s: string): Date {
  return new Date(s + 'T12:00:00')
}

function toStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

export default function DateRangePicker({
  pickDate, retDate, onPickDate, onRetDate, disabledRanges,
}: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Build disabled matchers for react-day-picker
  const disabledMatchers = [
    { before: today },
    ...disabledRanges.map(r => ({
      from: toDate(r.from),
      to: toDate(r.to),
    })),
  ]

  const selected: DateRange | undefined =
    pickDate
      ? {
          from: toDate(pickDate),
          to: retDate ? toDate(retDate) : undefined,
        }
      : undefined

  function handleSelect(range: DateRange | undefined) {
    if (!range) {
      onPickDate('')
      onRetDate('')
      return
    }
    if (range.from) onPickDate(toStr(range.from))
    if (range.to) {
      onRetDate(toStr(range.to))
      setOpen(false) // close after full range selected
    } else {
      onRetDate('')
    }
  }

  function formatDisplay(d: string) {
    if (!d) return 'Select'
    return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    })
  }

  return (
    <div className="relative" ref={ref}>
      {/* Trigger row */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className="text-left bg-white/5 border border-white/5 rounded-2xl px-4 py-3 text-xs text-white focus:ring-1 focus:ring-primary/40 outline-none hover:border-white/10 transition-colors"
        >
          <span className="block text-[9px] font-black text-white/30 uppercase tracking-widest mb-0.5">
            Pickup
          </span>
          <span className={pickDate ? 'text-white' : 'text-white/25'}>
            {formatDisplay(pickDate)}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className="text-left bg-white/5 border border-white/5 rounded-2xl px-4 py-3 text-xs text-white focus:ring-1 focus:ring-primary/40 outline-none hover:border-white/10 transition-colors"
        >
          <span className="block text-[9px] font-black text-white/30 uppercase tracking-widest mb-0.5">
            Return
          </span>
          <span className={retDate ? 'text-white' : 'text-white/25'}>
            {formatDisplay(retDate)}
          </span>
        </button>
      </div>

      {/* Calendar popup */}
      {open && (
        <div className="absolute z-50 top-full mt-2 left-0 bg-[#111] border border-white/10 rounded-2xl shadow-2xl p-4 overflow-hidden">
          <style>{`
            .rdp-root {
              --rdp-accent-color: var(--color-primary, #3B82F6);
              --rdp-background-color: rgba(255,255,255,0.08);
              --rdp-day-font: inherit;
              color: rgba(255,255,255,0.8);
            }
            .rdp-day_button:hover:not([disabled]) { background: rgba(255,255,255,0.1); }
            .rdp-day[aria-disabled="true"] .rdp-day_button {
              color: rgba(255,255,255,0.15);
              text-decoration: line-through;
              cursor: not-allowed;
            }
            .rdp-month_caption { color: rgba(255,255,255,0.6); font-size: 0.75rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; }
            .rdp-weekday { color: rgba(255,255,255,0.3); font-size: 0.65rem; font-weight: 800; text-transform: uppercase; }
            .rdp-nav button { color: rgba(255,255,255,0.4); }
            .rdp-nav button:hover { color: white; }
          `}</style>
          <DayPicker
            mode="range"
            selected={selected}
            onSelect={handleSelect}
            disabled={disabledMatchers}
            defaultMonth={pickDate ? toDate(pickDate) : today}
            showOutsideDays={false}
          />
          <button
            type="button"
            onClick={() => { onPickDate(''); onRetDate(''); }}
            className="w-full text-center text-[10px] font-bold text-white/25 hover:text-white/50 uppercase tracking-widest mt-1 py-1 transition-colors"
          >
            Clear dates
          </button>
        </div>
      )}
    </div>
  )
}
