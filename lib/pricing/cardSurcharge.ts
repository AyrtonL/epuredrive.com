const DEFAULT_CARD_SURCHARGE_RATE = 0.06

export function calculateCardSurcharge(subtotalCents: number, rate: number | null): number {
  const effectiveRate = rate ?? DEFAULT_CARD_SURCHARGE_RATE
  return Math.round(subtotalCents * effectiveRate)
}

export function getCardSurchargeRate(rate: number | null): number {
  return rate ?? DEFAULT_CARD_SURCHARGE_RATE
}
