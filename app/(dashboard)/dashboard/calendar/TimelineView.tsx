'use client'

import { useMemo, useState } from 'react'
import type { BlockedDate, Car, Reservation } from '@/lib/supabase/types'
import { buildTimeline, windowDays, type TimelineBar, type TimelineItem } from '@/lib/calendar/timeline'
import { carDisplayName } from '@/lib/utils/car-display-name'
import { todayISO } from '@/lib/finance/revenue'
import { formatDateRange } from '@/lib/dashboard/overview-metrics'

interface Props {
  cars: Car[]
  /** Listed after owned cars, like the Fleet page */
  consignedCarIds?: number[]
  reservations: Reservation[]
  blockedDates: BlockedDate[]
  selectedCars: Set<string>
  onReservationClick: (r: Reservation) => void
  onBlockClick: (b: BlockedDate) => void
}

const RANGES = [14, 30] as const
const LEAD_DAYS = 2 // show a little of the past so "today" isn't the first column
const LANE_HEIGHT_PX = 34
const LABEL_COL = 'minmax(140px, 180px)'
// Each day is two half-day columns (bars run mid pickup day → mid return day).
const HALF_COL = 'minmax(17px, 1fr)'
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const BAR_STYLE: Record<string, string> = {
  active: 'bg-sky-500/30 border-sky-400/70 text-sky-50',
  confirmed: 'bg-emerald-500/25 border-emerald-400/60 text-emerald-50',
  pending: 'bg-amber-500/25 border-amber-400/60 text-amber-50',
  completed: 'bg-white/[0.10] border-white/25 text-white/70',
  blocked: 'bg-red-500/20 border-red-400/60 text-red-100 bg-[repeating-linear-gradient(135deg,transparent,transparent_6px,rgba(239,68,68,0.15)_6px,rgba(239,68,68,0.15)_12px)]',
}

const LEGEND: Array<[string, string]> = [
  ['active', 'On rent'],
  ['confirmed', 'Confirmed'],
  ['pending', 'Pending'],
  ['completed', 'Completed'],
  ['blocked', 'Blocked'],
]

function shiftDays(iso: string, delta: number): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + delta * 86400000).toISOString().slice(0, 10)
}

