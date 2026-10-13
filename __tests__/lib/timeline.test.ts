// __tests__/lib/timeline.test.ts
import { buildTimeline, windowDays, type TimelineItem } from '@/lib/calendar/timeline'

const item = (p: Partial<TimelineItem>): TimelineItem => ({
  id: 'a',
  carId: 1,
  start: '2026-10-10',
  end: '2026-10-14',
  kind: 'reservation',
  status: 'confirmed',
  label: 'Ana',
  ...p,
})

describe('windowDays', () => {
  it('lists consecutive days across a month boundary', () => {
    expect(windowDays('2026-10-30', 4)).toEqual(['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02'])
  })
})

describe('buildTimeline (half-day columns: a bar runs from mid pickup day to mid return day)', () => {
  const days = windowDays('2026-10-08', 14) // Oct 8 – Oct 21 → 28 half-day columns

  it('places a booking from the second half of pickup day to the first half of return day', () => {
    const bar = buildTimeline([1], [item({})], days).get(1)![0][0]
    // Oct 10 is day index 2 → half col 6; Oct 14 is index 6 → ends at half col 13
    expect(bar).toMatchObject({ col: 6, span: 8, clippedStart: false, clippedEnd: false })
  })

  it('clips bookings that start before or end after the window', () => {
    const bar = buildTimeline([1], [item({ start: '2026-09-03', end: '2026-11-10' })], days).get(1)![0][0]
    expect(bar).toMatchObject({ col: 1, span: 28, clippedStart: true, clippedEnd: true })
  })

  it('drops items entirely outside the window', () => {
    expect(buildTimeline([1], [item({ start: '2026-12-01', end: '2026-12-03' })], days).get(1)).toEqual([])
  })

  it('keeps back-to-back same-day handovers in one lane', () => {
    const lanes = buildTimeline(
      [1],
      [
        item({ id: 'a', start: '2026-10-09', end: '2026-10-12', endTime: '10:00' }),
        item({ id: 'b', start: '2026-10-12', end: '2026-10-15', startTime: '10:00' }),
      ],
      days,
    ).get(1)!
    expect(lanes).toHaveLength(1)
    expect(lanes[0].map((b) => b.id)).toEqual(['a', 'b'])
  })

  it('stacks genuinely overlapping bookings into separate lanes', () => {
    const lanes = buildTimeline(
      [1],
      [
        item({ id: 'a', start: '2026-10-09', end: '2026-10-12' }),
        item({ id: 'b', start: '2026-10-11', end: '2026-10-15' }),
        item({ id: 'c', start: '2026-10-16', end: '2026-10-18' }),
      ],
      days,
    ).get(1)!
    expect(lanes).toHaveLength(2)
    expect(lanes[0].map((b) => b.id)).toEqual(['a', 'c'])
    expect(lanes[1].map((b) => b.id)).toEqual(['b'])
  })

  it('flags a same-day handover as overlapping when the return is after the next pickup', () => {
    const lanes = buildTimeline(
      [1],
      [
        item({ id: 'a', start: '2026-10-09', end: '2026-10-12', endTime: '14:00' }),
        item({ id: 'b', start: '2026-10-12', end: '2026-10-15', startTime: '10:00' }),
      ],
      days,
    ).get(1)!
    expect(lanes).toHaveLength(2)
  })

  it('keeps every car as a row, even with nothing booked', () => {
    expect(buildTimeline([1, 2], [item({ carId: 1 })], days).get(2)).toEqual([])
  })

  it('treats an open-ended rental as running to the end of the window', () => {
    const bar = buildTimeline([1], [item({ start: '2026-10-10', end: null })], days).get(1)![0][0]
    expect(bar).toMatchObject({ col: 6, span: 23, clippedEnd: true })
  })
})
