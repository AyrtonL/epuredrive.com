// __tests__/lib/overlap.test.ts
import { findOverlappingReservations, describeConflicts } from '@/lib/reservations/overlap'
import type { Reservation } from '@/lib/supabase/types'

function res(p: Partial<Reservation>): Reservation {
  return {
    id: 1, booking_code: 'B', car_id: 1, customer_name: 'A',
    pickup_date: '2026-06-10', return_date: '2026-06-12',
    total_amount: 100, status: 'confirmed', ...p,
  } as Reservation
}

describe('findOverlappingReservations', () => {
  const existing = [
    res({ id: 10, car_id: 1, pickup_date: '2026-06-10', return_date: '2026-06-14', status: 'confirmed' }),
    res({ id: 11, car_id: 2, pickup_date: '2026-06-10', return_date: '2026-06-14', status: 'confirmed' }),
    res({ id: 12, car_id: 1, pickup_date: '2026-07-01', return_date: '2026-07-03', status: 'confirmed' }),
    res({ id: 13, car_id: 1, pickup_date: '2026-06-11', return_date: '2026-06-13', status: 'cancelled' }),
  ]

  it('flags an overlapping booking on the same car', () => {
    const hits = findOverlappingReservations({ car_id: 1, pickup_date: '2026-06-12', return_date: '2026-06-13' }, existing)
    expect(hits.map((h) => h.id)).toEqual([10])
  })

  it('ignores a different car', () => {
    const hits = findOverlappingReservations({ car_id: 3, pickup_date: '2026-06-12', return_date: '2026-06-13' }, existing)
    expect(hits).toHaveLength(0)
  })

  it('ignores cancelled reservations', () => {
    const hits = findOverlappingReservations({ car_id: 1, pickup_date: '2026-06-11', return_date: '2026-06-11' }, existing)
    expect(hits.map((h) => h.id)).toEqual([10]) // 13 is cancelled, excluded
  })

  it('excludes the reservation being edited (same id)', () => {
    const hits = findOverlappingReservations({ id: 10, car_id: 1, pickup_date: '2026-06-10', return_date: '2026-06-14' }, existing)
    expect(hits).toHaveLength(0)
  })

  it('does not flag non-overlapping dates on the same car', () => {
    const hits = findOverlappingReservations({ car_id: 1, pickup_date: '2026-08-01', return_date: '2026-08-03' }, existing)
    expect(hits).toHaveLength(0)
  })

  it('treats a null return_date as open-ended and conflicting with all later bookings', () => {
    const hits = findOverlappingReservations({ car_id: 1, pickup_date: '2026-06-13', return_date: null }, existing)
    expect(hits.map((h) => h.id).sort((a, b) => a - b)).toEqual([10, 12])
  })
})

describe('describeConflicts', () => {
  it('summarises the first conflict', () => {
    const msg = describeConflicts([res({ customer_name: 'Jane', pickup_date: '2026-06-10', return_date: '2026-06-12' })])
    expect(msg).toContain('Jane')
    expect(msg).toContain('2026-06-10')
  })
  it('returns empty string when no conflicts', () => {
    expect(describeConflicts([])).toBe('')
  })
})
