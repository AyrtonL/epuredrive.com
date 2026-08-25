// lib/reservations/overlap.ts
//
// Overbooking prevention. Two reservations for the SAME car conflict when
// their [pickup, return] windows overlap. Used server-side in
// createReservation / updateReservation to block silent double-bookings.
//
// Operators can intentionally double-book (e.g. overlapping same-day
// turnaround), so callers may pass an `allowOverlap` override — the guard
// only reports conflicts, the caller decides whether to hard-block.

import type { Reservation } from '@/lib/supabase/types'

/** Statuses that occupy a car and therefore participate in conflicts. */
export const BLOCKING_STATUSES = ['pending', 'confirmed', 'active'] as const

export interface OverlapCandidate {
  id?: number | null
  car_id: number | null
  pickup_date: string | null
  pickup_time?: string | null
  return_date: string | null
  return_time?: string | null
}

/** Normalize "HH:MM" to "HH:MM:SS" so datetime strings compare consistently. */
function normalizeTime(time: string | null | undefined): string | null {
  if (!time) return null
  return time.length === 5 ? `${time}:00` : time
}

/**
 * Build a comparable datetime string. Missing time defaults to the
 * conservative bound (start of day for a start bound, end of day for an end
 * bound) so date-only reservations still block the whole day, as before.
 */
function toDateTime(date: string, time: string | null | undefined, boundary: 'start' | 'end'): string {
  const t = normalizeTime(time) ?? (boundary === 'start' ? '00:00:00' : '23:59:59')
  return `${date}T${t}`
}

/** Do two [start,end] datetime windows overlap? Null end = open-ended. */
function rangesOverlap(
  aStart: string,
  aStartTime: string | null | undefined,
  aEnd: string | null,
  aEndTime: string | null | undefined,
  bStart: string,
  bStartTime: string | null | undefined,
  bEnd: string | null,
  bEndTime: string | null | undefined
): boolean {
  const aS = toDateTime(aStart, aStartTime, 'start')
  const aE = aEnd ? toDateTime(aEnd, aEndTime, 'end') : '9999-12-31T23:59:59'
  const bS = toDateTime(bStart, bStartTime, 'start')
  const bE = bEnd ? toDateTime(bEnd, bEndTime, 'end') : '9999-12-31T23:59:59'
  return aS < bE && bS < aE
}

/**
 * Return the existing reservations that conflict with `candidate` on the same
 * car. Excludes the candidate itself (by id) and any cancelled/completed rows.
 */
export function findOverlappingReservations(
  candidate: OverlapCandidate,
  existing: readonly Reservation[]
): Reservation[] {
  if (candidate.car_id == null || !candidate.pickup_date) return []
  return existing.filter((r) => {
    if (r.id === candidate.id) return false
    if (r.car_id !== candidate.car_id) return false
    if (!r.pickup_date) return false
    const s = (r.status ?? '').toLowerCase()
    if (!(BLOCKING_STATUSES as readonly string[]).includes(s)) return false
    return rangesOverlap(
      candidate.pickup_date!,
      candidate.pickup_time,
      candidate.return_date ?? null,
      candidate.return_time,
      r.pickup_date,
      r.pickup_time,
      r.return_date ?? null,
      r.return_time
    )
  })
}

/** Human-readable summary of a conflict, for surfacing in an error toast. */
export function describeConflicts(conflicts: readonly Reservation[]): string {
  if (conflicts.length === 0) return ''
  const first = conflicts[0]
  const who = first.customer_name || first.booking_code || 'another booking'
  const range = [first.pickup_date, first.return_date].filter(Boolean).join(' – ')
  const more = conflicts.length > 1 ? ` (+${conflicts.length - 1} more)` : ''
  return `This vehicle is already booked by ${who} for ${range}${more}.`
}
