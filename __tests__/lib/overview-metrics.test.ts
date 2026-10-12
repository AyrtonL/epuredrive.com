// __tests__/lib/overview-metrics.test.ts
import { dailyCarsOutSeries, dailyRevenueSeries, formatDateRange, monthRevenue, rentalProgress, sameDayLastMonthISO } from '@/lib/dashboard/overview-metrics'
import type { Reservation } from '@/lib/supabase/types'

function res(partial: Partial<Reservation>): Reservation {
  return {
    id: 'r1',
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

describe('monthRevenue', () => {
  const today = '2026-10-12'

  it('counts completed revenue plus the October days of active rentals, including days still ahead', () => {
    const rows = [
      // completed inside October: all $100 earned
      res({ id: 'r1', pickup_date: '2026-10-01', return_date: '2026-10-02', total_amount: 100, status: 'completed' }),
      // active Oct 10–19: every day is in October → full $1000, even the days after today
      res({ id: 'r2', pickup_date: '2026-10-10', return_date: '2026-10-19', total_amount: 1000, status: 'active' }),
      // active Sep 22 – Nov 10 (50 days, $500 → $10/day): only Oct's 31 days count
      res({ id: 'r3', pickup_date: '2026-09-22', return_date: '2026-11-10', total_amount: 500, status: 'active' }),
    ]
    const r = monthRevenue(rows, today)
    expect(r.earned).toBeCloseTo(100)
    expect(r.inProgress).toBeCloseTo(1310)
    expect(r.current).toBeCloseTo(1410)
  })

  it('totals all of last month and reports this month as a share of it', () => {
    const rows = [
      res({ id: 'r4', pickup_date: '2026-09-11', return_date: '2026-09-14', total_amount: 400, status: 'completed' }),
      res({ id: 'r5', pickup_date: '2026-09-20', return_date: '2026-09-22', total_amount: 600, status: 'completed' }),
      res({ id: 'r6', pickup_date: '2026-10-05', return_date: '2026-10-06', total_amount: 250, status: 'completed' }),
    ]
    const r = monthRevenue(rows, today)
    expect(r.lastMonthTotal).toBeCloseTo(1000)
    expect(r.pctOfLastMonth).toBe(25)
    expect(r.lastMonthLabel).toBe('Sep')
  })

  it('ignores cancelled and upcoming reservations', () => {
    const rows = [
      res({ id: 'r7', status: 'cancelled', total_amount: 999 }),
      res({ id: 'r8', status: 'confirmed', total_amount: 999 }),
      res({ id: 'r9', status: 'pending', total_amount: 999 }),
    ]
    const r = monthRevenue(rows, today)
    expect(r.current).toBe(0)
    expect(r.lastMonthTotal).toBe(0)
  })

  it('has no share when last month had no revenue', () => {
    const r = monthRevenue([res({ pickup_date: '2026-10-03', return_date: '2026-10-03' })], today)
    expect(r.pctOfLastMonth).toBeNull()
  })

  it('treats an active rental with no return date as running through today', () => {
    const r = monthRevenue([res({ pickup_date: '2026-10-11', return_date: null, total_amount: 200, status: 'active' })], today)
    expect(r.inProgress).toBeCloseTo(200)
  })

  it('rolls the previous month back across the year boundary', () => {
    const r = monthRevenue([res({ pickup_date: '2025-12-10', return_date: '2025-12-11', total_amount: 80 })], '2026-01-05')
    expect(r.lastMonthTotal).toBeCloseTo(80)
    expect(r.lastMonthLabel).toBe('Dec')
  })
})

describe('dailyRevenueSeries', () => {
  it('spreads each rental evenly across its days inside the window', () => {
    const rows = [
      res({ pickup_date: '2026-10-01', return_date: '2026-10-02', total_amount: 100, status: 'completed' }),
      res({ id: 'r2', pickup_date: '2026-10-02', return_date: '2026-10-02', total_amount: 30, status: 'active' }),
      res({ id: 'r3', pickup_date: '2026-10-02', return_date: '2026-10-03', total_amount: 999, status: 'cancelled' }),
    ]
    expect(dailyRevenueSeries(rows, '2026-10-01', '2026-10-03')).toEqual([50, 80, 0])
  })
})

describe('dailyCarsOutSeries', () => {
  it('counts distinct cars out each day, ignoring upcoming and cancelled', () => {
    const rows = [
      res({ car_id: 1, pickup_date: '2026-10-01', return_date: '2026-10-02', status: 'completed' }),
      res({ id: 'r2', car_id: 1, pickup_date: '2026-10-02', return_date: '2026-10-03', status: 'active' }),
      res({ id: 'r3', car_id: 2, pickup_date: '2026-10-02', return_date: '2026-10-02', status: 'completed' }),
      res({ id: 'r4', car_id: 3, pickup_date: '2026-10-01', return_date: '2026-10-03', status: 'confirmed' }),
    ]
    expect(dailyCarsOutSeries(rows, '2026-10-01', '2026-10-03')).toEqual([1, 2, 1])
  })
})

describe('rentalProgress', () => {
  const today = '2026-10-12'

  it('reports the current day of the rental and days until return', () => {
    expect(rentalProgress('2026-10-10', '2026-10-24', today)).toEqual({
      day: 3, totalDays: 15, pct: 20, daysLeft: 12, label: 'Returns in 12 days', tone: 'normal',
    })
  })

  it('flags today and tomorrow returns', () => {
    expect(rentalProgress('2026-10-09', '2026-10-12', today)).toMatchObject({ day: 4, totalDays: 4, pct: 100, daysLeft: 0, label: 'Returns today', tone: 'today' })
    expect(rentalProgress('2026-10-09', '2026-10-13', today)).toMatchObject({ daysLeft: 1, label: 'Returns tomorrow', tone: 'today' })
  })

  it('marks rentals past their return date as overdue and caps progress', () => {
    expect(rentalProgress('2026-10-01', '2026-10-10', today)).toMatchObject({ pct: 100, daysLeft: -2, label: '2 days overdue', tone: 'overdue' })
    expect(rentalProgress('2026-10-01', '2026-10-11', today)).toMatchObject({ label: '1 day overdue' })
  })

  it('handles an open-ended rental', () => {
    expect(rentalProgress('2026-10-10', null, today)).toMatchObject({ day: 3, totalDays: null, pct: null, daysLeft: null, label: 'No return date', tone: 'normal' })
  })
})
