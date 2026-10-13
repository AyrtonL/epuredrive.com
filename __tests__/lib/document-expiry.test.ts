// __tests__/lib/document-expiry.test.ts
import { dueExpiryAlerts, expiryStatus } from '@/lib/fleet/document-expiry'

const TODAY = '2026-10-13'

describe('expiryStatus', () => {
  it('flags expired, due soon (≤30 days), ok and missing dates', () => {
    expect(expiryStatus('2026-07-22', TODAY)).toMatchObject({ state: 'expired', daysLeft: -83 })
    expect(expiryStatus('2026-10-13', TODAY)).toMatchObject({ state: 'expired', daysLeft: 0, label: 'Expires today' })
    expect(expiryStatus('2026-10-20', TODAY)).toMatchObject({ state: 'soon', daysLeft: 7, label: 'Expires in 7 days' })
    expect(expiryStatus('2026-11-12', TODAY)).toMatchObject({ state: 'soon', daysLeft: 30 })
    expect(expiryStatus('2027-07-22', TODAY)).toMatchObject({ state: 'ok' })
    expect(expiryStatus(null, TODAY)).toMatchObject({ state: 'missing', daysLeft: null })
  })

  it('words past dates as expired', () => {
    expect(expiryStatus('2026-10-12', TODAY).label).toBe('Expired 1 day ago')
    expect(expiryStatus('2026-07-22', TODAY).label).toBe('Expired 83 days ago')
  })
})

describe('dueExpiryAlerts', () => {
  const car = (id: number, reg: string | null, ins: string | null = null) => ({
    id, registration_expiry: reg, insurance_expiry: ins,
  })

  it('emits the most severe threshold crossed for each document', () => {
    const alerts = dueExpiryAlerts([car(1, '2026-11-01', '2026-10-15'), car(2, '2026-07-22')], TODAY, new Set())
    expect(alerts).toEqual([
      expect.objectContaining({ carId: 1, kind: 'registration', expiry: '2026-11-01', threshold: 30, daysLeft: 19 }),
      expect.objectContaining({ carId: 1, kind: 'insurance', expiry: '2026-10-15', threshold: 7, daysLeft: 2 }),
      expect.objectContaining({ carId: 2, kind: 'registration', expiry: '2026-07-22', threshold: 0, daysLeft: -83 }),
    ])
  })

  it('skips thresholds already sent for the same expiry date', () => {
    const sent = new Set(['1:insurance:2026-10-15:7'])
    const alerts = dueExpiryAlerts([car(1, null, '2026-10-15')], TODAY, sent)
    expect(alerts).toEqual([])
  })

  it('alerts again after a renewal changes the expiry date', () => {
    const sent = new Set(['1:registration:2026-07-22:0'])
    const alerts = dueExpiryAlerts([car(1, '2026-11-01')], TODAY, sent)
    expect(alerts.map((a) => a.threshold)).toEqual([30])
  })

  it('ignores missing and far-off dates', () => {
    expect(dueExpiryAlerts([car(1, null), car(2, '2027-07-22')], TODAY, new Set())).toEqual([])
  })
})
