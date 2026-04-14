'use client'

import { useMemo } from 'react'
import type { Reservation } from '@/lib/supabase/types'
import { calcCarStats, calcFleetSummary, type CarStats } from '@/lib/utils/fleet-performance-utils'

interface ReportCar {
  id: number
  make: string
  model: string
  model_full: string | null
}

interface Props {
  reservations: Reservation[]
  cars: ReportCar[]
  dateFrom: string
  dateTo: string
}

function utilizationColor(pct: number) {
  if (pct >= 70) return { badge: 'bg-emerald-500/15 text-emerald-400', bar: '#4ade80' }
  if (pct >= 40) return { badge: 'bg-yellow-500/12 text-yellow-400', bar: '#facc15' }
  return { badge: 'bg-red-500/12 text-red-400', bar: '#f87171' }
}

export default function FleetPerformanceTab({ reservations, cars, dateFrom, dateTo }: Props) {
  const carStats: CarStats[] = useMemo(() => {
    return cars
      .map(car => {
        const name = car.model_full || `${car.make} ${car.model}`
        return { carId: car.id, name, ...calcCarStats(car.id, reservations, dateFrom, dateTo) }
      })
      .sort((a, b) => b.utilization - a.utilization)
  }, [cars, reservations, dateFrom, dateTo])

  const summary = useMemo(() => calcFleetSummary(carStats), [carStats])

  if (carStats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-white/30 gap-3">
        <span className="text-4xl">🚗</span>
        <p className="text-sm">No data for this date range.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass border border-white/10 rounded-2xl p-5">
          <p className="text-[11px] text-white/35 uppercase tracking-widest mb-1.5">Fleet Utilization</p>
          <p className="text-3xl font-black text-white">{summary.avgUtilization}%</p>
          <p className="text-[11px] text-white/30 mt-1">avg across all vehicles</p>
        </div>
        <div className="glass border border-white/10 rounded-2xl p-5">
          <p className="text-[11px] text-white/35 uppercase tracking-widest mb-1.5">Total Miles Driven</p>
          <p className="text-3xl font-black text-white">{summary.totalMiles.toLocaleString()}</p>
          <p className="text-[11px] text-white/30 mt-1">across all rentals in range</p>
        </div>
        <div className="glass border border-white/10 rounded-2xl p-5">
          <p className="text-[11px] text-white/35 uppercase tracking-widest mb-1.5">Best Performer</p>
          {summary.bestPerformer ? (
            <>
              <p className="text-lg font-black text-emerald-400 leading-tight">{summary.bestPerformer.name}</p>
              <p className="text-[11px] text-white/30 mt-1">{summary.bestPerformer.utilization}% utilization</p>
            </>
          ) : (
            <p className="text-white/30 text-sm">—</p>
          )}
        </div>
      </div>

      {/* Per-car table */}
      <div className="glass border border-white/10 rounded-2xl overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] px-5 py-3 border-b border-white/[0.06]">
          {['Vehicle', 'Utilization', 'Idle Days', 'Miles', 'Revenue'].map(h => (
            <p key={h} className="text-[10px] font-bold text-white/30 uppercase tracking-widest last:text-right">{h}</p>
          ))}
        </div>

        {carStats.map((car, i) => {
          const { badge, bar } = utilizationColor(car.utilization)
          return (
            <div
              key={car.carId}
              className={`grid grid-cols-[2fr_1fr_1fr_1fr_1fr] px-5 py-3.5 items-center ${i < carStats.length - 1 ? 'border-b border-white/[0.04]' : ''}`}
            >
              <div>
                <p className="text-sm font-semibold text-white">{car.name}</p>
              </div>
              <div>
                <span className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded-md ${badge}`}>
                  {car.utilization}%
                </span>
                <div className="mt-1.5 h-1 bg-white/8 rounded-full w-4/5">
                  <div className="h-1 rounded-full" style={{ width: `${car.utilization}%`, backgroundColor: bar }} />
                </div>
              </div>
              <p className="text-sm text-white/60">{car.idleDays}</p>
              <p className="text-sm text-white/60">
                {car.miles > 0 ? car.miles.toLocaleString() : '—'}
              </p>
              <p className="text-sm font-semibold text-white text-right">
                ${car.revenue.toLocaleString(undefined, { minimumFractionDigits: 0 })}
              </p>
            </div>
          )
        })}
      </div>

      <p className="text-[11px] text-white/25 text-right">
        Utilization = rented days ÷ days in range · Miles = sum of odometer readings per completed rental
      </p>
    </div>
  )
}
