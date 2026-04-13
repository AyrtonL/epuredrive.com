// lib/__tests__/date-range-picker.test.ts

function toDate(s: string): Date {
  return new Date(s + 'T12:00:00')
}

function toStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

describe('DateRangePicker helpers', () => {
  it('toDate parses YYYY-MM-DD without timezone shift', () => {
    const d = toDate('2026-06-15')
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(5) // June = 5
    expect(d.getDate()).toBe(15)
  })

  it('toStr round-trips through toDate', () => {
    const original = '2026-08-01'
    expect(toStr(toDate(original))).toBe(original)
  })

  it('toStr round-trips for year boundary', () => {
    expect(toStr(toDate('2026-12-31'))).toBe('2026-12-31')
    expect(toStr(toDate('2027-01-01'))).toBe('2027-01-01')
  })
})
