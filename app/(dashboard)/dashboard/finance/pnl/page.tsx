import Link from 'next/link'
import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import PageHeader from '@/components/dashboard/PageHeader'
import { carDisplayName } from '@/lib/utils/car-display-name'
import { todayISO } from '@/lib/finance/revenue'
import { buildPnl, monthsBack, type PnlMonth } from '@/lib/finance/pnl'

export const dynamic = 'force-dynamic'

interface SearchParams {
  period?: string
}

const PERIODS = [
  { key: '6', label: 'Last 6 months', months: 6 },
  { key: '12', label: 'Last 12 months', months: 12 },
  { key: 'all', label: 'All time', months: null },
] as const

type PeriodKey = (typeof PERIODS)[number]['key']
const DEFAULT_PERIOD: PeriodKey = '12'

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const monthLabel = (m: string) => `${MONTHS_SHORT[Number(m.slice(5, 7)) - 1]} ’${m.slice(2, 4)}`

function fmt(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  const abs = Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 })
  return n < 0 ? `-$${abs}` : `$${abs}`
}
const fmtPct = (n: number | null) => (n == null ? '—' : `${Math.round(n * 100)}%`)
const tone = (n: number) => (n >= 0 ? 'text-emerald-400' : 'text-red-400')

export default async function PnlPage({ searchParams }: { searchParams: SearchParams }) {
  const { supabase, tenantId } = await requireTenantId()
  const periodKey = (PERIODS.some((p) => p.key === searchParams.period) ? searchParams.period : DEFAULT_PERIOD) as PeriodKey
  const period = PERIODS.find((p) => p.key === periodKey)!
  const today = todayISO()

  const [
    { data: reservations },
    { data: transactions },
    { data: financing },
    { data: recurring },
    { data: cars },
  ] = await Promise.all([
    supabase.from('reservations').select('car_id, pickup_date, return_date, status, total_amount').eq('tenant_id', tenantId),
    supabase.from('transactions').select('transaction_date, type, category, amount, car_id').eq('tenant_id', tenantId),
    supabase.from('car_financing').select('car_id, purchase_price, loan_amount, loan_apr, loan_term_months, loan_first_payment_date, current_value').eq('tenant_id', tenantId),
    supabase.from('recurring_expenses').select('amount, frequency, active, end_date').eq('tenant_id', tenantId),
    supabase.from('cars').select('id, make, model, model_full').eq('tenant_id', tenantId),
  ])

  // "All time" starts at the first month with a rental or an expense.
  const firstDates = [
    ...(reservations ?? []).map((r) => r.pickup_date as string | null),
    ...(transactions ?? []).map((t) => t.transaction_date as string | null),
  ].filter((d): d is string => !!d && d <= today)
  const earliest = firstDates.length ? firstDates.reduce((a, b) => (a < b ? a : b)) : today
  const from = period.months == null ? `${earliest.slice(0, 7)}-01` : monthsBack(today.slice(0, 7), period.months - 1)

  const report = buildPnl({
    reservations: reservations ?? [],
    transactions: transactions ?? [],
    financing: financing ?? [],
    recurring: recurring ?? [],
    cars: (cars ?? []).map((c) => ({ id: c.id as number, name: carDisplayName(c) })),
    from,
    today,
  })

  const { totals, breakEven, months } = report
  const hasData = totals.revenue !== 0 || totals.costs !== 0 || totals.principal !== 0

  const summary = [
    { label: 'Earned revenue', value: fmt(totals.revenue), color: 'text-white', note: totals.inProgress > 0 ? `+ ${fmt(totals.inProgress)} on rentals in progress` : 'Completed rentals' },
    { label: 'Operating profit', value: fmt(totals.operatingProfit), color: tone(totals.operatingProfit), note: 'Revenue − maintenance, insurance, interest, other' },
    { label: 'Cash flow', value: fmt(totals.cashFlow), color: tone(totals.cashFlow), note: `After ${fmt(totals.principal)} of loan principal` },
    { label: 'Monthly break-even', value: fmt(breakEven.monthlyCashNeed), color: 'text-white', note: breakEven.monthsUsed.length ? `Avg revenue ${fmt(breakEven.avgRevenue)}/mo (last ${breakEven.monthsUsed.length} closed)` : 'Not enough closed months yet' },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Profit & Loss"
        description="Earned revenue against every recorded cost, month by month and per vehicle — plus the cash you actually kept after loan payments."
      />

      <div className="flex flex-wrap items-center gap-2">
        {PERIODS.map((p) => (
          <Link
            key={p.key}
            href={`/dashboard/finance/pnl?period=${p.key}`}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest border transition-colors ${
              p.key === periodKey
                ? 'bg-white text-black border-white'
                : 'bg-white/[0.04] border-white/[0.10] text-white/60 hover:border-white/25 hover:text-white'
            }`}
          >
            {p.label}
          </Link>
        ))}
        <span className="text-[11px] text-white/40 ml-auto font-light">
          {report.from} → {report.to}
        </span>
      </div>

      {!hasData ? (
        <div className="empty-state">No completed rentals or expenses in this period yet.</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {summary.map((s) => (
              <div key={s.label} className="kpi-card glass border border-white/[0.14] rounded-2xl p-4">
                <div className="text-[10px] font-bold text-white/55 uppercase tracking-widest mb-2">{s.label}</div>
                <div className={`kpi-value font-bold ${s.color}`}>{s.value}</div>
                <div className="text-[11px] text-white/45 mt-1">{s.note}</div>
              </div>
            ))}
          </div>

          <BreakEvenBar
            gap={breakEven.gap}
            avgRevenue={breakEven.avgRevenue}
            loanPayments={breakEven.loanPayments}
            recurring={breakEven.recurring}
            avgMaintenance={breakEven.avgMaintenance}
            monthsUsed={breakEven.monthsUsed}
          />

          <div className="glass border border-white/[0.14] rounded-2xl p-4 md:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
              <h2 className="text-white font-bold text-base">Revenue vs cash out, by month</h2>
              <div className="flex gap-4 text-[11px] text-white/55">
                <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-400" />Revenue</span>
                <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-0.5 bg-red-400" />Cash out (costs + principal)</span>
              </div>
            </div>
            <MonthlyChart months={months} />
          </div>

          <h2 className="text-white font-bold text-base pt-2">Monthly P&amp;L</h2>
          <div className="data-table rounded-2xl">
            <table className="m-cards w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-bold uppercase tracking-widest text-white/55 border-b border-white/[0.10] bg-white/[0.04]">
                  <th className="px-4 py-3">Month</th>
                  <th className="px-4 py-3 text-right">Revenue</th>
                  <th className="px-4 py-3 text-right">Maintenance</th>
                  <th className="px-4 py-3 text-right">Insurance</th>
                  <th className="px-4 py-3 text-right">Interest</th>
                  <th className="px-4 py-3 text-right">Other</th>
                  <th className="px-4 py-3 text-right">Operating</th>
                  <th className="px-4 py-3 text-right">Principal</th>
                  <th className="px-4 py-3 text-right">Cash flow</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.07]">
                {[...months].reverse().map((m) => (
                  <tr key={m.month} className="hover:bg-white/5 transition-colors tabular-nums">
                    <td data-primary className="px-4 py-3 text-white font-medium">
                      {monthLabel(m.month)}
                      {m.month === today.slice(0, 7) && <span className="ml-2 text-[10px] text-white/40 uppercase tracking-widest">to date</span>}
                    </td>
                    <td data-label="Revenue" className="px-4 py-3 text-right text-white">{fmt(m.revenue)}</td>
                    <td data-label="Maintenance" className="px-4 py-3 text-right text-white/65">{m.maintenance ? fmt(m.maintenance) : '—'}</td>
                    <td data-label="Insurance" className="px-4 py-3 text-right text-white/65">{m.insurance ? fmt(m.insurance) : '—'}</td>
                    <td data-label="Interest" className="px-4 py-3 text-right text-white/65">{m.interest ? fmt(m.interest) : '—'}</td>
                    <td data-label="Other" className="px-4 py-3 text-right text-white/65">{m.other ? fmt(m.other) : '—'}</td>
                    <td data-label="Operating" className={`px-4 py-3 text-right font-bold ${tone(m.operatingProfit)}`}>{fmt(m.operatingProfit)}</td>
                    <td data-label="Principal" className="px-4 py-3 text-right text-white/65">{m.principal ? fmt(m.principal) : '—'}</td>
                    <td data-label="Cash flow" className={`px-4 py-3 text-right font-bold ${tone(m.cashFlow)}`}>{fmt(m.cashFlow)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="text-white font-bold text-base pt-2">By vehicle</h2>
          {report.cars.length === 0 ? (
            <div className="empty-state">No vehicle activity in this period.</div>
          ) : (
            <div className="data-table rounded-2xl">
              <table className="m-cards w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] font-bold uppercase tracking-widest text-white/55 border-b border-white/[0.10] bg-white/[0.04]">
                    <th className="px-4 py-3">Vehicle</th>
                    <th className="px-4 py-3 text-right">Revenue</th>
                    <th className="px-4 py-3 text-right">Utilization</th>
                    <th className="px-4 py-3 text-right">$/day</th>
                    <th className="px-4 py-3 text-right">Maint.</th>
                    <th className="px-4 py-3 text-right">Interest</th>
                    <th className="px-4 py-3 text-right">Operating net</th>
                    <th className="px-4 py-3 text-right">Loan / mo</th>
                    <th className="px-4 py-3 text-right">Value</th>
                    <th className="px-4 py-3 text-right">Loan balance</th>
                    <th className="px-4 py-3 text-right">Equity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.07]">
                  {report.cars.map((c) => (
                    <tr key={c.carId} className="hover:bg-white/5 transition-colors tabular-nums">
                      <td data-primary className="px-4 py-3 text-white font-medium">
                        <Link href={`/dashboard/fleet/${c.carId}`} className="hover:underline underline-offset-2">{c.name}</Link>
                      </td>
                      <td data-label="Revenue" className="px-4 py-3 text-right text-white">{fmt(c.revenue)}</td>
                      <td data-label="Utilization" className="px-4 py-3 text-right text-white/80" title={`${c.daysRented} of ${c.daysAvailable} days`}>{fmtPct(c.utilization)}</td>
                      <td data-label="$/day" className="px-4 py-3 text-right text-white/65">{fmt(c.revenuePerDay)}</td>
                      <td data-label="Maintenance" className="px-4 py-3 text-right text-white/65">{c.maintenance ? fmt(c.maintenance) : '—'}</td>
                      <td data-label="Interest" className="px-4 py-3 text-right text-white/65">{c.interest ? fmt(c.interest) : '—'}</td>
                      <td data-label="Operating net" className={`px-4 py-3 text-right font-bold ${tone(c.operatingNet)}`}>{fmt(c.operatingNet)}</td>
                      <td data-label="Loan / mo" className="px-4 py-3 text-right text-white/65">{fmt(c.monthlyPayment)}</td>
                      <td data-label="Value" className="px-4 py-3 text-right text-white/65">{fmt(c.currentValue)}</td>
                      <td data-label="Loan balance" className="px-4 py-3 text-right text-white/65">{fmt(c.loanBalance)}</td>
                      <td data-label="Equity" className={`px-4 py-3 text-right font-bold ${c.equity == null ? 'text-white/40' : tone(c.equity)}`}>{fmt(c.equity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {totals.sharedCosts > 0 && (
                <div className="px-4 md:px-6 py-4 border-t border-white/[0.10] bg-white/[0.03] flex items-center justify-between gap-4 max-md:mt-3 max-md:rounded-2xl max-md:border">
                  <span className="text-[11px] text-white/55 uppercase tracking-widest font-bold">
                    Shared costs (insurance, software, marketing…) — not assigned to a vehicle
                  </span>
                  <span className="text-red-400/80 font-medium text-sm">-{fmt(totals.sharedCosts)}</span>
                </div>
              )}
            </div>
          )}

          <p className="text-[11px] text-white/40 leading-relaxed">
            Revenue counts completed rentals in the month they ended; rentals still out show as “in progress”. Costs come from
            Expenses (maintenance logged on a vehicle is included there automatically). Loan principal is cash, not a cost, so it
            only affects cash flow. Equity uses the current value and loan terms from each vehicle’s financing details.
            Depreciation is not deducted.
          </p>
        </>
      )}
    </div>
  )
}

function BreakEvenBar(props: {
  gap: number
  avgRevenue: number
  loanPayments: number
  recurring: number
  avgMaintenance: number
  monthsUsed: string[]
}) {
  if (!props.monthsUsed.length) return null
  const need = props.loanPayments + props.recurring + props.avgMaintenance
  const ok = props.gap >= 0
  const range = props.monthsUsed.length > 1
    ? `${monthLabel(props.monthsUsed[0])}–${monthLabel(props.monthsUsed[props.monthsUsed.length - 1])}`
    : monthLabel(props.monthsUsed[0])
  return (
    <div className={`glass border rounded-2xl p-4 md:p-5 ${ok ? 'border-emerald-400/30' : 'border-red-400/30'}`}>
      <div className="text-sm text-white">
        {ok ? (
          <>Recent revenue covers your monthly cash needs with <b className="text-emerald-400">{fmt(props.gap)}</b> to spare.</>
        ) : (
          <>Recent revenue is <b className="text-red-400">{fmt(-props.gap)}</b> short of your monthly cash needs.</>
        )}
      </div>
      <div className="text-[12px] text-white/55 mt-1.5 tabular-nums">
        Avg revenue {fmt(props.avgRevenue)}/mo ({range}) vs {fmt(need)}/mo needed: loan payments {fmt(props.loanPayments)} ·
        recurring expenses {fmt(props.recurring)} · avg maintenance {fmt(props.avgMaintenance)}
      </div>
    </div>
  )
}

function MonthlyChart({ months }: { months: PnlMonth[] }) {
  const W = 800
  const H = 240
  const left = 48
  const right = 8
  const top = 10
  const bottom = 26
  const max = Math.max(1, ...months.map((m) => Math.max(m.revenue, m.costs + m.principal)))
  const step = niceStep(max / 4)
  const yMax = Math.ceil(max / step) * step
  const y = (v: number) => top + (H - top - bottom) * (1 - v / yMax)
  const band = (W - left - right) / Math.max(1, months.length)
  const barW = Math.min(32, band * 0.6)
  const cx = (i: number) => left + band * i + band / 2
  const labelEvery = Math.ceil(months.length / 12)
  const ticks = Array.from({ length: Math.round(yMax / step) + 1 }, (_, i) => i * step)
  const line = months.map((m, i) => `${i === 0 ? 'M' : 'L'}${cx(i).toFixed(1)},${y(m.costs + m.principal).toFixed(1)}`).join(' ')

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="block" role="img" aria-label="Monthly revenue and cash out">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={left} x2={W - right} y1={y(t)} y2={y(t)} stroke="rgba(255,255,255,0.08)" />
          <text x={left - 6} y={y(t) + 3} textAnchor="end" fontSize="10" fill="rgba(255,255,255,0.45)">
            {t >= 1000 ? `$${(t / 1000).toFixed(t % 1000 ? 1 : 0)}k` : `$${t}`}
          </text>
        </g>
      ))}
      {months.map((m, i) => (
        <g key={m.month}>
          <rect x={cx(i) - barW / 2} y={y(m.revenue)} width={barW} height={Math.max(0, y(0) - y(m.revenue))} rx={4} fill="rgb(52 211 153)" opacity={0.85}>
            <title>{`${monthLabel(m.month)}: revenue ${fmt(m.revenue)} · cash out ${fmt(m.costs + m.principal)} · cash flow ${fmt(m.cashFlow)}`}</title>
          </rect>
          {i % labelEvery === 0 && (
            <text x={cx(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.45)">{monthLabel(m.month)}</text>
          )}
        </g>
      ))}
      <path d={line} fill="none" stroke="rgb(248 113 113)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {months.map((m, i) => (
        <circle key={m.month} cx={cx(i)} cy={y(m.costs + m.principal)} r={3} fill="rgb(248 113 113)">
          <title>{`${monthLabel(m.month)}: cash out ${fmt(m.costs + m.principal)}`}</title>
        </circle>
      ))}
    </svg>
  )
}

function niceStep(raw: number): number {
  const pow = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1))))
  const n = raw / pow
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow
}
