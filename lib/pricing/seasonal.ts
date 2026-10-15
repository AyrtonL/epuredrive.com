// lib/pricing/seasonal.ts
//
// Suggested daily rates per vehicle for low season, high season and peak
// dates. Suggestions only — nothing here changes what a booking costs; the
// operator applies a suggestion to the car's daily_rate by hand.
//
// Method (shown on the page so the operator can judge it):
//   1. Base = what the car really earns per rented day over the last 12
//      months (completed rentals). Direct bookings are preferred when there are
//      enough of them, then all channels, then the list price.
//   2. Demand: recent utilization (last 90 days) nudges the base up or down.
//   3. Season: the base is multiplied for low season, high season and peaks.
//   4. Rounded to the nearest $5.

import { nightsBetween } from '@/lib/finance/pnl'

export type SeasonKind = 'low' | 'high' | 'peak'

/** A recurring yearly window, inclusive, as MM-DD. `to` may wrap past Dec 31. */
export interface PeakWindow {
  name: string
  from: string // MM-DD
  to: string // MM-DD
}

export interface SeasonConfig {
  /** Months (1–12) that are high season; every other month is low season. */
  highMonths: readonly number[]
  peaks: readonly PeakWindow[]
  multipliers: Record<SeasonKind, number>
}

/**
 * Miami defaults. Winter is high season (snowbirds, holidays, events); summer
 * and early fall are low season (heat, hurricane season). Peak windows are
 * approximate and recur every year.
 */
export const MIAMI_SEASONS: SeasonConfig = {
  highMonths: [11, 12, 1, 2, 3, 4],
  peaks: [
    { name: 'Art Basel week', from: '12-01', to: '12-08' },
    { name: 'Holidays & New Year', from: '12-20', to: '01-03' },
    { name: 'Spring break', from: '03-01', to: '03-31' },
    { name: 'Miami Grand Prix (F1)', from: '05-01', to: '05-05' },
  ],
  multipliers: { low: 0.95, high: 1.15, peak: 1.35 },
}

export interface PricingReservation {
  car_id: number | null
  pickup_date: string | null
  return_date: string | null
  status: string | null
  source: string | null
  total_amount: number | string | null
}

export interface PricingCar {
  id: number
  name: string
  dailyRate: number | null
}

export type BaseSource = 'direct' | 'all' | 'list' | 'none'

export interface CarPriceSuggestion {
  carId: number
  name: string
  listRate: number | null
  /** Revenue per rented day, last 12 months, completed rentals */
  realizedPerDay: number | null
  realizedDirectPerDay: number | null
  realizedTuroPerDay: number | null
  rentals: number
  /** Rented nights ÷ 90, last 90 days (completed + active) */
  utilization90: number
  base: number | null
  baseSource: BaseSource
  demandFactor: number
  suggested: Record<SeasonKind, number> | null
  /** Suggestion for the season today falls in */
  suggestedNow: number | null
  /** List price far from what the car actually earns (> 40% above) */
  listTooHigh: boolean
}

export interface SeasonToday {
  kind: SeasonKind
  label: string
}

const MIN_RENTALS_FOR_BASE = 3
const TURO_SOURCES = new Set(['turo'])

const num = (v: unknown): number => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/** Round to the nearest $5 (never below $5). */
export function roundPrice(n: number): number {
  return Math.max(5, Math.round(n / 5) * 5)
}

function inWindow(mmdd: string, w: PeakWindow): boolean {
  return w.from <= w.to ? mmdd >= w.from && mmdd <= w.to : mmdd >= w.from || mmdd <= w.to
}

/** Which season a YYYY-MM-DD date falls in (peak wins over high/low). */
export function seasonOf(date: string, config: SeasonConfig = MIAMI_SEASONS): SeasonToday {
  const mmdd = date.slice(5, 10)
  const peak = config.peaks.find((w) => inWindow(mmdd, w))
  if (peak) return { kind: 'peak', label: peak.name }
  const month = Number(date.slice(5, 7))
  return config.highMonths.includes(month) ? { kind: 'high', label: 'High season' } : { kind: 'low', label: 'Low season' }
}

