// __tests__/lib/car-roi.test.ts
import { carRoi, loanStatus, monthlyPayment } from '@/lib/finance/car-roi'

describe('monthlyPayment', () => {
  it('matches a standard amortized payment', () => {
    // $30,000 at 6% APR for 60 months → $579.98
    expect(monthlyPayment(30000, 6, 60)).toBeCloseTo(579.98, 2)
  })

  it('splits evenly at 0% APR', () => {
    expect(monthlyPayment(12000, 0, 24)).toBe(500)
  })
})

describe('loanStatus', () => {
  const loan = { amount: 30000, aprPct: 6, termMonths: 60, firstPaymentDate: '2026-01-15' }

  it('counts payments whose due date has passed and splits interest from principal', () => {
    const s = loanStatus(loan, '2026-03-20') // Jan 15, Feb 15, Mar 15 paid
    expect(s.paymentsMade).toBe(3)
    expect(s.payment).toBeCloseTo(579.98, 2)
    // month 1 interest = 30000 × 0.5% = 150
    expect(s.interestPaid).toBeGreaterThan(440)
    expect(s.interestPaid).toBeLessThan(450)
    expect(s.principalPaid + s.interestPaid).toBeCloseTo(s.payment * 3, 2)
    expect(s.balance).toBeCloseTo(30000 - s.principalPaid, 2)
    expect(s.paidOff).toBe(false)
  })

  it('reports the total interest over the life of the loan', () => {
    // 60 × 579.98 − 30,000 ≈ 4,798.8 regardless of how far along the loan is
    expect(loanStatus(loan, '2026-03-20').totalInterest).toBeCloseTo(4798.8, 0)
    expect(loanStatus(loan, '2026-01-01').totalInterest).toBeCloseTo(4798.8, 0)
  })

  it('has made no payments before the first due date', () => {
    expect(loanStatus(loan, '2026-01-14')).toMatchObject({ paymentsMade: 0, interestPaid: 0, balance: 30000 })
  })

  it('is paid off after the last payment', () => {
    const s = loanStatus(loan, '2031-06-01')
    expect(s.paymentsMade).toBe(60)
    expect(s.balance).toBeCloseTo(0, 2)
    expect(s.paidOff).toBe(true)
  })

  it('clamps due days to short months', () => {
    const s = loanStatus({ ...loan, firstPaymentDate: '2026-01-31' }, '2026-02-28')
    expect(s.paymentsMade).toBe(2) // Jan 31, Feb 28
  })
})

describe('carRoi', () => {
  const base = { purchaseDate: '2025-10-12', today: '2026-10-12' }

  it('uses down payment plus installments paid as the cash invested', () => {
    const r = carRoi({
      ...base,
      purchasePrice: 35000,
      downPayment: 5000,
      loan: { amount: 30000, aprPct: 6, termMonths: 60, firstPaymentDate: '2025-11-12' },
      currentValue: null,
      operatingNet: 9000,
    })
    // 12 payments made (Nov 12 2025 … Oct 12 2026)
    expect(r.loan?.paymentsMade).toBe(12)
    expect(r.cashInvested).toBeCloseTo(5000 + 12 * 579.98, 0)
    expect(r.paybackPct).toBe(Math.round((9000 / r.cashInvested) * 100))
    expect(r.returnIfSoldPct).toBeNull()
  })

  it('treats a car with no loan and no down payment as bought in cash', () => {
    const r = carRoi({ ...base, purchasePrice: 20000, downPayment: null, loan: null, currentValue: null, operatingNet: 5000 })
    expect(r.cashInvested).toBe(20000)
    expect(r.paybackPct).toBe(25)
    expect(r.monthlyCashFlow).toBeCloseTo(5000 / 12, 2)
  })

  it('adds equity when a current value is known', () => {
    const r = carRoi({ ...base, purchasePrice: 20000, downPayment: null, loan: null, currentValue: 16000, operatingNet: 5000 })
    expect(r.equity).toBe(16000)
    // sold today: 5000 + 16000 − 20000 = +1000 on 20000 invested → 5%
    expect(r.returnIfSoldPct).toBe(5)
  })

  it('subtracts the monthly payment from cash flow while the loan runs', () => {
    const r = carRoi({
      ...base,
      purchasePrice: 35000,
      downPayment: 5000,
      loan: { amount: 30000, aprPct: 6, termMonths: 60, firstPaymentDate: '2025-11-12' },
      currentValue: null,
      operatingNet: 12000, // $1,000/month over 12 months
    })
    expect(r.monthlyCashFlow).toBeCloseTo(1000 - 579.98, 2)
  })

  it('reports months left to pay back, or null when it never pays back', () => {
    const paying = carRoi({ ...base, purchasePrice: 20000, downPayment: null, loan: null, currentValue: null, operatingNet: 6000 })
    // gap 14,000 at $500/month → 28 months
    expect(paying.paybackMonthsLeft).toBe(28)

    const losing = carRoi({
      ...base,
      purchasePrice: 35000,
      downPayment: 5000,
      loan: { amount: 30000, aprPct: 6, termMonths: 600, firstPaymentDate: '2025-11-12' },
      currentValue: null,
      operatingNet: 0,
    })
    expect(losing.paybackMonthsLeft).toBeNull()
  })

  it('is already paid back when earnings exceed cash invested', () => {
    const r = carRoi({ ...base, purchasePrice: 10000, downPayment: null, loan: null, currentValue: null, operatingNet: 12000 })
    expect(r.paybackMonthsLeft).toBe(0)
    expect(r.paybackPct).toBe(120)
  })
})
