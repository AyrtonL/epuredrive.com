'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Reservation, Car } from '@/lib/supabase/types'
import {
  createReservation,
  updateReservation,
  sendAgreement,
  getLatestOdometer,
  searchCustomersForBooking,
  type CustomerLookup,
} from './actions'
import ModalPortal from '@/components/ui/ModalPortal'
import FuelSummary from '@/components/dashboard/FuelSummary'
import TenantCloseOut from './TenantCloseOut'

interface Props {
  isOpen: boolean
  onClose: () => void
  reservation?: Reservation | null // null means creating a new one
  cars: Car[]
  chargePerLevel: number
}

export default function BookingModal({ isOpen, onClose, reservation, cars, chargePerLevel }: Props) {
  const [isPending, startTransition] = useTransition()
  const [isSendingAgreement, setIsSendingAgreement] = useTransition()
  const [errorStr, setErrorStr] = useState<string | null>(null)
  const [agreementMsg, setAgreementMsg] = useState<string | null>(null)
  const router = useRouter()
  
  const [formData, setFormData] = useState<Partial<Reservation>>({})
  // When true, the currently shown odometer value(s) were prefilled from
  // telematics (cars.mileage) rather than typed by the user. Staff can
  // always override; the hint below the input makes the source obvious.
  const [autoOdometerOut, setAutoOdometerOut] = useState(false)
  const [autoOdometerIn, setAutoOdometerIn] = useState(false)

  // Existing-customer typeahead state. Lets staff reuse a saved customer
  // (name/email/phone/DOB/address/license/insurance) instead of retyping.
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerResults, setCustomerResults] = useState<CustomerLookup[]>([])
  const [showCustomerResults, setShowCustomerResults] = useState(false)
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false)

  useEffect(() => {
    if (reservation) {
      setFormData(reservation)
    } else {
      setFormData({
        status: 'pending',
        source: 'admin'
      })
    }
    setErrorStr(null)
    setAutoOdometerOut(false)
    setAutoOdometerIn(false)
    setCustomerSearch('')
    setCustomerResults([])
    setShowCustomerResults(false)
  }, [reservation, isOpen])

  // Debounced customer typeahead — only when creating a new booking.
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

  function handlePickCustomer(c: CustomerLookup) {
    setFormData((prev) => ({
      ...prev,
      customer_name: c.name ?? '',
      customer_email: c.email ?? '',
      customer_phone: c.phone ?? '',
      customer_dob: c.dob ?? '',
      customer_address: c.address ?? '',
      license_number: c.license_number ?? '',
      license_state: c.license_state ?? '',
      insurance_provider: c.insurance_provider ?? '',
      insurance_policy_number: c.insurance_policy_number ?? '',
    }))
    setCustomerSearch('')
    setCustomerResults([])
    setShowCustomerResults(false)
  }

  // Auto-fill odometer inputs from the linked telematics device when the
  // modal opens on an existing reservation whose car has Bouncie connected.
  // Only fills empty fields — never overwrites what the user already typed
  // or what the DB already contains.
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

  if (!isOpen) return null

  const isEditing = !!reservation

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorStr(null)

    if (
      formData.pickup_date &&
      formData.return_date &&
      formData.return_date < formData.pickup_date
    ) {
      setErrorStr('Return date must be on or after the pickup date.')
      return
    }

    // Data prep
    const dataToSubmit = {
      car_id: Number(formData.car_id),
      customer_name: formData.customer_name || null,
      customer_email: formData.customer_email || null,
      customer_phone: formData.customer_phone || null,
      customer_dob: formData.customer_dob || null,
      customer_address: formData.customer_address || null,
      pickup_date: formData.pickup_date || null,
      pickup_time: formData.pickup_time || '10:00',
      return_date: formData.return_date || null,
      return_time: formData.return_time || '10:00',
      pickup_location: formData.pickup_location || null,
      return_location: formData.return_location || null,
      total_amount: Number(formData.total_amount) || null,
      security_deposit: formData.security_deposit ? Number(formData.security_deposit) : null,
      surcharge: formData.surcharge ? Number(formData.surcharge) : null,
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
      insurance_provider: formData.insurance_provider || null,
      insurance_policy_number: formData.insurance_policy_number || null,
      damage_checkin: formData.damage_checkin || null,
      damage_checkout: formData.damage_checkout || null,
    }

    startTransition(async () => {
      let result;
      if (isEditing && reservation?.id) {
        result = await updateReservation(reservation.id, dataToSubmit)
      } else {
        result = await createReservation(dataToSubmit as any)
      }

      if (result.error) {
        setErrorStr(result.error)
      } else {
        router.refresh()
        onClose()
      }
    })
  }

  return (
    <ModalPortal>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="glass w-full max-w-2xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-fade-in-up my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
          <h3 className="text-lg font-bold text-white tracking-wide">
            {isEditing ? 'Edit Booking' : 'Add New Booking'}
          </h3>
          <button 
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors p-1"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {errorStr && (
            <div className="p-4 bg-red-500/20 text-red-300 rounded-xl text-sm border border-red-500/30">
              {errorStr}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Existing customer quick-find — only when creating new */}
            {!isEditing && (
              <div className="space-y-1 md:col-span-2 relative">
                <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">
                  Find Existing Customer <span className="text-white/30 font-medium normal-case">(optional)</span>
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
                  className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white"
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
                {customerSearch.trim().length >= 2 && !isSearchingCustomer && customerResults.length === 0 && (
                  <p className="text-[10px] text-white/30 mt-1">
                    No saved customers match — fill in below to create new.
                  </p>
                )}
              </div>
            )}

            {/* Customer Contact */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Customer Name</label>
              <input 
                type="text" required
                value={formData.customer_name || ''} 
                onChange={e => setFormData({...formData, customer_name: e.target.value})}
                className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Vehicle</label>
              <select 
                required
                value={formData.car_id || ''} 
                onChange={e => setFormData({...formData, car_id: Number(e.target.value)})}
                className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white"
              >
                <option value="" disabled className="bg-[#0d0d0d]">Select Car...</option>
                {cars.map(c => (
                  <option key={c.id} value={c.id} className="bg-[#0d0d0d]">
                    {c.make} {c.model_full || c.model}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Email</label>
              <input 
                type="email" 
                value={formData.customer_email || ''} 
                onChange={e => setFormData({...formData, customer_email: e.target.value})}
                className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Phone</label>
              <input 
                type="text" 
                value={formData.customer_phone || ''} 
                onChange={e => setFormData({...formData, customer_phone: e.target.value})}
                className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white" 
              />
            </div>

            {/* Dates */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Pickup Date</label>
              <input 
                type="date" required
                value={formData.pickup_date || ''} 
                onChange={e => setFormData({...formData, pickup_date: e.target.value})}
                className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white [color-scheme:dark]" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Pickup Time</label>
              <input 
                type="time"
                value={formData.pickup_time || '10:00'} 
                onChange={e => setFormData({...formData, pickup_time: e.target.value})}
                className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white [color-scheme:dark]" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Return Date</label>
              <input 
                type="date" required
                value={formData.return_date || ''} 
                onChange={e => setFormData({...formData, return_date: e.target.value})}
                className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white [color-scheme:dark]" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Return Time</label>
              <input 
                type="time"
                value={formData.return_time || '10:00'} 
                onChange={e => setFormData({...formData, return_time: e.target.value})}
                className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white [color-scheme:dark]" 
              />
            </div>

            {/* Locations */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Pickup Location</label>
              <input
                type="text" placeholder="e.g. Downtown, Miami Airport..."
                value={formData.pickup_location || ''}
                onChange={e => setFormData({...formData, pickup_location: e.target.value})}
                className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Return Location</label>
              <input
                type="text" placeholder="If different from pickup..."
                value={formData.return_location || ''}
                onChange={e => setFormData({...formData, return_location: e.target.value})}
                className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Total Amount ($)</label>
              <input
                type="number" step="0.01" min="0" required
                value={formData.total_amount || ''}
                onChange={e => setFormData({...formData, total_amount: Number(e.target.value)})}
                className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Status</label>
              <select 
                value={formData.status || ''} 
                onChange={e => setFormData({...formData, status: e.target.value})}
                className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white"
              >
                <option value="pending" className="bg-[#0d0d0d]">Pending</option>
                <option value="confirmed" className="bg-[#0d0d0d]">Confirmed</option>
                <option value="active" className="bg-[#0d0d0d]">Active</option>
                <option value="completed" className="bg-[#0d0d0d]">Completed</option>
                <option value="cancelled" className="bg-[#0d0d0d]">Cancelled</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Source</label>
              <select 
                value={formData.source || 'admin'} 
                onChange={e => setFormData({...formData, source: e.target.value})}
                className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white"
              >
                <option value="admin" className="bg-[#0d0d0d]">Admin</option>
                <option value="turo" className="bg-[#0d0d0d]">Turo</option>
                <option value="ical" className="bg-[#0d0d0d]">iCal</option>
                <option value="direct" className="bg-[#0d0d0d]">Direct</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Security Deposit ($)</label>
              <input
                type="number" step="0.01" min="0"
                value={formData.security_deposit || ''}
                onChange={e => setFormData({...formData, security_deposit: e.target.value ? Number(e.target.value) : null})}
                className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Surcharge ($)</label>
              <input
                type="number" step="0.01" min="0"
                value={formData.surcharge || ''}
                onChange={e => setFormData({...formData, surcharge: e.target.value ? Number(e.target.value) : null})}
                className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Amount Outstanding ($)</label>
              <input
                type="number" step="0.01" min="0"
                value={formData.amount_outstanding || ''}
                onChange={e => setFormData({...formData, amount_outstanding: e.target.value ? Number(e.target.value) : null})}
                className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white"
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Notes (internal)</label>
              <textarea
                rows={2} placeholder="Internal notes, special requests..."
                value={formData.notes || ''}
                onChange={e => setFormData({...formData, notes: e.target.value})}
                className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white resize-none"
              />
            </div>

            {/* ── Rental Agreement ── */}
            {isEditing && reservation && (
              <div className="md:col-span-2 pt-4 border-t border-white/[0.06]">
                <p className="text-[11px] font-bold text-white/30 uppercase tracking-widest mb-4">Rental Agreement</p>
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-3">
                  {/* Status row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {reservation.agreement_signed_at ? (
                        <>
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          <span className="text-xs text-emerald-300 font-bold">Signed</span>
                          <span className="text-xs text-white/30 ml-1">
                            {new Date(reservation.agreement_signed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </>
                      ) : reservation.agreement_sent_at ? (
                        <>
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                          <span className="text-xs text-amber-300 font-bold">Pending Signature</span>
                          <span className="text-xs text-white/30 ml-1">
                            Sent {new Date(reservation.agreement_sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="w-2 h-2 rounded-full bg-white/20" />
                          <span className="text-xs text-white/40 font-bold">Not Sent</span>
                        </>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {reservation.agreement_pdf_url && (
                        <a
                          href={reservation.agreement_pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs bg-white/5 hover:bg-white/10 text-white/70 px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
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
                            const result = await sendAgreement(reservation.id)
                            if (result.error) {
                              setAgreementMsg('Error: ' + result.error)
                            } else {
                              setAgreementMsg('Agreement sent successfully!')
                              router.refresh()
                            }
                          })
                        }}
                        title={!reservation.customer_email ? 'Customer email is required' : undefined}
                        className="text-xs bg-white/5 hover:bg-white/10 text-white/70 px-3 py-1.5 rounded-lg font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {isSendingAgreement
                          ? 'Sending...'
                          : reservation.agreement_sent_at
                          ? 'Resend'
                          : 'Send Agreement'}
                      </button>
                    </div>
                  </div>

                  {agreementMsg && (
                    <p className={`text-xs ${agreementMsg.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'}`}>
                      {agreementMsg}
                    </p>
                  )}

                  {!reservation.customer_email && (
                    <p className="text-xs text-amber-400/70">Add customer email above to enable agreement sending.</p>
                  )}

                  {/* Tenant Close-Out Signature */}
                  {reservation.agreement_signed_at && (
                    <div className="pt-3 border-t border-white/[0.06]">
                      <p className="text-[11px] font-bold text-white/30 uppercase tracking-widest mb-2">Operator Close-Out</p>
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

            {/* Renter Details */}
            <div className="md:col-span-2 pt-4 border-t border-white/[0.06]">
              <p className="text-[11px] font-bold text-white/30 uppercase tracking-widest mb-4">Renter Details (optional)</p>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Date of Birth</label>
              <input
                type="date"
                value={formData.customer_dob || ''}
                onChange={e => setFormData({...formData, customer_dob: e.target.value})}
                className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white [color-scheme:dark]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Address</label>
              <input
                type="text" placeholder="Full address..."
                value={formData.customer_address || ''}
                onChange={e => setFormData({...formData, customer_address: e.target.value})}
                className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white"
              />
            </div>

            {/* Driver License & Insurance (optional) */}
            <div className="md:col-span-2 pt-4 border-t border-white/[0.06]">
              <p className="text-[11px] font-bold text-white/30 uppercase tracking-widest mb-4">Driver License &amp; Insurance (optional)</p>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">License Number</label>
              <input
                type="text" placeholder="e.g. D123-456-78-901"
                value={formData.license_number || ''}
                onChange={e => setFormData({...formData, license_number: e.target.value})}
                className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">License State / Country</label>
              <input
                type="text" placeholder="e.g. Florida, USA"
                value={formData.license_state || ''}
                onChange={e => setFormData({...formData, license_state: e.target.value})}
                className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Insurance Provider</label>
              <input
                type="text" placeholder="e.g. State Farm, Geico..."
                value={formData.insurance_provider || ''}
                onChange={e => setFormData({...formData, insurance_provider: e.target.value})}
                className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Policy Number</label>
              <input
                type="text" placeholder="e.g. POL-123456"
                value={formData.insurance_policy_number || ''}
                onChange={e => setFormData({...formData, insurance_policy_number: e.target.value})}
                className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white"
              />
            </div>

            {/* Vehicle State */}
            <div className="md:col-span-2 pt-4 border-t border-white/[0.06]">
              <p className="text-[11px] font-bold text-white/30 uppercase tracking-widest mb-4">Vehicle State (optional)</p>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Odometer Out</label>
              <input
                type="number" min="0" placeholder="Miles at pickup"
                value={formData.odometer_out || ''}
                onChange={e => {
                  setAutoOdometerOut(false)
                  setFormData({...formData, odometer_out: e.target.value ? Number(e.target.value) : null})
                }}
                className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white"
              />
              {autoOdometerOut && (
                <p className="text-[10px] text-emerald-300/80 mt-1">Auto-filled from Bouncie · tap to override</p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Odometer In</label>
              <input
                type="number" min="0" placeholder="Miles at return"
                value={formData.odometer_in || ''}
                onChange={e => {
                  setAutoOdometerIn(false)
                  setFormData({...formData, odometer_in: e.target.value ? Number(e.target.value) : null})
                }}
                className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white"
              />
              {autoOdometerIn && (
                <p className="text-[10px] text-emerald-300/80 mt-1">Auto-filled from Bouncie · tap to override</p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Fuel Out</label>
              <select
                value={formData.fuel_out || ''}
                onChange={e => setFormData({...formData, fuel_out: e.target.value || null})}
                className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white"
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
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Fuel In</label>
              <select
                value={formData.fuel_in || ''}
                onChange={e => setFormData({...formData, fuel_in: e.target.value || null})}
                className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white"
              >
                <option value="" className="bg-[#0d0d0d]">—</option>
                <option value="Full" className="bg-[#0d0d0d]">Full</option>
                <option value="3/4" className="bg-[#0d0d0d]">3/4</option>
                <option value="1/2" className="bg-[#0d0d0d]">1/2</option>
                <option value="1/4" className="bg-[#0d0d0d]">1/4</option>
                <option value="Empty" className="bg-[#0d0d0d]">Empty</option>
              </select>
            </div>

            <FuelSummary
              fuelOut={formData.fuel_out ?? null}
              fuelIn={formData.fuel_in ?? null}
              chargePerLevel={chargePerLevel}
              amountOutstanding={formData.amount_outstanding ?? null}
              onApplyCharge={(newAmount) => setFormData({ ...formData, amount_outstanding: newAmount })}
            />

            {/* Damage Report */}
            <div className="md:col-span-2 pt-4 border-t border-white/[0.06]">
              <p className="text-[11px] font-bold text-white/30 uppercase tracking-widest mb-4">Damage Report (optional)</p>
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Check-In Notes</label>
              <textarea
                rows={2} placeholder="Describe any pre-existing damage at pickup..."
                value={formData.damage_checkin || ''}
                onChange={e => setFormData({...formData, damage_checkin: e.target.value})}
                className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white resize-none"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Check-Out Notes</label>
              <textarea
                rows={2} placeholder="Describe any damage found at return..."
                value={formData.damage_checkout || ''}
                onChange={e => setFormData({...formData, damage_checkout: e.target.value})}
                className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-white/10">
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
              {isPending ? 'Saving...' : 'Save Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>
  )
}
