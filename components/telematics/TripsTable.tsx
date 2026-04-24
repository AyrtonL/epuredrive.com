'use client'

// components/telematics/TripsTable.tsx
// Client-side trips table + filter bar. Filter changes push new searchParams
// via the Next.js router so the server component re-fetches with RLS-scoped
// queries. Row click opens <TripDetailModal /> which fetches positions.
import { useMemo, useState, useTransition } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import TripDetailModal, { type TripDetailMeta } from './TripDetailModal'

export interface TripRow {
  id: string
  started_at: string
  ended_at: string | null
  car_id: number | null
  car_label: string
  booking_code: string | null
  distance_mi: number | null
  duration_s: number | null
  max_speed_mph: number | null
  hard_braking_count: number | null
  hard_accel_count: number | null
}

export interface CarOption {
  id: number
  label: string
}

interface Props {
  trips: TripRow[]
  cars: CarOption[]
  initialFilters: {
    from: string
    to: string
    carIds: number[]
    minDistance: string
  }
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString()
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return '—'
  const m = Math.round(seconds / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  return `${h}h ${m - h * 60}m`
}

function formatDistance(miles: number | null): string {
  if (miles === null) return '—'
  return `${miles.toFixed(1)} mi`
}

function toDateInput(iso: string): string {
  // Expecting YYYY-MM-DD — trim off time if present.
  return iso.length >= 10 ? iso.slice(0, 10) : iso
}

export default function TripsTable({ trips, cars, initialFilters }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const currentParams = useSearchParams()
  const [pending, startTransition] = useTransition()

  const [from, setFrom] = useState(toDateInput(initialFilters.from))
  const [to, setTo] = useState(toDateInput(initialFilters.to))
  const [carIds, setCarIds] = useState<number[]>(initialFilters.carIds)
  const [minDistance, setMinDistance] = useState(initialFilters.minDistance)
  const [selectedTrip, setSelectedTrip] = useState<TripDetailMeta | null>(null)

  const exportHref = useMemo(() => {
    const q = new URLSearchParams()
    q.set('from', from)
    q.set('to', to)
    if (carIds.length > 0) q.set('car_ids', carIds.join(','))
    if (minDistance.trim()) q.set('min_distance', minDistance.trim())
    return `/dashboard/telematics/trips/export?${q.toString()}`
  }, [from, to, carIds, minDistance])

  function applyFilters() {
    const q = new URLSearchParams(currentParams?.toString() ?? '')
    q.set('from', from)
    q.set('to', to)
    if (carIds.length > 0) q.set('car_ids', carIds.join(','))
    else q.delete('car_ids')
    if (minDistance.trim()) q.set('min_distance', minDistance.trim())
    else q.delete('min_distance')
    startTransition(() => {
      router.replace(`${pathname}?${q.toString()}`)
    })
  }

  function toggleCar(id: number) {
    setCarIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  function openTripRow(row: TripRow) {
    setSelectedTrip({
      id: row.id,
      started_at: row.started_at,
      ended_at: row.ended_at,
      car_label: row.car_label,
      booking_code: row.booking_code,
      distance_mi: row.distance_mi,
      duration_s: row.duration_s,
      max_speed_mph: row.max_speed_mph,
      hard_braking_count: row.hard_braking_count,
      hard_accel_count: row.hard_accel_count,
    })
  }

  return (
    <>
      <div className="glass border border-white/[0.08] rounded-2xl p-4 flex flex-col gap-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">
              From
            </span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1 w-full bg-white/5 border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-white/30"
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">
              To
            </span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 w-full bg-white/5 border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-white/30"
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">
              Min distance (mi)
            </span>
            <input
              type="number"
              min={0}
              step={0.1}
              value={minDistance}
              onChange={(e) => setMinDistance(e.target.value)}
              className="mt-1 w-full bg-white/5 border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-white/30"
              placeholder="0"
            />
          </label>
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={applyFilters}
              disabled={pending}
              className="bg-white text-black hover:bg-white/90 text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
            >
              {pending ? 'Loading...' : 'Apply'}
            </button>
            <a
              href={exportHref}
              className="bg-white/[0.04] border border-white/10 text-white/70 hover:bg-white/[0.08] hover:text-white text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-lg transition-colors"
            >
              Export CSV
            </a>
          </div>
        </div>

        {cars.length > 0 && (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-2">
              Cars
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
              {cars.map((c) => {
                const isActive = carIds.includes(c.id)
                return (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => toggleCar(c.id)}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-full transition-colors ${
                      isActive
                        ? 'bg-white text-black'
                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    {c.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <div className="glass border border-white/[0.08] rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-white/[0.03] text-[10px] font-bold uppercase tracking-widest text-white/40">
            <tr>
              <th className="text-left py-3 px-4 font-bold">Date / time</th>
              <th className="text-left py-3 px-4 font-bold">Car</th>
              <th className="text-left py-3 px-4 font-bold">Distance</th>
              <th className="text-left py-3 px-4 font-bold">Duration</th>
              <th className="text-left py-3 px-4 font-bold">Max speed</th>
              <th className="text-left py-3 px-4 font-bold">Events</th>
              <th className="text-left py-3 px-4 font-bold">Booking</th>
            </tr>
          </thead>
          <tbody>
            {trips.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-white/40 text-sm">
                  No trips in this range.
                </td>
              </tr>
            ) : (
              trips.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => openTripRow(t)}
                  className="border-t border-white/[0.04] hover:bg-white/[0.03] cursor-pointer"
                >
                  <td className="py-3 px-4 text-white/80 text-sm">
                    {formatDateTime(t.started_at)}
                  </td>
                  <td className="py-3 px-4 text-white/80 text-sm">
                    {t.car_label}
                  </td>
                  <td className="py-3 px-4 text-white/80 text-sm">
                    {formatDistance(t.distance_mi)}
                  </td>
                  <td className="py-3 px-4 text-white/80 text-sm">
                    {formatDuration(t.duration_s)}
                  </td>
                  <td className="py-3 px-4 text-white/80 text-sm">
                    {t.max_speed_mph === null ? '—' : `${t.max_speed_mph} mph`}
                  </td>
                  <td className="py-3 px-4 text-white/60 text-xs">
                    {(t.hard_braking_count ?? 0) + (t.hard_accel_count ?? 0) === 0 ? (
                      <span className="text-white/30">—</span>
                    ) : (
                      <span>
                        {t.hard_braking_count ?? 0}B / {t.hard_accel_count ?? 0}A
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-white/70 text-sm">
                    {t.booking_code ?? <span className="text-white/30">—</span>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <TripDetailModal trip={selectedTrip} onClose={() => setSelectedTrip(null)} />
    </>
  )
}
