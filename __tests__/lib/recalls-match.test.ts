import { buildCandidates, normalizeMake, parseNhtsaDate } from '@/lib/recalls/match'

describe('normalizeMake', () => {
  it.each([
    ['Mercedes Benz', 'MERCEDES-BENZ'],
    ['Mercedes ', 'MERCEDES-BENZ'],
    ['Mercedes AMG', 'MERCEDES-BENZ'],
    ['MERCEDES-BENZ', 'MERCEDES-BENZ'],
    ['vw', 'VOLKSWAGEN'],
    ['Chevy', 'CHEVROLET'],
    ['  bmw ', 'BMW'],
    ['Land Rover', 'LAND ROVER'],
  ])('%s → %s', (raw, expected) => {
    expect(normalizeMake(raw).make).toBe(expected)
  })

  it('splits a model name typed into the make field', () => {
    expect(normalizeMake('Chevrolet Malibu')).toEqual({ make: 'CHEVROLET', modelPrefix: 'MALIBU' })
  })

  it('keeps known multi-word makes whole', () => {
    expect(normalizeMake('Alfa Romeo')).toEqual({ make: 'ALFA ROMEO', modelPrefix: '' })
  })
})

describe('buildCandidates', () => {
  const key = (c: { make: string; model: string; year: number }) => `${c.make}|${c.model}|${c.year}`

  it('tries the exact model first', () => {
    const c = buildCandidates({ make: 'AUDI', model: 'Q3', year: 2018 })
    expect(key(c[0])).toBe('AUDI|Q3|2018')
  })

  it('puts the VIN-decoded vehicle and its trim ahead of typed values', () => {
    const c = buildCandidates(
      { make: 'MERCEDES-BENZ', model: 'S-Class', year: 2021 },
      { make: 'MERCEDES-BENZ', model: 'S-Class', year: 2021, trim: 'S580-4M' },
    ).map(key)
    expect(c[0]).toBe('MERCEDES-BENZ|S-CLASS|2021')
    expect(c).toContain('MERCEDES-BENZ|S580|2021')
  })

  it('adds the MODEL prefix for Tesla', () => {
    const c = buildCandidates({ make: 'Tesla', model: 'Y', year: 2026 }).map(key)
    expect(c).toContain('TESLA|MODEL Y|2026')
  })

  it('adds the 1500 variant for half-ton pickups', () => {
    const c = buildCandidates({ make: 'Chevrolet', model: 'Silverado', year: 2021 }).map(key)
    expect(c).toContain('CHEVROLET|SILVERADO 1500|2021')
  })

  it('falls back to the first word of a decorated model', () => {
    const c = buildCandidates({ make: 'FORD', model: 'Mustang GT - California Special ', year: 2019 }).map(key)
    expect(c).toContain('FORD|MUSTANG|2019')
  })

  it('recovers a model typed into the make field', () => {
    const c = buildCandidates({ make: 'Chevrolet Malibu', model: 'LT', year: 2019 }).map(key)
    expect(c).toContain('CHEVROLET|MALIBU|2019')
  })

  it('uses the decoded year when the car has none', () => {
    const c = buildCandidates(
      { make: 'Audi', model: 'Q3', year: null },
      { make: 'AUDI', model: 'Q3', year: 2018, trim: '' },
    )
    expect(c.every((x) => x.year === 2018)).toBe(true)
  })

  it('returns nothing without a year', () => {
    expect(buildCandidates({ make: 'BMW', model: '420', year: null })).toEqual([])
  })

  it('returns nothing without a make or model', () => {
    expect(buildCandidates({ make: '', model: 'X3', year: 2012 })).toEqual([])
  })

  it('does not repeat candidates', () => {
    const c = buildCandidates(
      { make: 'AUDI', model: 'Q3', year: 2018 },
      { make: 'AUDI', model: 'Q3', year: 2018, trim: '' },
    ).map(key)
    expect(new Set(c).size).toBe(c.length)
  })
})

describe('parseNhtsaDate', () => {
  it('converts DD/MM/YYYY to ISO', () => {
    expect(parseNhtsaDate('23/05/2019')).toBe('2019-05-23')
  })
  it('returns null for junk', () => {
    expect(parseNhtsaDate('')).toBeNull()
    expect(parseNhtsaDate(undefined)).toBeNull()
  })
})
