// lib/reservations/overlap.ts
//
// Overbooking prevention. Two reservations for the SAME car conflict when
// their [pickup_date, return_date] ranges overlap. Used server-side in
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
  return_date: string | null
}

/** Do two inclusive [start,end] date ranges overlap? Null end = open-ended. */
function rangesOverlap(
  aStart: string,
  aEnd: string | null,
  bStart: string,
  bEnd: string | null
): boolean {
  const aE = aEnd ?? '9999-12-31'
  const bE = bEnd ?? '9999-12-31'
  return aStart <= bE && bStart <= aE
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
      candidate.return_date ?? null,
      r.pickup_date,
      r.return_date ?? null
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
