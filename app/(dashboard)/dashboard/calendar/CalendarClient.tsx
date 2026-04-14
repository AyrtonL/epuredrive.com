'use client'

import { useState, useMemo, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import listPlugin from '@fullcalendar/list'
import interactionPlugin from '@fullcalendar/interaction'
import type { Reservation, Car, BlockedDate } from '@/lib/supabase/types'
import { deleteBlockedDate } from './actions'
import BlockDateModal from './BlockDateModal'
import ReservationDetailModal from './ReservationDetailModal'

// Curated palette — vibrant, dark-bg-friendly, no red (reserved for blocked dates)
const CAR_PALETTE = [
  '#60a5fa', // blue
  '#34d399', // emerald
  '#a78bfa', // violet
  '#fbbf24', // amber
  '#38bdf8', // sky
  '#f472b6', // pink
  '#4ade80', // green
  '#fb923c', // orange
  '#e879f9', // fuchsia
  '#2dd4bf', // teal
  '#facc15', // yellow
  '#818cf8', // indigo
]

function carColor(id: number): string {
  return CAR_PALETTE[Math.abs(id) % CAR_PALETTE.length]
}


export default function CalendarClient({
  reservations,
  cars,
  blockedDates,
}: {
  reservations: Reservation[]
  cars: Car[]
  blockedDates: BlockedDate[]
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [selectedCars, setSelectedCars] = useState<Set<string>>(new Set())
  const [filterOpen, setFilterOpen] = useState(false)
  const [blockModalOpen, setBlockModalOpen] = useState(false)
  const [detailRes, setDetailRes] = useState<Reservation | null>(null)
  const filterRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function toggleCar(id: string) {
    setSelectedCars(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const carMap = useMemo(() => {
    return Object.fromEntries(cars.map((c) => [c.id, `${c.make} ${c.model_full || c.model}`]))
  }, [cars])

  const filterLabel = selectedCars.size === 0
    ? 'All Fleet'
    : selectedCars.size === 1
      ? carMap[Number(Array.from(selectedCars)[0])] ?? 'All Fleet'
      : `${selectedCars.size} vehicles`

  const dailyRateMap = useMemo(() => {
    return Object.fromEntries(cars.map(c => [c.id, c.daily_rate ?? 0]))
  }, [cars])

  const events = useMemo(() => {
    const resEvents = reservations
      .filter((r) => r.status !== 'cancelled')
      .filter((r) => selectedCars.size === 0 || selectedCars.has(String(r.car_id)))
      .map((r) => {
        const title = `${carMap[r.car_id ?? -1] || 'Car'} · ${r.customer_name}`
        const color = carColor(r.car_id ?? 0)
        return {
          id: String(r.id),
          title,
          start: `${r.pickup_date}T${r.pickup_time || '10:00'}`,
          end: `${r.return_date}T${r.return_time || '10:00'}`,
          backgroundColor: `${color}30`,
          borderColor: color,
          textColor: '#ffffff',
          extendedProps: { type: 'reservation', data: r },
        }
      })

    const blockEvents = (blockedDates || [])
      .filter((b) => selectedCars.size === 0 || selectedCars.has(String(b.car_id)))
      .map((b) => ({
        id: `block_${b.id}`,
        title: `${carMap[b.car_id ?? -1] || 'Car'} · ${b.reason || 'Blocked'}`,
        start: b.start_date,
        end: new Date(new Date(b.end_date).getTime() + 86400000).toISOString().split('T')[0],
        backgroundColor: 'rgba(239,68,68,0.18)',
        borderColor: 'rgba(239,68,68,0.7)',
        textColor: '#fca5a5',
        extendedProps: { type: 'blocked', data: b },
      }))

    return [...resEvents, ...blockEvents]
  }, [reservations, blockedDates, selectedCars, carMap])

  function handleEventClick(info: any) {
    const { type, data } = info.event.extendedProps
    if (type === 'reservation') {
      setDetailRes(data)
    } else if (type === 'blocked') {
      const blockId = data.id
      const carName = carMap[data.car_id] || 'this vehicle'
      if (confirm(`Remove block "${data.reason || 'Blocked'}" for ${carName}?`)) {
        startTransition(async () => {
          await deleteBlockedDate(blockId)
          router.refresh()
        })
      }
    }
  }

  return (
    <div className="text-white space-y-5">

      {/* ── Toolbar ───────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">

        {/* Car multi-select dropdown */}
        <div ref={filterRef} className="relative">
          {/* Trigger button */}
          <button
            onClick={() => setFilterOpen((v) => !v)}
            className={`dash-input flex items-center gap-2.5 pl-3.5 pr-3 py-2.5 min-w-[220px] cursor-pointer transition-all ${
              filterOpen ? 'border-white/30 bg-white/[0.12]' : ''
            }`}
          >
            {/* Color dots for selected cars (up to 3) */}
            {selectedCars.size > 0 ? (
              <span className="flex items-center gap-1 shrink-0">
                {Array.from(selectedCars).slice(0, 3).map((id) => (
                  <span
                    key={id}
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: carColor(Number(id)) }}
                  />
                ))}
              </span>
            ) : (
              <span className="w-2 h-2 rounded-full bg-white/25 shrink-0" />
            )}
            <span className="flex-1 text-left text-sm truncate">
              {filterLabel}
            </span>
            {selectedCars.size > 0 && (
              <span
                onClick={(e) => { e.stopPropagation(); setSelectedCars(new Set()) }}
                className="text-white/35 hover:text-white/70 transition-colors text-xs leading-none px-0.5"
                title="Clear selection"
              >
                ✕
              </span>
            )}
            <svg className={`w-3.5 h-3.5 text-white/40 shrink-0 transition-transform ${filterOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown panel */}
          {filterOpen && (
            <div className="absolute top-full left-0 mt-2 w-72 z-50 rounded-2xl border border-white/[0.13] bg-[#141620] shadow-[0_16px_48px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.07)] overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08]">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/45">Filter by vehicle</span>
                <button
                  onClick={() => setSelectedCars(new Set())}
                  className="text-[10px] font-bold uppercase tracking-wide text-white/35 hover:text-white/65 transition-colors"
                >
                  Clear all
                </button>
              </div>

              {/* Car list */}
              <div className="max-h-72 overflow-y-auto py-1.5">
                {cars.map((car) => {
                  const color = carColor(car.id)
                  const checked = selectedCars.has(String(car.id))
                  return (
                    <button
                      key={car.id}
                      onClick={() => toggleCar(String(car.id))}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        checked ? 'bg-white/[0.06]' : 'hover:bg-white/[0.04]'
                      }`}
                    >
                      {/* Checkbox */}
                      <span className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 transition-all ${
                        checked
                          ? 'border-transparent'
                          : 'border-white/20 bg-white/[0.04]'
                      }`}
                        style={checked ? { backgroundColor: color } : {}}
                      >
                        {checked && (
                          <svg className="w-2.5 h-2.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </span>
                      {/* Color dot */}
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      {/* Label */}
                      <span className={`text-sm truncate ${checked ? 'text-white font-medium' : 'text-white/60'}`}>
                        {car.make} {car.model_full || car.model}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Footer */}
              <div className="px-4 py-3 border-t border-white/[0.08] flex items-center justify-between">
                <span className="text-[11px] text-white/35">
                  {selectedCars.size === 0 ? 'Showing all vehicles' : `${selectedCars.size} of ${cars.length} selected`}
                </span>
                <button
                  onClick={() => setFilterOpen(false)}
                  className="text-[11px] font-semibold text-white/55 hover:text-white transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Block dates button */}
        <button
          onClick={() => setBlockModalOpen(true)}
          className="flex items-center gap-2 bg-red-500/[0.12] hover:bg-red-500/[0.20] border border-red-500/25 hover:border-red-500/40 text-red-300 hover:text-red-200 px-4 py-2 rounded-xl text-sm font-semibold transition-all flex-shrink-0"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10" />
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
          </svg>
          Block Dates
        </button>
      </div>

      {/* ── Calendar card ─────────────────────────────────────────────── */}
      <div className="glass border border-white/[0.13] rounded-2xl p-5 md:p-7">
        <style jsx global>{`
          /* ── Base ── */
          .fc {
            --fc-border-color: rgba(255,255,255,0.07);
            --fc-page-bg-color: transparent;
            --fc-neutral-bg-color: transparent;
            font-family: inherit;
          }

          /* ── Toolbar ── */
          .fc .fc-toolbar.fc-header-toolbar {
            margin-bottom: 1.5rem;
            gap: 0.5rem;
            flex-wrap: wrap;
          }
          .fc .fc-toolbar-title {
            font-size: 1.05rem;
            font-weight: 700;
            color: white;
            letter-spacing: -0.02em;
          }
          .fc .fc-toolbar-chunk {
            display: flex;
            align-items: center;
            gap: 0.375rem;
          }

          /* ── Nav buttons ── */
          .fc .fc-button {
            background: rgba(255,255,255,0.07) !important;
            border: 1px solid rgba(255,255,255,0.13) !important;
            color: rgba(255,255,255,0.70) !important;
            border-radius: 0.6rem !important;
            font-weight: 600 !important;
            font-size: 0.7rem !important;
            text-transform: uppercase !important;
            letter-spacing: 0.07em !important;
            padding: 0.45rem 0.9rem !important;
            transition: all 0.2s ease !important;
            box-shadow: inset 0 1px 0 rgba(255,255,255,0.07) !important;
          }
          .fc .fc-button:hover {
            background: rgba(255,255,255,0.12) !important;
            border-color: rgba(255,255,255,0.22) !important;
            color: white !important;
          }
          .fc .fc-button:focus {
            box-shadow: 0 0 0 2px rgba(255,255,255,0.2) !important;
          }
          .fc .fc-button-primary:not(:disabled).fc-button-active,
          .fc .fc-button-primary:not(:disabled):active {
            background: rgba(255,255,255,0.18) !important;
            border-color: rgba(255,255,255,0.30) !important;
            color: white !important;
          }
          .fc .fc-button-group .fc-button {
            border-radius: 0 !important;
          }
          .fc .fc-button-group .fc-button:first-child {
            border-radius: 0.6rem 0 0 0.6rem !important;
          }
          .fc .fc-button-group .fc-button:last-child {
            border-radius: 0 0.6rem 0.6rem 0 !important;
          }

          /* ── Grid container ── */
          .fc-theme-standard .fc-scrollgrid {
            border: 1px solid rgba(255,255,255,0.09) !important;
            border-radius: 0.875rem !important;
            overflow: hidden !important;
          }
          .fc-theme-standard td,
          .fc-theme-standard th {
            border-color: rgba(255,255,255,0.06) !important;
          }

          /* ── Day header row (Mon Tue …) ── */
          .fc .fc-col-header-cell {
            background: rgba(255,255,255,0.04) !important;
            padding: 0.65rem 0 !important;
            border-bottom: 1px solid rgba(255,255,255,0.08) !important;
          }
          .fc .fc-col-header-cell-cushion {
            color: rgba(255,255,255,0.45) !important;
            font-size: 0.65rem !important;
            font-weight: 800 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.14em !important;
            text-decoration: none !important;
            padding: 0 !important;
          }

          /* ── Day cells ── */
          .fc .fc-daygrid-day {
            background: transparent !important;
          }
          .fc .fc-daygrid-day:hover {
            background: rgba(255,255,255,0.02) !important;
          }
          .fc .fc-daygrid-day-number {
            color: rgba(255,255,255,0.50) !important;
            font-size: 0.72rem !important;
            font-weight: 500 !important;
            padding: 0.45rem 0.55rem !important;
            text-decoration: none !important;
          }
          .fc .fc-day-other .fc-daygrid-day-number {
            color: rgba(255,255,255,0.18) !important;
          }

          /* ── Today ── */
          .fc .fc-day-today {
            background: rgba(255,255,255,0.04) !important;
          }
          .fc .fc-day-today .fc-daygrid-day-number {
            color: white !important;
            background: rgba(255,255,255,0.18) !important;
            border-radius: 50% !important;
            width: 1.65rem !important;
            height: 1.65rem !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            margin: 0.3rem !important;
            font-weight: 700 !important;
            padding: 0 !important;
            box-shadow: 0 0 10px rgba(255,255,255,0.12) !important;
          }

          /* ── Events ── */
          .fc-h-event {
            border-left-width: 3px !important;
            border-top: none !important;
            border-right: none !important;
            border-bottom: none !important;
            border-radius: 0.3rem !important;
            padding: 2px 6px !important;
            font-size: 0.7rem !important;
            font-weight: 600 !important;
            cursor: pointer !important;
            transition: opacity 0.15s ease !important;
          }
          .fc-h-event:hover {
            opacity: 0.85 !important;
          }
          .fc-h-event .fc-event-title {
            font-weight: 600 !important;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .fc .fc-daygrid-more-link {
            color: rgba(255,255,255,0.45) !important;
            font-size: 0.65rem !important;
            font-weight: 700 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.05em !important;
            padding: 1px 4px !important;
            border-radius: 0.25rem !important;
            transition: all 0.15s ease !important;
          }
          .fc .fc-daygrid-more-link:hover {
            color: white !important;
            background: rgba(255,255,255,0.08) !important;
          }

          /* ── List view ── */
          .fc .fc-list {
            border: none !important;
            background: transparent !important;
          }
          .fc .fc-list-day th {
            border-color: rgba(255,255,255,0.06) !important;
          }
          .fc .fc-list-day-cushion {
            background: rgba(255,255,255,0.04) !important;
            padding: 0.55rem 1rem !important;
          }
          .fc .fc-list-day-text,
          .fc .fc-list-day-side-text {
            color: rgba(255,255,255,0.55) !important;
            font-size: 0.68rem !important;
            font-weight: 800 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.12em !important;
            text-decoration: none !important;
          }
          .fc .fc-list-event td {
            border-color: rgba(255,255,255,0.05) !important;
            background: transparent !important;
          }
          .fc .fc-list-event:hover td {
            background: rgba(255,255,255,0.04) !important;
            cursor: pointer !important;
          }
          .fc .fc-list-event-title a {
            color: rgba(255,255,255,0.80) !important;
            font-weight: 500 !important;
            text-decoration: none !important;
          }
          .fc .fc-list-event-time {
            color: rgba(255,255,255,0.38) !important;
            font-size: 0.72rem !important;
          }
          .fc-list-table td,
          .fc-list-table th {
            border-color: rgba(255,255,255,0.05) !important;
          }
          .fc .fc-list-empty {
            background: transparent !important;
            color: rgba(255,255,255,0.30) !important;
            font-size: 0.875rem !important;
          }
          .fc .fc-list-empty-cushion {
            margin: 3rem 0 !important;
          }

          /* ── Popover ("+N more") ── */
          .fc .fc-popover {
            background: #141620 !important;
            border: 1px solid rgba(255,255,255,0.13) !important;
            border-radius: 0.75rem !important;
            box-shadow: 0 12px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.07) !important;
            overflow: hidden !important;
          }
          .fc .fc-popover-header {
            background: rgba(255,255,255,0.05) !important;
            color: rgba(255,255,255,0.80) !important;
            font-weight: 700 !important;
            font-size: 0.75rem !important;
            padding: 0.5rem 0.75rem !important;
            border-bottom: 1px solid rgba(255,255,255,0.08) !important;
          }
          .fc .fc-popover-close {
            color: rgba(255,255,255,0.35) !important;
            opacity: 1 !important;
          }
          .fc .fc-popover-close:hover {
            color: white !important;
          }
          .fc .fc-popover-body {
            padding: 0.5rem !important;
          }
        `}</style>

        <FullCalendar
          plugins={[dayGridPlugin, listPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,listMonth' }}
          events={events}
          height="auto"
          eventClick={handleEventClick}
          dayMaxEvents={3}
          fixedWeekCount={false}
        />
      </div>

      <BlockDateModal
        isOpen={blockModalOpen}
        onClose={() => setBlockModalOpen(false)}
        cars={cars}
      />

      <ReservationDetailModal
        reservation={detailRes}
        cars={cars}
        dailyRateMap={dailyRateMap}
        onClose={() => setDetailRes(null)}
      />
    </div>
  )
}
