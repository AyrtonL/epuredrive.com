import { calculateCardSurcharge, getCardSurchargeRate } from '@/lib/pricing/cardSurcharge'

describe('calculateCardSurcharge', () => {
  it('applies the default 6% rate when tenant rate is null', () => {
    expect(calculateCardSurcharge(10000, null)).toBe(600)
  })

  it('applies a custom tenant rate', () => {
    expect(calculateCardSurcharge(10000, 0.03)).toBe(300)
  })

  it('returns 0 for a zero subtotal', () => {
    expect(calculateCardSurcharge(0, null)).toBe(0)
  })

  it('rounds to the nearest cent', () => {
    expect(calculateCardSurcharge(999, null)).toBe(60) // 999 * 0.06 = 59.94 -> 60
  })
})

describe('getCardSurchargeRate', () => {
  it('returns the default rate when null', () => {
    expect(getCardSurchargeRate(null)).toBe(0.06)
  })

  it('returns the tenant-configured rate when set', () => {
    expect(getCardSurchargeRate(0.04)).toBe(0.04)
  })
})
