'use client'

// components/telematics/LiveMapClient.tsx
// Client island that owns the interactive Live Map surface:
//   - Polls /api/telematics/live every 15s to refresh marker positions
//   - Tracks the selected car (for the VehicleDrawer)
//   - Renders the searchable car list alongside the map
//
// The server page seeds `initialVehicles` so the first paint is data-ready;
// after that, the poll loop takes over.
import { useCallback, useEffect, useMemo, useState } from 'react'
import FleetMap from './FleetMap'
import VehicleDrawer from './VehicleDrawer'
import { useInterval } from './useInterval'
import {
  formatRelative,
  statusColor,
  statusLabel,
  type MapVehicle,
} from './types'

const POLL_MS = 15_000

interface Props {
  initialVehicles: MapVehicle[]
}

type StatusFilter = 'all' | 'moving' | 'idle' | 'offline'

export default function LiveMapClient({ initialVehicles }: Props) {
  const [vehicles, setVehicles] = useState<MapVehicle[]>(initialVehicles)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [focusedId, setFocusedId] = useState<number | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<StatusFilter>('all')

  const poll = useCallback(async () => {
    try {
      const res = await fetch('/api/telematics/live', { cache: 'no-store' })
      if (!res.ok) return
      const body = (await res.json()) as { vehicles: MapVehicle[] }
      if (Array.isArray(body.vehicles)) setVehicles(body.vehicles)
    } catch {
      // Silent — the next tick will try again.
    }
  }, [])

  useInterval(poll, POLL_MS)

  // Re-poll on tab focus so a returning user sees fresh data immediately.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') poll()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [poll])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return vehicles.filter((v) => {
      if (filter !== 'all' && v.status !== filter) return false
      if (!q) return true
      const hay = [v.plate, v.make, v.model].filter(Boolean).join(' ').toLowerCase()
      return hay.includes(q)
    })
  }, [vehicles, query, filter])

  const selected = selectedId !== null ? vehicles.find((v) => v.id === selectedId) ?? null : null

  function handleSelect(carId: number) {
    setSelectedId(carId)
    setFocusedId(carId)
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[640px]">
        <div className="lg:col-span-2 glass border border-white/[0.08] rounded-2xl overflow-hidden">
          <FleetMap vehicles={vehicles} onSelectCar={handleSelect} focusCarId={focusedId} />
        </div>

        <div className="glass border border-white/[0.08] rounded-2xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-white/[0.06] space-y-3">
            <input
              type="search"
              placeholder="Search plate or model"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-white/30"
            />
            <div className="flex flex-wrap gap-1">
              {(['all', 'moving', 'idle', 'offline'] as StatusFilter[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFilter(s)}
                  className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full transition-colors ${
                    filter === s
                      ? 'bg-white text-black'
                      : 'bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
                >
                  {s === 'all' ? 'All' : statusLabel(s)}
                </button>
              ))}
            </div>
          </div>

          <ul className="flex-1 overflow-y-auto divide-y divide-white/[0.06]">
            {filtered.length === 0 && (
              <li className="px-4 py-8 text-white/40 text-sm text-center">
                No vehicles match the current filter.
              </li>
            )}
            {filtered.map((v) => {
              const label = v.plate ?? [v.make, v.model].filter(Boolean).join(' ') ?? 'Vehicle'
              return (
                <li key={v.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(v.id)}
                    className={`w-full text-left px-4 py-3 transition-colors ${
                      selectedId === v.id ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-white font-semibold text-sm truncate">{label}</span>
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider shrink-0"
                        style={{ color: statusColor(v.status) }}
                      >
                        {statusLabel(v.status)}
                      </span>
                    </div>
                    <div className="text-white/40 text-[11px] mt-0.5 truncate">
                      {[v.make, v.model].filter(Boolean).join(' ')}
                    </div>
                    <div className="text-white/30 text-[11px] mt-0.5">
                      {formatRelative(v.last_seen_at)}
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </div>

      <VehicleDrawer
        vehicle={selected}
        mileage={null}
        reservationId={null}
        recentEvents={[]}
        onClose={() => setSelectedId(null)}
      />
    </>
  )
}
