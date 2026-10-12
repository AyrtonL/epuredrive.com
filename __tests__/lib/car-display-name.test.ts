// __tests__/lib/car-display-name.test.ts
import { carDisplayName, categoryLabel } from '@/lib/utils/car-display-name'

describe('carDisplayName', () => {
  it('joins make and model_full', () => {
    expect(carDisplayName({ make: 'Audi', model: 'Q3', model_full: 'Q3 2.0 FWD' })).toBe('Audi Q3 2.0 FWD')
  })

  it('falls back to model when model_full is empty', () => {
    expect(carDisplayName({ make: 'Mercedes Benz', model: 'S550', model_full: null })).toBe('Mercedes Benz S550')
    expect(carDisplayName({ make: 'Kia', model: 'Rio', model_full: '' })).toBe('Kia Rio')
  })

  it('does not repeat the make when model_full already starts with it', () => {
    expect(carDisplayName({ make: 'Tesla', model: 'Y', model_full: 'Tesla Y' })).toBe('Tesla Y')
    expect(carDisplayName({ make: 'Chevrolet', model: 'Silverado', model_full: 'Chevrolet Silverado' })).toBe('Chevrolet Silverado')
    expect(carDisplayName({ make: 'Mercedes Benz', model: 'GL450', model_full: 'Mercedes Benz GL450' })).toBe('Mercedes Benz GL450')
  })

  it('dedupes case-insensitively and ignores stray whitespace', () => {
    expect(carDisplayName({ make: 'Mercedes ', model: 'E350', model_full: 'Mercedes e350 ' })).toBe('Mercedes e350')
    expect(carDisplayName({ make: 'BMW ', model: '420', model_full: 'BMW 420 ' })).toBe('BMW 420')
  })

  it('does not treat a partial word as the make', () => {
    expect(carDisplayName({ make: 'Mini', model: 'Cooper', model_full: 'Minivan XL' })).toBe('Mini Minivan XL')
  })

  it('title-cases all-caps make words longer than 3 letters, keeps acronyms', () => {
    expect(carDisplayName({ make: 'AUDI', model: 'A3', model_full: 'A3 2.0 FWD' })).toBe('Audi A3 2.0 FWD')
    expect(carDisplayName({ make: 'VOLKSWAGEN', model: 'Atlas', model_full: 'Atlas SE V6' })).toBe('Volkswagen Atlas SE V6')
    expect(carDisplayName({ make: 'BMW', model: 'X5', model_full: null })).toBe('BMW X5')
    expect(carDisplayName({ make: 'MERCEDES AMG', model: 'S63', model_full: null })).toBe('Mercedes AMG S63')
  })

  it('handles a missing make', () => {
    expect(carDisplayName({ make: null, model: 'Y', model_full: null })).toBe('Y')
    expect(carDisplayName({ make: '', model: '', model_full: null })).toBe('Vehicle')
  })
})

describe('categoryLabel', () => {
  it('uppercases short categories and capitalizes the rest', () => {
    expect(categoryLabel('suv')).toBe('SUV')
    expect(categoryLabel('economy')).toBe('Economy')
    expect(categoryLabel('LUXURY')).toBe('Luxury')
    expect(categoryLabel('')).toBeNull()
    expect(categoryLabel(null)).toBeNull()
  })
})
