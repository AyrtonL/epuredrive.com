// __tests__/lib/recurring-expenses.test.ts
import { installmentSchedule } from '@/lib/finance/car-roi'
import {
  isOperatingExpense,
  nextOccurrence,
  loanTransactions,
  occurrenceDates,
  recurringTransactions,
  type RecurringRule,
} from '@/lib/expenses/recurring'

const rule = (p: Partial<RecurringRule> = {}): RecurringRule => ({
  id: 'r1',
  tenantId: 't1',
  carId: 3,
  category: 'insurance',
  description: 'Progressive',
  amount: 180,
  frequency: 'monthly',
  startDate: '2026-01-15',
  endDate: null,
  active: true,
  ...p,
})

describe('occurrenceDates', () => {
  it('lists monthly dates from start through today', () => {
    expect(occurrenceDates(rule(), '2026-04-14')).toEqual(['2026-01-15', '2026-02-15', '2026-03-15'])
  })

  it('clamps to the last day of short months and keeps the original day after', () => {
    expect(occurrenceDates(rule({ startDate: '2026-01-31' }), '2026-04-30')).toEqual([
      '2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30',
    ])
  })

  it('supports quarterly and yearly', () => {
    expect(occurrenceDates(rule({ frequency: 'quarterly' }), '2026-10-12')).toEqual(['2026-01-15', '2026-04-15', '2026-07-15'])
    expect(occurrenceDates(rule({ frequency: 'yearly', startDate: '2024-03-01' }), '2026-10-12')).toEqual(['2024-03-01', '2025-03-01', '2026-03-01'])
  })

  it('stops at the end date and skips inactive rules', () => {
    expect(occurrenceDates(rule({ endDate: '2026-02-20' }), '2026-10-12')).toEqual(['2026-01-15', '2026-02-15'])
    expect(occurrenceDates(rule({ active: false }), '2026-10-12')).toEqual([])
  })
})

describe('recurringTransactions', () => {
  it('builds one expense per due date with a deterministic key', () => {
    const rows = recurringTransactions(rule(), '2026-02-15')
    expect(rows).toHaveLength(2)
    expect(rows[1]).toMatchObject({
      tenant_id: 't1',
      car_id: 3,
      type: 'expense',
      category: 'insurance',
      amount: 180,
      transaction_date: '2026-02-15',
      recurring_expense_id: 'r1',
      source_key: 'rec:r1:2026-02-15',
      description: 'Progressive',
    })
  })
})

describe('loanTransactions', () => {
  const loan = { amount: 15000, aprPct: 6.9, termMonths: 48, firstPaymentDate: '2026-01-01' }

  it('splits each paid installment into interest and principal rows', () => {
    const rows = loanTransactions('t1', 2, 'Audi A3', loan, '2026-02-10')
    expect(rows).toHaveLength(4) // 2 installments × (interest + principal)
    const [i1, p1] = rows
    expect(i1).toMatchObject({ category: 'loan_interest', transaction_date: '2026-01-01', source_key: 'loan:2:1:interest', car_id: 2 })
    expect(p1).toMatchObject({ category: 'loan_principal', source_key: 'loan:2:1:principal' })
    expect(i1.amount).toBeCloseTo(86.25, 2) // 15,000 × 6.9% / 12
    expect(i1.amount + p1.amount).toBeCloseTo(358.5, 1)
    expect(i1.description).toBe('Audi A3 · Loan payment 1 of 48 (interest)')
  })

  it('matches the amortization schedule', () => {
    const schedule = installmentSchedule(loan)
    expect(schedule).toHaveLength(48)
    expect(schedule.reduce((s, x) => s + x.principal, 0)).toBeCloseTo(15000, 2)
  })

  it('omits zero-interest rows on 0% loans', () => {
    const rows = loanTransactions('t1', 2, 'Car', { ...loan, aprPct: 0 }, '2026-01-01')
    expect(rows.map((r) => r.category)).toEqual(['loan_principal'])
  })
})

describe('isOperatingExpense', () => {
  it('counts expenses except loan principal (paying down debt is not a cost)', () => {
    expect(isOperatingExpense({ type: 'expense', category: 'insurance' })).toBe(true)
    expect(isOperatingExpense({ type: 'expense', category: 'loan_interest' })).toBe(true)
    expect(isOperatingExpense({ type: 'expense', category: 'loan_principal' })).toBe(false)
    expect(isOperatingExpense({ type: 'income', category: 'rental' })).toBe(false)
  })
})

describe('nextOccurrence', () => {
  it('returns the next due date after today', () => {
    expect(nextOccurrence(rule(), '2026-10-12')).toBe('2026-10-15')
    expect(nextOccurrence(rule(), '2026-10-15')).toBe('2026-11-15')
  })

  it('returns the start date for a rule that has not started', () => {
    expect(nextOccurrence(rule({ startDate: '2026-12-01' }), '2026-10-12')).toBe('2026-12-01')
  })

  it('returns null after the end date or when inactive', () => {
    expect(nextOccurrence(rule({ endDate: '2026-03-01' }), '2026-10-12')).toBeNull()
    expect(nextOccurrence(rule({ active: false }), '2026-10-12')).toBeNull()
  })
})
