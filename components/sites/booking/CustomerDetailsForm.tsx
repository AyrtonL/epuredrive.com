'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { validateCustomer, type CustomerInput } from '@/lib/booking/customer'
import { FIELD, FIELD_ERROR, LABEL, PRIMARY_BTN } from './styles'

interface Props {
  value: CustomerInput
  onChange: (next: CustomerInput) => void
  onSubmit: () => void
  onBack: () => void
  submitting: boolean
  submitLabel: string
  submittingLabel: string
  serverError: string
}

type Field = keyof CustomerInput

const FIELDS: { key: Field; label: string; type: string; autoComplete: string; inputMode?: 'email' | 'tel'; placeholder: string }[] = [
  { key: 'name', label: 'Full name', type: 'text', autoComplete: 'name', placeholder: 'Jane Smith' },
  { key: 'email', label: 'Email', type: 'email', autoComplete: 'email', inputMode: 'email', placeholder: 'jane@example.com' },
  { key: 'phone', label: 'Phone (optional)', type: 'tel', autoComplete: 'tel', inputMode: 'tel', placeholder: '(305) 555-0101' },
]

/** Contact step. Scrolls itself into view and focuses the first field when it opens. */
export default function CustomerDetailsForm({ value, onChange, onSubmit, onBack, submitting, submitLabel, submittingLabel, serverError }: Props) {
  const rootRef = useRef<HTMLFormElement>(null)
  const firstRef = useRef<HTMLInputElement>(null)
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({})
  const errors = useMemo(() => validateCustomer(value), [value])

  useEffect(() => {
    rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    const t = window.setTimeout(() => firstRef.current?.focus({ preventScroll: true }), 400)
    return () => window.clearTimeout(t)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setTouched({ name: true, email: true, phone: true })
    if (Object.keys(errors).length > 0) return
    onSubmit()
  }

  return (
    <form ref={rootRef} onSubmit={handleSubmit} noValidate className="space-y-4 scroll-mt-28">
      <div className="text-base font-bold text-white">Your details</div>
      {FIELDS.map((f, i) => {
        const err = touched[f.key] ? errors[f.key] : undefined
        return (
          <div key={f.key}>
            <label htmlFor={`booking-${f.key}`} className={LABEL}>{f.label}</label>
            <input
              id={`booking-${f.key}`}
              ref={i === 0 ? firstRef : undefined}
              type={f.type}
              name={f.key}
              autoComplete={f.autoComplete}
              inputMode={f.inputMode}
              autoCapitalize={f.key === 'name' ? 'words' : 'off'}
              enterKeyHint={i === FIELDS.length - 1 ? 'done' : 'next'}
              placeholder={f.placeholder}
              value={value[f.key]}
              aria-invalid={!!err}
              aria-describedby={err ? `booking-${f.key}-err` : undefined}
              onChange={(e) => onChange({ ...value, [f.key]: e.target.value })}
              onBlur={() => setTouched((t) => ({ ...t, [f.key]: true }))}
              className={`${FIELD} ${err ? FIELD_ERROR : ''}`}
            />
            {err && <p id={`booking-${f.key}-err`} className="text-red-400 text-xs mt-1.5 ml-1">{err}</p>}
          </div>
        )
      })}

      {serverError && (
        <div role="alert" className="text-red-300 text-sm bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3">
          {serverError}
        </div>
      )}

      <button type="submit" disabled={submitting} className={PRIMARY_BTN}>
        {submitting ? submittingLabel : submitLabel}
      </button>
      <button
        type="button"
        onClick={onBack}
        className="w-full text-white/60 text-sm py-2 hover:text-white transition-colors"
      >
        ← Change dates or extras
      </button>
    </form>
  )
}
