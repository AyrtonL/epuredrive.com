// __tests__/lib/overview-metrics.test.ts
import { dailyCarsOutSeries, dailyRevenueSeries, formatDateRange, monthToDateRevenue, sameDayLastMonthISO } from '@/lib/dashboard/overview-metrics'
import type { Reservation } from '@/lib/supabase/types'

function res(partial: Partial<Reservation>): Reservation {
  return {
    id: 1,
    car_id: 1,
    pickup_date: '2026-10-01',
    return_date: '2026-10-02',
    total_amount: 100,
    status: 'completed',
    ...partial,
  } as Reservation
}

describe('formatDateRange', () => {
  it('shows the month once when both dates share it', () => {
    expect(formatDateRange('2026-10-09', '2026-10-13', '2026-10-12')).toBe('Oct 9 – 13')
  })

  it('names both months when the range crosses a month', () => {
    expect(formatDateRange('2026-09-24', '2026-10-02', '2026-10-12')).toBe('Sep 24 – Oct 2')
  })

  it('adds the year when the range crosses into another year', () => {
    expect(formatDateRange('2026-12-27', '2027-01-03', '2026-10-12')).toBe('Dec 27 – Jan 3, 2027')
  })

  it('adds the year when the whole range is outside the current year', () => {
    expect(formatDateRange('2027-02-01', '2027-02-05', '2026-10-12')).toBe('Feb 1 – 5, 2027')
  })

  it('handles a missing return date and a missing pickup', () => {
    expect(formatDateRange('2026-10-09', null, '2026-10-12')).toBe('Oct 9 – open')
    expect(formatDateRange(null, null, '2026-10-12')).toBe('TBD')
  })
})

describe('sameDayLastMonthISO', () => {
  it('returns the same day of the previous month', () => {
    expect(sameDayLastMonthISO('2026-10-12')).toBe('2026-09-12')
  })

  it('clamps to the last day of a shorter month', () => {
    expect(sameDayLastMonthISO('2026-03-31')).toBe('2026-02-28')
  })

  it('rolls back across the year boundary', () => {
    expect(sameDayLastMonthISO('2026-01-15')).toBe('2025-12-15')
  })
})

describe('monthToDateRevenue', () => {
  const today = '2026-10-12'

  it('splits earned and in-progress revenue, prorated to the days inside the month so far', () => {
    const rows = [
      // completed, fully inside Oct 1–12: all $100 counts as earned
      res({ id: 1, pickup_date: '2026-10-01', return_date: '2026-10-02', total_amount: 100, status: 'completed' }),
      // active Oct 10–19 (10 days, $1000): Oct 10–12 = 3 days → $300 in progress
      res({ id: 2, pickup_date: '2026-10-10', return_date: '2026-10-19', total_amount: 1000, status: 'active' }),
    ]
    const r = monthToDateRevenue(rows, today)
    expect(r.earned).toBeCloseTo(100)
    expect(r.inProgress).toBeCloseTo(300)
    expect(r.current).toBeCloseTo(400)
  })

  it('compares against the same window last month, not the whole month', () => {
    const rows = [
      // Sep 1–12 window: 2 of 4 days of a $400 rental → $200
      res({ id: 3, pickup_date: '2026-09-11', return_date: '2026-09-14', total_amount: 400, status: 'completed' }),
      // after Sep 12 → must not count toward the comparison
      res({ id: 4, pickup_date: '2026-09-20', return_date: '2026-09-22', total_amount: 900, status: 'completed' }),
      res({ id: 5, pickup_date: '2026-10-05', return_date: '2026-10-06', total_amount: 300, status: 'completed' }),
    ]
    const r = monthToDateRevenue(rows, today)
    expect(r.previous).toBeCloseTo(200)
    expect(r.current).toBeCloseTo(300)
    expect(r.trendPct).toBe(50)
  })

  it('ignores cancelled and upcoming reservations', () => {
    const rows = [
      res({ id: 6, status: 'cancelled', total_amount: 999 }),
      res({ id: 7, status: 'confirmed', total_amount: 999 }),
      res({ id: 8, status: 'pending', total_amount: 999 }),
    ]
    const r = monthToDateRevenue(rows, today)
    expect(r.current).toBe(0)
    expect(r.previous).toBe(0)
  })

  it('returns a null trend when there is nothing to compare against', () => {
    const r = monthToDateRevenue([res({ pickup_date: '2026-10-03', return_date: '2026-10-03' })], today)
    expect(r.trendPct).toBeNull()
  })

  it('treats an active rental with no return date as ongoing through today', () => {
    const r = monthToDateRevenue([res({ pickup_date: '2026-10-11', return_date: null, total_amount: 200, status: 'active' })], today)
    // open-ended: whole amount is attributed to the 2 days so far
    expect(r.inProgress).toBeCloseTo(200)
  })
})

describe('dailyRevenueSeries', () => {
  it('spreads each rental evenly across its days inside the window', () => {
    const rows = [
      res({ pickup_date: '2026-10-01', return_date: '2026-10-02', total_amount: 100, status: 'completed' }),
      res({ id: 2, pickup_date: '2026-10-02', return_date: '2026-10-02', total_amount: 30, status: 'active' }),
      res({ id: 3, pickup_date: '2026-10-02', return_date: '2026-10-03', total_amount: 999, status: 'cancelled' }),
    ]
    expect(dailyRevenueSeries(rows, '2026-10-01', '2026-10-03')).toEqual([50, 80, 0])
  })
})

describe('dailyCarsOutSeries', () => {
  it('counts distinct cars out each day, ignoring upcoming and cancelled', () => {
    const rows = [
      res({ car_id: 1, pickup_date: '2026-10-01', return_date: '2026-10-02', status: 'completed' }),
      res({ id: 2, car_id: 1, pickup_date: '2026-10-02', return_date: '2026-10-03', status: 'active' }),
      res({ id: 3, car_id: 2, pickup_date: '2026-10-02', return_date: '2026-10-02', status: 'completed' }),
      res({ id: 4, car_id: 3, pickup_date: '2026-10-01', return_date: '2026-10-03', status: 'confirmed' }),
    ]
    expect(dailyCarsOutSeries(rows, '2026-10-01', '2026-10-03')).toEqual([1, 2, 1])
  })
})