function dayParts(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`)
  return { dow: d.getUTCDay(), day: d.getUTCDate(), month: d.getUTCMonth(), year: d.getUTCFullYear() }
}

export default function TimelineView({ cars, consignedCarIds = [], reservations, blockedDates, selectedCars, onReservationClick, onBlockClick }: Props) {
  const today = todayISO()
  const [range, setRange] = useState<(typeof RANGES)[number]>(14)
  const [start, setStart] = useState(() => shiftDays(today, -LEAD_DAYS))

  const days = useMemo(() => windowDays(start, range), [start, range])
  const visibleCars = useMemo(() => {
    const consigned = new Set(consignedCarIds)
    return cars
      .filter((c) => c.status !== 'retired' && (selectedCars.size === 0 || selectedCars.has(String(c.id))))
      .sort((a, b) => Number(consigned.has(a.id)) - Number(consigned.has(b.id)) || a.id - b.id)
  }, [cars, selectedCars, consignedCarIds])

  const resById = useMemo(() => new Map(reservations.map((r) => [String(r.id), r])), [reservations])
  const blockById = useMemo(() => new Map(blockedDates.map((b) => [`block_${b.id}`, b])), [blockedDates])

  const rows = useMemo(() => {
    const items: TimelineItem[] = [
      ...reservations
        .filter((r) => r.status !== 'cancelled' && r.pickup_date)
        .map((r) => ({
          id: String(r.id),
          carId: r.car_id,
          start: r.pickup_date!,
          end: r.return_date,
          startTime: r.pickup_time,
          endTime: r.return_time,
          kind: 'reservation' as const,
          status: r.status,
          label: r.customer_name || 'Customer',
        })),
      ...blockedDates.map((b) => ({
        id: `block_${b.id}`,
        carId: b.car_id,
        start: b.start_date,
        end: b.end_date,
        kind: 'blocked' as const,
        status: 'blocked',
        label: b.reason || 'Blocked',
      })),
    ]
    return buildTimeline(visibleCars.map((c) => c.id), items, days)
  }, [reservations, blockedDates, visibleCars, days])

  const gridCols = `${LABEL_COL} repeat(${days.length * 2}, ${HALF_COL})`
  const first = dayParts(days[0])
  const last = dayParts(days[days.length - 1])
  const title =
    first.month === last.month
      ? `${MONTHS[first.month]} ${first.day} – ${last.day}, ${last.year}`
      : `${MONTHS[first.month]} ${first.day} – ${MONTHS[last.month]} ${last.day}, ${last.year}`

  function openBar(bar: TimelineBar) {
    if (bar.kind === 'reservation') {
      const r = resById.get(bar.id)
      if (r) onReservationClick(r)
    } else {
      const b = blockById.get(bar.id)
      if (b) onBlockClick(b)
    }
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setStart(shiftDays(start, -range))} className="w-9 h-9 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-white/80" aria-label="Previous">‹</button>
          <button onClick={() => setStart(shiftDays(start, range))} className="w-9 h-9 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-white/80" aria-label="Next">›</button>
          <button onClick={() => setStart(shiftDays(today, -LEAD_DAYS))} className="px-3 h-9 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-[13px] text-white/80">Today</button>
          <span className="ml-2 text-white font-semibold text-sm">{title}</span>
        </div>
        <div className="flex gap-1 p-1 rounded-lg bg-white/[0.05]">
          {RANGES.map((r) => (
            <button key={r} onClick={() => setRange(r)} className={`px-3 py-1.5 rounded-md text-[12px] font-semibold ${range === r ? 'bg-white text-black' : 'text-white/65 hover:text-white'}`}>
              {r === 14 ? '2 weeks' : '1 month'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto rounded-xl border border-white/[0.10]">
        <div className="min-w-max lg:min-w-0" style={{ minWidth: `calc(160px + ${days.length * 34}px)` }}>
          {/* Day header */}
          <div className="grid border-b border-white/[0.10] bg-white/[0.03]" style={{ gridTemplateColumns: gridCols }}>
            <div className="sticky left-0 z-20 bg-[#161616] px-3 py-2 text-[11px] font-semibold text-white/50 flex items-end">Vehicle</div>
            {days.map((d) => {
              const p = dayParts(d)
              const isToday = d === today
              return (
                <div key={d} style={{ gridColumn: 'span 2' }} className={`py-1.5 text-center border-l border-white/[0.05] ${p.dow === 0 || p.dow === 6 ? 'bg-white/[0.03]' : ''}`}>
                  <div className={`text-[10px] ${isToday ? 'text-sky-300' : 'text-white/40'}`}>{p.day === 1 ? MONTHS[p.month] : WEEKDAYS[p.dow]}</div>
                  <div className={`mx-auto mt-0.5 w-6 h-6 leading-6 rounded-full text-[12px] tabular-nums ${isToday ? 'bg-sky-400 text-black font-bold' : 'text-white/75'}`}>{p.day}</div>
                </div>
              )
            })}
          </div>

          {/* Car rows */}
          {visibleCars.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-white/50">No vehicles to show.</div>
          ) : (
            visibleCars.map((car) => {
              const lanes = rows.get(car.id) ?? []
              const laneCount = Math.max(1, lanes.length)
              const doubleBooked = lanes.length > 1 && lanes[1].some((b) => b.kind === 'reservation')
              return (
                <div
                  key={car.id}
                  className="grid border-b border-white/[0.06] last:border-b-0"
                  style={{ gridTemplateColumns: gridCols, gridTemplateRows: `repeat(${laneCount}, ${LANE_HEIGHT_PX}px)` }}
                >
                  <div className="sticky left-0 z-20 bg-[#161616] px-3 flex flex-col justify-center border-r border-white/[0.06]" style={{ gridColumn: 1, gridRow: `1 / span ${laneCount}` }}>
                    <span className="text-[13px] text-white font-medium truncate" title={carDisplayName(car)}>{carDisplayName(car)}</span>
                    {doubleBooked ? (
                      <span className="text-[10px] text-amber-300">Overlapping bookings</span>
                    ) : car.plate ? (
                      <span className="text-[10px] text-white/40">{car.plate}</span>
                    ) : null}
                  </div>
                  {/* Day background */}
                  {days.map((d, i) => {
                    const p = dayParts(d)
                    return (
                      <div
                        key={d}
                        className={`border-l border-white/[0.05] ${d === today ? 'bg-sky-400/[0.07]' : p.dow === 0 || p.dow === 6 ? 'bg-white/[0.025]' : ''}`}
                        style={{ gridColumn: `${i * 2 + 2} / span 2`, gridRow: `1 / span ${laneCount}` }}
                      />
                    )
                  })}
                  {/* Bars */}
                  {lanes.flatMap((lane, li) =>
                    lane.map((bar) => (
                      <button
                        key={bar.id}
                        onClick={() => openBar(bar)}
                        title={`${bar.label} · ${formatDateRange(bar.start, bar.end, today)}`}
                        className={`z-10 my-1 mx-0.5 px-2 border text-left text-[11px] font-medium truncate hover:brightness-125 transition ${BAR_STYLE[bar.status ?? ''] ?? BAR_STYLE.completed} ${bar.clippedStart ? 'rounded-l-none border-l-0' : 'rounded-l-md'} ${bar.clippedEnd ? 'rounded-r-none border-r-0' : 'rounded-r-md'}`}
                        style={{ gridColumn: `${bar.col + 1} / span ${bar.span}`, gridRow: li + 1 }}
                      >
                        {bar.clippedStart ? '‹ ' : ''}{bar.label}
                      </button>
                    )),
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-white/60">
        {LEGEND.map(([k, label]) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className={`inline-block w-4 h-2.5 rounded-sm border ${BAR_STYLE[k]}`} />
            {label}
          </span>
        ))}
        <span className="text-white/40">· Empty space = available</span>
      </div>
    </div>
  )
}
