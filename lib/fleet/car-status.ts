// lib/fleet/car-status.ts
//
// Where each car stands right now (on rent / overdue / available / …) and how
// much it was rented in a window. Shared by Fleet, the car detail page and
// the Overview so they never disagree.

import type { Reservation } from '@/lib/supabase/types'
import { inclusiveDays, revenueBucket } from '@/lib/finance/revenue'

export type CarStatusKind = 'on_rent' | 'overdue' | 'available' | 'maintenance' | 'retired'

export interface CarStatus {
  kind: CarStatusKind
  label: string
  detail: string
  current: Reservation | null
  next: Reservation | null
}

/** What the Fleet grid shows per car. */
export interface FleetCarInsight {
  status: CarStatus
  utilizationPct: number
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const OCCUPYING = new Set(['pending', 'confirmed', 'active'])

function shortDay(iso: string): string {
  const [, m, d] = iso.split('-').map(Number)
  return `${MONTHS[m - 1]} ${d}`
}

const who = (r: Reservation): string => r.customer_name?.trim() || 'Customer'

export function carStatus(carStatusValue: string | null | undefined, reservations: readonly Reservation[], today: string): CarStatus {
  const status = (carStatusValue ?? '').toLowerCase()
  const open = reservations.filter((r) => OCCUPYING.has((r.status ?? '').toLowerCase()) && r.pickup_date)

  const overdue = open.find((r) => r.status === 'active' && r.return_date != null && r.return_date < today) ?? null
  const current =
    open.find((r) => r.pickup_date! <= today && (r.return_date == null || r.return_date >= today)) ?? null
  const next =
    [...open].filter((r) => r.pickup_date! > today).sort((a, b) => a.pickup_date!.localeCompare(b.pickup_date!))[0] ?? null

  if (status === 'retired') return { kind: 'retired', label: 'Retired', detail: 'Out of the active fleet', current: null, next: null }
  if (status === 'maintenance') {
    return { kind: 'maintenance', label: 'In maintenance', detail: next ? `Next: ${who(next)} · ${shortDay(next.pickup_date!)}` : 'No upcoming bookings', current: null, next }
  }
  if (overdue) {
    return { kind: 'overdue', label: 'Overdue', detail: `${who(overdue)} · was due ${shortDay(overdue.return_date!)}`, current: overdue, next }
  }
  if (current) {
    const back = current.return_date ? ` · back ${shortDay(current.return_date)}` : ''
    return { kind: 'on_rent', label: 'On rent', detail: `${who(current)}${back}`, current, next }
  }
  return {
    kind: 'available',
    label: 'Available',
    detail: next ? `Next: ${who(next)} · ${shortDay(next.pickup_date!)}` : 'No upcoming bookings',
    current: null,
    next,
  }
}

/**
 * Rented days per car inside [from, to] from completed and active rentals
 * (the same rentals that count toward revenue). Open-ended rentals run to `to`.
 */
export function rentedDaysByCar(rows: readonly Reservation[], from: string, to: string): Map<number, number> {
  const out = new Map<number, number>()
  for (const r of rows) {
    const bucket = revenueBucket(r.status)
    if ((bucket !== 'earned' && bucket !== 'active') || r.car_id == null || !r.pickup_date) continue
    const start = r.pickup_date > from ? r.pickup_date : from
    const end = (r.return_date ?? to) < to ? (r.return_date ?? to) : to
    if (end < start) continue
    out.set(r.car_id, (out.get(r.car_id) ?? 0) + inclusiveDays(start, end))
  }
  return out
}
