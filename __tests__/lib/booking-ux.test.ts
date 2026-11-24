import { rentalDays } from '@/lib/booking/dates'
import { buildPriceLines } from '@/lib/booking/priceLines'
import { validateCustomer } from '@/lib/booking/customer'

describe('validateCustomer', () => {
  it('accepts a complete customer with or without phone', () => {
    expect(validateCustomer({ name: 'Ana Ruiz', email: 'ana@example.com', phone: '' })).toEqual({})
    expect(validateCustomer({ name: 'Ana Ruiz', email: 'ana@example.com', phone: '+1 (305) 555-0101' })).toEqual({})
  })
  it('flags each bad field with its own message', () => {
    const errors = validateCustomer({ name: ' ', email: 'ana@', phone: '12' })
    expect(Object.keys(errors).sort()).toEqual(['email', 'name', 'phone'])
  })
})

describe('rentalDays', () => {
  it('counts nights between pickup and return', () => {
    expect(rentalDays('2026-11-28', '2026-12-02')).toBe(4)
  })
  it('handles DST changes without off-by-one', () => {
    expect(rentalDays('2026-03-07', '2026-03-09')).toBe(2)
  })
  it('returns 0 for missing, invalid or reversed dates', () => {
    expect(rentalDays('', '2026-12-02')).toBe(0)
    expect(rentalDays('2026-12-02', '2026-11-28')).toBe(0)
    expect(rentalDays('2026-12-02', '2026-12-02')).toBe(0)
    expect(rentalDays('2026-02-31', '2026-03-02')).toBe(0)
  })
})

describe('buildPriceLines', () => {
  const base = {
    dailyRate: 80,
    days: 4,
    location: { label: 'MIA Airport', fee: 120 },
    extras: [
      { id: 'a', name: 'Child Seat', pricing_type: 'per_day', price: 10 },
      { id: 'b', name: 'Prepaid Fuel', pricing_type: 'flat', price: 80 },
    ],
    card: true,
    surchargeRate: 0.06,
  }

  it('itemizes rental, location, extras and surcharge with a matching total', () => {
    const { lines, totalCents } = buildPriceLines(base)
    expect(lines).toEqual([
      { label: '$80 × 4 days', cents: 32000 },
      { label: 'MIA Airport', cents: 12000 },
      { label: 'Child Seat ($10 × 4 days)', cents: 4000 },
      { label: 'Prepaid Fuel', cents: 8000 },
      { label: 'Card fee (6%)', cents: 3360 },
    ])
    expect(totalCents).toBe(59360)
    expect(lines.reduce((s, l) => s + l.cents, 0)).toBe(totalCents)
  })

  it('omits free location and the card fee when paying cash', () => {
    const { lines, totalCents } = buildPriceLines({
      ...base,
      location: { label: 'Aventura HQ', fee: 0 },
      extras: [],
      card: false,
    })
    expect(lines).toEqual([{ label: '$80 × 4 days', cents: 32000 }])
    expect(totalCents).toBe(32000)
  })

  it('uses singular "day" for one-day rentals', () => {
    const { lines } = buildPriceLines({ ...base, days: 1, location: null, extras: [], card: false })
    expect(lines[0].label).toBe('$80 × 1 day')
  })
})
