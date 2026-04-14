import { getFuelLevel, getFuelDiscrepancy } from '@/lib/utils/fuel-utils'

describe('getFuelLevel', () => {
  it('returns 4 for Full', () => expect(getFuelLevel('Full')).toBe(4))
  it('returns 3 for 3/4', () => expect(getFuelLevel('3/4')).toBe(3))
  it('returns 2 for 1/2', () => expect(getFuelLevel('1/2')).toBe(2))
  it('returns 1 for 1/4', () => expect(getFuelLevel('1/4')).toBe(1))
  it('returns 0 for Empty', () => expect(getFuelLevel('Empty')).toBe(0))
  it('returns -1 for unknown value', () => expect(getFuelLevel('unknown')).toBe(-1))
})

describe('getFuelDiscrepancy', () => {
  it('returns 0 charge when fuel returned full', () => {
    const result = getFuelDiscrepancy('Full', 'Full', 20)
    expect(result).toEqual({ levelsMissing: 0, suggestedCharge: 0 })
  })

  it('calculates 2 levels missing with $20/level = $40', () => {
    const result = getFuelDiscrepancy('Full', '1/2', 20)
    expect(result).toEqual({ levelsMissing: 2, suggestedCharge: 40 })
  })

  it('calculates 1 level missing with $30/level = $30', () => {
    const result = getFuelDiscrepancy('3/4', '1/2', 30)
    expect(result).toEqual({ levelsMissing: 1, suggestedCharge: 30 })
  })

  it('returns 0 when fuel returned higher (overfill)', () => {
    const result = getFuelDiscrepancy('1/2', 'Full', 20)
    expect(result).toEqual({ levelsMissing: 0, suggestedCharge: 0 })
  })

  it('returns 0 charge when fuelOut is null', () => {
    const result = getFuelDiscrepancy(null, 'Full', 20)
    expect(result).toEqual({ levelsMissing: 0, suggestedCharge: 0 })
  })

  it('returns 0 charge when fuelIn is null', () => {
    const result = getFuelDiscrepancy('Full', null, 20)
    expect(result).toEqual({ levelsMissing: 0, suggestedCharge: 0 })
  })
})
