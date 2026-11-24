'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import type { Car, PickupLocation, RentalExtra, ReservationExtra } from '@/lib/supabase/types'
import DateRangePicker from './DateRangePicker'
import { trackBookingStart, trackWhatsAppInquiry } from '@/lib/analytics'
import { carDisplayName } from '@/lib/utils/car-display-name'
import { rentalDays } from '@/lib/booking/dates'
import { buildPriceLines } from '@/lib/booking/priceLines'
import type { CustomerInput } from '@/lib/booking/customer'
import { pickupLocationText } from '@/lib/booking/locationText'
import PriceSummary from './booking/PriceSummary'
import ExtrasPicker from './booking/ExtrasPicker'
import CustomerDetailsForm from './booking/CustomerDetailsForm'
import MobileBookingBar from './booking/MobileBookingBar'
import { useBookingSubmit } from './booking/useBookingSubmit'
import { CHOICE, FIELD, FIELD_ERROR, LABEL, PRIMARY_BTN } from './booking/styles'

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

const TIME_OPTIONS = [
  '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM',
  '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM', '08:00 PM',
]

interface BookedRange { from: string; to: string }

const overlaps = (a1: string, a2: string, b1: string, b2: string): boolean => a1 <= b2 && a2 >= b1

const shortDate = (d: string): string =>
  new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

const EMPTY_CUSTOMER: CustomerInput = { name: '', email: '', phone: '' }

