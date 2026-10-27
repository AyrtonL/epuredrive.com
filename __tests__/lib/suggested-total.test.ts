import { suggestBookingTotal } from '@/lib/booking/suggestedTotal'
import type { ReservationExtra } from '@/lib/supabase/types'

const extra = (over: Partial<ReservationExtra>): ReservationExtra => ({
  extra_id: 'x',
  name: 'Child seat',
  pricing_type: 'per_day',
  unit_price: 10,
  quantity: 1,
  subtotal: 10,
  ...over,
})

describe('suggestBookingTotal', () => {
  it('multiplies daily rate by nights', () => {
    expect(suggestBookingTotal({ dailyRate: 45, nights: 10, extras: [] })).toEqual({
      nights: 10,
      dailyRate: 45,
      rental: 450,
      extras: 0,
      total: 450,
    })
  })

  it('reprices per-day extras with the current nights and keeps flat extras', () => {
    const s = suggestBookingTotal({
      dailyRate: 45,
      nights: 10,
      extras: [extra({ quantity: 3, subtotal: 30 }), extra({ pricing_type: 'flat', unit_price: 25, subtotal: 25 })],
    })
    expect(s?.extras).toBe(125)
    expect(s?.total).toBe(575)
  })

  it('handles cents without float drift', () => {
    expect(suggestBookingTotal({ dailyRate: 39.99, nights: 3, extras: [] })?.total).toBe(119.97)
  })

  it('returns null without a rate or a valid stay', () => {
    expect(suggestBookingTotal({ dailyRate: null, nights: 5, extras: [] })).toBeNull()
    expect(suggestBookingTotal({ dailyRate: 0, nights: 5, extras: [] })).toBeNull()
    expect(suggestBookingTotal({ dailyRate: 45, nights: null, extras: [] })).toBeNull()
    expect(suggestBookingTotal({ dailyRate: 45, nights: 0, extras: [] })).toBeNull()
  })
})
