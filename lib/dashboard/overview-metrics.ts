// lib/dashboard/overview-metrics.ts
//
// Pure helpers behind the Overview page. Kept out of the page so the
// numbers can be unit-tested against fixed dates.

import type { Reservation } from '@/lib/supabase/types'
import { inclusiveDays, proratedAmountInRange, revenueBucket } from '@/lib/finance/revenue'

export interface MonthToDateRevenue {
  /** earned + inProgress, prorated to the days of this month so far */
  current: number
  earned: number
  inProgress: number
  /** same calculation for the same days of last month */
  previous: number
  /** % change vs previous, null when there is nothing to compare against */
  trendPct: number | null
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function parts(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return { y, m, d }
}

const pad = (n: number): string => String(n).padStart(2, '0')

export function sameDayLastMonthISO(today: string): string {
  const { y, m, d } = parts(today)
  const prevY = m === 1 ? y - 1 : y
  const prevM = m === 1 ? 12 : m - 1
  const lastDayOfPrev = new Date(Date.UTC(prevY, prevM, 0)).getUTCDate()
  return `${prevY}-${pad(prevM)}-${pad(Math.min(d, lastDayOfPrev))}`
}

function firstOfMonth(iso: string): string {
  const { y, m } = parts(iso)
  return `${y}-${pad(m)}-01`
}

/**
 * Revenue for the month so far. Earned (completed) follows the policy in
 * lib/finance/revenue.ts; in-progress (active) rentals are shown alongside
 * it explicitly so an operator with cars out early in the month doesn't see
 * "$0 · −100%". Both windows are prorated by rental days, so the comparison
 * is like for like.
 */
export function monthToDateRevenue(rows: readonly Reservation[], today: string): MonthToDateRevenue {
  // Open-ended active rentals run through today — fix their end once so the
  // same rental isn't attributed in full to both windows.
  const normalized = rows.map((r) => (r.return_date ? r : { ...r, return_date: today }))

  const sumWindow = (from: string, to: string, bucket: 'earned' | 'active'): number =>
    normalized
      .filter((r) => revenueBucket(r.status) === bucket)
      .reduce((s, r) => s + proratedAmountInRange(r, from, to), 0)

  const curFrom = firstOfMonth(today)
  const prevTo = sameDayLastMonthISO(today)
  const prevFrom = firstOfMonth(prevTo)

  const earned = sumWindow(curFrom, today, 'earned')
  const inProgress = sumWindow(curFrom, today, 'active')
  const current = earned + inProgress
  const previous = sumWindow(prevFrom, prevTo, 'earned') + sumWindow(prevFrom, prevTo, 'active')
  const trendPct = previous > 0 ? Math.round(((current - previous) / previous) * 100) : null

  return { current, earned, inProgress, previous, trendPct }
}

const isRevenueBearing = (r: Pick<Reservation, 'status'>): boolean => {
  const b = revenueBucket(r.status)
  return b === 'earned' || b === 'active'
}

function eachDay(from: string, to: string): string[] {
  const days: string[] = []
  const end = Date.parse(`${to}T00:00:00Z`)
  for (let t = Date.parse(`${from}T00:00:00Z`); t <= end; t += 86400000) {
    days.push(new Date(t).toISOString().slice(0, 10))
  }
  return days
}

function coversDay(r: Pick<Reservation, 'pickup_date' | 'return_date'>, day: string): boolean {
  return !!r.pickup_date && r.pickup_date <= day && (r.return_date ?? day) >= day
}

/** Revenue per day across [from, to], each rental spread evenly over its days. */
export function dailyRevenueSeries(rows: readonly Reservation[], from: string, to: string): number[] {
  const bearing = rows.filter(isRevenueBearing)
  return eachDay(from, to).map((day) =>
    bearing
      .filter((r) => coversDay(r, day))
      .reduce((s, r) => s + (Number(r.total_amount) || 0) / inclusiveDays(r.pickup_date!, r.return_date ?? day), 0)
  )
}

/** Distinct cars out on rental per day across [from, to]. */
export function dailyCarsOutSeries(rows: readonly Reservation[], from: string, to: string): number[] {
  const bearing = rows.filter(isRevenueBearing)
  return eachDay(from, to).map(
    (day) => new Set(bearing.filter((r) => r.car_id != null && coversDay(r, day)).map((r) => r.car_id)).size
  )
}

/** "Oct 9 – 13", "Sep 24 – Oct 2", "Dec 27 – Jan 3, 2027". */
export function formatDateRange(pickup: string | null, ret: string | null, today: string): string {
  if (!pickup) return 'TBD'
  const a = parts(pickup)
  const start = `${MONTHS[a.m - 1]} ${a.d}`
  const currentYear = parts(today).y

  if (!ret) return `${start} – open`

  const b = parts(ret)
  const end = a.y === b.y && a.m === b.m ? `${b.d}` : `${MONTHS[b.m - 1]} ${b.d}`
  const needsYear = a.y !== b.y || b.y !== currentYear
  return `${start} – ${end}${needsYear ? `, ${b.y}` : ''}`
}
