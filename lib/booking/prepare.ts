// lib/booking/prepare.ts
//
// The one server-side gate every public booking route runs before it
// creates a reservation or a payment link: valid dates, known pickup
// location, car actually free, and a price computed from the DB.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { PickupLocation } from '@/lib/supabase/types'
import { todayISO } from '@/lib/finance/revenue'
import { to24h, validateBookingWindow } from '@/lib/booking/dates'
import { computeQuote, resolveLocationFee, type Quote } from '@/lib/booking/quote'
import { loadActiveExtras, requestedExtraIds } from '@/lib/booking/extras'
import { isCarAvailable } from '@/lib/booking/availability'

export const UNAVAILABLE_ERROR = 'This vehicle is not available for the selected dates. Please choose different dates.'

export interface PrepareInput {
  tenantId: string
  carId: number
  dailyRate: number
  pickupLocations: PickupLocation[] | null
  surchargeRate: number | null
  card: boolean
  pickupDate: string
  returnDate: string
  pickupTime: unknown
  returnTime: unknown
  pickupLocation: unknown
  extras: unknown
}

export interface PreparedBooking {
  days: number
  pickupTime: string | null
  returnTime: string | null
  pickupLocation: string | null
  quote: Quote
}

export type PrepareResult =
  | { ok: true; booking: PreparedBooking }
  | { ok: false; status: number; error: string }

export async function prepareBooking(supabase: SupabaseClient, input: PrepareInput): Promise<PrepareResult> {
  const window = validateBookingWindow(input.pickupDate, input.returnDate, todayISO())
  if (!window.ok) return { ok: false, status: 400, error: window.error }

  const pickupLocation = typeof input.pickupLocation === 'string' ? input.pickupLocation.trim().slice(0, 200) : null
  const location = resolveLocationFee(input.pickupLocations, pickupLocation)
  if (!location.ok) return { ok: false, status: 400, error: location.error }

  const pickupTime = to24h(typeof input.pickupTime === 'string' ? input.pickupTime : null)
  const returnTime = to24h(typeof input.returnTime === 'string' ? input.returnTime : null)

  try {
    const free = await isCarAvailable(supabase, input.tenantId, {
      carId: input.carId,
      pickupDate: input.pickupDate,
      pickupTime,
      returnDate: input.returnDate,
      returnTime,
    })
    if (!free) return { ok: false, status: 409, error: UNAVAILABLE_ERROR }

    const extras = await loadActiveExtras(supabase, input.tenantId, requestedExtraIds(input.extras))
    const quote = computeQuote({
      dailyRate: input.dailyRate,
      days: window.days,
      locationFee: location.fee,
      extras,
      card: input.card,
      surchargeRate: input.surchargeRate,
    })
    return { ok: true, booking: { days: window.days, pickupTime, returnTime, pickupLocation, quote } }
  } catch (err) {
    // Fail closed: never book when availability/pricing can't be verified
    console.error('[booking] prepare failed:', err)
    return { ok: false, status: 500, error: 'Could not verify availability. Please try again.' }
  }
}
