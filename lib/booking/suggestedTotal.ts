// lib/booking/suggestedTotal.ts
//
// Suggested total for a dashboard booking: car daily rate × nights, plus the
// selected extras (per-day extras repriced for the current nights). Reuses
// computeQuote so the dashboard and the public widget price the same way.

import type { ReservationExtra } from '@/lib/supabase/types'
import { computeQuote } from '@/lib/booking/quote'

export interface SuggestedTotal {
  nights: number
  dailyRate: number
  rental: number
  extras: number
  total: number
}

export function suggestBookingTotal(input: {
  dailyRate: number | null | undefined
  nights: number | null
  extras: readonly ReservationExtra[]
}): SuggestedTotal | null {
  const dailyRate = Number(input.dailyRate) || 0
  if (dailyRate <= 0 || !input.nights || input.nights <= 0) return null

  const quote = computeQuote({
    dailyRate,
    days: input.nights,
    locationFee: 0,
    extras: input.extras.map((e) => ({ id: e.extra_id, name: e.name, pricing_type: e.pricing_type, price: e.unit_price })),
    card: false,
    surchargeRate: null,
  })
  return {
    nights: input.nights,
    dailyRate,
    rental: quote.rentalCents / 100,
    extras: quote.extrasCents / 100,
    total: quote.subtotalCents / 100,
  }
}
