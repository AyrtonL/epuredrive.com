'use client'

import { useState, useRef, useEffect, useLayoutEffect, CSSProperties } from 'react'
import { createPortal } from 'react-dom'
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
  theme?: 'dark' | 'light'
}

function toDate(s: string): Date {
  return new Date(s + 'T12:00:00')
}

function toStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

export default function DateRangePicker({
  pickDate, retDate, onPickDate, onRetDate, disabledRanges, theme = 'dark',
}: Props) {
  const isLight = theme === 'light'
  const [open, setOpen] = useState(false)
  const [popupStyle, setPopupStyle] = useState<CSSProperties>({})
  const [mounted, setMounted] = useState(false)
  const triggerRef = useRef<HTMLDivElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setMounted(true) }, [])

  // Close on outside click (checks both trigger and popup)
  useEffect(() => {
    function handler(e: MouseEvent) {
      const target = e.target as Node
      const outsideTrigger = !triggerRef.current?.contains(target)
      const outsidePopup = !popupRef.current?.contains(target)
      if (outsideTrigger && outsidePopup) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Reposition popup on window scroll (fixed position, so just update coords)
  useEffect(() => {
    if (!open) return
    const handler = () => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect()
        setPopupStyle(prev => ({ ...prev, top: rect.bottom + 8, left: rect.left }))
      }
    }
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [open])

  // Clamp the popup back onto the viewport if it would overflow the right
  // or bottom edge — important on mobile, where the trigger often sits
  // close to the screen edge.
  useLayoutEffect(() => {
    if (!open || !popupRef.current) return
    const margin = 8
    const rect = popupRef.current.getBoundingClientRect()
    let left = rect.left
    let top = rect.top
    if (rect.right > window.innerWidth - margin) {
      left = Math.max(margin, window.innerWidth - rect.width - margin)
    }
    if (rect.bottom > window.innerHeight - margin) {
      top = Math.max(margin, window.innerHeight - rect.height - margin)
    }
    if (left !== rect.left || top !== rect.top) {
      setPopupStyle(prev => ({ ...prev, left, top }))
    }
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

  // Whether the user has picked the start date and is now choosing the end
  const waitingForReturn = open && pickDate && !retDate

  function handleSelect(range: DateRange | undefined) {
    if (!range) {
      onPickDate('')
      onRetDate('')
      return
    }
    if (range.from) onPickDate(toStr(range.from))
    // react-day-picker v9 may return from===to on first click (single-day "range")
    const sameDay = range.from && range.to && toStr(range.from) === toStr(range.to)
    if (range.to && !sameDay) {
      onRetDate(toStr(range.to))
      setOpen(false) // close only after a real range is selected
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

  function toggleCalendar() {
    if (open) { setOpen(false); return }
    // Always start fresh so the user selects pickup → return in one flow
    if (pickDate || retDate) {
      onPickDate('')
      onRetDate('')
    }
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setPopupStyle({
        position: 'fixed',
        top: rect.bottom + 8,
        left: rect.left,
        minWidth: Math.max(rect.width, 320),
        zIndex: 9999,
      })
    }
    setOpen(true)
  }

  return (
    <div className="relative" ref={triggerRef}>
      {/* Single trigger — opens one calendar for both dates */}
      <button
        type="button"
        onClick={toggleCalendar}
        className={`w-full text-left border rounded-2xl px-4 py-3 text-xs focus:ring-1 focus:ring-primary/40 outline-none transition-colors ${
          isLight
            ? `bg-gray-50 text-gray-900 hover:border-gray-300 ${open ? 'border-primary/40 bg-primary/5' : 'border-gray-200'}`
            : `bg-white/5 text-white hover:border-white/10 ${open ? 'border-primary/40 bg-primary/5' : 'border-white/5'}`
        }`}
      >
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div>
            <span className={`block text-[9px] font-black uppercase tracking-widest mb-0.5 ${
              isLight
                ? (waitingForReturn ? 'text-gray-400' : 'text-gray-500')
                : (waitingForReturn ? 'text-white/30' : 'text-white/40')
            }`}>
              Pickup
            </span>
            <span className={pickDate ? (isLight ? 'text-gray-900 font-semibold' : 'text-white font-semibold') : (isLight ? 'text-gray-400' : 'text-white/40')}>
              {formatDisplay(pickDate)}
            </span>
          </div>
          <svg className={`w-3.5 h-3.5 flex-shrink-0 ${isLight ? 'text-gray-300' : 'text-white/20'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
          <div className="text-right">
            <span className={`block text-[9px] font-black uppercase tracking-widest mb-0.5 ${waitingForReturn ? 'text-primary/70' : (isLight ? 'text-gray-500' : 'text-white/40')}`}>
              Return
            </span>
            <span className={retDate ? (isLight ? 'text-gray-900 font-semibold' : 'text-white font-semibold') : waitingForReturn ? 'text-primary/50 animate-pulse' : (isLight ? 'text-gray-400' : 'text-white/40')}>
              {waitingForReturn ? 'Select...' : formatDisplay(retDate)}
            </span>
          </div>
        </div>
      </button>

      {/* Calendar popup — rendered via portal so it floats above all page content */}
      {open && mounted && createPortal(
        <div ref={popupRef} style={popupStyle} className="z-[9999] bg-[#0d0d0d] border border-white/10 rounded-3xl shadow-2xl p-5 overflow-hidden min-w-[320px]">
          <style>{`
            .rdp-root {
              --rdp-accent-color: rgba(255,255,255,0.2);
              --rdp-accent-background-color: rgba(255,255,255,0.2);
              --rdp-background-color: rgba(255,255,255,0.06);
              --rdp-day-font: inherit;
              --rdp-range_start-color: white;
              --rdp-range_end-color: white;
              --rdp-range_start-background: white;
              --rdp-range_end-background: white;
              --rdp-range_middle-background-color: rgba(255,255,255,0.18);
              --rdp-range_middle-color: #fff;
              --rdp-selected-color: black;
              --rdp-selected-font: inherit;
              color: rgba(255,255,255,0.9);
              font-size: 0.8rem;
            }
            .rdp-root * { box-sizing: border-box; }
            .rdp-month_caption {
              color: white;
              font-size: 0.7rem;
              font-weight: 900;
              letter-spacing: 0.12em;
              text-transform: uppercase;
              margin-bottom: 16px;
              padding-bottom: 12px;
              border-bottom: 1px solid rgba(255,255,255,0.06);
            }
            .rdp-weekday {
              color: rgba(255,255,255,0.35);
              font-size: 0.6rem;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.08em;
              padding-bottom: 8px;
            }
            .rdp-day_button {
              width: 36px;
              height: 36px;
              border-radius: 10px;
              font-size: 0.78rem;
              font-weight: 600;
              transition: background 0.15s, color 0.15s;
            }
            .rdp-day_button:hover:not([disabled]) {
              background: rgba(255,255,255,0.12);
              color: white;
            }
            .rdp-selected .rdp-day_button {
              background: white !important;
              color: black !important;
              font-weight: 800;
              border-radius: 10px;
            }
            .rdp-range_middle .rdp-day_button,
            .rdp-selected.rdp-range_middle .rdp-day_button {
              background: rgba(255,255,255,0.18) !important;
              color: #ffffff !important;
              font-weight: 700;
              border-radius: 0 !important;
            }
            .rdp-range_start .rdp-day_button,
            .rdp-selected.rdp-range_start .rdp-day_button {
              background: white !important;
              color: black !important;
              border-radius: 10px 0 0 10px !important;
              font-weight: 800;
            }
            .rdp-range_end .rdp-day_button,
            .rdp-selected.rdp-range_end .rdp-day_button {
              background: white !important;
              color: black !important;
              border-radius: 0 10px 10px 0 !important;
              font-weight: 800;
            }
            .rdp-range_start.rdp-range_end .rdp-day_button {
              border-radius: 10px !important;
            }
            .rdp-day[aria-disabled="true"] .rdp-day_button {
              color: rgba(255,255,255,0.25);
              text-decoration: line-through;
              cursor: not-allowed;
            }
            .rdp-today:not(.rdp-selected) .rdp-day_button {
              color: white;
              border: 1px solid rgba(255,255,255,0.3);
            }
            .rdp-nav button {
              color: rgba(255,255,255,0.4);
              background: none;
              border: none;
              width: 28px;
              height: 28px;
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              transition: background 0.15s, color 0.15s;
            }
            .rdp-nav button:hover {
              color: white;
              background: rgba(255,255,255,0.1);
            }
            .rdp-outside .rdp-day_button { opacity: 0; pointer-events: none; }
          `}</style>
          <DayPicker
            mode="range"
            selected={selected}
            onSelect={handleSelect}
            disabled={disabledMatchers}
            defaultMonth={pickDate ? toDate(pickDate) : today}
            showOutsideDays={false}
          />
          <div className="border-t border-white/5 mt-1 pt-3 flex justify-between items-center">
            <span className={`text-[10px] uppercase tracking-widest font-bold ${pickDate && !retDate ? 'text-primary/60' : 'text-white/20'}`}>
              {pickDate && retDate ? 'Range selected' : pickDate ? 'Now tap return date' : 'Tap your pickup date'}
            </span>
            <button
              type="button"
              onClick={() => { onPickDate(''); onRetDate(''); }}
              className="text-[10px] font-bold text-white/25 hover:text-white/60 uppercase tracking-widest transition-colors"
            >
              Clear
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
