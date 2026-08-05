'use client'

import { useState, useTransition, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { Reservation, Car, RentalExtra, ReservationExtra } from '@/lib/supabase/types'
import {
  createReservation,
  updateReservation,
  sendAgreement,
  getAgreementViewUrl,
  getAgreementEmailIssue,
  getLatestOdometer,
  searchCustomersForBooking,
  type CustomerLookup,
} from './actions'
import ModalPortal from '@/components/ui/ModalPortal'
import FuelSummary from '@/components/dashboard/FuelSummary'
import TenantCloseOut from './TenantCloseOut'
import DatePicker from '@/components/ui/DatePicker'
import TimePicker from '@/components/ui/TimePicker'
import { calculateCardSurcharge } from '@/lib/pricing/cardSurcharge'

interface Props {
  isOpen: boolean
  onClose: () => void
  reservation?: Reservation | null
  cars: Car[]
  rentalExtras: RentalExtra[]
  chargePerLevel: number
  cardSurchargeRate: number | null
}

type TabKey = 'customer' | 'trip' | 'charges' | 'vehicle' | 'agreement'

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'customer', label: 'Customer' },
  { key: 'trip', label: 'Trip' },
  { key: 'charges', label: 'Charges' },
  { key: 'vehicle', label: 'Vehicle State' },
  { key: 'agreement', label: 'Agreement' },
]

