// lib/daily-schedule/build.ts
//
// Pure pieces of the 7am "today's pickups & returns" digest, kept free of
// Supabase so they can be tested with fixed dates.

import { APP_TZ } from '@/lib/finance/revenue'

export const DIGEST_HOUR = 7
export const OPEN_STATUSES = ['pending', 'confirmed', 'active'] as const

export interface ScheduleReservation {
  id: string
  tenant_id: string
  car_id: number | null
  booking_code: string | null
  customer_name: string | null
  customer_phone: string | null
  pickup_date: string | null
  pickup_time: string | null
  return_date: string | null
  return_time: string | null
  status: string | null
}

export interface ScheduleItem {
  id: string
  customer: string
  vehicle: string
  time: string | null
  phone: string | null
  bookingCode: string | null
}

export interface TenantSchedule {
  pickups: ScheduleItem[]
  returns: ScheduleItem[]
}

const isOpen = (status: string | null): boolean =>
  (OPEN_STATUSES as readonly string[]).includes((status ?? '').toLowerCase())

// Untimed items sort after timed ones; "HH:MM" strings compare correctly as text.
const byTime = (a: ScheduleItem, b: ScheduleItem): number =>
  (a.time ?? '99:99').localeCompare(b.time ?? '99:99')

export function buildTenantSchedules(
  rows: readonly ScheduleReservation[],
  today: string,
  carName: (carId: number | null) => string,
): Map<string, TenantSchedule> {
  const toItem = (r: ScheduleReservation, time: string | null): ScheduleItem => ({
    id: r.id,
    customer: r.customer_name?.trim() || 'Customer',
    vehicle: carName(r.car_id),
    time,
    phone: r.customer_phone?.trim() || null,
    bookingCode: r.booking_code,
  })

  const out = new Map<string, TenantSchedule>()
  for (const r of rows.filter((x) => isOpen(x.status))) {
    const isPickup = r.pickup_date === today
    const isReturn = r.return_date === today
    if (!isPickup && !isReturn) continue
    const current = out.get(r.tenant_id) ?? { pickups: [], returns: [] }
    out.set(r.tenant_id, {
      pickups: isPickup ? [...current.pickups, toItem(r, r.pickup_time)] : current.pickups,
      returns: isReturn ? [...current.returns, toItem(r, r.return_time)] : current.returns,
    })
  }

  return new Map(
    Array.from(out.entries()).map(([tenantId, s]) => [
      tenantId,
      { pickups: [...s.pickups].sort(byTime), returns: [...s.returns].sort(byTime) },
    ]),
  )
}

const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? '' : 's'}`

/** "2 pickups · 1 return" — used in the subject, bell and push. */
export function scheduleSummary(s: TenantSchedule): string {
  return [
    s.pickups.length ? plural(s.pickups.length, 'pickup') : null,
    s.returns.length ? plural(s.returns.length, 'return') : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

/**
 * pg_cron runs in UTC, so the job fires at both 11:00 and 12:00 UTC and only
 * the run that lands on 7am New York time (EDT or EST) sends anything.
 */
export function isDigestHour(now: Date = new Date()): boolean {
  const hour = Number(new Intl.DateTimeFormat('en-US', { timeZone: APP_TZ, hour: 'numeric', hourCycle: 'h23' }).format(now))
  return hour === DIGEST_HOUR
}

/** "8:30am", "10am" from a "HH:MM[:SS]" string; null when unparseable. */
export function formatClock(t: string | null): string | null {
  if (!t) return null
  const [h, m] = t.split(':').map(Number)
  if (Number.isNaN(h)) return null
  const suffix = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 || 12
  return m ? `${h12}:${String(m).padStart(2, '0')}${suffix}` : `${h12}${suffix}`
}
