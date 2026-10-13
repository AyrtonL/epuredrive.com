// lib/booking/quote.ts
//
// Server-side price of a public booking. Mirrors the BookingWidget total
// (rental + pickup location fee + extras, + card surcharge when paying by
// card) so the amount stored/charged never comes from the browser.

import type { PickupLocation, ReservationExtra } from '@/lib/supabase/types'
import { calculateCardSurcharge } from '@/lib/pricing/cardSurcharge'

export interface DbExtra {
  id: string
  name: string
  pricing_type: string
  price: number | string
}

export interface QuoteInput {
  dailyRate: number
  days: number
  locationFee: number
  extras: readonly DbExtra[]
  card: boolean
  surchargeRate: number | null
}

export interface Quote {
  rentalCents: number
  locationCents: number
  extrasCents: number
  subtotalCents: number
  surchargeCents: number
  totalCents: number
  extras: ReservationExtra[]
}

export type LocationResult = { ok: true; fee: number } | { ok: false; error: string }

/**
 * Fee of the chosen pickup location. Accepts the raw label or the decorated
 * label the widget stores ("MIA Airport ($120)", "Aventura HQ (Free)").
 * A tenant with no configured locations has no location fee.
 */
export function resolveLocationFee(
  locations: readonly PickupLocation[] | null | undefined,
  chosen: string | null | undefined,
): LocationResult {
  if (!locations || locations.length === 0) return { ok: true, fee: 0 }
  const value = (chosen ?? '').trim()
  const match = locations.find((l) => value === l.label || value.startsWith(`${l.label} (`))
  if (!match) return { ok: false, error: 'Invalid pickup location' }
  return { ok: true, fee: Number(match.fee) || 0 }
}

export function computeQuote(input: QuoteInput): Quote {
  const rentalCents = Math.round(input.dailyRate * input.days * 100)
  const locationCents = Math.round(input.locationFee * 100)
  const extras: ReservationExtra[] = input.extras.map((e) => {
    const perDay = e.pricing_type === 'per_day'
    const quantity = perDay ? input.days : 1
    const unitCents = Math.round(Number(e.price) * 100)
    return {
      extra_id: e.id,
      name: e.name,
      pricing_type: perDay ? 'per_day' : 'flat',
      unit_price: Number(e.price),
      quantity,
      subtotal: (unitCents * quantity) / 100,
    }
  })
  const extrasCents = extras.reduce((sum, e) => sum + Math.round(e.subtotal * 100), 0)
  const subtotalCents = rentalCents + locationCents + extrasCents
  const surchargeCents = input.card ? calculateCardSurcharge(subtotalCents, input.surchargeRate) : 0
  return {
    rentalCents,
    locationCents,
    extrasCents,
    subtotalCents,
    surchargeCents,
    totalCents: subtotalCents + surchargeCents,
    extras,
  }
}
