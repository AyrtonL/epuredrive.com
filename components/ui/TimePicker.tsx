'use client'

import { useState, useRef, useEffect, useMemo, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  value: string // 'HH:MM' 24h, or ''
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  step?: 15 | 30 | 60
  disabled?: boolean
}

function formatDisplay(value: string): string {
  const [hStr, mStr] = value.split(':')
  const h = Number(hStr)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${mStr} ${ampm}`
}

function buildOptions(step: number): string[] {
  const options: string[] = []
  for (let mins = 0; mins < 24 * 60; mins += step) {
    const h = Math.floor(mins / 60)
    const m = mins % 60
    options.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`)
  }
  return options
}

const ClockIcon = () => (
  <svg className="w-4 h-4 opacity-40 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <circle cx="12" cy="12" r="9" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 3" />
  </svg>
)

export default function TimePicker({
  value, onChange, placeholder = 'Select time', className, step = 30, disabled,
}: Props) {
  const [open, setOpen] = useState(false)
  const [popupStyle, setPopupStyle] = useState<CSSProperties>({})
  const [mounted, setMounted] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const options = useMemo(() => buildOptions(step), [step])

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

  useEffect(() => {
    if (!open || !listRef.current) return
    const selectedEl = listRef.current.querySelector<HTMLButtonElement>('[data-selected="true"]')
    selectedEl?.scrollIntoView({ block: 'center' })
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
        <ClockIcon />
      </button>

      {open && mounted && createPortal(
        <div
          ref={popupRef}
          style={popupStyle}
          className="z-[9999] bg-[#0d0d0d] border border-white/10 rounded-2xl shadow-2xl overflow-hidden w-36"
        >
          <div ref={listRef} className="max-h-64 overflow-y-auto custom-scrollbar py-1.5">
            {options.map((opt) => {
              const selected = opt === value
              return (
                <button
                  key={opt}
                  type="button"
                  data-selected={selected}
                  onClick={() => {
                    onChange(opt)
                    setOpen(false)
                  }}
                  className={`w-full text-left px-4 py-2 text-sm font-medium transition-colors ${
                    selected ? 'bg-white text-black font-bold' : 'text-white/75 hover:bg-white/10'
                  }`}
                >
                  {formatDisplay(opt)}
                </button>
              )
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
