'use client'

import { useState, useMemo, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import type { Reservation, Car, BlockedDate } from '@/lib/supabase/types'
import { deleteBlockedDate } from './actions'
import BlockDateModal from './BlockDateModal'
import ReservationDetailModal from './ReservationDetailModal'

// FullCalendar (~500KB with plugins) is heavy and only used on this page.
// Dynamic import keeps it out of the route's initial JS chunk; users see
// the skeleton below first, then the calendar hydrates.
const CalendarView = dynamic(() => import('./CalendarView'), {
  ssr: false,
  loading: () => (
    <div className="h-[420px] animate-pulse bg-white/[0.03] rounded-xl border border-white/[0.06]" />
  ),
})

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
            <div className="absolute top-full left-0 mt-2 w-72 z-50 rounded-2xl border border-white/[0.13] bg-[#2B2B2B] shadow-[0_16px_48px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.07)] overflow-hidden">
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
        <CalendarView events={events} onEventClick={handleEventClick} />
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
