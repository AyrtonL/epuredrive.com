'use client'

import { useState, useMemo, useEffect } from 'react'
import type { Car, PickupLocation, RentalExtra, ReservationExtra } from '@/lib/supabase/types'
import DateRangePicker from './DateRangePicker'
import { trackBookingStart, trackBookingSubmit, trackWhatsAppInquiry } from '@/lib/analytics'
import { calculateCardSurcharge, getCardSurchargeRate } from '@/lib/pricing/cardSurcharge'

interface Props {
  car: Car
  tenantId: string
  pickupLocations?: PickupLocation[]
  whatsappPhone?: string | null
  paymentsEnabled?: boolean
  paymentProcessor?: string
  cardSurchargeRate?: number | null
  rentalExtras?: RentalExtra[]
}

const timeOptions = [
  '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM',
  '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM', '08:00 PM'
];

interface BookedRange { from: string; to: string }

function datesOverlap(pickupA: string, returnA: string, pickupB: string, returnB: string) {
  return pickupA <= returnB && returnA >= pickupB
}

function formatBookedRange(from: string, to: string): string {
  const fmt = (d: string) =>
    new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${fmt(from)} – ${fmt(to)}`
}

export default function BookingWidget({ car, tenantId, pickupLocations = [], whatsappPhone, paymentsEnabled, paymentProcessor, cardSurchargeRate, rentalExtras = [] }: Props) {
  const [pickDate, setPickDate] = useState('')
  const [retDate, setRetDate] = useState('')
  const [bookedRanges, setBookedRanges] = useState<BookedRange[]>([])
  const [dateConflict, setDateConflict] = useState(false)
  const [pickTime, setPickTime] = useState('10:00 AM')
  const [retTime, setRetTime] = useState('10:00 AM')
  const [locationIdx, setLocationIdx] = useState(0)

  const [selectedExtras, setSelectedExtras] = useState<Record<string, boolean>>({})
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash'>('card')

  const selectedLocation: PickupLocation | null = pickupLocations[locationIdx] ?? null

  // Fetch booked date ranges for this car
  useEffect(() => {
    fetch(`/api/availability?carId=${car.id}&tenantId=${tenantId}`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data?.bookedRanges)) setBookedRanges(data.bookedRanges) })
      .catch(() => {/* non-critical */})
  }, [car.id, tenantId])

  // Pre-fill from URL params (set by QuickSearchBar on the home page)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const p = params.get('pickup')
    const r = params.get('return')
    const pt = params.get('pickTime')
    const rt = params.get('retTime')
    const loc = params.get('location')
    if (p) setPickDate(p)
    if (r) setRetDate(r)
    if (pt) setPickTime(pt)
    if (rt) setRetTime(rt)
    if (loc && pickupLocations.length > 0) {
      const idx = pickupLocations.findIndex(l => l.label === loc)
      if (idx >= 0) setLocationIdx(idx)
    }
  }, [pickupLocations])

  // Booking form state
  const [showBookingForm, setShowBookingForm] = useState(false)
  const [custName, setCustName] = useState('')
  const [custEmail, setCustEmail] = useState('')
  const [custPhone, setCustPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [formError, setFormError] = useState('')

  const days = useMemo(() => {
    if (!pickDate || !retDate) return 0
    const d1 = new Date(pickDate)
    const d2 = new Date(retDate)
    return Math.max(1, Math.round((d2.getTime() - d1.getTime()) / 86400000))
  }, [pickDate, retDate])

  // Check date conflict whenever pickup or return changes
  useEffect(() => {
    if (!pickDate || !retDate) { setDateConflict(false); return }
    const conflict = bookedRanges.some(r => datesOverlap(pickDate, retDate, r.from, r.to))
    setDateConflict(conflict)
  }, [pickDate, retDate, bookedRanges])

  const { total, locFee, extrasTotal, baseCost, surcharge } = useMemo(() => {
    const baserate = Number(car.daily_rate) || 0
    const base = days * baserate
    const lFee = selectedLocation?.fee ?? 0
    const eTotal = rentalExtras
      .filter(e => selectedExtras[e.id])
      .reduce((sum, e) => sum + (e.pricing_type === 'per_day' ? days * e.price : e.price), 0)
    const subtotal = base + lFee + eTotal
    const applySurcharge = !!paymentsEnabled && paymentMethod === 'card'
    const surchargeAmount = applySurcharge
      ? calculateCardSurcharge(Math.round(subtotal * 100), cardSurchargeRate ?? null) / 100
      : 0
    return {
      baseCost: base, locFee: lFee, extrasTotal: eTotal, surcharge: surchargeAmount,
      total: subtotal + surchargeAmount
    }
  }, [days, car.daily_rate, selectedLocation, selectedExtras, rentalExtras, paymentsEnabled, paymentMethod, cardSurchargeRate])

  const surchargePercentLabel = useMemo(() => {
    const rate = getCardSurchargeRate(cardSurchargeRate ?? null)
    return (rate * 100).toLocaleString('en-US', { maximumFractionDigits: 2 })
  }, [cardSurchargeRate])

  // Build ReservationExtra[] for API submission
  const buildExtrasPayload = (): ReservationExtra[] => {
    return rentalExtras
      .filter(e => selectedExtras[e.id])
      .map(e => ({
        extra_id: e.id,
        name: e.name,
        pricing_type: e.pricing_type,
        unit_price: e.price,
        quantity: e.pricing_type === 'per_day' ? days : 1,
        subtotal: e.pricing_type === 'per_day' ? days * e.price : e.price,
      }))
  }

  const locationLabel = selectedLocation
    ? `${selectedLocation.label}${selectedLocation.fee > 0 ? ` ($${selectedLocation.fee})` : ' (Free)'}`
    : 'Not specified'

  const handleWhatsapp = () => {
    if (!pickDate || !retDate) { alert('Please select dates first.'); return; }
    if (!whatsappPhone) { alert('WhatsApp contact not configured.'); return; }
    trackWhatsAppInquiry({ car_make: car.make, car_model: car.model_full || car.model })
    const addons = rentalExtras.filter(e => selectedExtras[e.id]).map(e => e.name)

    const msg = `Hello! I'd like to reserve the *${car.make} ${car.model_full || car.model}*.\n\n`
      + `Pickup: ${pickDate} at ${pickTime}\n`
      + `Return: ${retDate} at ${retTime}\n`
      + `Location: ${locationLabel}\n`
      + (addons.length ? `Add-ons: ${addons.join(', ')}\n` : '')
      + `Estimated Total: $${total}`

    const cleanPhone = whatsappPhone.replace(/\D/g, '')
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const handleOnlineBooking = () => {
    if (!pickDate || !retDate) { alert('Please select dates first.'); return; }
    trackBookingStart({
      car_make: car.make,
      car_model: car.model_full || car.model,
      daily_rate: Number(car.daily_rate) || 0,
      days,
      total,
    })
    setShowBookingForm(true)
    setFormError('')
  }

  const handleSubmitBooking = async () => {
    if (!custName.trim()) {
      setFormError('Full name is required.')
      return
    }
    if (dateConflict) {
      setFormError('Selected dates are unavailable. Please choose different dates.')
      return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
    if (!emailRegex.test(custEmail.trim())) {
      setFormError('Please enter a valid email address.')
      return
    }
    setSubmitting(true)
    setFormError('')
    try {
      // If tenant has payments enabled and customer chose to pay by card, redirect to checkout
      if (paymentsEnabled && paymentMethod === 'card') {
        const extras = buildExtrasPayload()
        const checkoutEndpoint = paymentProcessor === 'square' ? '/api/square/checkout' : '/api/checkout'
        const res = await fetch(checkoutEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenant_id: tenantId,
            car_id: car.id,
            start_date: pickDate,
            end_date: retDate,
            customer_name: custName.trim(),
            customer_email: custEmail.trim(),
            customer_phone: custPhone.trim() || undefined,
            pickup_time: pickTime || undefined,
            return_time: retTime || undefined,
            pickup_location: locationLabel || undefined,
            total_amount: total,
            extras: extras.length > 0 ? extras : undefined,
          }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Payment failed' }))
          setFormError((err as { error?: string }).error || 'Could not start payment.')
          return
        }
        const { url } = await res.json() as { url: string }
        if (url) {
          trackBookingSubmit({
            car_make: car.make,
            car_model: car.model_full || car.model,
            total,
            payment_method: 'online',
          })
          window.location.href = url
          return
        }
        setFormError('Could not create payment session.')
        return
      }

      // Cash payment chosen, or tenant has no online payments configured — submit as a request (no charge now)
      await submitBookingRequest()
    } catch {
      setFormError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const submitBookingRequest = async () => {
    const extras = buildExtrasPayload()
    const extrasNotes = extras.map(e => `${e.name} ($${e.subtotal})`).join(', ')
    const res = await fetch('/api/booking/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_id: tenantId,
        car_id: car.id,
        customer_name: custName.trim(),
        customer_email: custEmail.trim(),
        customer_phone: custPhone.trim() || null,
        pickup_date: pickDate,
        pickup_time: pickTime,
        return_date: retDate,
        return_time: retTime,
        pickup_location: locationLabel,
        total_amount: total,
        notes: extrasNotes || null,
        extras: extras.length > 0 ? extras : undefined,
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Request failed' }))
      setFormError((err as { error?: string }).error || 'Something went wrong.')
      return
    }
    const result = await res.json().catch(() => ({})) as { reservationId?: number }
    trackBookingSubmit({
      car_make: car.make,
      car_model: car.model_full || car.model,
      total,
      payment_method: 'request',
    })
    if (typeof window !== 'undefined') {
      const onDirectPath = window.location.pathname.startsWith('/sites/')
      const pathParts = window.location.pathname.split('/')
      const siteIdx = pathParts.indexOf('sites')
      const slug = siteIdx >= 0 ? pathParts[siteIdx + 1] : null
      const basePath = onDirectPath && slug ? `/sites/${slug}` : ''
      const confirmUrl = `${basePath}/booking-confirmation?id=${result.reservationId ?? ''}&car=${encodeURIComponent(car.make + ' ' + (car.model_full || car.model))}`
      window.location.href = confirmUrl
      return
    }
    setSubmitted(true)
  }

  const priceNum = Number(car.daily_rate) || 0

  return (
    <div className="glass border border-white/10 rounded-[2rem] p-8 lg:p-10 shadow-2xl relative overflow-hidden group/widget">
      {/* Background Accent */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 transition-all duration-700 group-hover/widget:bg-primary/10" />

      {/* Header / Pricing */}
      <div className="relative z-10 mb-8 pb-8 border-b border-white/5">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-5xl font-black text-white tracking-tighter italic">${priceNum}</span>
          <span className="text-[10px] font-black uppercase tracking-widest text-white/30">/ day</span>
        </div>
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">Professional Grade Fleet</div>
      </div>

      <div className="relative z-10 space-y-6">
        {/* Date + Time Selection */}
        <div className="space-y-3">
          <DateRangePicker
            pickDate={pickDate}
            retDate={retDate}
            onPickDate={setPickDate}
            onRetDate={setRetDate}
            disabledRanges={bookedRanges}
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-[9px] font-black text-white/30 uppercase tracking-widest ml-1">Pickup Time</label>
              <select value={pickTime} onChange={e => setPickTime(e.target.value)}
                className="w-full bg-white/5 border border-white/5 rounded-2xl px-4 py-3 text-xs text-white focus:ring-1 focus:ring-primary/40 outline-none appearance-none">
                {timeOptions.map(t => <option key={t} value={t} className="text-black">{t}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-[9px] font-black text-white/30 uppercase tracking-widest ml-1">Return Time</label>
              <select value={retTime} onChange={e => setRetTime(e.target.value)}
                className="w-full bg-white/5 border border-white/5 rounded-2xl px-4 py-3 text-xs text-white focus:ring-1 focus:ring-primary/40 outline-none appearance-none">
                {timeOptions.map(t => <option key={t} value={t} className="text-black">{t}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Unavailable periods */}
        {bookedRanges.length > 0 && (
          <div className="space-y-2">
            <span className="block text-[9px] font-black text-white/25 uppercase tracking-widest ml-1">
              Unavailable periods
            </span>
            <div className="flex flex-wrap gap-2">
              {bookedRanges.map((r, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400/80 text-[10px] font-bold"
                >
                  <svg className="w-2.5 h-2.5 flex-shrink-0" fill="currentColor" viewBox="0 0 8 8">
                    <circle cx="4" cy="4" r="3" />
                  </svg>
                  {formatBookedRange(r.from, r.to)}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Date conflict warning */}
        {dateConflict && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-[10px] font-bold uppercase tracking-widest">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            These dates are already booked — please select different dates.
          </div>
        )}

        {/* Location Select */}
        {pickupLocations.length > 0 && (
          <div className="space-y-2">
            <label className="block text-[9px] font-black text-white/30 uppercase tracking-widest ml-1">Delivery / Pickup</label>
            <select value={locationIdx} onChange={e => setLocationIdx(Number(e.target.value))}
              className="w-full bg-white/5 border border-white/5 rounded-2xl px-4 py-4 text-xs text-white font-bold focus:ring-1 focus:ring-primary/40 outline-none appearance-none">
              {pickupLocations.map((loc, i) => (
                <option key={`${loc.label}-${i}`} value={i} className="text-black">
                  {loc.label} {loc.fee > 0 ? `($${loc.fee} Fee)` : '(Free)'}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Dynamic Rental Extras */}
        {rentalExtras.length > 0 && (
          <div className="space-y-3 pt-4">
            <div className="text-[9px] font-black text-white/30 uppercase tracking-widest ml-1 mb-2">Enhancements</div>

            {rentalExtras.map(extra => {
              const checked = !!selectedExtras[extra.id]
              const feeLabel = extra.pricing_type === 'per_day'
                ? `+$${Number(extra.price).toFixed(0)}/day`
                : `$${Number(extra.price).toFixed(0)} Flat`
              return (
                <button
                  key={extra.id}
                  onClick={() => setSelectedExtras(prev => ({ ...prev, [extra.id]: !prev[extra.id] }))}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 ${checked ? 'bg-primary/10 border-primary/30 text-white' : 'bg-white/5 border-white/5 text-white/40 hover:border-white/10'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${checked ? 'bg-primary shadow-[0_0_8px_#3B82F6]' : 'bg-white/10'}`} />
                    <div className="text-left">
                      <span className="text-[11px] font-black uppercase tracking-tight block">{extra.name}</span>
                      {extra.description && (
                        <span className="text-[9px] opacity-50 block mt-0.5">{extra.description}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] font-bold opacity-60 italic">{feeLabel}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* Payment Method Selection */}
        {paymentsEnabled && (
          <div className="space-y-3 pt-4">
            <div className="text-[9px] font-black text-white/30 uppercase tracking-widest ml-1 mb-2">Payment Method</div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPaymentMethod('card')}
                className={`p-4 rounded-2xl border transition-all duration-300 text-[11px] font-black uppercase tracking-tight ${paymentMethod === 'card' ? 'bg-primary/10 border-primary/30 text-white' : 'bg-white/5 border-white/5 text-white/40 hover:border-white/10'}`}
              >
                Card
              </button>
              <button
                onClick={() => setPaymentMethod('cash')}
                className={`p-4 rounded-2xl border transition-all duration-300 text-[11px] font-black uppercase tracking-tight ${paymentMethod === 'cash' ? 'bg-primary/10 border-primary/30 text-white' : 'bg-white/5 border-white/5 text-white/40 hover:border-white/10'}`}
              >
                Cash
              </button>
            </div>
            {paymentMethod === 'cash' && (
              <p className="text-[9px] text-white/25 font-bold uppercase tracking-widest ml-1">Reserve now, pay in cash at pickup — no surcharge</p>
            )}
          </div>
        )}

        {/* Summary / Total */}
        <div className="pt-8 space-y-4">
          {surcharge > 0 && (
            <div className="flex items-center justify-between px-2 text-white/40">
              <span className="text-[9px] font-bold uppercase tracking-widest">Card surcharge ({surchargePercentLabel}%)</span>
              <span className="text-xs font-bold">${surcharge.toLocaleString()}</span>
            </div>
          )}
          <div className="flex items-center justify-between px-2">
            <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Est. Investment</span>
            <div className="text-right">
              <div className="text-2xl font-black text-white italic tracking-tighter">
                {days > 0 ? `$${total.toLocaleString()}` : 'Select Configuration'}
              </div>
              {days > 0 && <div className="text-[9px] font-bold text-white/20 uppercase">All-inclusive total</div>}
            </div>
          </div>

          {submitted ? (
            /* ── Success Confirmation ── */
            <div className="text-center space-y-4 py-6">
              <div className="w-16 h-16 mx-auto rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-black text-white uppercase tracking-wider">Reservation Requested</div>
                <p className="text-white/40 text-xs mt-2 leading-relaxed">
                  We&apos;ll confirm your {car.make} {car.model} reservation shortly via email or phone.
                </p>
              </div>
              {whatsappPhone && (
                <button
                  onClick={handleWhatsapp}
                  className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl border border-[#25D366]/20 bg-[#25D366]/5 text-[#25D366] text-[10px] font-black uppercase tracking-widest hover:bg-[#25D366]/10 transition-all"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                  Message Us on WhatsApp
                </button>
              )}
            </div>
          ) : showBookingForm ? (
            /* ── Booking Form ── */
            <div className="space-y-4">
              <div className="text-[9px] font-black text-white/30 uppercase tracking-widest ml-1">Your Details</div>
              <input
                type="text"
                placeholder="Full Name *"
                value={custName}
                onChange={e => setCustName(e.target.value)}
                className="w-full bg-white/5 border border-white/5 rounded-2xl px-4 py-3 text-xs text-white placeholder:text-white/20 focus:ring-1 focus:ring-primary/40 outline-none"
              />
              <input
                type="email"
                placeholder="Email *"
                value={custEmail}
                onChange={e => setCustEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/5 rounded-2xl px-4 py-3 text-xs text-white placeholder:text-white/20 focus:ring-1 focus:ring-primary/40 outline-none"
              />
              <input
                type="tel"
                placeholder="Phone (optional)"
                value={custPhone}
                onChange={e => setCustPhone(e.target.value)}
                className="w-full bg-white/5 border border-white/5 rounded-2xl px-4 py-3 text-xs text-white placeholder:text-white/20 focus:ring-1 focus:ring-primary/40 outline-none"
              />
              {formError && (
                <div className="text-red-400 text-xs font-bold px-1">{formError}</div>
              )}
              <button
                onClick={handleSubmitBooking}
                disabled={submitting}
                className="w-full bg-white text-black font-black uppercase tracking-[0.2em] text-[11px] py-5 rounded-2xl hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting
                  ? (paymentsEnabled && paymentMethod === 'card' ? 'Redirecting to Payment...' : 'Submitting...')
                  : (paymentsEnabled && paymentMethod === 'card' ? 'Pay & Reserve Now' : 'Confirm Reservation Request')}
              </button>
              <button
                onClick={() => setShowBookingForm(false)}
                className="w-full text-white/30 text-[10px] font-bold uppercase tracking-widest py-2 hover:text-white/50 transition-colors"
              >
                Back
              </button>
            </div>
          ) : (
            /* ── Default CTAs ── */
            <>
              <button
                onClick={handleOnlineBooking}
                disabled={dateConflict}
                className="w-full bg-white text-black font-black uppercase tracking-[0.2em] text-[11px] py-5 rounded-2xl hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-white/5 disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
              >
                Reserve This Vehicle
              </button>

              {whatsappPhone && (
                <button
                  onClick={handleWhatsapp}
                  disabled={dateConflict}
                  className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl border border-[#25D366]/20 bg-[#25D366]/5 text-[#25D366] text-[10px] font-black uppercase tracking-widest hover:bg-[#25D366]/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                  Inquire via SMS / WhatsApp
                </button>
              )}
            </>
          )}
        </div>

        <div className="text-center pt-2">
          <span className="text-[8px] font-bold uppercase tracking-[0.3em] text-white/20">Secured via éPure Drive Cloud</span>
        </div>
      </div>
    </div>
  )
}
