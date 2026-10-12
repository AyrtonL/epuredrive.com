// lib/dashboard/overview-metrics.ts
//
// Pure helpers behind the Overview page. Kept out of the page so the
// numbers can be unit-tested against fixed dates.

import type { Reservation } from '@/lib/supabase/types'
import { inclusiveDays, proratedAmountInRange, revenueBucket } from '@/lib/finance/revenue'

export interface MonthRevenue {
  /** earned + inProgress for this calendar month */
  current: number
  /** completed reservations, prorated to this month's days */
  earned: number
  /** active rentals, counting all of their days that fall in this month (incl. days still ahead) */
  inProgress: number
  /** completed + active revenue for all of last month */
  lastMonthTotal: number
  /** current as a % of lastMonthTotal; null when last month had none */
  pctOfLastMonth: number | null
  /** "Sep" */
  lastMonthLabel: string
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

function lastOfMonth(iso: string): string {
  const { y, m } = parts(iso)
  return `${y}-${pad(m)}-${pad(new Date(Date.UTC(y, m, 0)).getUTCDate())}`
}

/**
 * This month's revenue. Earned (completed) follows the policy in
 * lib/finance/revenue.ts; active rentals are opted in explicitly and count
 * every day they have in this month — they're already on the road, so
 * October will collect them. Days that spill into next month don't count.
 * Compared with the whole of last month as a share ("62% of Sep"), since a
 * month in progress can't be compared like for like with a finished one.
 */
export function monthRevenue(rows: readonly Reservation[], today: string): MonthRevenue {
  // Open-ended active rentals have no known end — count them through today.
  const normalized = rows.map((r) => (r.return_date ? r : { ...r, return_date: today }))

  const sumWindow = (from: string, to: string, bucket: 'earned' | 'active'): number =>
    normalized
      .filter((r) => revenueBucket(r.status) === bucket)
      .reduce((s, r) => s + proratedAmountInRange(r, from, to), 0)

  const curFrom = firstOfMonth(today)
  const curTo = lastOfMonth(today)
  const prevTo = lastOfMonth(sameDayLastMonthISO(today))
  const prevFrom = firstOfMonth(prevTo)

  const earned = sumWindow(curFrom, curTo, 'earned')
  const inProgress = sumWindow(curFrom, curTo, 'active')
  const current = earned + inProgress
  const lastMonthTotal = sumWindow(prevFrom, prevTo, 'earned') + sumWindow(prevFrom, prevTo, 'active')

  return {
    current,
    earned,
    inProgress,
    lastMonthTotal,
    pctOfLastMonth: lastMonthTotal > 0 ? Math.round((current / lastMonthTotal) * 100) : null,
    lastMonthLabel: MONTHS[parts(prevTo).m - 1],
  }
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

export interface RentalProgress {
  /** 1-based day of the rental today */
  day: number
  totalDays: number | null
  /** 0–100, null when the rental has no return date */
  pct: number | null
  /** negative when overdue */
  daysLeft: number | null
  label: string
  tone: 'normal' | 'today' | 'overdue'
}

const dayDiff = (from: string, to: string): number =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000)

/** Where an active rental stands today: "day 3 of 15 · Returns in 12 days". */
export function rentalProgress(pickup: string, ret: string | null, today: string): RentalProgress {
  const day = Math.max(1, dayDiff(pickup, today) + 1)
  if (!ret) return { day, totalDays: null, pct: null, daysLeft: null, label: 'No return date', tone: 'normal' }

  const totalDays = inclusiveDays(pickup, ret)
  const daysLeft = dayDiff(today, ret)
  const pct = Math.min(100, Math.round((Math.min(day, totalDays) / totalDays) * 100))

  if (daysLeft < 0) {
    const late = -daysLeft
    return { day, totalDays, pct, daysLeft, label: `${late} day${late === 1 ? '' : 's'} overdue`, tone: 'overdue' }
  }
  if (daysLeft === 0) return { day, totalDays, pct, daysLeft, label: 'Returns today', tone: 'today' }
  if (daysLeft === 1) return { day, totalDays, pct, daysLeft, label: 'Returns tomorrow', tone: 'today' }
  return { day, totalDays, pct, daysLeft, label: `Returns in ${daysLeft} days`, tone: 'normal' }
}
