import { isValidRating } from '@/lib/feedback/validate-rating'

describe('isValidRating', () => {
  test('accepts integers 1 through 5', () => {
    expect(isValidRating(1)).toBe(true)
    expect(isValidRating(3)).toBe(true)
    expect(isValidRating(5)).toBe(true)
  })

  test('rejects 0, 6, and negative numbers', () => {
    expect(isValidRating(0)).toBe(false)
    expect(isValidRating(6)).toBe(false)
    expect(isValidRating(-1)).toBe(false)
  })

  test('rejects non-integers', () => {
    expect(isValidRating(3.5)).toBe(false)
  })

  test('rejects non-number input without throwing', () => {
    expect(isValidRating('3')).toBe(false)
    expect(isValidRating(null)).toBe(false)
    expect(isValidRating(undefined)).toBe(false)
    expect(isValidRating({})).toBe(false)
  })
})
