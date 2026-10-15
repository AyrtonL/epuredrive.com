// lib/finance/pnl.ts
//
// Profit & loss and cash flow for the P&L page, month by month and per car.
//
// Revenue follows lib/finance/revenue.ts (EARNED = completed), attributed to
// the month the rental ended (return_date, falling back to pickup_date).
// Rentals still out (`active`) are reported separately as "in progress".
//
// Costs come only from `transactions` (type 'expense'). Maintenance logged in
// car_services is mirrored into transactions by a DB trigger, so reading
// transactions alone counts every cost exactly once. Loan principal moves cash
// but is not a cost: it is excluded from operating profit and subtracted only
// in cash flow.

import { loanStatus, type LoanTerms } from '@/lib/finance/car-roi'
import { revenueBucket } from '@/lib/finance/revenue'
import {
  FREQUENCY_MONTHS,
  LOAN_INTEREST_CATEGORY,
  LOAN_PRINCIPAL_CATEGORY,
  type RecurringFrequency,
} from '@/lib/expenses/recurring'

export interface PnlReservation {
  car_id: number | null
  pickup_date: string | null
  return_date: string | null
  status: string | null
  total_amount: number | string | null
}

export interface PnlTransaction {
  transaction_date: string | null
  type: string | null
  category: string | null
  amount: number | string | null
  car_id: number | null
}

export interface PnlFinancing {
  car_id: number
  purchase_price: number | string | null
  loan_amount: number | string | null
  loan_apr: number | string | null
  loan_term_months: number | null
  loan_first_payment_date: string | null
  current_value: number | string | null
}

export interface PnlRecurring {
  amount: number | string | null
  frequency: string | null
  active: boolean | null
  end_date: string | null
}

export interface PnlCar {
  id: number
  name: string
}

export type ExpenseGroup = 'maintenance' | 'insurance' | 'interest' | 'other'

export interface PnlMonth {
  month: string // YYYY-MM
  revenue: number
  maintenance: number
  insurance: number
  interest: number
  other: number
  /** maintenance + insurance + interest + other */
  costs: number
  operatingProfit: number
  principal: number
  cashFlow: number
}

export interface PnlCarRow {
  carId: number
  name: string
  revenue: number
  daysRented: number
  daysAvailable: number
  utilization: number | null
  revenuePerDay: number | null
  maintenance: number
  interest: number
  otherCosts: number
  /** revenue − maintenance − interest − other per-car costs */
  operatingNet: number
  principal: number
  monthlyPayment: number | null
  currentValue: number | null
  loanBalance: number | null
  equity: number | null
}

export interface PnlTotals {
  revenue: number
  costs: number
  operatingProfit: number
  principal: number
  cashFlow: number
  inProgress: number
  /** Costs not tied to any car (insurance, software, marketing…) */
  sharedCosts: number
}

export interface BreakEven {
  loanPayments: number
  recurring: number
  avgMaintenance: number
  /** loanPayments + recurring + avgMaintenance */
  monthlyCashNeed: number
  avgRevenue: number
  /** Closed months averaged (oldest → newest), may be fewer than requested */
  monthsUsed: string[]
  /** avgRevenue − monthlyCashNeed */
  gap: number
}

export interface PnlReport {
  months: PnlMonth[]
  cars: PnlCarRow[]
  totals: PnlTotals
  breakEven: BreakEven
  from: string
  to: string
}

const num = (v: unknown): number => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

const numOrNull = (v: unknown): number | null => (v == null || v === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null)

const monthOf = (date: string): string => date.slice(0, 7)

/** Whole nights between two YYYY-MM-DD dates (0 if reversed or invalid). */
export function nightsBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`)
  const b = Date.parse(`${to}T00:00:00Z`)
  if (Number.isNaN(a) || Number.isNaN(b)) return 0
  return Math.max(0, Math.round((b - a) / 86400000))
}

/** YYYY-MM list from `fromMonth` through `toMonth`, inclusive. */
export function monthRange(fromMonth: string, toMonth: string): string[] {
  const out: string[] = []
  let [y, m] = fromMonth.split('-').map(Number)
  const [ty, tm] = toMonth.split('-').map(Number)
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`)
    m += 1
    if (m > 12) { m = 1; y += 1 }
    if (out.length > 600) break
  }
  return out
}

