// __tests__/lib/seasonal-pricing.test.ts
import { demandFactor, nextPeak, roundPrice, seasonOf, suggestPrices } from '@/lib/pricing/seasonal'

describe('seasonOf', () => {
  it('maps months to Miami high/low season', () => {
    expect(seasonOf('2026-10-15').kind).toBe('low')
    expect(seasonOf('2026-11-15').kind).toBe('high')
    expect(seasonOf('2027-02-10').kind).toBe('high')
    expect(seasonOf('2027-07-04').kind).toBe('low')
  })

  it('peaks win over the month, including windows that wrap the year', () => {
    expect(seasonOf('2026-12-05')).toEqual({ kind: 'peak', label: 'Art Basel week' })
    expect(seasonOf('2026-12-31').kind).toBe('peak')
    expect(seasonOf('2027-01-02').kind).toBe('peak')
    expect(seasonOf('2027-01-04').kind).toBe('high')
    expect(seasonOf('2027-03-15').label).toBe('Spring break')
  })
})

describe('helpers', () => {
  it('rounds to the nearest $5 with a floor', () => {
    expect(roundPrice(147)).toBe(145)
    expect(roundPrice(148)).toBe(150)
    expect(roundPrice(1)).toBe(5)
  })

  it('nudges by utilization', () => {
    expect(demandFactor(0.8)).toBe(1.1)
    expect(demandFactor(0.55)).toBe(1.05)
    expect(demandFactor(0.35)).toBe(1)
    expect(demandFactor(0.1)).toBe(0.95)
  })

  it('finds the next peak, across the year end', () => {
    expect(nextPeak('2026-10-15')).toEqual({ name: 'Art Basel week', from: '2026-12-01', to: '2026-12-08' })
    expect(nextPeak('2026-12-25')?.name).toBe('Holidays & New Year')
    expect(nextPeak('2027-01-02')).toEqual({ name: 'Holidays & New Year', from: '2026-12-20', to: '2027-01-03' })
    expect(nextPeak('2027-01-10')).toEqual({ name: 'Spring break', from: '2027-03-01', to: '2027-03-31' })
  })
})

describe('suggestPrices', () => {
  const today = '2026-10-15' // low season
  const r = (car_id: number, pickup: string, ret: string, amount: number, source = 'admin', status = 'completed') => ({
    car_id, pickup_date: pickup, return_date: ret, status, source, total_amount: amount,
  })

  it('prefers direct bookings as the base when there are at least 3', () => {
    const out = suggestPrices({
      today,
      cars: [{ id: 3, name: 'Cayenne', dailyRate: 200 }],
      reservations: [
        r(3, '2026-08-01', '2026-08-03', 300), // 150/day direct
        r(3, '2026-08-10', '2026-08-14', 600),
        r(3, '2026-09-01', '2026-09-03', 300),
        r(3, '2026-09-10', '2026-09-14', 400, 'turo'), // 100/day Turo
      ],
    })
    const c = out.cars[0]
    expect(c.baseSource).toBe('direct')
    expect(c.realizedDirectPerDay).toBe(150)
    expect(c.realizedTuroPerDay).toBe(100)
    // 12 nights in last 90 days → 13% utilization → ×0.95
    expect(c.demandFactor).toBe(0.95)
    expect(c.suggested).toEqual({
      low: roundPrice(150 * 0.95 * 0.95),
      high: roundPrice(150 * 0.95 * 1.15),
      peak: roundPrice(150 * 0.95 * 1.35),
    })
    expect(out.season.kind).toBe('low')
    expect(c.suggestedNow).toBe(c.suggested!.low)
  })

  it('falls back to all channels, then to the list price', () => {
    const out = suggestPrices({
      today,
      cars: [
        { id: 4, name: 'Atlas', dailyRate: 130 },
        { id: 9, name: 'New car', dailyRate: 80 },
        { id: 10, name: 'No price', dailyRate: null },
      ],
      reservations: [
        r(4, '2026-07-01', '2026-07-05', 240, 'turo'), // 60/day
        r(4, '2026-08-01', '2026-08-05', 240, 'turo'),
        r(4, '2026-09-01', '2026-09-05', 240),
      ],
    })
    const [atlas, fresh, none] = out.cars
    expect(atlas.baseSource).toBe('all')
    expect(atlas.base).toBe(60)
    expect(atlas.listTooHigh).toBe(true) // 130 > 60 × 1.4
    expect(fresh.baseSource).toBe('list')
    expect(fresh.base).toBe(80)
    expect(fresh.listTooHigh).toBe(false)
    expect(none.baseSource).toBe('none')
    expect(none.suggested).toBeNull()
  })

  it('ignores cancelled, old and zero-amount rentals; counts active rentals only for utilization', () => {
    const out = suggestPrices({
      today,
      cars: [{ id: 2, name: 'A3', dailyRate: 50 }],
      reservations: [
        r(2, '2025-01-01', '2025-01-05', 999), // older than 12 months
        r(2, '2026-09-01', '2026-09-05', 0), // no amount
        r(2, '2026-09-10', '2026-09-12', 500, 'admin', 'cancelled'),
        r(2, '2026-08-01', '2026-08-03', 100),
        r(2, '2026-08-10', '2026-08-12', 100),
        r(2, '2026-09-20', '2026-09-22', 100),
        r(2, '2026-10-01', '2026-11-30', 1800, 'admin', 'active'), // 14 nights through today
      ],
    })
    const a3 = out.cars[0]
    expect(a3.rentals).toBe(3)
    expect(a3.realizedPerDay).toBe(50)
    // nights in the last 90 days: 2 + 2 + 4 (zero-amount, still rented) + 2 + 14 = 24
    expect(a3.utilization90).toBeCloseTo(24 / 90, 5)
  })
})