/** Utilization-based nudge: busy cars can charge more, idle ones a bit less. */
export function demandFactor(utilization: number): number {
  if (utilization >= 0.7) return 1.1
  if (utilization >= 0.5) return 1.05
  if (utilization < 0.25) return 0.95
  return 1
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function suggestPrices(input: {
  cars: readonly PricingCar[]
  reservations: readonly PricingReservation[]
  today: string
  config?: SeasonConfig
}): { cars: CarPriceSuggestion[]; season: SeasonToday } {
  const config = input.config ?? MIAMI_SEASONS
  const { today } = input
  const yearAgo = addDays(today, -365)
  const ninetyAgo = addDays(today, -90)
  const season = seasonOf(today, config)

  const cars = input.cars.map<CarPriceSuggestion>((car) => {
    let revenue = 0
    let nights = 0
    let rentals = 0
    let directRevenue = 0
    let directNights = 0
    let directRentals = 0
    let turoRevenue = 0
    let turoNights = 0
    let recentNights = 0

    for (const r of input.reservations) {
      if (r.car_id !== car.id || !r.pickup_date) continue
      const status = (r.status ?? '').toLowerCase()

      // Recent utilization: completed + active rentals overlapping the last 90 days.
      if ((status === 'completed' || status === 'active') && r.pickup_date <= today) {
        const start = r.pickup_date > ninetyAgo ? r.pickup_date : ninetyAgo
        const endRaw = r.return_date ?? today
        const end = endRaw < today ? endRaw : today
        recentNights += nightsBetween(start, end)
      }

      // Realized price: completed rentals that ended in the last 12 months.
      if (status !== 'completed' || !r.return_date) continue
      if (r.return_date < yearAgo || r.return_date > today) continue
      const n = Math.max(1, nightsBetween(r.pickup_date, r.return_date))
      const amount = num(r.total_amount)
      if (amount <= 0) continue
      revenue += amount
      nights += n
      rentals += 1
      if (TURO_SOURCES.has((r.source ?? '').toLowerCase())) {
        turoRevenue += amount
        turoNights += n
      } else {
        directRevenue += amount
        directNights += n
        directRentals += 1
      }
    }

    const realizedPerDay = nights > 0 ? revenue / nights : null
    const realizedDirectPerDay = directNights > 0 ? directRevenue / directNights : null
    const realizedTuroPerDay = turoNights > 0 ? turoRevenue / turoNights : null
    const utilization90 = Math.min(1, recentNights / 90)
    const listRate = car.dailyRate != null && car.dailyRate > 0 ? car.dailyRate : null

    let base: number | null = null
    let baseSource: BaseSource = 'none'
    if (directRentals >= MIN_RENTALS_FOR_BASE && realizedDirectPerDay != null) {
      base = realizedDirectPerDay
      baseSource = 'direct'
    } else if (rentals >= MIN_RENTALS_FOR_BASE && realizedPerDay != null) {
      base = realizedPerDay
      baseSource = 'all'
    } else if (listRate != null) {
      base = listRate
      baseSource = 'list'
    }

    const factor = demandFactor(utilization90)
    const suggested = base == null
      ? null
      : {
          low: roundPrice(base * factor * config.multipliers.low),
          high: roundPrice(base * factor * config.multipliers.high),
          peak: roundPrice(base * factor * config.multipliers.peak),
        }

    return {
      carId: car.id,
      name: car.name,
      listRate,
      realizedPerDay,
      realizedDirectPerDay,
      realizedTuroPerDay,
      rentals,
      utilization90,
      base,
      baseSource,
      demandFactor: factor,
      suggested,
      suggestedNow: suggested ? suggested[season.kind] : null,
      listTooHigh: listRate != null && realizedPerDay != null && rentals >= MIN_RENTALS_FOR_BASE && listRate > realizedPerDay * 1.4,
    }
  })

  return { cars, season }
}

/** Next peak window starting after `today` (within a year), for the page header. */
export function nextPeak(today: string, config: SeasonConfig = MIAMI_SEASONS): { name: string; from: string; to: string } | null {
  const year = Number(today.slice(0, 4))
  const candidates = config.peaks.flatMap((w) =>
    [year - 1, year, year + 1].map((y) => {
      const from = `${y}-${w.from}`
      const toYear = w.to < w.from ? y + 1 : y
      return { name: w.name, from, to: `${toYear}-${w.to}` }
    })
  )
  return candidates.filter((c) => c.to >= today).sort((a, b) => (a.from < b.from ? -1 : 1))[0] ?? null
}
