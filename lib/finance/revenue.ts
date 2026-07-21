// lib/finance/revenue.ts
//
// SINGLE SOURCE OF TRUTH for how the dashboard defines "revenue".
//
// Policy (chosen 2026-07-21): EARNED / COMPLETED.
//   - A reservation contributes revenue once it is `completed`.
//   - `active` (in progress) reservations are "in-progress" — surfaced
//     separately, never counted as earned unless a page explicitly opts in.
//   - `confirmed` / `pending` (future) are "upcoming", not revenue.
//   - `cancelled` is always excluded.
//
// Every finance surface (Overview, Reports, ROI, Taxes, Utilization,
// Fleet Performance) MUST import from here so the same fleet never shows
// two different revenue numbers. Do not re-derive revenue inline.

import type { Reservation } from '@/lib/supabase/types'

/** Reservation statuses that count as earned revenue. */
export const EARNED_STATUSES = ['completed'] as const
/** Reservations that are money-in-progress (out on rental right now). */
export const ACTIVE_STATUSES = ['active'] as const
/** Reservations booked but not yet earned. */
export const UPCOMING_STATUSES = ['confirmed', 'pending'] as const

export type RevenueBucket = 'earned' | 'active' | 'upcoming' | 'excluded'

/** Classify a reservation into a single revenue bucket. */
export function revenueBucket(status: string | null | undefined): RevenueBucket {
  const s = (status ?? '').toLowerCase()
  if ((EARNED_STATUSES as readonly string[]).includes(s)) return 'earned'
  if ((ACTIVE_STATUSES as readonly string[]).includes(s)) return 'active'
  if ((UPCOMING_STATUSES as readonly string[]).includes(s)) return 'upcoming'
  return 'excluded'
}

export function isEarned(r: Pick<Reservation, 'status'>): boolean {
  return revenueBucket(r.status) === 'earned'
}

const amountOf = (r: Pick<Reservation, 'total_amount'>): number =>
  Number(r.total_amount) || 0

/** Total earned (completed) revenue. The canonical "revenue" number. */
export function sumEarnedRevenue(reservations: readonly Reservation[]): number {
  return reservations.filter(isEarned).reduce((s, r) => s + amountOf(r), 0)
}

/** Money currently out on active rentals (in-progress, not yet earned). */
export function sumActiveRevenue(reservations: readonly Reservation[]): number {
  return reservations
    .filter((r) => revenueBucket(r.status) === 'active')
    .reduce((s, r) => s + amountOf(r), 0)
}

/** Booked-but-unearned revenue (confirmed/pending future bookings) = A/R. */
export function sumUpcomingRevenue(reservations: readonly Reservation[]): number {
  return reservations
    .filter((r) => revenueBucket(r.status) === 'upcoming')
    .reduce((s, r) => s + amountOf(r), 0)
}

// ---------------------------------------------------------------------------
// Date helpers — timezone-safe. The app operates in America/New_York.
// Using toISOString() (UTC) for "today"/ranges caused off-by-one bugs near
// midnight and dropped boundary-spanning rentals; these fix that.
// ---------------------------------------------------------------------------

export const APP_TZ = 'America/New_York'

/** Today as YYYY-MM-DD in the app timezone (not UTC). */
export function todayISO(tz: string = APP_TZ): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: tz })
}

/** N days ago as YYYY-MM-DD in the app timezone. */
export function daysAgoISO(days: number, tz: string = APP_TZ): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toLocaleDateString('en-CA', { timeZone: tz })
}

/** First day of the current month as YYYY-MM-DD (app timezone). */
export function startOfMonthISO(tz: string = APP_TZ): string {
  const now = new Date()
  const y = Number(now.toLocaleDateString('en-CA', { timeZone: tz, year: 'numeric' }))
  const m = now.toLocaleDateString('en-CA', { timeZone: tz, month: '2-digit' })
  return `${y}-${m}-01`
}

/**
 * Does a reservation OVERLAP the inclusive [from, to] date window?
 *
 * A rental overlaps the window if it starts on/before `to` AND ends on/after
 * `from`. This is the correct test for period reports — the previous
 * "entirely inside the window" test dropped long rentals near range edges and
 * excluded in-progress rentals with a null return_date.
 */
export function overlapsRange(
  r: Pick<Reservation, 'pickup_date' | 'return_date'>,
  from: string,
  to: string
): boolean {
  if (!r.pickup_date) return false
  const start = r.pickup_date
  // Open-ended (in-progress) rentals have no return_date → treat as ongoing.
  const end = r.return_date ?? to
  return start <= to && end >= from
}

/** Filter reservations that overlap [from, to] and are not cancelled. */
export function reservationsInRange(
  reservations: readonly Reservation[],
  from: string,
  to: string
): Reservation[] {
  return reservations.filter(
    (r) => revenueBucket(r.status) !== 'excluded' && overlapsRange(r, from, to)
  )
}

/** Inclusive whole-day count between two YYYY-MM-DD strings (min 1). */
export function inclusiveDays(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00`)
  const b = Date.parse(`${to}T00:00:00`)
  if (Number.isNaN(a) || Number.isNaN(b)) return 1
  return Math.max(1, Math.round((b - a) / 86400000) + 1)
}

/**
 * Portion of a reservation's amount attributable to the [from, to] window,
 * prorated by the number of rental days that fall inside the window.
 * Used by utilization/period revenue views.
 */
export function proratedAmountInRange(
  r: Reservation,
  from: string,
  to: string
): number {
  if (!r.pickup_date) return 0
  const end = r.return_date ?? to
  const rentalDays = inclusiveDays(r.pickup_date, end)
  const overlapStart = r.pickup_date > from ? r.pickup_date : from
  const overlapEnd = end < to ? end : to
  if (overlapEnd < overlapStart) return 0
  const overlapDays = inclusiveDays(overlapStart, overlapEnd)
  const amount = amountOf(r)
  return (amount * Math.min(overlapDays, rentalDays)) / rentalDays
}

/** Stable per-vehicle grouping key — never group by bare `model` (collisions). */
export function carRevenueKey(car: Pick<Reservation, 'car_id'>): string {
  return car.car_id != null ? String(car.car_id) : 'unassigned'
}
