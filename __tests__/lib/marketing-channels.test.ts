import { channelOf, computeChannelStats, type ChannelReservation } from '@/lib/marketing/channels'

const r = (over: Partial<ChannelReservation>): ChannelReservation => ({
  source: 'admin',
  status: 'completed',
  total_amount: 100,
  pickup_date: '2026-03-01',
  return_date: '2026-03-04',
  customer_name: 'Ana Perez',
  customer_email: null,
  customer_phone: null,
  ...over,
})

describe('channelOf', () => {
  it.each([
    ['admin', 'direct'], ['manual', 'direct'], ['web', 'direct'], ['website', 'direct'],
    ['stripe', 'direct'], [null, 'direct'], ['turo', 'turo'], ['upcar', 'other'], ['ical', 'other'],
  ])('%s → %s', (source, expected) => {
    expect(channelOf(source)).toBe(expected)
  })
})

describe('computeChannelStats', () => {
  it('splits bookings and earned revenue per channel, ignoring cancelled', () => {
    const s = computeChannelStats([
      r({ source: 'admin', total_amount: 600 }),
      r({ source: 'turo', total_amount: 300 }),
      r({ source: 'turo', total_amount: 400, status: 'confirmed' }),
      r({ source: 'admin', total_amount: 999, status: 'cancelled' }),
    ])
    const direct = s.channels.find((c) => c.channel === 'direct')!
    const turo = s.channels.find((c) => c.channel === 'turo')!
    expect(direct.bookings).toBe(1)
    expect(direct.earnedRevenue).toBe(600)
    expect(turo.bookings).toBe(2)
    expect(turo.earnedRevenue).toBe(300) // confirmed is upcoming, not earned
    expect(turo.avgPerEarnedBooking).toBe(300)
    expect(s.directShare).toBeCloseTo(1 / 3)
  })

  it('computes average rental length in days', () => {
    const s = computeChannelStats([
      r({ pickup_date: '2026-03-01', return_date: '2026-03-04' }),
      r({ pickup_date: '2026-03-10', return_date: '2026-03-20' }),
    ])
    expect(s.channels.find((c) => c.channel === 'direct')!.avgDays).toBe(6.5)
  })

  it('counts repeat customers by email, then phone digits, then name', () => {
    const s = computeChannelStats([
      r({ customer_email: 'A@x.com', customer_name: 'A' }),
      r({ customer_email: 'a@x.com ', customer_name: 'A. Smith' }),
      r({ customer_phone: '(305) 555-1234', customer_name: 'B' }),
      r({ customer_phone: '3055551234', customer_name: 'Bee' }),
      r({ customer_name: 'Carl' }),
    ])
    expect(s.uniqueCustomers).toBe(3)
    expect(s.repeatCustomers).toBe(2)
  })

  it('measures contact capture on direct bookings only', () => {
    const s = computeChannelStats([
      r({ source: 'admin', customer_email: 'a@x.com' }),
      r({ source: 'admin' }),
      r({ source: 'turo' }),
    ])
    expect(s.directEmailCapture).toBe(0.5)
  })

  it('handles an empty list', () => {
    const s = computeChannelStats([])
    expect(s.directShare).toBe(0)
    expect(s.directEmailCapture).toBe(0)
    expect(s.uniqueCustomers).toBe(0)
  })
})
