// lib/expenses/recurring.ts
//
// Pure pieces of recurring expenses: which dates a rule falls on, the
// `transactions` rows those dates (and loan installments) turn into, and the
// single rule for what counts as an operating expense.

import { dueDate, installmentSchedule, type LoanTerms } from '@/lib/finance/car-roi'

export type RecurringFrequency = 'monthly' | 'quarterly' | 'yearly'

export const FREQUENCY_MONTHS: Record<RecurringFrequency, number> = {
  monthly: 1,
  quarterly: 3,
  yearly: 12,
}

/** Paying down loan principal moves cash but is not a cost (or a tax deduction). */
export const LOAN_PRINCIPAL_CATEGORY = 'loan_principal'
export const LOAN_INTEREST_CATEGORY = 'loan_interest'
export const LOAN_CATEGORIES: ReadonlySet<string> = new Set([LOAN_PRINCIPAL_CATEGORY, LOAN_INTEREST_CATEGORY])

/** Human label for a stored category ("loan_interest" → "Loan interest"). */
export function categoryName(category: string | null | undefined): string {
  const c = (category ?? '').trim()
  if (!c) return 'General'
  const spaced = c.replace(/_/g, ' ')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

const MAX_OCCURRENCES = 1200

export interface RecurringRule {
  id: string
  tenantId: string
  carId: number | null
  category: string
  description: string | null
  amount: number
  frequency: RecurringFrequency
  startDate: string
  endDate: string | null
  active: boolean
}

export interface GeneratedTransaction {
  tenant_id: string
  car_id: number | null
  type: 'expense'
  category: string
  amount: number
  transaction_date: string
  description: string | null
  recurring_expense_id: string | null
  source_key: string
}

const cents = (n: number): number => Math.round(n * 100) / 100

/** Every due date of a rule from its start through `until` (and its end date). */
export function occurrenceDates(rule: Pick<RecurringRule, 'frequency' | 'startDate' | 'endDate' | 'active'>, until: string): string[] {
  if (!rule.active) return []
  const last = rule.endDate && rule.endDate < until ? rule.endDate : until
  const step = FREQUENCY_MONTHS[rule.frequency]
  const out: string[] = []
  for (let k = 0; k < MAX_OCCURRENCES; k++) {
    const d = dueDate(rule.startDate, k * step)
    if (d > last) break
    out.push(d)
  }
  return out
}

/** First due date strictly after `today`, or null when the rule has ended. */
export function nextOccurrence(rule: Pick<RecurringRule, 'frequency' | 'startDate' | 'endDate' | 'active'>, today: string): string | null {
  if (!rule.active) return null
  const step = FREQUENCY_MONTHS[rule.frequency]
  for (let k = 0; k < MAX_OCCURRENCES; k++) {
    const d = dueDate(rule.startDate, k * step)
    if (rule.endDate && d > rule.endDate) return null
    if (d > today) return d
  }
  return null
}

export function recurringTransactions(rule: RecurringRule, until: string): GeneratedTransaction[] {
  return occurrenceDates(rule, until).map((date) => ({
    tenant_id: rule.tenantId,
    car_id: rule.carId,
    type: 'expense',
    category: rule.category,
    amount: cents(rule.amount),
    transaction_date: date,
    description: rule.description,
    recurring_expense_id: rule.id,
    source_key: `rec:${rule.id}:${date}`,
  }))
}

/** Each installment due by `until`, as an interest row and a principal row. */
export function loanTransactions(
  tenantId: string,
  carId: number,
  carName: string,
  loan: LoanTerms,
  until: string,
): GeneratedTransaction[] {
  const rows: GeneratedTransaction[] = []
  for (const inst of installmentSchedule(loan)) {
    if (inst.dueDate > until) break
    const label = `${carName} · Loan payment ${inst.n} of ${loan.termMonths}`
    const parts: Array<[string, number, string]> = [
      [LOAN_INTEREST_CATEGORY, inst.interest, 'interest'],
      [LOAN_PRINCIPAL_CATEGORY, inst.principal, 'principal'],
    ]
    for (const [category, amount, kind] of parts) {
      const value = cents(amount)
      if (value <= 0) continue // transactions.amount must be > 0 (0% APR has no interest)
      rows.push({
        tenant_id: tenantId,
        car_id: carId,
        type: 'expense',
        category,
        amount: value,
        transaction_date: inst.dueDate,
        description: `${label} (${kind})`,
        recurring_expense_id: null,
        source_key: `loan:${carId}:${inst.n}:${kind}`,
      })
    }
  }
  return rows
}

/** The one definition of "expense" for P&L, taxes, ROI and owner payouts. */
export function isOperatingExpense(t: { type?: string | null; category?: string | null }): boolean {
  return (t.type ?? 'expense') === 'expense' && t.category !== LOAN_PRINCIPAL_CATEGORY
}
