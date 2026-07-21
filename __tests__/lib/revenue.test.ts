// __tests__/lib/revenue.test.ts
import {
  revenueBucket,
  isEarned,
  sumEarnedRevenue,
  sumActiveRevenue,
  sumUpcomingRevenue,
  overlapsRange,
  reservationsInRange,
  inclusiveDays,
  proratedAmountInRange,
  carRevenueKey,
} from '@/lib/finance/revenue'
import type { Reservation } from '@/lib/supabase/types'

function res(partial: Partial<Reservation>): Reservation {
  return {
    id: 1,
    booking_code: 'B1',
    car_id: 1,
    customer_name: 'Test',
    pickup_date: '2026-06-10',
    return_date: '2026-06-12',
    total_amount: 100,
    status: 'completed',
    ...partial,
  } as Reservation
}

describe('revenueBucket', () => {
  it('classifies each status into one bucket', () => {
    expect(revenueBucket('completed')).toBe('earned')
    expect(revenueBucket('active')).toBe('active')
    expect(revenueBucket('confirmed')).toBe('upcoming')
    expect(revenueBucket('pending')).toBe('upcoming')
    expect(revenueBucket('cancelled')).toBe('excluded')
    expect(revenueBucket(null)).toBe('excluded')
    expect(revenueBucket('COMPLETED')).toBe('earned') // case-insensitive
  })
})

describe('sum helpers', () => {
  const data = [
    res({ status: 'completed', total_amount: 100 }),
    res({ status: 'completed', total_amount: 50 }),
    res({ status: 'active', total_amount: 40 }),
    res({ status: 'confirmed', total_amount: 200 }),
    res({ status: 'cancelled', total_amount: 999 }),
    res({ status: 'completed', total_amount: null as unknown as number }),
  ]
  it('sums only earned (completed) revenue', () => {
    expect(sumEarnedRevenue(data)).toBe(150)
  })
  it('sums active revenue separately', () => {
    expect(sumActiveRevenue(data)).toBe(40)
  })
  it('sums upcoming (confirmed/pending) revenue separately', () => {
    expect(sumUpcomingRevenue(data)).toBe(200)
  })
  it('excludes cancelled and treats null amount as 0', () => {
    expect(isEarned(res({ status: 'cancelled' }))).toBe(false)
  })
})

describe('overlapsRange', () => {
  it('includes a rental that starts before the window and ends inside', () => {
    expect(overlapsRange({ pickup_date: '2026-05-28', return_date: '2026-06-02' }, '2026-06-01', '2026-06-30')).toBe(true)
  })
  it('includes a rental that starts inside and ends after the window', () => {
    expect(overlapsRange({ pickup_date: '2026-06-28', return_date: '2026-07-05' }, '2026-06-01', '2026-06-30')).toBe(true)
  })
  it('includes an in-progress rental with null return_date', () => {
    expect(overlapsRange({ pickup_date: '2026-06-15', return_date: null }, '2026-06-01', '2026-06-30')).toBe(true)
  })
  it('excludes a rental entirely outside the window', () => {
    expect(overlapsRange({ pickup_date: '2026-04-01', return_date: '2026-04-05' }, '2026-06-01', '2026-06-30')).toBe(false)
  })
})

describe('reservationsInRange', () => {
  it('excludes cancelled even if dates overlap', () => {
    const data = [
      res({ status: 'completed', pickup_date: '2026-06-10', return_date: '2026-06-12' }),
      res({ status: 'cancelled', pickup_date: '2026-06-10', return_date: '2026-06-12' }),
    ]
    expect(reservationsInRange(data, '2026-06-01', '2026-06-30')).toHaveLength(1)
  })
})

describe('inclusiveDays', () => {
  it('counts inclusive whole days', () => {
    expect(inclusiveDays('2026-06-10', '2026-06-12')).toBe(3)
    expect(inclusiveDays('2026-06-10', '2026-06-10')).toBe(1)
  })
})

describe('proratedAmountInRange', () => {
  it('returns full amount when rental fits inside window', () => {
    const r = res({ pickup_date: '2026-06-10', return_date: '2026-06-12', total_amount: 300 })
    expect(proratedAmountInRange(r, '2026-06-01', '2026-06-30')).toBe(300)
  })
  it('prorates a rental that straddles the window edge', () => {
    // 4-day rental Jun 29–Jul 2, window ends Jun 30 → 2 of 4 days inside
    const r = res({ pickup_date: '2026-06-29', return_date: '2026-07-02', total_amount: 400 })
    expect(proratedAmountInRange(r, '2026-06-01', '2026-06-30')).toBe(200)
  })
})

describe('carRevenueKey', () => {
  it('keys by car id, not model string', () => {
    expect(carRevenueKey({ car_id: 7 })).toBe('7')
    expect(carRevenueKey({ car_id: null })).toBe('unassigned')
  })
})
