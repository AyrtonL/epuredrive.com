import { computeCarPayout, groupOwnerPayouts } from '@/lib/consignments/payouts'
import type { Consignment, ConsignmentOwner, Reservation, Transaction } from '@/lib/supabase/types'

function res(p: Partial<Reservation>): Reservation {
  return {
    id: 1, booking_code: 'B', car_id: 26, customer_name: 'C',
    pickup_date: '2026-06-10', return_date: '2026-06-12',
    total_amount: 1000, status: 'completed', ...p,
  } as Reservation
}
function con(p: Partial<Consignment> = {}): Consignment {
  return {
    id: 'c1', car_id: 26, owner_id: 'o1',
    owner_name: null, owner_email: null, owner_phone: null,
    owner_percentage: 70, contract_start: null, contract_end: null,
    notes: null, tenant_id: 't1', ...p,
  } as Consignment
}
function owner(p: Partial<ConsignmentOwner>): ConsignmentOwner {
  return {
    id: 'o1', tenant_id: 't1', name: 'Jorge', email: null, phone: null,
    default_percentage: 70, notes: null, ...p,
  } as ConsignmentOwner
}
function tx(p: Partial<Transaction> = {}): Transaction {
  return { id: 1, transaction_date: '2026-06-11', type: 'expense',
    category: 'fuel', amount: 100, description: null, car_id: 26, ...p } as Transaction
}

const WIDE_FROM = '0001-01-01'
const WIDE_TO = '9999-12-31'

describe('computeCarPayout', () => {
  it('counts only completed revenue, nets out expenses, splits by pct', () => {
    const c = con({ owner_percentage: 70 })
    const out = computeCarPayout(
      c,
      [res({ total_amount: 1000, status: 'completed' })],
      [tx({ amount: 100 })],
      WIDE_FROM, WIDE_TO
    )
    expect(out.earnedGross).toBe(1000)
    expect(out.expenses).toBe(100)
    expect(out.net).toBe(900)
    expect(out.ownerShare).toBe(630)   // 900 * 0.70
    expect(out.epureShare).toBe(270)   // 900 * 0.30
  })

  it('excludes active/confirmed/cancelled from earned but reports active separately', () => {
    const c = con({ owner_percentage: 50 })
    const out = computeCarPayout(
      c,
      [
        res({ total_amount: 1000, status: 'completed' }),
        res({ id: 2, total_amount: 500, status: 'active' }),
        res({ id: 3, total_amount: 400, status: 'confirmed' }),
        res({ id: 4, total_amount: 999, status: 'cancelled' }),
      ],
      [],
      WIDE_FROM, WIDE_TO
    )
    expect(out.earnedGross).toBe(1000)
    expect(out.activeGross).toBe(500)
    expect(out.ownerShare).toBe(500)          // 1000 * 0.50
    expect(out.activeOwnerShare).toBe(250)    // 500 * 0.50 (informational)
  })

  it('net never goes below zero', () => {
    const out = computeCarPayout(
      con({ owner_percentage: 70 }),
      [res({ total_amount: 100, status: 'completed' })],
      [tx({ amount: 500 })],
      WIDE_FROM, WIDE_TO
    )
    expect(out.net).toBe(0)
    expect(out.ownerShare).toBe(0)
  })

  it('respects the period window via overlapsRange', () => {
    const out = computeCarPayout(
      con(),
      [res({ pickup_date: '2026-01-01', return_date: '2026-01-03', status: 'completed', total_amount: 1000 })],
      [],
      '2026-06-01', '2026-06-30'
    )
    expect(out.earnedGross).toBe(0) // outside window
  })
})

describe('groupOwnerPayouts', () => {
  it('groups multiple cars under one owner and sums the payout', () => {
    const groups = groupOwnerPayouts({
      owners: [owner({ id: 'o1' })],
      consignments: [
        con({ id: 'c1', car_id: 26, owner_id: 'o1', owner_percentage: 70 }),
        con({ id: 'c2', car_id: 27, owner_id: 'o1', owner_percentage: 70 }),
      ],
      reservations: [
        res({ car_id: 26, total_amount: 1000, status: 'completed' }),
        res({ id: 2, car_id: 27, total_amount: 2000, status: 'completed' }),
      ],
      expenses: [],
    })
    expect(groups).toHaveLength(1)
    expect(groups[0].cars).toHaveLength(2)
    expect(groups[0].totalOwnerShare).toBe(2100) // (1000+2000)*0.70
  })

  it('includes owners with zero cars', () => {
    const groups = groupOwnerPayouts({
      owners: [owner({ id: 'o9', name: 'Empty' })],
      consignments: [], reservations: [], expenses: [],
    })
    expect(groups).toHaveLength(1)
    expect(groups[0].cars).toHaveLength(0)
    expect(groups[0].totalOwnerShare).toBe(0)
  })
})
