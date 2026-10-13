// lib/calendar/timeline.ts
//
// Layout for the fleet timeline (cars as rows, days as columns). Each day is
// two half-day columns and a bar runs from the middle of the pickup day to
// the middle of the return day — hotel-style — so back-to-back rentals with
// a same-day handover meet in the middle instead of colliding. Bars that
// truly overlap on the same car are stacked into extra lanes.

export interface TimelineItem {
  id: string
  carId: number | null
  /** YYYY-MM-DD, inclusive */
  start: string
  /** YYYY-MM-DD, inclusive; null = open-ended */
  end: string | null
  /** HH:MM, used only to decide whether a same-day handover collides */
  startTime?: string | null
  endTime?: string | null
  kind: 'reservation' | 'blocked'
  status: string | null
  label: string
}

export interface TimelineBar extends TimelineItem {
  /** 1-based first half-day column in the window */
  col: number
  /** number of half-day columns */
  span: number
  clippedStart: boolean
  clippedEnd: boolean
}

const DAY_MS = 86400000

export function windowDays(start: string, count: number): string[] {
  const t0 = Date.parse(`${start}T00:00:00Z`)
  return Array.from({ length: count }, (_, i) => new Date(t0 + i * DAY_MS).toISOString().slice(0, 10))
}

function collides(prev: TimelineBar, next: TimelineBar): boolean {
  const prevEnd = prev.col + prev.span - 1
  if (prevEnd < next.col) {
    // Same-day handover: they share the day but not the half. Still a clash
    // if the earlier rental is returned after the next one is picked up.
    const sameDay = prev.end != null && prev.end === next.start
    return sameDay && !!prev.endTime && !!next.startTime && prev.endTime > next.startTime
  }
  return true
}

/** Map of carId → lanes (each lane a list of non-colliding bars, by start). */
export function buildTimeline(
  carIds: readonly number[],
  items: readonly TimelineItem[],
  days: readonly string[],
): Map<number, TimelineBar[][]> {
  const first = days[0]
  const last = days[days.length - 1]
  const halves = days.length * 2
  const out = new Map<number, TimelineBar[][]>(carIds.map((id) => [id, []]))

  const bars = items
    .filter((it) => it.carId != null && out.has(it.carId) && it.start <= last && (it.end ?? last) >= first)
    .map((it): TimelineBar => {
      const clippedStart = it.start < first
      const clippedEnd = it.end == null || it.end > last
      const startHalf = clippedStart ? 1 : days.indexOf(it.start) * 2 + 2
      const endHalf = clippedEnd ? halves : days.indexOf(it.end!) * 2 + 1
      // A same-day rental (pickup = return) still gets one visible half.
      const span = Math.max(1, endHalf - startHalf + 1)
      return { ...it, col: Math.min(startHalf, endHalf), span, clippedStart, clippedEnd }
    })
    .sort((a, b) => a.col - b.col || b.span - a.span)

  for (const bar of bars) {
    const lanes = out.get(bar.carId!)!
    const lane = lanes.find((l) => !collides(l[l.length - 1], bar))
    if (lane) lane.push(bar)
    else lanes.push([bar])
  }
  return out
}
