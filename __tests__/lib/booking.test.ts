// __tests__/lib/booking.test.ts
import { to24h, validateBookingWindow } from '@/lib/booking/dates'
import { computeQuote, resolveLocationFee } from '@/lib/booking/quote'
import { isAllowedOriginHost } from '@/lib/booking/origin'
import { findBookingConflicts } from '@/lib/booking/availability'
import type { PickupLocation } from '@/lib/supabase/types'

describe('to24h', () => {
  it('converts 12h widget times', () => {
    expect(to24h('10:00 AM')).toBe('10:00')
    expect(to24h('12:00 PM')).toBe('12:00')
    expect(to24h('12:30 AM')).toBe('00:30')
    expect(to24h('08:00 PM')).toBe('20:00')
  })
  it('passes through 24h times and rejects garbage', () => {
    expect(to24h('14:30')).toBe('14:30')
    expect(to24h('later')).toBeNull()
    expect(to24h(null)).toBeNull()
  })
})

describe('validateBookingWindow', () => {
  const today = '2026-10-13'
  it('accepts a future range and counts days', () => {
    expect(validateBookingWindow('2026-10-21', '2026-10-24', today)).toEqual({ ok: true, days: 3 })
  })
  it('accepts a same-day pickup', () => {
    expect(validateBookingWindow('2026-10-13', '2026-10-14', today)).toEqual({ ok: true, days: 1 })
  })
  it('rejects past pickup', () => {
    expect(validateBookingWindow('2026-10-12', '2026-10-14', today).ok).toBe(false)
  })
  it('rejects return on/before pickup', () => {
    expect(validateBookingWindow('2026-10-20', '2026-10-20', today).ok).toBe(false)
    expect(validateBookingWindow('2026-10-20', '2026-10-18', today).ok).toBe(false)
  })
  it('rejects malformed dates and >365 days', () => {
    expect(validateBookingWindow('2026-13-01', '2026-13-05', today).ok).toBe(false)
    expect(validateBookingWindow('tomorrow', '2026-10-20', today).ok).toBe(false)
    expect(validateBookingWindow('2026-10-20', '2027-12-01', today).ok).toBe(false)
  })
})

const locations: PickupLocation[] = [
  { label: 'Aventura HQ', address: '', note: '', maps_query: '', fee: 0 },
  { label: 'MIA Airport', address: '', note: '', maps_query: '', fee: 120 },
]

describe('resolveLocationFee', () => {
  it('matches the raw label', () => {
    expect(resolveLocationFee(locations, 'MIA Airport')).toEqual({ ok: true, fee: 120 })
  })
  it('matches the decorated label the widget stores', () => {
    expect(resolveLocationFee(locations, 'MIA Airport ($120)')).toEqual({ ok: true, fee: 120 })
    expect(resolveLocationFee(locations, 'Aventura HQ (Free)')).toEqual({ ok: true, fee: 0 })
  })
  it('rejects an unknown location when the tenant has a list', () => {
    expect(resolveLocationFee(locations, 'My house').ok).toBe(false)
    expect(resolveLocationFee(locations, null).ok).toBe(false)
  })
  it('is free when the tenant has no locations configured', () => {
    expect(resolveLocationFee([], 'anything')).toEqual({ ok: true, fee: 0 })
    expect(resolveLocationFee(null, null)).toEqual({ ok: true, fee: 0 })
  })
})

describe('computeQuote', () => {
  const extras = [
    { id: 'gps', name: 'GPS', pricing_type: 'per_day', price: 15 },
    { id: 'fuel', name: 'Fuel', pricing_type: 'flat', price: 80 },
  ]
  it('matches the widget for cash: rental + location + extras, no surcharge', () => {
    const q = computeQuote({ dailyRate: 200, days: 3, locationFee: 120, extras, card: false, surchargeRate: 0.06 })
    expect(q.rentalCents).toBe(60000)
    expect(q.extrasCents).toBe(4500 + 8000)
    expect(q.surchargeCents).toBe(0)
    expect(q.totalCents).toBe(60000 + 12000 + 12500)
    expect(q.extras).toEqual([
      { extra_id: 'gps', name: 'GPS', pricing_type: 'per_day', unit_price: 15, quantity: 3, subtotal: 45 },
      { extra_id: 'fuel', name: 'Fuel', pricing_type: 'flat', unit_price: 80, quantity: 1, subtotal: 80 },
    ])
  })
  it('adds the card surcharge on the full subtotal', () => {
    const q = computeQuote({ dailyRate: 200, days: 3, locationFee: 0, extras: [], card: true, surchargeRate: 0.06 })
    expect(q.surchargeCents).toBe(3600)
    expect(q.totalCents).toBe(63600)
  })
})

describe('isAllowedOriginHost', () => {
  it('allows the platform, its subdomains and localhost', () => {
    expect(isAllowedOriginHost('epuredrive.com', [])).toBe(true)
    expect(isAllowedOriginHost('epurecarent.epuredrive.com', [])).toBe(true)
    expect(isAllowedOriginHost('localhost', [])).toBe(true)
  })
  it('allows a tenant custom domain and its www variant', () => {
    expect(isAllowedOriginHost('sswrental.autos', ['sswrental.autos'])).toBe(true)
    expect(isAllowedOriginHost('www.sswrental.autos', ['sswrental.autos'])).toBe(true)
  })
  it('rejects look-alikes and unknown hosts', () => {
    expect(isAllowedOriginHost('evil.com', ['sswrental.autos'])).toBe(false)
    expect(isAllowedOriginHost('epuredrive.com.evil.com', [])).toBe(false)
    expect(isAllowedOriginHost('xsswrental.autos', ['sswrental.autos'])).toBe(false)
  })
})

describe('findBookingConflicts', () => {
  const reservations = [
    { id: 'a', car_id: 3, status: 'active', pickup_date: '2026-10-10', pickup_time: '10:00', return_date: '2026-10-24', return_time: '10:00' },
    { id: 'b', car_id: 3, status: 'cancelled', pickup_date: '2026-11-05', pickup_time: null, return_date: '2026-11-07', return_time: null },
  ]
  const blocked = [{ start_date: '2026-11-20', end_date: '2026-11-22' }]

  it('blocks dates inside an active rental (the live Cayenne case)', () => {
    const c = findBookingConflicts({ carId: 3, pickupDate: '2026-10-21', pickupTime: '10:00', returnDate: '2026-10-24', returnTime: '10:00' }, reservations, blocked)
    expect(c).toBe(true)
  })
  it('allows a same-day turnaround after the return time', () => {
    const c = findBookingConflicts({ carId: 3, pickupDate: '2026-10-24', pickupTime: '14:00', returnDate: '2026-10-26', returnTime: '10:00' }, reservations, blocked)
    expect(c).toBe(false)
  })
  it('ignores cancelled bookings', () => {
    const c = findBookingConflicts({ carId: 3, pickupDate: '2026-11-05', pickupTime: '10:00', returnDate: '2026-11-06', returnTime: '10:00' }, reservations, blocked)
    expect(c).toBe(false)
  })
  it('blocks operator-blocked dates', () => {
    const c = findBookingConflicts({ carId: 3, pickupDate: '2026-11-22', pickupTime: '10:00', returnDate: '2026-11-25', returnTime: '10:00' }, reservations, blocked)
    expect(c).toBe(true)
  })
})
