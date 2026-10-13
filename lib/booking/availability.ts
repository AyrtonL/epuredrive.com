// lib/booking/availability.ts
//
// Is a car free for a public booking? Checks live reservations (pending,
// confirmed, active — via the shared overbooking guard) and operator
// blocked_dates. Reads with the service-role client: anon has no SELECT on
// reservations, which is why /api/availability used to return [] for every
// car and the site let customers book cars that were already rented.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Reservation } from '@/lib/supabase/types'
import { BLOCKING_STATUSES, findOverlappingReservations } from '@/lib/reservations/overlap'

export interface BookingWindow {
  carId: number
  pickupDate: string
  pickupTime: string | null
  returnDate: string
  returnTime: string | null
}

export interface BusyReservation {
  id: string
  car_id: number | null
  status: string | null
  pickup_date: string | null
  pickup_time: string | null
  return_date: string | null
  return_time: string | null
}

export interface BlockedRange {
  start_date: string
  end_date: string
}

/** Date ranges the public calendar should grey out (no customer data). */
export interface BusyRange {
  from: string
  to: string
}

export function findBookingConflicts(
  window: BookingWindow,
  reservations: readonly BusyReservation[],
  blocked: readonly BlockedRange[],
): boolean {
  const overlapping = findOverlappingReservations(
    {
      car_id: window.carId,
      pickup_date: window.pickupDate,
      pickup_time: window.pickupTime,
      return_date: window.returnDate,
      return_time: window.returnTime,
    },
    reservations as unknown as Reservation[],
  )
  if (overlapping.length > 0) return true
  return blocked.some((b) => b.start_date <= window.returnDate && b.end_date >= window.pickupDate)
}

async function loadBusy(
  supabase: SupabaseClient,
  tenantId: string,
  carId: number,
  fromDate: string,
): Promise<{ reservations: BusyReservation[]; blocked: BlockedRange[] }> {
  const [res, blk] = await Promise.all([
    supabase
      .from('reservations')
      .select('id, car_id, status, pickup_date, pickup_time, return_date, return_time')
      .eq('tenant_id', tenantId)
      .eq('car_id', carId)
      .in('status', [...BLOCKING_STATUSES])
      .gte('return_date', fromDate),
    supabase
      .from('blocked_dates')
      .select('start_date, end_date')
      .eq('tenant_id', tenantId)
      .eq('car_id', carId)
      .gte('end_date', fromDate),
  ])
  if (res.error || blk.error) {
    throw new Error(`availability lookup failed: ${res.error?.message ?? blk.error?.message}`)
  }
  return { reservations: (res.data ?? []) as BusyReservation[], blocked: (blk.data ?? []) as BlockedRange[] }
}

/** True when the car is free. Throws on lookup errors — callers must fail closed. */
export async function isCarAvailable(
  supabase: SupabaseClient,
  tenantId: string,
  window: BookingWindow,
): Promise<boolean> {
  const { reservations, blocked } = await loadBusy(supabase, tenantId, window.carId, window.pickupDate)
  return !findBookingConflicts(window, reservations, blocked)
}

/** Busy ranges from `fromDate` on, for greying out the public date picker. */
export async function getBusyRanges(
  supabase: SupabaseClient,
  tenantId: string,
  carId: number,
  fromDate: string,
): Promise<BusyRange[]> {
  const { reservations, blocked } = await loadBusy(supabase, tenantId, carId, fromDate)
  return [
    ...reservations
      .filter((r) => r.pickup_date)
      .map((r) => ({ from: r.pickup_date as string, to: (r.return_date ?? r.pickup_date) as string })),
    ...blocked.map((b) => ({ from: b.start_date, to: b.end_date })),
  ].sort((a, b) => a.from.localeCompare(b.from))
}