/** First day of the month `n` months before `month` (YYYY-MM-01). */
export function monthsBack(month: string, n: number): string {
  let [y, m] = month.split('-').map(Number)
  m -= n
  while (m < 1) { m += 12; y -= 1 }
  return `${y}-${String(m).padStart(2, '0')}-01`
}

/** Which bucket of the P&L a transaction category falls in. */
export function expenseGroup(category: string | null | undefined): ExpenseGroup | 'principal' {
  const c = (category ?? '').trim().toLowerCase()
  if (c === LOAN_PRINCIPAL_CATEGORY) return 'principal'
  if (c === LOAN_INTEREST_CATEGORY) return 'interest'
  if (c.startsWith('maintenance') || c === 'repairs' || c === 'repair') return 'maintenance'
  if (c.startsWith('insurance')) return 'insurance'
  return 'other'
}

function loanTerms(f: PnlFinancing): LoanTerms | null {
  const amount = numOrNull(f.loan_amount)
  if (amount == null || amount <= 0 || !f.loan_term_months || !f.loan_first_payment_date) return null
  return {
    amount,
    aprPct: num(f.loan_apr),
    termMonths: Number(f.loan_term_months),
    firstPaymentDate: f.loan_first_payment_date,
  }
}

export interface BuildPnlInput {
  reservations: readonly PnlReservation[]
  transactions: readonly PnlTransaction[]
  financing: readonly PnlFinancing[]
  recurring: readonly PnlRecurring[]
  cars: readonly PnlCar[]
  /** Window start, YYYY-MM-DD (first day of a month) */
  from: string
  /** Today, YYYY-MM-DD — the window ends here */
  today: string
  /** Closed months averaged for break-even (default 3) */
  breakEvenMonths?: number
}

