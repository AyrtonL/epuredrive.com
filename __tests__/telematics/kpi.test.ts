// __tests__/telematics/kpi.test.ts
import { milesFromOdometerEndpoints, startOfAppDayIso } from '@/lib/telematics/kpi'

describe('startOfAppDayIso', () => {
  it('is New York midnight expressed in UTC, during EDT', () => {
    expect(startOfAppDayIso(new Date('2026-10-12T19:00:00Z'))).toBe('2026-10-12T04:00:00.000Z')
  })

  it('is New York midnight expressed in UTC, during EST', () => {
    expect(startOfAppDayIso(new Date('2026-12-01T15:00:00Z'))).toBe('2026-12-01T05:00:00.000Z')
  })

  it('stays on the New York date late in the evening (UTC already tomorrow)', () => {
    // 11pm EDT on Oct 12 = 03:00Z Oct 13 — still Oct 12 in New York.
    expect(startOfAppDayIso(new Date('2026-10-13T03:00:00Z'))).toBe('2026-10-12T04:00:00.000Z')
  })
})

describe('milesFromOdometerEndpoints', () => {
  it('sums last minus first odometer per device and rounds', () => {
    expect(
      milesFromOdometerEndpoints([
        { first: 126387.5, last: 126447.3 },
        { first: 92871, last: 92871 },
      ]),
    ).toBe(60)
  })

  it('skips devices without both readings and never goes negative', () => {
    expect(
      milesFromOdometerEndpoints([
        { first: null, last: 100 },
        { first: 200, last: 150 },
        { first: 10, last: 20 },
      ]),
    ).toBe(10)
  })
})
