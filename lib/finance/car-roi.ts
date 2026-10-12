// lib/finance/car-roi.ts
//
// Real ROI per vehicle once purchase and financing are known.
//
// "Cash invested" = what actually left the operator's pocket: the down
// payment (or the full price if bought in cash) plus every loan installment
// paid so far. Operating net comes from the ROI page (earned revenue minus
// maintenance, owner splits and per-car expenses) — loan payments are NOT
// subtracted from it, because they are already counted as cash invested.

export interface LoanTerms {
  amount: number
  aprPct: number
  termMonths: number
  /** YYYY-MM-DD of the first installment */
  firstPaymentDate: string
}

export interface LoanStatus {
  payment: number
  paymentsMade: number
  principalPaid: number
  interestPaid: number
  balance: number
  totalInterest: number
  paidOff: boolean
}

export interface CarRoiInput {
  purchasePrice: number | null
  purchaseDate: string | null
  downPayment: number | null
  loan: LoanTerms | null
  currentValue: number | null
  operatingNet: number
  today: string
}

export interface CarRoi {
  loan: LoanStatus | null
  cashInvested: number
  /** operating net ÷ cash invested, % — 100% means the car has paid for itself */
  paybackPct: number | null
  equity: number | null
  /** (operating net + equity − cash invested) ÷ cash invested, % */
  returnIfSoldPct: number | null
  monthlyCashFlow: number | null
  /** 0 = already paid back; null = never at the current pace */
  paybackMonthsLeft: number | null
}

const MAX_PROJECTION_MONTHS = 600

export function monthlyPayment(principal: number, aprPct: number, termMonths: number): number {
  if (termMonths <= 0) return 0
  const r = aprPct / 100 / 12
  if (r === 0) return principal / termMonths
  return (principal * r) / (1 - Math.pow(1 + r, -termMonths))
}

function parts(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return { y, m, d }
}

/** Due date of installment k (0-based), clamped to the month's last day. */
export function dueDate(first: string, k: number): string {
  const { y, m, d } = parts(first)
  const total = (m - 1) + k
  const year = y + Math.floor(total / 12)
  const month = (total % 12) + 1
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return `${year}-${String(month).padStart(2, '0')}-${String(Math.min(d, lastDay)).padStart(2, '0')}`
}

function monthsBetween(from: string, to: string): number {
  const a = parts(from)
  const b = parts(to)
  return (b.y - a.y) * 12 + (b.m - a.m) - (b.d < a.d ? 1 : 0)
}

export interface Installment {
  /** 1-based installment number */
  n: number
  dueDate: string
  interest: number
  principal: number
}

/** Full amortization schedule: each installment's due date and interest/principal split. */
export function installmentSchedule(loan: LoanTerms): Installment[] {
  const payment = monthlyPayment(loan.amount, loan.aprPct, loan.termMonths)
  const r = loan.aprPct / 100 / 12
  let balance = loan.amount
  const out: Installment[] = []
  for (let k = 0; k < loan.termMonths; k++) {
    const interest = balance * r
    const principal = Math.min(payment - interest, balance)
    balance -= principal
    out.push({ n: k + 1, dueDate: dueDate(loan.firstPaymentDate, k), interest, principal })
  }
  return out
}

export function loanStatus(loan: LoanTerms, today: string): LoanStatus {
  const schedule = installmentSchedule(loan)
  const paid = schedule.filter((i) => i.dueDate <= today)
  const principalPaid = paid.reduce((s, i) => s + i.principal, 0)

  return {
    payment: monthlyPayment(loan.amount, loan.aprPct, loan.termMonths),
    paymentsMade: paid.length,
    principalPaid,
    interestPaid: paid.reduce((s, i) => s + i.interest, 0),
    balance: Math.max(0, loan.amount - principalPaid),
    totalInterest: schedule.reduce((s, i) => s + i.interest, 0),
    paidOff: paid.length >= loan.termMonths,
  }
}

export function carRoi(input: CarRoiInput): CarRoi {
  const loan = input.loan ? loanStatus(input.loan, input.today) : null
  const upfront = input.downPayment ?? (input.loan ? 0 : input.purchasePrice ?? 0)
  const cashInvested = upfront + (loan ? loan.payment * loan.paymentsMade : 0)

  const paybackPct = cashInvested > 0 ? Math.round((input.operatingNet / cashInvested) * 100) : null
  const equity = input.currentValue != null ? input.currentValue - (loan?.balance ?? 0) : null
  const returnIfSoldPct =
    equity != null && cashInvested > 0
      ? Math.round(((input.operatingNet + equity - cashInvested) / cashInvested) * 100)
      : null

  const monthsOwned = input.purchaseDate ? Math.max(1, monthsBetween(input.purchaseDate, input.today)) : null
  const avgMonthlyNet = monthsOwned ? input.operatingNet / monthsOwned : null
  const loanActive = loan != null && !loan.paidOff
  const monthlyCashFlow = avgMonthlyNet != null ? avgMonthlyNet - (loanActive ? loan!.payment : 0) : null

  let paybackMonthsLeft: number | null = null
  let remaining = cashInvested - input.operatingNet
  if (remaining <= 0) {
    paybackMonthsLeft = 0
  } else if (avgMonthlyNet != null) {
    for (let m = 1; m <= MAX_PROJECTION_MONTHS; m++) {
      remaining -= avgMonthlyNet
      if (loan && input.loan && loan.paymentsMade + m <= input.loan.termMonths) remaining += loan.payment
      if (remaining <= 0) {
        paybackMonthsLeft = m
        break
      }
    }
  }

  return { loan, cashInvested, paybackPct, equity, returnIfSoldPct, monthlyCashFlow, paybackMonthsLeft }
}
