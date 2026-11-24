// lib/booking/priceLines.ts
//
// Itemized price for the public booking widget. Built on computeQuote so the
// customer sees exactly what the server will charge, line by line.

import { computeQuote, type DbExtra } from '@/lib/booking/quote'
import { getCardSurchargeRate } from '@/lib/pricing/cardSurcharge'

export interface PriceLine {
  label: string
  cents: number
}

export interface PriceLinesInput {
  dailyRate: number
  days: number
  location: { label: string; fee: number } | null
  extras: readonly DbExtra[]
  card: boolean
  surchargeRate: number | null
}

const dollars = (n: number): string =>
  `$${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`

const dayWord = (days: number): string => `${days} day${days === 1 ? '' : 's'}`

export function buildPriceLines(input: PriceLinesInput): { lines: PriceLine[]; totalCents: number } {
  const quote = computeQuote({
    dailyRate: input.dailyRate,
    days: input.days,
    locationFee: input.location?.fee ?? 0,
    extras: input.extras,
    card: input.card,
    surchargeRate: input.surchargeRate,
  })

  const lines: PriceLine[] = [
    { label: `${dollars(input.dailyRate)} × ${dayWord(input.days)}`, cents: quote.rentalCents },
  ]
  if (input.location && quote.locationCents > 0) {
    lines.push({ label: input.location.label, cents: quote.locationCents })
  }
  for (const e of quote.extras) {
    const label = e.pricing_type === 'per_day'
      ? `${e.name} (${dollars(e.unit_price)} × ${dayWord(e.quantity)})`
      : e.name
    lines.push({ label, cents: Math.round(e.subtotal * 100) })
  }
  if (quote.surchargeCents > 0) {
    const pct = (getCardSurchargeRate(input.surchargeRate) * 100).toLocaleString('en-US', { maximumFractionDigits: 2 })
    lines.push({ label: `Card fee (${pct}%)`, cents: quote.surchargeCents })
  }
  return { lines, totalCents: quote.totalCents }
}
