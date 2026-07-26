'use client'

import { useState, useRef, useEffect, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/style.css'
import { DARK_DAYPICKER_CSS } from './dayPickerTheme'

interface Props {
  value: string // 'YYYY-MM-DD' or ''
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  min?: string // 'YYYY-MM-DD' — dates before this are disabled
  max?: string // 'YYYY-MM-DD' — dates after this are disabled
  disabled?: boolean
  clearable?: boolean
}

function toDate(s: string): Date {
  return new Date(s + 'T12:00:00')
}

function toStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

function formatDisplay(s: string): string {
  return toDate(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const CalendarIcon = () => (
  <svg className="w-4 h-4 opacity-40 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z" />
  </svg>
)

export default function DatePicker({
  value, onChange, placeholder = 'Select date', className, min, max, disabled, clearable = true,
}: Props) {
  const [open, setOpen] = useState(false)
  const [popupStyle, setPopupStyle] = useState<CSSProperties>({})
  const [mounted, setMounted] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    function handler(e: MouseEvent) {
      const target = e.target as Node
      if (!triggerRef.current?.contains(target) && !popupRef.current?.contains(target)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    if (!open) return
    const reposition = () => {
      if (!triggerRef.current) return
      const rect = triggerRef.current.getBoundingClientRect()
      setPopupStyle((prev) => ({ ...prev, top: rect.bottom + 6, left: rect.left }))
    }
    window.addEventListener('scroll', reposition, { passive: true })
    window.addEventListener('resize', reposition)
    return () => {
      window.removeEventListener('scroll', reposition)
      window.removeEventListener('resize', reposition)
    }
  }, [open])

  function toggle() {
    if (disabled) return
    if (open) {
      setOpen(false)
      return
    }
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setPopupStyle({ position: 'fixed', top: rect.bottom + 6, left: rect.left, zIndex: 9999 })
    }
    setOpen(true)
  }

  const disabledMatchers: Array<{ before: Date } | { after: Date }> = []
  if (min) disabledMatchers.push({ before: toDate(min) })
  if (max) disabledMatchers.push({ after: toDate(max) })

  return (
    <div className="relative">
      <button
        type="button"
        ref={triggerRef}
        onClick={toggle}
        disabled={disabled}
        className={`text-left flex items-center justify-between gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${className ?? ''}`}
      >
        <span className={value ? '' : 'opacity-40'}>{value ? formatDisplay(value) : placeholder}</span>
        <CalendarIcon />
      </button>

      {open && mounted && createPortal(
        <div
          ref={popupRef}
          style={popupStyle}
          className="z-[9999] bg-[#0d0d0d] border border-white/10 rounded-3xl shadow-2xl p-4 overflow-hidden"
        >
          <style>{DARK_DAYPICKER_CSS}</style>
          <DayPicker
            mode="single"
            selected={value ? toDate(value) : undefined}
            onSelect={(d) => {
              if (d) {
                onChange(toStr(d))
                setOpen(false)
              }
            }}
            disabled={disabledMatchers.length ? disabledMatchers : undefined}
            defaultMonth={value ? toDate(value) : (min ? toDate(min) : new Date())}
            showOutsideDays={false}
          />
          {clearable && value && (
            <div className="border-t border-white/5 mt-1 pt-3 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  onChange('')
                  setOpen(false)
                }}
                className="text-[10px] font-bold text-white/25 hover:text-white/60 uppercase tracking-widest transition-colors"
              >
                Clear
              </button>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}