export default function BookingWidget({ car, tenantId, pickupLocations = [], whatsappPhone, paymentsEnabled, paymentProcessor, cardSurchargeRate, rentalExtras = [] }: Props) {
  const [pickDate, setPickDate] = useState('')
  const [retDate, setRetDate] = useState('')
  const [pickTime, setPickTime] = useState('10:00 AM')
  const [retTime, setRetTime] = useState('10:00 AM')
  const [locationIdx, setLocationIdx] = useState(0)
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [addressMissing, setAddressMissing] = useState(false)
  const addressRef = useRef<HTMLInputElement>(null)
  const [bookedRanges, setBookedRanges] = useState<BookedRange[]>([])
  const [selectedExtras, setSelectedExtras] = useState<Record<string, boolean>>({})
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash'>('card')
  const [step, setStep] = useState<'trip' | 'details'>('trip')
  const [customer, setCustomer] = useState<CustomerInput>(EMPTY_CUSTOMER)
  const [openCalendarSignal, setOpenCalendarSignal] = useState(0)
  const [needDates, setNeedDates] = useState(false)
  const [ctaVisible, setCtaVisible] = useState(true)
  const ctaRef = useRef<HTMLDivElement>(null)
  const { submit, submitting, error: submitError, clearError } = useBookingSubmit()

  const selectedLocation: PickupLocation | null = pickupLocations[locationIdx] ?? null
  const payByCard = !!paymentsEnabled && paymentMethod === 'card'

  useEffect(() => {
    fetch(`/api/availability?carId=${car.id}&tenantId=${tenantId}`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data?.bookedRanges)) setBookedRanges(data.bookedRanges) })
      .catch(() => { /* non-critical: the server re-checks availability on submit */ })
  }, [car.id, tenantId])

  // Pre-fill from the fleet search (?pickup=&return=&pickTime=&retTime=&location=)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const p = params.get('pickup'); const r = params.get('return')
    const pt = params.get('pickTime'); const rt = params.get('retTime'); const loc = params.get('location')
    if (p) setPickDate(p)
    if (r) setRetDate(r)
    if (pt && TIME_OPTIONS.includes(pt)) setPickTime(pt)
    if (rt && TIME_OPTIONS.includes(rt)) setRetTime(rt)
    if (loc) {
      const idx = pickupLocations.findIndex((l) => l.label === loc)
      if (idx >= 0) setLocationIdx(idx)
    }
  }, [pickupLocations])

  // Phone bar shows only while the in-widget call-to-action is off screen.
  useEffect(() => {
    const el = ctaRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([entry]) => setCtaVisible(entry.isIntersecting), { threshold: 0.4 })
    io.observe(el)
    return () => io.disconnect()
  }, [step])

  const days = rentalDays(pickDate, retDate)
  const hasDates = days > 0
  const dateConflict = hasDates && bookedRanges.some((r) => overlaps(pickDate, retDate, r.from, r.to))

  useEffect(() => { if (hasDates) setNeedDates(false) }, [hasDates])

  const chosenExtras = useMemo(() => rentalExtras.filter((e) => selectedExtras[e.id]), [rentalExtras, selectedExtras])

  const { lines, totalCents } = useMemo(() => buildPriceLines({
    dailyRate: Number(car.daily_rate) || 0,
    days,
    location: selectedLocation ? { label: selectedLocation.label, fee: Number(selectedLocation.fee) || 0 } : null,
    extras: chosenExtras,
    card: payByCard,
    surchargeRate: cardSurchargeRate ?? null,
  }), [car.daily_rate, days, selectedLocation, chosenExtras, payByCard, cardSurchargeRate])
  const total = totalCents / 100

  const needsAddress = !!selectedLocation?.delivery_to_customer
  const locationLabel = pickupLocationText(selectedLocation, deliveryAddress)

  /** Delivery locations need the customer's address before moving on. */
  const addressOk = (): boolean => {
    if (!needsAddress || deliveryAddress.trim().length >= 5) return true
    setAddressMissing(true)
    addressRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    window.setTimeout(() => addressRef.current?.focus({ preventScroll: true }), 350)
    return false
  }

  const askForDates = () => {
    setNeedDates(true)
    setOpenCalendarSignal((n) => n + 1)
  }

  const goToDetails = () => {
    if (!hasDates) { askForDates(); return }
    if (dateConflict) return
    if (!addressOk()) return
    trackBookingStart({ car_make: car.make, car_model: car.model_full || car.model, daily_rate: Number(car.daily_rate) || 0, days, total })
    clearError()
    setStep('details')
  }

  const handleWhatsapp = () => {
    if (!hasDates) { askForDates(); return }
    if (!whatsappPhone || !addressOk()) return
    trackWhatsAppInquiry({ car_make: car.make, car_model: car.model_full || car.model })
    const addons = chosenExtras.map((e) => e.name)
    const msg = `Hello! I'd like to reserve the *${carDisplayName(car)}*.\n\n`
      + `Pickup: ${pickDate} at ${pickTime}\n`
      + `Return: ${retDate} at ${retTime}\n`
      + `Location: ${locationLabel}\n`
      + (addons.length ? `Add-ons: ${addons.join(', ')}\n` : '')
      + `Estimated Total: $${total.toFixed(2)}`
    window.open(`https://wa.me/${whatsappPhone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const handleSubmit = () => {
    const extras: ReservationExtra[] = chosenExtras.map((e) => {
      const perDay = e.pricing_type === 'per_day'
      return { extra_id: e.id, name: e.name, pricing_type: e.pricing_type, unit_price: e.price, quantity: perDay ? days : 1, subtotal: perDay ? days * e.price : e.price }
    })
    void submit({ tenantId, car, customer, pickDate, retDate, pickTime, retTime, locationLabel, total, extras, payByCard, paymentProcessor })
  }

  const barAction = !hasDates ? 'Choose dates' : step === 'details' ? 'Finish' : 'Reserve'
  const onBarAction = () => {
    if (step === 'details') { ctaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); return }
    goToDetails()
  }

  return (
    <div className="glass border border-white/10 rounded-[2rem] p-5 sm:p-8 shadow-2xl relative">
      {/* Price header */}
      <div className="mb-6 pb-6 border-b border-white/10 flex flex-col gap-1">
        <div className="flex items-baseline gap-1.5">
          <span className="text-4xl font-black text-white tracking-tight">${Number(car.daily_rate) || 0}</span>
          <span className="text-sm text-white/55">/ day</span>
        </div>
        {hasDates && <span className="text-sm text-white/65">{shortDate(pickDate)} – {shortDate(retDate)} · {days} day{days === 1 ? '' : 's'}</span>}
      </div>

      <div className="space-y-5">
        {/* 1. Dates & times */}
        <div>
          <span className={LABEL}>Dates</span>
          <DateRangePicker
            pickDate={pickDate}
            retDate={retDate}
            onPickDate={setPickDate}
            onRetDate={setRetDate}
            disabledRanges={bookedRanges}
            openSignal={openCalendarSignal}
            invalid={needDates && !hasDates}
          />
          {needDates && !hasDates && (
            <p className="text-amber-300 text-xs mt-1.5 ml-1">Pick your pickup and return dates to continue.</p>
          )}
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label htmlFor="pick-time" className={LABEL}>Pickup time</label>
              <select id="pick-time" value={pickTime} onChange={(e) => setPickTime(e.target.value)} className={FIELD}>
                {TIME_OPTIONS.map((t) => <option key={t} value={t} className="text-black">{t}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="ret-time" className={LABEL}>Return time</label>
              <select id="ret-time" value={retTime} onChange={(e) => setRetTime(e.target.value)} className={FIELD}>
                {TIME_OPTIONS.map((t) => <option key={t} value={t} className="text-black">{t}</option>)}
              </select>
            </div>
          </div>
        </div>

        {dateConflict ? (
          <div role="alert" className="px-4 py-3 bg-red-500/10 border border-red-500/25 rounded-2xl text-red-300 text-sm">
            This car is already booked for part of those dates. Please pick different dates.
          </div>
        ) : bookedRanges.length > 0 && (
          <p className="text-xs text-white/50 ml-1">
            Already booked: {bookedRanges.slice(0, 4).map((r) => `${shortDate(r.from)}–${shortDate(r.to)}`).join(', ')}
            {bookedRanges.length > 4 ? '…' : ''}
          </p>
        )}

        {/* 2. Pickup / delivery */}
        {pickupLocations.length > 0 && (
          <div>
            <label htmlFor="pickup-location" className={LABEL}>Pickup or delivery</label>
            <select id="pickup-location" value={locationIdx} onChange={(e) => setLocationIdx(Number(e.target.value))} className={FIELD}>
              {pickupLocations.map((loc, i) => (
                <option key={`${loc.label}-${i}`} value={i} className="text-black">
                  {loc.label} — {loc.fee > 0 ? `+$${loc.fee}` : 'Free'}
                </option>
              ))}
            </select>
            {selectedLocation?.note && <p className="text-xs text-white/50 mt-1.5 ml-1">{selectedLocation.note}</p>}
            {needsAddress && (
              <div className="mt-3">
                <label htmlFor="delivery-address" className={LABEL}>Delivery address</label>
                <input
                  id="delivery-address"
                  ref={addressRef}
                  type="text"
                  autoComplete="street-address"
                  enterKeyHint="done"
                  placeholder="Street, city, ZIP"
                  maxLength={150}
                  value={deliveryAddress}
                  aria-invalid={addressMissing && deliveryAddress.trim().length < 5}
                  onChange={(e) => { setDeliveryAddress(e.target.value); setAddressMissing(false) }}
                  className={`${FIELD} ${addressMissing && deliveryAddress.trim().length < 5 ? FIELD_ERROR : ''}`}
                />
                {addressMissing && deliveryAddress.trim().length < 5 && (
                  <p className="text-red-400 text-xs mt-1.5 ml-1">Enter the address where we should deliver the car.</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* 3. Extras (collapsed) */}
        <ExtrasPicker
          extras={rentalExtras}
          selected={selectedExtras}
          onToggle={(id) => setSelectedExtras((prev) => ({ ...prev, [id]: !prev[id] }))}
        />

        {/* 4. Payment */}
        {paymentsEnabled && (
          <div>
            <span className={LABEL}>Payment</span>
            <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Payment method">
              {(['card', 'cash'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={paymentMethod === m}
                  onClick={() => setPaymentMethod(m)}
                  className={`p-3.5 text-left ${CHOICE(paymentMethod === m)}`}
                >
                  <span className="block text-sm font-bold">{m === 'card' ? 'Pay now by card' : 'Pay at pickup'}</span>
                  <span className="block text-xs text-white/50 mt-0.5">{m === 'card' ? 'Instant confirmation' : 'Cash, no card fee'}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Total */}
        <PriceSummary lines={lines} totalCents={totalCents} hasDates={hasDates} />

        {/* Call to action / details step */}
        <div ref={ctaRef} className="scroll-mt-28">
          {step === 'details' && hasDates ? (
            <CustomerDetailsForm
              value={customer}
              onChange={setCustomer}
              onSubmit={handleSubmit}
              onBack={() => setStep('trip')}
              submitting={submitting}
              serverError={submitError}
              submitLabel={payByCard ? `Pay $${total.toFixed(2)} & reserve` : 'Request reservation'}
              submittingLabel={payByCard ? 'Opening secure payment…' : 'Sending…'}
            />
          ) : (
            <div className="space-y-3">
              <button type="button" onClick={goToDetails} disabled={dateConflict} className={PRIMARY_BTN}>
                {hasDates ? 'Continue' : 'Choose dates'}
              </button>
              {whatsappPhone && (
                <button
                  type="button"
                  onClick={handleWhatsapp}
                  disabled={dateConflict}
                  className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl border border-[#25D366]/30 bg-[#25D366]/5 text-[#25D366] text-sm font-bold hover:bg-[#25D366]/10 transition-all disabled:opacity-40"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
                  Ask on WhatsApp
                </button>
              )}
              <p className="text-xs text-white/45 text-center">
                {payByCard ? 'You won’t be charged until the next step.' : 'No payment needed now — we’ll confirm by email.'}
              </p>
            </div>
          )}
        </div>
      </div>

      <MobileBookingBar
        hidden={ctaVisible}
        hasDates={hasDates}
        totalCents={totalCents}
        days={days}
        dailyRate={Number(car.daily_rate) || 0}
        actionLabel={barAction}
        disabled={dateConflict && step === 'trip'}
        onAction={onBarAction}
      />
    </div>
  )
}
