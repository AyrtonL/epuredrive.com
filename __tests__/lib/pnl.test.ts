// __tests__/lib/pnl.test.ts
import { buildPnl, expenseGroup, monthRange, monthsBack, nightsBetween } from '@/lib/finance/pnl'

const cars = [
  { id: 1, name: 'Audi Q3' },
  { id: 3, name: 'Porsche Cayenne' },
]

describe('helpers', () => {
  it('lists months inclusively across a year boundary', () => {
    expect(monthRange('2025-11', '2026-02')).toEqual(['2025-11', '2025-12', '2026-01', '2026-02'])
  })

  it('steps back months across a year boundary', () => {
    expect(monthsBack('2026-02', 3)).toBe('2025-11-01')
    expect(monthsBack('2026-10', 11)).toBe('2025-11-01')
  })

  it('counts nights, never negative', () => {
    expect(nightsBetween('2026-03-01', '2026-03-05')).toBe(4)
    expect(nightsBetween('2026-03-05', '2026-03-01')).toBe(0)
  })

  it('groups categories regardless of casing', () => {
    expect(expenseGroup('Maintenance')).toBe('maintenance')
    expect(expenseGroup('maintenance')).toBe('maintenance')
    expect(expenseGroup('insurance')).toBe('insurance')
    expect(expenseGroup('loan_interest')).toBe('interest')
    expect(expenseGroup('loan_principal')).toBe('principal')
    expect(expenseGroup('Marketing')).toBe('other')
    expect(expenseGroup(null)).toBe('other')
  })
})

describe('buildPnl', () => {
  const base = {
    financing: [],
    recurring: [],
    cars,
    from: '2026-08-01',
    today: '2026-10-15',
  }

  it('counts completed rentals in the month they ended and keeps active ones apart', () => {
    const r = buildPnl({
      ...base,
      reservations: [
        // spans Aug → Sep: earned in September
        { car_id: 3, pickup_date: '2026-08-28', return_date: '2026-09-02', status: 'completed', total_amount: 1000 },
        { car_id: 1, pickup_date: '2026-08-10', return_date: '2026-08-12', status: 'completed', total_amount: '200' },
        // still out: not revenue
        { car_id: 1, pickup_date: '2026-10-01', return_date: '2026-11-10', status: 'active', total_amount: 1800 },
        // future and cancelled: ignored
        { car_id: 3, pickup_date: '2026-12-01', return_date: '2026-12-05', status: 'confirmed', total_amount: 900 },
        { car_id: 3, pickup_date: '2026-09-10', return_date: '2026-09-12', status: 'cancelled', total_amount: 500 },
      ],
      transactions: [],
    })
    const m = Object.fromEntries(r.months.map((x) => [x.month, x.revenue]))
    expect(m).toEqual({ '2026-08': 200, '2026-09': 1000, '2026-10': 0 })
    expect(r.totals.revenue).toBe(1200)
    expect(r.totals.inProgress).toBe(1800)
  })

  it('treats principal as cash only and splits shared vs per-car costs', () => {
    const r = buildPnl({
      ...base,
      reservations: [
        { car_id: 3, pickup_date: '2026-09-01', return_date: '2026-09-04', status: 'completed', total_amount: 900 },
      ],
      transactions: [
        { transaction_date: '2026-09-03', type: 'expense', category: 'loan_interest', amount: 400, car_id: 3 },
        { transaction_date: '2026-09-03', type: 'expense', category: 'loan_principal', amount: 550, car_id: 3 },
        { transaction_date: '2026-09-20', type: 'expense', category: 'Maintenance', amount: 100, car_id: 3 },
        { transaction_date: '2026-09-21', type: 'expense', category: 'insurance', amount: 800, car_id: null },
        // outside the window and non-expense rows are ignored
        { transaction_date: '2026-07-01', type: 'expense', category: 'maintenance', amount: 5000, car_id: 1 },
        { transaction_date: '2026-09-05', type: 'income', category: 'rental', amount: 999, car_id: 3 },
      ],
    })
    const sep = r.months.find((x) => x.month === '2026-09')!
    expect(sep.costs).toBe(400 + 100 + 800)
    expect(sep.operatingProfit).toBe(900 - 1300)
    expect(sep.principal).toBe(550)
    expect(sep.cashFlow).toBe(900 - 1300 - 550)
    expect(r.totals.sharedCosts).toBe(800)

    const cay = r.cars.find((c) => c.carId === 3)!
    expect(cay.operatingNet).toBe(900 - 400 - 100)
    expect(cay.principal).toBe(550)
    // Q3 had no activity in the window → hidden
    expect(r.cars.find((c) => c.carId === 1)).toBeUndefined()
  })

  it('measures utilization from the first rental, capped at today', () => {
    const r = buildPnl({
      ...base,
      reservations: [
        { car_id: 1, pickup_date: '2026-09-15', return_date: '2026-09-25', status: 'completed', total_amount: 300 },
        // in progress past today: counted only through today
        { car_id: 1, pickup_date: '2026-10-05', return_date: '2026-11-10', status: 'active', total_amount: 900 },
      ],
      transactions: [],
    })
    const q3 = r.cars.find((c) => c.carId === 1)!
    expect(q3.daysRented).toBe(10 + 10)
    expect(q3.daysAvailable).toBe(30) // Sep 15 → Oct 15
    expect(q3.utilization).toBeCloseTo(20 / 30, 5)
    expect(q3.revenuePerDay).toBeCloseTo(300 / 20, 5)
  })

  it('computes loan balance, equity and break-even from financing and recurring rules', () => {
    const r = buildPnl({
      ...base,
      reservations: [
        { car_id: 3, pickup_date: '2026-08-01', return_date: '2026-08-11', status: 'completed', total_amount: 3000 },
        { car_id: 3, pickup_date: '2026-09-01', return_date: '2026-09-11', status: 'completed', total_amount: 1500 },
      ],
      transactions: [
        { transaction_date: '2026-08-15', type: 'expense', category: 'maintenance', amount: 600, car_id: 3 },
      ],
      financing: [
        { car_id: 3, purchase_price: 30000, loan_amount: 30000, loan_apr: 6, loan_term_months: 60, loan_first_payment_date: '2026-01-15', current_value: 25000 },
      ],
      recurring: [
        { amount: 800, frequency: 'monthly', active: true, end_date: null },
        { amount: 1200, frequency: 'yearly', active: true, end_date: null },
        { amount: 999, frequency: 'monthly', active: false, end_date: null },
      ],
    })
    const cay = r.cars.find((c) => c.carId === 3)!
    expect(cay.monthlyPayment).toBeCloseTo(579.98, 2)
    expect(cay.loanBalance!).toBeLessThan(30000)
    expect(cay.equity!).toBeCloseTo(25000 - cay.loanBalance!, 2)

    // closed months in window: Aug, Sep
    expect(r.breakEven.monthsUsed).toEqual(['2026-08', '2026-09'])
    expect(r.breakEven.avgRevenue).toBe(2250)
    expect(r.breakEven.recurring).toBe(800 + 100)
    expect(r.breakEven.avgMaintenance).toBe(300)
    expect(r.breakEven.monthlyCashNeed).toBeCloseTo(579.98 + 900 + 300, 2)
    expect(r.breakEven.gap).toBeCloseTo(2250 - r.breakEven.monthlyCashNeed, 5)
  })
})