const STATUS_OPTIONS: Array<{ value: string; label: string; color: string }> = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' },
  { value: 'confirmed', label: 'Confirmed', color: 'bg-green-500/20 text-green-300 border-green-500/40' },
  { value: 'active', label: 'Active', color: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  { value: 'completed', label: 'Completed', color: 'bg-white/10 text-white/60 border-white/20' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-500/20 text-red-300 border-red-500/40' },
]

const INPUT_CLASS = 'w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white'
const LABEL_CLASS = 'text-[11px] font-bold text-white/50 uppercase tracking-widest'
const SECTION_HEADING = 'text-[11px] font-bold text-white/30 uppercase tracking-widest'

function calcNights(pickup: string | null | undefined, ret: string | null | undefined): number | null {
  if (!pickup || !ret) return null
  const p = new Date(pickup)
  const r = new Date(ret)
  if (Number.isNaN(p.getTime()) || Number.isNaN(r.getTime())) return null
  const diff = Math.round((r.getTime() - p.getTime()) / 86_400_000)
  return diff >= 0 ? diff : null
}

export default function BookingModal({ isOpen, onClose, reservation, cars, rentalExtras, chargePerLevel, cardSurchargeRate }: Props) {
  const [isPending, startTransition] = useTransition()
  const [isSendingAgreement, setIsSendingAgreement] = useTransition()
  const [isOpeningAgreement, setIsOpeningAgreement] = useTransition()
  const [errorStr, setErrorStr] = useState<string | null>(null)
  const [conflict, setConflict] = useState<string | null>(null)
  const [agreementMsg, setAgreementMsg] = useState<string | null>(null)
  const [agreementCc, setAgreementCc] = useState('')
  const [agreementEmailIssue, setAgreementEmailIssue] = useState<{ label: string | null; occurredAt: string | null }>({
    label: null,
    occurredAt: null,
  })
  const router = useRouter()

  const [formData, setFormData] = useState<Partial<Reservation>>({})
  const [activeTab, setActiveTab] = useState<TabKey>('customer')
  const [autoOdometerOut, setAutoOdometerOut] = useState(false)
  const [autoOdometerIn, setAutoOdometerIn] = useState(false)

  const [customerSearch, setCustomerSearch] = useState('')
  const [customerResults, setCustomerResults] = useState<CustomerLookup[]>([])
  const [showCustomerResults, setShowCustomerResults] = useState(false)
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false)

  useEffect(() => {
    if (reservation) setFormData(reservation)
    else setFormData({ status: 'pending', source: 'admin' })
    setErrorStr(null)
    setAutoOdometerOut(false)
    setAutoOdometerIn(false)
    setCustomerSearch('')
    setCustomerResults([])
    setShowCustomerResults(false)
    setActiveTab('customer')
    setAgreementMsg(null)
  }, [reservation, isOpen])

  // Customer typeahead — only when creating a new booking
  useEffect(() => {
    if (reservation) return
    const q = customerSearch.trim()
    if (q.length < 2) {
      setCustomerResults([])
      setIsSearchingCustomer(false)
      return
    }
    setIsSearchingCustomer(true)
    const handler = setTimeout(async () => {
      const { results } = await searchCustomersForBooking(q)
      setCustomerResults(results)
      setIsSearchingCustomer(false)
    }, 250)
    return () => clearTimeout(handler)
  }, [customerSearch, reservation])

  // Auto-fill odometer from telematics on existing reservations
  useEffect(() => {
    if (!isOpen || !reservation?.car_id) return
    let cancelled = false
    ;(async () => {
      const latest = await getLatestOdometer(Number(reservation.car_id))
      if (cancelled || latest == null) return
      setFormData((prev) => {
        const next = { ...prev }
        let filledOut = false
        let filledIn = false
        if (prev.odometer_out == null || prev.odometer_out === 0) {
          next.odometer_out = latest
          filledOut = true
        }
        if (prev.odometer_in == null || prev.odometer_in === 0) {
          next.odometer_in = latest
          filledIn = true
        }
        if (filledOut) setAutoOdometerOut(true)
        if (filledIn) setAutoOdometerIn(true)
        return next
      })
    })()
    return () => {
      cancelled = true
    }
  }, [isOpen, reservation?.car_id])

  // Surface bounce/complaint/delay events Resend reported for the agreement email
  useEffect(() => {
    if (!isOpen || !reservation?.id || !reservation.agreement_sent_at) {
      setAgreementEmailIssue({ label: null, occurredAt: null })
      return
    }
    let cancelled = false
    getAgreementEmailIssue(reservation.id).then((result) => {
      if (!cancelled) setAgreementEmailIssue(result)
    })
    return () => {
      cancelled = true
    }
  }, [isOpen, reservation?.id, reservation?.agreement_sent_at])

  const isEditing = !!reservation
  const carName = useMemo(() => {
    const c = cars.find((c) => c.id === Number(formData.car_id))
    return c ? `${c.make} ${c.model_full || c.model}` : null
  }, [cars, formData.car_id])
  const nights = calcNights(formData.pickup_date, formData.return_date)

  const expirationWarnings = useMemo(() => {
    const returnDate = formData.return_date
    if (!returnDate) return []
    const warnings: string[] = []
    if (formData.license_expiration_date && formData.license_expiration_date < returnDate) {
      warnings.push('Driver license expires before the return date.')
    }
    if (formData.insurance_expiration_date && formData.insurance_expiration_date < returnDate) {
      warnings.push('Insurance policy expires before the return date.')
    }
    return warnings
  }, [formData.return_date, formData.license_expiration_date, formData.insurance_expiration_date])

  if (!isOpen) return null

  function toggleExtra(extra: RentalExtra) {
    const current = formData.extras ?? []
    const existing = current.find((e) => e.extra_id === extra.id)
    if (existing) {
      setFormData({
        ...formData,
        extras: current.filter((e) => e.extra_id !== extra.id),
        total_amount: (Number(formData.total_amount) || 0) - existing.subtotal,
      })
      return
    }
    const quantity = extra.pricing_type === 'per_day' ? nights || 1 : 1
    const subtotal = extra.price * quantity
    const newExtra: ReservationExtra = {
      extra_id: extra.id,
      name: extra.name,
      pricing_type: extra.pricing_type,
      unit_price: extra.price,
      quantity,
      subtotal,
    }
    setFormData({
      ...formData,
      extras: [...current, newExtra],
      total_amount: (Number(formData.total_amount) || 0) + subtotal,
    })
  }

  function handlePaymentMethodChange(method: 'card' | 'cash') {
    if (method === 'card') {
      const subtotalCents = Math.round((Number(formData.total_amount) || 0) * 100)
      const surchargeCents = calculateCardSurcharge(subtotalCents, cardSurchargeRate)
      setFormData({ ...formData, payment_method: method, surcharge: surchargeCents / 100 })
      return
    }
    setFormData({ ...formData, payment_method: method })
  }

  function handlePickCustomer(c: CustomerLookup) {
    setFormData((prev) => ({
      ...prev,
      customer_name: c.name ?? '',
      customer_email: c.email ?? '',
      customer_phone: c.phone ?? '',
      customer_dob: c.dob ?? '',
      customer_address: c.address ?? '',
      customer_zip: c.zip_code ?? '',
      license_number: c.license_number ?? '',
      license_state: c.license_state ?? '',
      license_expiration_date: c.license_expiration_date ?? '',
      insurance_provider: c.insurance_provider ?? '',
      insurance_policy_number: c.insurance_policy_number ?? '',
      insurance_expiration_date: c.insurance_expiration_date ?? '',
    }))
    setCustomerSearch('')
    setCustomerResults([])
    setShowCustomerResults(false)
  }

  async function handleSubmit(e: React.FormEvent, allowOverlap = false) {
    e.preventDefault()
    setErrorStr(null)
    if (!allowOverlap) setConflict(null)

    if (!formData.customer_name?.trim()) {
      setErrorStr('Customer name is required.')
      setActiveTab('customer')
      return
    }
    if (!formData.car_id) {
      setErrorStr('Please select a vehicle.')
      setActiveTab('trip')
      return
    }
    if (!formData.pickup_date || !formData.return_date) {
      setErrorStr('Pickup and return dates are required.')
      setActiveTab('trip')
      return
    }
    if (formData.return_date < formData.pickup_date) {
      setErrorStr('Return date must be on or after the pickup date.')
      setActiveTab('trip')
      return
    }
    if (formData.total_amount == null || formData.total_amount === ('' as unknown as number)) {
      setErrorStr('Total amount is required.')
      setActiveTab('charges')
      return
    }

    const dataToSubmit = {
      car_id: Number(formData.car_id),
      customer_name: formData.customer_name || null,
      customer_email: formData.customer_email || null,
      customer_phone: formData.customer_phone || null,
      customer_dob: formData.customer_dob || null,
      customer_address: formData.customer_address || null,
      customer_zip: formData.customer_zip || null,
      pickup_date: formData.pickup_date || null,
      pickup_time: formData.pickup_time || '10:00',
      return_date: formData.return_date || null,
      return_time: formData.return_time || '10:00',
      pickup_location: formData.pickup_location || null,
      return_location: formData.return_location || null,
      total_amount: Number(formData.total_amount) || null,
      security_deposit: formData.security_deposit ? Number(formData.security_deposit) : null,
      surcharge: formData.surcharge ? Number(formData.surcharge) : null,
      payment_method: formData.payment_method || null,
      amount_outstanding: formData.amount_outstanding ? Number(formData.amount_outstanding) : null,
      odometer_out: formData.odometer_out ? Number(formData.odometer_out) : null,
      odometer_in: formData.odometer_in ? Number(formData.odometer_in) : null,
      fuel_out: formData.fuel_out || null,
      fuel_in: formData.fuel_in || null,
      status: formData.status || 'pending',
      source: formData.source || 'admin',
      notes: formData.notes || null,
      license_number: formData.license_number || null,
      license_state: formData.license_state || null,
      license_expiration_date: formData.license_expiration_date || null,
      insurance_provider: formData.insurance_provider || null,
      insurance_policy_number: formData.insurance_policy_number || null,
      insurance_expiration_date: formData.insurance_expiration_date || null,
      damage_checkin: formData.damage_checkin || null,
      damage_checkout: formData.damage_checkout || null,
      extras: formData.extras && formData.extras.length > 0 ? formData.extras : null,
    }

    startTransition(async () => {
      const result = isEditing && reservation?.id
        ? await updateReservation(reservation.id, dataToSubmit, { allowOverlap })
        : await createReservation(dataToSubmit as any, { allowOverlap })
      if (result.conflict && !allowOverlap) {
        setConflict(result.conflict)
        setActiveTab('trip')
      } else if (result.error) {
        setErrorStr(result.error)
      } else {
        router.refresh()
        onClose()
      }
    })
  }

  const summaryParts = [
    formData.customer_name,
    carName,
    formData.pickup_date && formData.return_date
      ? `${formData.pickup_date} → ${formData.return_date}${nights != null ? ` · ${nights}n` : ''}`
      : null,
  ].filter(Boolean) as string[]

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
        <div className="glass w-full max-w-3xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-fade-in-up my-auto flex flex-col max-h-[92vh]">

          {/* ── Sticky Summary Header ── */}
          <div className="border-b border-white/10 bg-white/[0.04] flex-shrink-0">
            <div className="flex items-start justify-between px-6 pt-4 pb-2 gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="text-lg font-bold text-white tracking-wide">
                    {isEditing ? 'Edit Booking' : 'New Booking'}
                  </h3>
                  {isEditing && reservation?.booking_code && (
                    <span className="font-mono text-xs text-white/70 bg-white/5 px-2 py-0.5 rounded">
                      {reservation.booking_code}
                    </span>
                  )}
                </div>
                {isEditing && summaryParts.length > 0 && (
                  <div className="mt-1 text-xs text-white/55 truncate">{summaryParts.join(' · ')}</div>
                )}
              </div>
              <button
                onClick={onClose}
                type="button"
                aria-label="Close"
                className="text-white/40 hover:text-white transition-colors p-1 flex-shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Status pills + total */}
            <div className="flex items-center justify-between gap-4 px-6 pb-3 flex-wrap">
              <div className="flex gap-1.5 flex-wrap">
                {STATUS_OPTIONS.map((opt) => {
                  const active = (formData.status ?? 'pending') === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, status: opt.value }))}
                      className={`text-[10px] font-bold uppercase tracking-widest rounded-full px-3 py-1.5 border transition-all ${
                        active
                          ? opt.color
                          : 'bg-white/[0.03] text-white/40 border-white/10 hover:bg-white/5 hover:text-white/60'
                      }`}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
              {formData.total_amount != null && Number(formData.total_amount) > 0 && (
                <div className="text-right">
                  <div className="text-[9px] font-bold uppercase tracking-widest text-white/40">Total</div>
                  <div className="text-white font-black text-lg tracking-tight leading-none">
                    ${Number(formData.total_amount).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-4 -mb-px overflow-x-auto custom-scrollbar">
              {TABS.map((t) => {
                const isActive = activeTab === t.key
                const disabled = t.key === 'agreement' && !isEditing
                return (
                  <button
                    key={t.key}
                    type="button"
                    disabled={disabled}
                    onClick={() => setActiveTab(t.key)}
                    title={disabled ? 'Save the booking first to send the agreement' : undefined}
                    className={`text-[11px] font-bold uppercase tracking-widest px-4 py-3 border-b-2 transition-all whitespace-nowrap ${
                      disabled
                        ? 'text-white/15 border-transparent cursor-not-allowed'
                        : isActive
                        ? 'text-white border-white'
                        : 'text-white/45 border-transparent hover:text-white/70'
                    }`}
                  >
                    {t.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Form Body ── */}
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
              {errorStr && (
                <div className="p-4 bg-red-500/20 text-red-300 rounded-xl text-sm border border-red-500/30">
                  {errorStr}
                </div>
              )}

              {conflict && (
                <div className="p-4 bg-amber-500/15 text-amber-200 rounded-xl text-sm border border-amber-500/30 space-y-3">
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><path d="M12 9v4M12 17h.01"/></svg>
                    <span>{conflict}</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleSubmit(e, true)}
                    disabled={isPending}
                    className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-100 text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    Book anyway (allow overlap)
                  </button>
                </div>
              )}

              {expirationWarnings.length > 0 && (
                <div className="p-4 bg-amber-500/15 text-amber-200 rounded-xl text-sm border border-amber-500/30 space-y-1.5">
                  {expirationWarnings.map((w) => (
                    <div key={w} className="flex items-start gap-2">
                      <svg className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><path d="M12 9v4M12 17h.01"/></svg>
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* CUSTOMER TAB */}
              <div className={activeTab === 'customer' ? 'space-y-5' : 'hidden'}>
                {!isEditing && (
                  <div className="space-y-1 relative">
                    <label className={LABEL_CLASS}>
                      Find Existing Customer{' '}
                      <span className="text-white/30 font-medium normal-case">(optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Search by name, email, or phone…"
                      value={customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value)
                        setShowCustomerResults(true)
                      }}
                      onFocus={() => setShowCustomerResults(true)}
                      onBlur={() => setTimeout(() => setShowCustomerResults(false), 150)}
                      className={INPUT_CLASS}
                    />
                    {showCustomerResults && customerResults.length > 0 && (
                      <div className="absolute z-20 mt-1 w-full bg-[#0d0d0d] border border-white/10 rounded-xl overflow-hidden shadow-2xl max-h-64 overflow-y-auto">
                        {customerResults.map((c, idx) => (
                          <button
                            key={`${c.email ?? ''}-${c.phone ?? ''}-${idx}`}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handlePickCustomer(c)}
                            className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-b-0"
                          >
                            <div className="text-white text-sm font-semibold">{c.name || '—'}</div>
                            <div className="text-white/50 text-xs mt-0.5">
                              {[c.email, c.phone].filter(Boolean).join(' · ') || '—'}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {customerSearch.trim().length >= 2 &&
                      !isSearchingCustomer &&
                      customerResults.length === 0 && (
                        <p className="text-[10px] text-white/30 mt-1">
                          No saved customers match — fill in below to create new.
                        </p>
                      )}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1">
                    <label className={LABEL_CLASS}>Customer Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.customer_name || ''}
                      onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={LABEL_CLASS}>Email</label>
                    <input
                      type="email"
                      value={formData.customer_email || ''}
                      onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={LABEL_CLASS}>Phone</label>
                    <input
                      type="text"
                      value={formData.customer_phone || ''}
                      onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={LABEL_CLASS}>Date of Birth</label>
                    <DatePicker
                      value={formData.customer_dob || ''}
                      onChange={(v) => setFormData({ ...formData, customer_dob: v })}
                      className={INPUT_CLASS}
                      captionLayout="dropdown"
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={LABEL_CLASS}>Address</label>
                    <input
                      type="text"
                      placeholder="Full address…"
                      value={formData.customer_address || ''}
                      onChange={(e) => setFormData({ ...formData, customer_address: e.target.value })}
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={LABEL_CLASS}>ZIP Code</label>
                    <input
                      type="text"
                      placeholder="e.g. 33180"
                      value={formData.customer_zip || ''}
                      onChange={(e) => setFormData({ ...formData, customer_zip: e.target.value })}
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-white/[0.06]">
                  <p className={`${SECTION_HEADING} mb-4`}>Driver License &amp; Insurance</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1">
                      <label className={LABEL_CLASS}>License Number</label>
                      <input
                        type="text"
                        placeholder="e.g. D123-456-78-901"
                        value={formData.license_number || ''}
                        onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                        className={INPUT_CLASS}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className={LABEL_CLASS}>License State / Country</label>
                      <input
                        type="text"
                        placeholder="e.g. Florida, USA"
                        value={formData.license_state || ''}
                        onChange={(e) => setFormData({ ...formData, license_state: e.target.value })}
                        className={INPUT_CLASS}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className={LABEL_CLASS}>License Expiration Date</label>
                      <DatePicker
                        value={formData.license_expiration_date || ''}
                        onChange={(v) => setFormData({ ...formData, license_expiration_date: v })}
                        className={INPUT_CLASS}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className={LABEL_CLASS}>Insurance Provider</label>
                      <input
                        type="text"
                        placeholder="e.g. State Farm, Geico…"
                        value={formData.insurance_provider || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, insurance_provider: e.target.value })
                        }
                        className={INPUT_CLASS}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className={LABEL_CLASS}>Policy Number</label>
                      <input
                        type="text"
                        placeholder="e.g. POL-123456"
                        value={formData.insurance_policy_number || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, insurance_policy_number: e.target.value })
                        }
                        className={INPUT_CLASS}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className={LABEL_CLASS}>Insurance Expiration Date</label>
                      <DatePicker
                        value={formData.insurance_expiration_date || ''}
                        onChange={(v) => setFormData({ ...formData, insurance_expiration_date: v })}
                        className={INPUT_CLASS}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* TRIP TAB */}
              <div className={activeTab === 'trip' ? 'space-y-5' : 'hidden'}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1 md:col-span-2">
                    <label className={LABEL_CLASS}>Vehicle *</label>
                    <select
                      required
                      value={formData.car_id || ''}
                      onChange={(e) => setFormData({ ...formData, car_id: Number(e.target.value) })}
                      className={INPUT_CLASS}
                    >
                      <option value="" disabled className="bg-[#0d0d0d]">
                        Select Car…
                      </option>
                      {cars.map((c) => (
                        <option key={c.id} value={c.id} className="bg-[#0d0d0d]">
                          {c.make} {c.model_full || c.model}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className={LABEL_CLASS}>Pickup Date *</label>
                    <DatePicker
                      value={formData.pickup_date || ''}
                      onChange={(v) => setFormData({ ...formData, pickup_date: v })}
                      className={INPUT_CLASS}
                      clearable={false}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={LABEL_CLASS}>Pickup Time</label>
                    <TimePicker
                      value={formData.pickup_time || '10:00'}
                      onChange={(v) => setFormData({ ...formData, pickup_time: v })}
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={LABEL_CLASS}>Return Date *</label>
                    <DatePicker
                      value={formData.return_date || ''}
                      onChange={(v) => setFormData({ ...formData, return_date: v })}
                      className={INPUT_CLASS}
                      min={formData.pickup_date || undefined}
                      clearable={false}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={LABEL_CLASS}>Return Time</label>
                    <TimePicker
                      value={formData.return_time || '10:00'}
                      onChange={(v) => setFormData({ ...formData, return_time: v })}
                      className={INPUT_CLASS}
                    />
                  </div>
                  {nights != null && (
                    <div className="md:col-span-2 -mt-2">
                      <span className="inline-flex items-center gap-2 text-[10px] text-emerald-300/90 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full font-bold uppercase tracking-widest">
                        Duration · {nights} {nights === 1 ? 'night' : 'nights'}
                      </span>
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className={LABEL_CLASS}>Pickup Location</label>
                    <input
                      type="text"
                      placeholder="e.g. Downtown, Miami Airport…"
                      value={formData.pickup_location || ''}
                      onChange={(e) => setFormData({ ...formData, pickup_location: e.target.value })}
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={LABEL_CLASS}>Return Location</label>
                    <input
                      type="text"
                      placeholder="If different from pickup…"
                      value={formData.return_location || ''}
                      onChange={(e) => setFormData({ ...formData, return_location: e.target.value })}
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={LABEL_CLASS}>Source</label>
                    <select
                      value={formData.source || 'admin'}
                      onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                      className={INPUT_CLASS}
                    >
                      <option value="admin" className="bg-[#0d0d0d]">Admin</option>
                      <option value="turo" className="bg-[#0d0d0d]">Turo</option>
                      <option value="ical" className="bg-[#0d0d0d]">iCal</option>
                      <option value="direct" className="bg-[#0d0d0d]">Direct</option>
                    </select>
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className={LABEL_CLASS}>Notes (internal)</label>
                    <textarea
                      rows={3}
                      placeholder="Internal notes, special requests…"
                      value={formData.notes || ''}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className={`${INPUT_CLASS} resize-none`}
                    />
                  </div>
                </div>
              </div>

              {/* CHARGES TAB */}
              <div className={activeTab === 'charges' ? 'space-y-5' : 'hidden'}>
                <div className="space-y-1">
                  <label className={LABEL_CLASS}>Payment Method</label>
                  <div className="flex gap-2">
                    {(['card', 'cash'] as const).map((method) => {
                      const active = (formData.payment_method ?? '') === method
                      return (
                        <button
                          key={method}
                          type="button"
                          onClick={() => handlePaymentMethodChange(method)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border transition-colors ${
                            active ? 'bg-white/15 border-white/30 text-white' : 'bg-white/5 border-transparent text-white/40 hover:text-white/70'
                          }`}
                        >
                          {method === 'card' ? 'Card' : 'Cash'}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1">
                    <label className={LABEL_CLASS}>Total Amount ($) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={formData.total_amount ?? ''}
                      onChange={(e) =>
                        setFormData({ ...formData, total_amount: e.target.value === '' ? null : Number(e.target.value) })
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={LABEL_CLASS}>Security Deposit ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.security_deposit ?? ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          security_deposit: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={LABEL_CLASS}>Surcharge ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.surcharge ?? ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          surcharge: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={LABEL_CLASS}>Amount Outstanding ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.amount_outstanding ?? ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          amount_outstanding: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>

                {rentalExtras.length > 0 && (
                  <div className="pt-4 border-t border-white/[0.06]">
                    <p className={`${SECTION_HEADING} mb-4`}>Extras &amp; Add-ons</p>
                    <div className="space-y-2">
                      {rentalExtras.map((extra) => {
                        const selected = (formData.extras ?? []).find((e) => e.extra_id === extra.id)
                        const previewQty = extra.pricing_type === 'per_day' ? nights || 1 : 1
                        const previewSubtotal = extra.price * previewQty
                        return (
                          <label
                            key={extra.id}
                            className={`flex items-center justify-between gap-3 rounded-xl px-4 py-3 cursor-pointer transition-colors border ${
                              selected
                                ? 'bg-white/10 border-white/20'
                                : 'bg-white/[0.03] border-white/5 hover:bg-white/5'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <input
                                type="checkbox"
                                checked={!!selected}
                                onChange={() => toggleExtra(extra)}
                                className="rounded border-white/20 bg-black/50 text-white focus:ring-1 focus:ring-white shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-white truncate">{extra.name}</div>
                                {extra.description && (
                                  <div className="text-[11px] text-white/40 truncate">{extra.description}</div>
                                )}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-sm font-bold text-white">
                                ${(selected ? selected.subtotal : previewSubtotal).toLocaleString()}
                              </div>
                              <div className="text-[10px] text-white/30 uppercase tracking-widest">
                                {extra.pricing_type === 'per_day' ? `$${extra.price}/day` : 'flat'}
                              </div>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* VEHICLE STATE TAB */}
              <div className={activeTab === 'vehicle' ? 'space-y-5' : 'hidden'}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1">
                    <label className={LABEL_CLASS}>Odometer Out</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="Miles at pickup"
                      value={formData.odometer_out ?? ''}
                      onChange={(e) => {
                        setAutoOdometerOut(false)
                        setFormData({
                          ...formData,
                          odometer_out: e.target.value ? Number(e.target.value) : null,
                        })
                      }}
                      className={INPUT_CLASS}
                    />
                    {autoOdometerOut && (
                      <p className="text-[10px] text-emerald-300/80 mt-1">
                        Auto-filled from Bouncie · tap to override
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className={LABEL_CLASS}>Odometer In</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="Miles at return"
                      value={formData.odometer_in ?? ''}
                      onChange={(e) => {
                        setAutoOdometerIn(false)
                        setFormData({
                          ...formData,
                          odometer_in: e.target.value ? Number(e.target.value) : null,
                        })
                      }}
                      className={INPUT_CLASS}
                    />
                    {autoOdometerIn && (
                      <p className="text-[10px] text-emerald-300/80 mt-1">
                        Auto-filled from Bouncie · tap to override
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className={LABEL_CLASS}>Fuel Out</label>
                    <select
                      value={formData.fuel_out || ''}
                      onChange={(e) => setFormData({ ...formData, fuel_out: e.target.value || null })}
                      className={INPUT_CLASS}
                    >
                      <option value="" className="bg-[#0d0d0d]">—</option>
                      <option value="Full" className="bg-[#0d0d0d]">Full</option>
                      <option value="3/4" className="bg-[#0d0d0d]">3/4</option>
                      <option value="1/2" className="bg-[#0d0d0d]">1/2</option>
                      <option value="1/4" className="bg-[#0d0d0d]">1/4</option>
                      <option value="Empty" className="bg-[#0d0d0d]">Empty</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className={LABEL_CLASS}>Fuel In</label>
                    <select
                      value={formData.fuel_in || ''}
                      onChange={(e) => setFormData({ ...formData, fuel_in: e.target.value || null })}
                      className={INPUT_CLASS}
                    >
                      <option value="" className="bg-[#0d0d0d]">—</option>
                      <option value="Full" className="bg-[#0d0d0d]">Full</option>
                      <option value="3/4" className="bg-[#0d0d0d]">3/4</option>
                      <option value="1/2" className="bg-[#0d0d0d]">1/2</option>
                      <option value="1/4" className="bg-[#0d0d0d]">1/4</option>
                      <option value="Empty" className="bg-[#0d0d0d]">Empty</option>
                    </select>
                  </div>
                </div>
                <FuelSummary
                  fuelOut={formData.fuel_out ?? null}
                  fuelIn={formData.fuel_in ?? null}
                  chargePerLevel={chargePerLevel}
                  amountOutstanding={formData.amount_outstanding ?? null}
                  onApplyCharge={(newAmount) =>
                    setFormData({ ...formData, amount_outstanding: newAmount })
                  }
                />

                <div className="pt-4 border-t border-white/[0.06]">
                  <p className={`${SECTION_HEADING} mb-4`}>Damage Report</p>
                  <div className="grid grid-cols-1 gap-5">
                    <div className="space-y-1">
                      <label className={LABEL_CLASS}>Check-In Notes</label>
                      <textarea
                        rows={2}
                        placeholder="Describe any pre-existing damage at pickup…"
                        value={formData.damage_checkin || ''}
                        onChange={(e) => setFormData({ ...formData, damage_checkin: e.target.value })}
                        className={`${INPUT_CLASS} resize-none`}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className={LABEL_CLASS}>Check-Out Notes</label>
                      <textarea
                        rows={2}
                        placeholder="Describe any damage found at return…"
                        value={formData.damage_checkout || ''}
                        onChange={(e) => setFormData({ ...formData, damage_checkout: e.target.value })}
                        className={`${INPUT_CLASS} resize-none`}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* AGREEMENT TAB */}
              {isEditing && reservation && (
                <div className={activeTab === 'agreement' ? 'space-y-5' : 'hidden'}>
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-2">
                        {reservation.agreement_signed_at ? (
                          <>
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            <span className="text-xs text-emerald-300 font-bold">Signed</span>
                            <span className="text-xs text-white/30 ml-1">
                              {new Date(reservation.agreement_signed_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                          </>
                        ) : reservation.agreement_sent_at ? (
                          <>
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                            <span className="text-xs text-amber-300 font-bold">Pending Signature</span>
                            <span className="text-xs text-white/30 ml-1">
                              Sent{' '}
                              {new Date(reservation.agreement_sent_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="w-2 h-2 rounded-full bg-white/20" />
                            <span className="text-xs text-white/40 font-bold">Not Sent</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {reservation.agreement_token && (
                          <button
                            type="button"
                            disabled={isOpeningAgreement}
                            onClick={() => {
                              setAgreementMsg(null)
                              setIsOpeningAgreement(async () => {
                                const result = await getAgreementViewUrl(reservation.id)
                                if (result.error || !result.url) {
                                  setAgreementMsg('Error: ' + (result.error || 'Could not open agreement'))
                                } else {
                                  window.open(result.url, '_blank', 'noopener,noreferrer')
                                }
                              })
                            }}
                            className="text-xs bg-white/5 hover:bg-white/10 text-white/70 px-3 py-1.5 rounded-lg font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {isOpeningAgreement ? 'Opening…' : 'View / Print / Download'}
                          </button>
                        )}
                        {reservation.agreement_pdf_url && (
                          <a
                            href={reservation.agreement_pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs bg-white/5 hover:bg-white/10 text-white/70 px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1"
                          >
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                              />
                            </svg>
                            PDF
                          </a>
                        )}
                        <button
                          type="button"
                          disabled={isSendingAgreement || !reservation.customer_email}
                          onClick={() => {
                            setAgreementMsg(null)
                            setIsSendingAgreement(async () => {
                              const result = await sendAgreement(reservation.id, agreementCc)
                              if (result.error) setAgreementMsg('Error: ' + result.error)
                              else {
                                setAgreementMsg('Agreement sent successfully!')
                                setAgreementEmailIssue({ label: null, occurredAt: null })
                                router.refresh()
                              }
                            })
                          }}
                          title={!reservation.customer_email ? 'Customer email is required' : undefined}
                          className="text-xs bg-white text-black hover:bg-white/90 px-4 py-1.5 rounded-lg font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {isSendingAgreement
                            ? 'Sending…'
                            : reservation.agreement_sent_at
                            ? 'Resend'
                            : 'Send Agreement'}
                        </button>
                      </div>
                    </div>

                    {agreementEmailIssue.label && (
                      <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
                        <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
                        <span className="text-xs text-red-300">
                          <span className="font-bold">Delivery issue:</span> this email {agreementEmailIssue.label}
                          {agreementEmailIssue.occurredAt &&
                            ` (${new Date(agreementEmailIssue.occurredAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })})`}
                          . The customer likely never saw it — consider resending or sharing the link directly.
                        </span>
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className={LABEL_CLASS}>CC (optional)</label>
                      <input
                        type="email"
                        placeholder="extra-recipient@example.com"
                        value={agreementCc}
                        onChange={(e) => setAgreementCc(e.target.value)}
                        className={INPUT_CLASS}
                      />
                      <p className="text-[11px] text-white/30">
                        The business owner is CC&apos;d automatically. Add another address here if needed.
                      </p>
                    </div>

                    {agreementMsg && (
                      <p
                        className={`text-xs ${
                          agreementMsg.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'
                        }`}
                      >
                        {agreementMsg}
                      </p>
                    )}

                    {!reservation.customer_email && (
                      <p className="text-xs text-amber-400/70">
                        Add customer email in the Customer tab to enable agreement sending.
                      </p>
                    )}

                    {reservation.agreement_signed_at && (
                      <div className="pt-3 border-t border-white/[0.06]">
                        <p className={`${SECTION_HEADING} mb-2`}>Operator Close-Out</p>
                        <TenantCloseOut
                          reservationId={reservation.id}
                          tenantSignedAt={reservation.tenant_signed_at ?? null}
                          onSigned={() => router.refresh()}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center gap-3 px-6 py-4 border-t border-white/10 bg-white/[0.02] flex-shrink-0">
              <div className="text-[10px] text-white/30 font-medium hidden sm:block">
                {nights != null && `${nights} ${nights === 1 ? 'night' : 'nights'}`}
              </div>
              <div className="flex gap-3 ml-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="bg-white/5 text-white/80 hover:bg-white/10 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="bg-white text-black hover:bg-white/90 px-6 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                >
                  {isPending ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Booking'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  )
}
