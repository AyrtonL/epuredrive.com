'use client'

// components/telematics/TripDetailModal.tsx
// Modal that renders a trip's route polyline on a mini map plus key stats.
// Fetches positions via getTripPositionsAction (server action) on open.
import { useEffect, useState } from 'react'
import TripMap, { type TripMapPoint } from './TripMap'
import {
  getTripPositionsAction,
  type TripPositionPoint,
} from '@/app/(dashboard)/dashboard/telematics/trips/actions'

export interface TripDetailMeta {
  id: string
  started_at: string
  ended_at: string | null
  car_label: string
  booking_code: string | null
  distance_mi: number | null
  duration_s: number | null
  max_speed_mph: number | null
  hard_braking_count: number | null
  hard_accel_count: number | null
}

interface Props {
  trip: TripDetailMeta | null
  onClose: () => void
}

function formatDuration(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return '—'
  const m = Math.floor(seconds / 60)
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const rem = m - h * 60
  return `${h}h ${rem}m`
}

function formatDistance(miles: number | null): string {
  if (miles === null || !Number.isFinite(miles)) return '—'
  return `${miles.toFixed(1)} mi`
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString()
}

export default function TripDetailModal({ trip, onClose }: Props) {
  const [points, setPoints] = useState<TripPositionPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!trip) {
      setPoints([])
      setError(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    getTripPositionsAction(trip.id)
      .then((res) => {
        if (cancelled) return
        if (!res.ok) {
          setError(res.error ?? 'Could not load trip route.')
          setPoints([])
        } else {
          setPoints(res.points)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [trip])

  // ESC closes the modal
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!trip) return null

  const startPoint: TripMapPoint | null = points.length > 0
    ? { lat: points[0].lat, lon: points[0].lon }
    : null
  const endPoint: TripMapPoint | null = points.length > 0
    ? {
        lat: points[points.length - 1].lat,
        lon: points[points.length - 1].lon,
      }
    : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      onClick={onClose}
    >
      <div
        className="glass rounded-3xl border border-white/10 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-6 py-4 border-b border-white/[0.06]">
          <div>
            <div className="text-white text-lg font-bold">{trip.car_label}</div>
            <div className="text-white/40 text-xs">
              {formatDateTime(trip.started_at)} &rarr; {formatDateTime(trip.ended_at)}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/40 hover:text-white text-2xl leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 px-6 py-4 border-b border-white/[0.06]">
          <Stat label="Distance" value={formatDistance(trip.distance_mi)} />
          <Stat label="Duration" value={formatDuration(trip.duration_s)} />
          <Stat
            label="Max speed"
            value={trip.max_speed_mph === null ? '—' : `${trip.max_speed_mph} mph`}
          />
          <Stat
            label="Events"
            value={`${trip.hard_braking_count ?? 0}B / ${trip.hard_accel_count ?? 0}A`}
            sub="brake / accel"
          />
          {trip.booking_code && (
            <Stat label="Booking" value={trip.booking_code} />
          )}
        </div>

        <div className="h-[380px] p-6">
          {loading ? (
            <div className="h-full w-full rounded-2xl bg-white/5 animate-pulse flex items-center justify-center text-white/40 text-sm">
              Loading route...
            </div>
          ) : error ? (
            <div className="h-full w-full rounded-2xl border border-red-500/30 bg-red-500/5 flex items-center justify-center text-red-200 text-sm">
              {error}
            </div>
          ) : points.length === 0 ? (
            <div className="h-full w-full rounded-2xl border border-white/[0.08] bg-white/[0.02] flex items-center justify-center text-white/40 text-sm">
              No position data recorded for this trip.
            </div>
          ) : (
            <TripMap
              points={points.map((p) => ({ lat: p.lat, lon: p.lon }))}
              startPoint={startPoint}
              endPoint={endPoint}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string
  value: string
  sub?: string
}) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-widest text-white/40">
        {label}
      </div>
      <div className="text-white font-bold text-sm">{value}</div>
      {sub && <div className="text-white/30 text-[10px]">{sub}</div>}
    </div>
  )
}
