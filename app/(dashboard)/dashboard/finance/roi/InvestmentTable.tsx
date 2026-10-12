import Link from 'next/link'
import type { CarRoi } from '@/lib/finance/car-roi'
import { formatMoney } from '@/lib/utils/format'

export interface InvestmentRow {
  carId: number
  name: string
  operatingNet: number
  roi: CarRoi | null
}

interface Props {
  rows: InvestmentRow[]
}

const pct = (n: number | null): string => (n == null ? '—' : `${n}%`)
const money = (n: number | null | undefined): string => (n == null ? '—' : formatMoney(n, { cents: false }))

function paybackLabel(roi: CarRoi): string {
  if (roi.paybackMonthsLeft === 0) return 'Paid back'
  if (roi.paybackMonthsLeft == null) return 'Not at this pace'
  const m = roi.paybackMonthsLeft
  return m >= 24 ? `~${Math.round(m / 12)} yrs` : `~${m} mo`
}

export default function InvestmentTable({ rows }: Props) {
  const withData = rows.filter((r) => r.roi)
  const missing = rows.filter((r) => !r.roi)

  const totals = withData.reduce(
    (t, r) => ({
      invested: t.invested + r.roi!.cashInvested,
      interest: t.interest + (r.roi!.loan?.interestPaid ?? 0),
      balance: t.balance + (r.roi!.loan?.balance ?? 0),
      cashFlow: t.cashFlow + (r.roi!.monthlyCashFlow ?? 0),
    }),
    { invested: 0, interest: 0, balance: 0, cashFlow: 0 },
  )

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-white font-bold text-base">Return on investment</h2>
        <p className="text-[12px] text-white/55 mt-0.5">
          Cash invested = down payment (or full price if paid cash) + loan payments made so far. Paid back = net profit ÷ cash invested.
        </p>
      </div>

      {withData.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Cash invested', value: money(totals.invested), color: 'text-white' },
            { label: 'Interest paid', value: money(totals.interest), color: 'text-red-300' },
            { label: 'Loan balance', value: money(totals.balance), color: 'text-orange-300' },
            { label: 'Cash flow / month', value: money(totals.cashFlow), color: totals.cashFlow >= 0 ? 'text-emerald-400' : 'text-red-400' },
          ].map((s) => (
            <div key={s.label} className="kpi-card glass border border-white/[0.14] rounded-2xl p-4">
              <div className="text-[10px] font-bold text-white/55 uppercase tracking-widest mb-2">{s.label}</div>
              <div className={`kpi-value font-bold ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {withData.length > 0 && (
        <div className="data-table rounded-2xl">
          <table className="m-cards w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-bold uppercase tracking-widest text-white/55 border-b border-white/[0.10] bg-white/[0.04]">
                <th className="px-5 py-4">Vehicle</th>
                <th className="px-5 py-4">Cash invested</th>
                <th className="px-5 py-4">Net profit</th>
                <th className="px-5 py-4">Paid back</th>
                <th className="px-5 py-4">Interest paid</th>
                <th className="px-5 py-4">Loan balance</th>
                <th className="px-5 py-4">Cash flow / mo</th>
                <th className="px-5 py-4">Payback</th>
                <th className="px-5 py-4">If sold today</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.07]">
              {withData.map(({ carId, name, operatingNet, roi }) => (
                <tr key={carId} className="hover:bg-white/5 transition-colors">
                  <td data-primary className="px-5 py-4 text-white font-medium">
                    <Link href={`/dashboard/fleet/${carId}`} className="hover:underline underline-offset-4">{name}</Link>
                  </td>
                  <td data-label="Cash invested" className="px-5 py-4 text-white/80">{money(roi!.cashInvested)}</td>
                  <td data-label="Net profit" className={`px-5 py-4 ${operatingNet >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{money(operatingNet)}</td>
                  <td data-label="Paid back" className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold tabular-nums w-11">{pct(roi!.paybackPct)}</span>
                      <div className="h-1.5 w-16 bg-white/[0.10] rounded-full overflow-hidden max-lg:hidden">
                        <div className={`h-full rounded-full ${(roi!.paybackPct ?? 0) >= 100 ? 'bg-emerald-400' : 'bg-white/70'}`} style={{ width: `${Math.min(100, Math.max(roi!.paybackPct ?? 0, 0))}%` }} />
                      </div>
                    </div>
                  </td>
                  <td data-label="Interest paid" className="px-5 py-4 text-red-300/90">{roi!.loan ? money(roi!.loan.interestPaid) : '—'}</td>
                  <td data-label="Loan balance" className="px-5 py-4 text-orange-300/90">{roi!.loan ? (roi!.loan.paidOff ? 'Paid off' : money(roi!.loan.balance)) : '—'}</td>
                  <td data-label="Cash flow / mo" className={`px-5 py-4 ${(roi!.monthlyCashFlow ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{money(roi!.monthlyCashFlow)}</td>
                  <td data-label="Payback" className="px-5 py-4 text-white/75">{paybackLabel(roi!)}</td>
                  <td data-label="If sold today" className="px-5 py-4 text-white/75" title="Net profit + (current value − loan balance) − cash invested">
                    {roi!.returnIfSoldPct != null ? pct(roi!.returnIfSoldPct) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {missing.length > 0 && (
        <div className="glass rounded-2xl border border-white/[0.10] p-4">
          <div className="text-[12px] text-white/55 mb-2">
            {withData.length === 0 ? 'Add purchase price and loan details to see real ROI:' : 'No purchase info yet:'}
          </div>
          <div className="flex flex-wrap gap-2">
            {missing.map((r) => (
              <Link key={r.carId} href={`/dashboard/fleet/${r.carId}#financing`} className="text-[12px] text-white/80 bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.10] rounded-full px-3 py-1.5 transition-colors">
                {r.name} · Add →
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
