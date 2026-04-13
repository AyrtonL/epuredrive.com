// __tests__/booking-widget-utils.test.ts

function formatBookedRange(from: string, to: string): string {
  const fmt = (d: string) =>
    new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${fmt(from)} – ${fmt(to)}`
}

describe('formatBookedRange', () => {
  it('formats a range within the same month', () => {
    expect(formatBookedRange('2026-01-15', '2026-01-18')).toBe('Jan 15 – Jan 18')
  })

  it('formats a range across months', () => {
    expect(formatBookedRange('2026-01-28', '2026-02-03')).toBe('Jan 28 – Feb 3')
  })

  it('formats a single-day range', () => {
    expect(formatBookedRange('2026-03-10', '2026-03-10')).toBe('Mar 10 – Mar 10')
  })
})
