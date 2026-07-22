// lib/consignments/payouts.ts
//
// Pure payout math for consignments. Groups cars by owner and computes each
// owner's share of NET COMPLETED revenue, per the app-wide revenue policy.
// Active rentals are reported separately as "in progress", never in the payout.

import type { Consignment, ConsignmentOwner, Reservation, Transaction } from '@/lib/supabase/types'
import { isEarned, revenueBucket, overlapsRange } from '@/lib/finance/revenue'

const WIDE_FROM = '0001-01-01'
const WIDE_TO = '9999-12-31'

export interface CarPayout {
  consignment: Consignment
  ownerPct: number
  earnedGross: number
  activeGross: number
  expenses: number
  net: number
  ownerShare: number
  epureShare: number
  activeOwnerShare: number
}

export interface OwnerGroup {
  owner: ConsignmentOwner
  cars: CarPayout[]
  totalEarnedGross: number
  totalExpenses: number
  totalOwnerShare: number
  totalEpureShare: number
  totalActiveOwnerShare: number
}

export interface PayoutInput {
  owners: readonly ConsignmentOwner[]
  consignments: readonly Consignment[]
  reservations: readonly Reservation[]
  expenses: readonly Transaction[]
  from?: string
  to?: string
}

const num = (v: unknown): number => Number(v) || 0

export function computeCarPayout(
  consignment: Consignment,
  reservations: readonly Reservation[],
  expenses: readonly Transaction[],
  from: string,
  to: string
): CarPayout {
  // Supabase returns `numeric` as a string; coerce to a real number (preserve 0).
  const ownerPct = consignment.owner_percentage == null ? 70 : Number(consignment.owner_percentage)
  const carId = consignment.car_id

  const forCar = reservations.filter(
    (r) => r.car_id === carId && revenueBucket(r.status) !== 'excluded' && overlapsRange(r, from, to)
  )
  const earnedGross = forCar
    .filter(isEarned)
    .reduce((s, r) => s + num(r.total_amount), 0)
  const activeGross = forCar
    .filter((r) => revenueBucket(r.status) === 'active')
    .reduce((s, r) => s + num(r.total_amount), 0)

  const carExpenses = expenses
    .filter((e) => {
      if (e.car_id !== carId) return false
      const d = e.transaction_date ?? ''
      return d >= from && d <= to
    })
    .reduce((s, e) => s + num(e.amount), 0)

  const net = Math.max(0, earnedGross - carExpenses)
  return {
    consignment,
    ownerPct,
    earnedGross,
    activeGross,
    expenses: carExpenses,
    net,
    ownerShare: (net * ownerPct) / 100,
    epureShare: (net * (100 - ownerPct)) / 100,
    activeOwnerShare: (activeGross * ownerPct) / 100,
  }
}

export function groupOwnerPayouts(input: PayoutInput): OwnerGroup[] {
  const from = input.from && input.from.length ? input.from : WIDE_FROM
  const to = input.to && input.to.length ? input.to : WIDE_TO

  const byOwner = new Map<string, Consignment[]>()
  for (const c of input.consignments) {
    if (!c.owner_id) continue
    const list = byOwner.get(c.owner_id) ?? []
    list.push(c)
    byOwner.set(c.owner_id, list)
  }

  return input.owners.map((owner) => {
    const cars = (byOwner.get(owner.id) ?? []).map((c) =>
      computeCarPayout(c, input.reservations, input.expenses, from, to)
    )
    return {
      owner,
      cars,
      totalEarnedGross: cars.reduce((s, c) => s + c.earnedGross, 0),
      totalExpenses: cars.reduce((s, c) => s + c.expenses, 0),
      totalOwnerShare: cars.reduce((s, c) => s + c.ownerShare, 0),
      totalEpureShare: cars.reduce((s, c) => s + c.epureShare, 0),
      totalActiveOwnerShare: cars.reduce((s, c) => s + c.activeOwnerShare, 0),
    }
  })
}
