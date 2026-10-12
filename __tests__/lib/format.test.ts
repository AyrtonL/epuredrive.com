// __tests__/lib/format.test.ts
import { formatDate, formatMoney } from '@/lib/utils/format'

describe('formatMoney', () => {
  it('drops cents on whole amounts and keeps two decimals otherwise', () => {
    expect(formatMoney(650)).toBe('$650')
    expect(formatMoney(216.9)).toBe('$216.90')
    expect(formatMoney(41.6)).toBe('$41.60')
    expect(formatMoney(13947.12)).toBe('$13,947.12')
  })

  it('puts the minus sign before the dollar sign', () => {
    expect(formatMoney(-461.23)).toBe('-$461.23')
  })

  it('treats a zero amount (including -0) as $0', () => {
    expect(formatMoney(0)).toBe('$0')
    expect(formatMoney(-0)).toBe('$0')
  })

  it('can round to whole dollars', () => {
    expect(formatMoney(25913.5, { cents: false })).toBe('$25,914')
  })

  it('can always show cents for accounting tables', () => {
    expect(formatMoney(50, { cents: 'always' })).toBe('$50.00')
    expect(formatMoney(-306.92, { cents: 'always' })).toBe('-$306.92')
  })

  it('accepts numeric strings and handles empty values', () => {
    expect(formatMoney('216.90')).toBe('$216.90')
    expect(formatMoney(null)).toBe('—')
    expect(formatMoney(undefined)).toBe('—')
    expect(formatMoney('abc')).toBe('—')
  })
})

describe('formatDate', () => {
  it('formats a YYYY-MM-DD date without timezone drift', () => {
    expect(formatDate('2026-12-28')).toBe('Dec 28, 2026')
    expect(formatDate('2026-01-01')).toBe('Jan 1, 2026')
  })

  it('uses the app timezone for timestamps', () => {
    // 02:00Z on Oct 13 is still Oct 12 in New York
    expect(formatDate('2026-10-13T02:00:00Z')).toBe('Oct 12, 2026')
  })

  it('handles empty and invalid input', () => {
    expect(formatDate(null)).toBe('—')
    expect(formatDate('')).toBe('—')
    expect(formatDate('not a date')).toBe('—')
  })
})
