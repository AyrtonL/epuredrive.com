'use client'

import { useState, useRef, useEffect, CSSProperties } from 'react'
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
  const [popupStyle, setPopupStyle] = useState<CSSProperties>({})
  const [mounted, setMounted] = useState(false)
  // Tracks which field the user is actively setting: 'pick' or 'ret'
  const [activeField, setActiveField] = useState<'pick' | 'ret'>('pick')
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

  // Close on scroll so popup doesn't drift
  useEffect(() => {
    if (!open) return
    const handler = () => setOpen(false)
    window.addEventListener('scroll', handler, true)
    return () => window.removeEventListener('scroll', handler, true)
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
      setActiveField('pick')
      return
    }
    if (range.from) onPickDate(toStr(range.from))
    if (range.to) {
      onRetDate(toStr(range.to))
      setActiveField('pick') // reset for next interaction
      setOpen(false) // close after full range selected
    } else {
      onRetDate('')
      setActiveField('ret') // user just picked the start — now picking end
    }
  }

  function formatDisplay(d: string) {
    if (!d) return 'Select'
    return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    })
  }

  function openCalendar(field: 'pick' | 'ret') {
    if (open) { setOpen(false); return }
    // If user clicks Return and pickup is already set, go straight to return selection
    if (field === 'ret' && pickDate && !retDate) {
      setActiveField('ret')
    } else if (field === 'pick') {
      // Clicking pickup resets the range so user starts fresh
      setActiveField('pick')
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
      {/* Trigger row */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => openCalendar('pick')}
          className={`text-left bg-white/5 border rounded-2xl px-4 py-3 text-xs text-white focus:ring-1 focus:ring-primary/40 outline-none hover:border-white/10 transition-colors ${open && activeField === 'pick' ? 'border-primary/40 bg-primary/5' : 'border-white/5'}`}
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
          onClick={() => openCalendar('ret')}
          className={`text-left bg-white/5 border rounded-2xl px-4 py-3 text-xs text-white focus:ring-1 focus:ring-primary/40 outline-none hover:border-white/10 transition-colors ${open && activeField === 'ret' ? 'border-primary/40 bg-primary/5' : 'border-white/5'}`}
        >
          <span className="block text-[9px] font-black text-white/30 uppercase tracking-widest mb-0.5">
            Return
          </span>
          <span className={retDate ? 'text-white' : 'text-white/25'}>
            {formatDisplay(retDate)}
          </span>
        </button>
      </div>

      {/* Calendar popup — rendered via portal so it floats above all page content */}
      {open && mounted && createPortal(
        <div ref={popupRef} style={popupStyle} className="z-[9999] bg-[#0d0d0d] border border-white/10 rounded-3xl shadow-2xl p-5 overflow-hidden min-w-[320px]">
          <style>{`
            .rdp-root {
              --rdp-accent-color: rgba(255,255,255,0.15);
              --rdp-background-color: rgba(255,255,255,0.06);
              --rdp-day-font: inherit;
              --rdp-range_start-color: white;
              --rdp-range_end-color: white;
              --rdp-selected-color: black;
              color: rgba(255,255,255,0.75);
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
              color: rgba(255,255,255,0.2);
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
              background: rgba(255,255,255,0.08);
              color: white;
            }
            .rdp-selected .rdp-day_button {
              background: white !important;
              color: black !important;
              font-weight: 800;
              border-radius: 10px;
            }
            .rdp-range_middle .rdp-day_button {
              background: rgba(255,255,255,0.07) !important;
              color: rgba(255,255,255,0.85) !important;
              border-radius: 0 !important;
            }
            .rdp-range_start .rdp-day_button {
              background: white !important;
              color: black !important;
              border-radius: 10px 0 0 10px !important;
              font-weight: 800;
            }
            .rdp-range_end .rdp-day_button {
              background: white !important;
              color: black !important;
              border-radius: 0 10px 10px 0 !important;
              font-weight: 800;
            }
            .rdp-range_start.rdp-range_end .rdp-day_button {
              border-radius: 10px !important;
            }
            .rdp-day[aria-disabled="true"] .rdp-day_button {
              color: rgba(255,255,255,0.12);
              text-decoration: line-through;
              cursor: not-allowed;
            }
            .rdp-today:not(.rdp-selected) .rdp-day_button {
              color: white;
              border: 1px solid rgba(255,255,255,0.2);
            }
            .rdp-nav button {
              color: rgba(255,255,255,0.3);
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
              background: rgba(255,255,255,0.08);
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
              {pickDate && retDate ? 'Range selected' : pickDate ? '← Now select return date' : '← Select pickup date'}
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