export function buildPnl(input: BuildPnlInput): PnlReport {
  const { from, today } = input
  const months = monthRange(monthOf(from), monthOf(today))
  const byMonth = new Map<string, PnlMonth>(
    months.map((m) => [m, { month: m, revenue: 0, maintenance: 0, insurance: 0, interest: 0, other: 0, costs: 0, operatingProfit: 0, principal: 0, cashFlow: 0 }])
  )

  const carIds = new Set(input.cars.map((c) => c.id))
  const carAcc = new Map<number, { revenue: number; nights: number; firstPickup: string | null; maintenance: number; interest: number; other: number; principal: number }>()
  const acc = (id: number) => {
    let a = carAcc.get(id)
    if (!a) { a = { revenue: 0, nights: 0, firstPickup: null, maintenance: 0, interest: 0, other: 0, principal: 0 }; carAcc.set(id, a) }
    return a
  }

  let inProgress = 0

  for (const r of input.reservations) {
    const bucket = revenueBucket(r.status)
    if (bucket === 'excluded' || bucket === 'upcoming' || !r.pickup_date) continue

    // Rented nights inside [from, today], for utilization (earned + active).
    if (r.car_id != null && carIds.has(r.car_id) && r.pickup_date <= today) {
      const a = acc(r.car_id)
      const start = r.pickup_date > from ? r.pickup_date : from
      const endRaw = r.return_date ?? today
      const end = endRaw < today ? endRaw : today
      a.nights += nightsBetween(start, end)
      if (!a.firstPickup || r.pickup_date < a.firstPickup) a.firstPickup = r.pickup_date
    }

    if (bucket === 'active') {
      inProgress += num(r.total_amount)
      continue
    }

    const earnedOn = r.return_date ?? r.pickup_date
    if (earnedOn < from || earnedOn > today) continue
    const m = byMonth.get(monthOf(earnedOn))
    if (!m) continue
    const amount = num(r.total_amount)
    m.revenue += amount
    if (r.car_id != null && carIds.has(r.car_id)) acc(r.car_id).revenue += amount
  }

  let sharedCosts = 0
  for (const t of input.transactions) {
    if ((t.type ?? 'expense') !== 'expense' || !t.transaction_date) continue
    if (t.transaction_date < from || t.transaction_date > today) continue
    const m = byMonth.get(monthOf(t.transaction_date))
    if (!m) continue
    const amount = num(t.amount)
    const group = expenseGroup(t.category)
    const car = t.car_id != null && carIds.has(t.car_id) ? acc(t.car_id) : null

    if (group === 'principal') {
      m.principal += amount
      if (car) car.principal += amount
      continue
    }
    m[group] += amount
    if (car) {
      if (group === 'maintenance') car.maintenance += amount
      else if (group === 'interest') car.interest += amount
      else car.other += amount
    } else {
      sharedCosts += amount
    }
  }

  for (const m of byMonth.values()) {
    m.costs = m.maintenance + m.insurance + m.interest + m.other
    m.operatingProfit = m.revenue - m.costs
    m.cashFlow = m.operatingProfit - m.principal
  }

  const financingByCar = new Map(input.financing.map((f) => [f.car_id, f]))
  const windowNights = nightsBetween(from, today)

  const cars: PnlCarRow[] = input.cars
    .map((c) => {
      const a = carAcc.get(c.id) ?? { revenue: 0, nights: 0, firstPickup: null, maintenance: 0, interest: 0, other: 0, principal: 0 }
      const f = financingByCar.get(c.id)
      const terms = f ? loanTerms(f) : null
      const loan = terms ? loanStatus(terms, today) : null
      const currentValue = f ? numOrNull(f.current_value) : null
      const loanBalance = loan ? loan.balance : f ? 0 : null
      const availableFrom = a.firstPickup && a.firstPickup > from ? a.firstPickup : from
      const daysAvailable = a.firstPickup ? nightsBetween(availableFrom, today) : windowNights
      return {
        carId: c.id,
        name: c.name,
        revenue: a.revenue,
        daysRented: a.nights,
        daysAvailable,
        utilization: daysAvailable > 0 ? Math.min(1, a.nights / daysAvailable) : null,
        revenuePerDay: a.nights > 0 ? a.revenue / a.nights : null,
        maintenance: a.maintenance,
        interest: a.interest,
        otherCosts: a.other,
        operatingNet: a.revenue - a.maintenance - a.interest - a.other,
        principal: a.principal,
        monthlyPayment: loan && !loan.paidOff ? loan.payment : null,
        currentValue,
        loanBalance,
        equity: currentValue != null ? currentValue - (loanBalance ?? 0) : null,
      }
    })
    .filter((c) => c.revenue !== 0 || c.daysRented > 0 || c.maintenance + c.interest + c.otherCosts + c.principal !== 0 || c.monthlyPayment != null)
    .sort((a, b) => b.operatingNet - a.operatingNet)

  const monthList = Array.from(byMonth.values())
  const sum = (k: keyof PnlMonth) => monthList.reduce((s, m) => s + (m[k] as number), 0)
  const totals: PnlTotals = {
    revenue: sum('revenue'),
    costs: sum('costs'),
    operatingProfit: sum('operatingProfit'),
    principal: sum('principal'),
    cashFlow: sum('cashFlow'),
    inProgress,
    sharedCosts,
  }

  // Break-even: what the business needs per month in cash today, against
  // what it has been earning in recent closed months.
  const closed = monthList.filter((m) => m.month < monthOf(today))
  const recent = closed.slice(-(input.breakEvenMonths ?? 3))
  const avgRevenue = recent.length ? recent.reduce((s, m) => s + m.revenue, 0) / recent.length : 0
  const avgMaintenance = closed.length ? closed.reduce((s, m) => s + m.maintenance, 0) / closed.length : 0
  const loanPayments = cars.reduce((s, c) => s + (c.monthlyPayment ?? 0), 0)
  const recurring = input.recurring
    .filter((r) => r.active && (!r.end_date || r.end_date >= today))
    .reduce((s, r) => s + num(r.amount) / (FREQUENCY_MONTHS[(r.frequency ?? 'monthly') as RecurringFrequency] ?? 1), 0)
  const monthlyCashNeed = loanPayments + recurring + avgMaintenance

  return {
    months: monthList,
    cars,
    totals,
    breakEven: {
      loanPayments,
      recurring,
      avgMaintenance,
      monthlyCashNeed,
      avgRevenue,
      monthsUsed: recent.map((m) => m.month),
      gap: avgRevenue - monthlyCashNeed,
    },
    from,
    to: today,
  }
}
