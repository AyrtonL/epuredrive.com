'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/Toast'
import { monthlyPayment, loanStatus } from '@/lib/finance/car-roi'
import { formatMoney } from '@/lib/utils/format'
import { saveCarFinancing } from './financing-actions'

export interface FinancingValues {
  purchasePrice: number | null
  purchaseDate: string | null
  downPayment: number | null
  loanAmount: number | null
  loanAprPct: number | null
  loanTermMonths: number | null
  loanFirstPaymentDate: string | null
  currentValue: number | null
  currentValueAsOf: string | null
}

interface Props {
  carId: number
  initial: FinancingValues | null
  today: string
}

const INPUT = 'w-full bg-white/5 border border-white/10 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-white/30'
const LABEL = 'block text-sm text-white/60 mb-1'

const str = (n: number | null | undefined): string => (n == null ? '' : String(n))
const num = (s: string): number | null => {
  const t = s.replace(/[$,\s]/g, '')
  if (!t) return null
  const n = Number(t)
  return Number.isFinite(n) ? n : NaN
}

export default function FinancingForm({ carId, initial, today }: Props) {
  const router = useRouter()
  const toast = useToast()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [price, setPrice] = useState(str(initial?.purchasePrice))
  const [purchaseDate, setPurchaseDate] = useState(initial?.purchaseDate ?? '')
  const [down, setDown] = useState(str(initial?.downPayment))
  const [financed, setFinanced] = useState(initial?.loanAmount != null)
  const [loanAmount, setLoanAmount] = useState(str(initial?.loanAmount))
  // Until the user types a loan amount, keep it at price − down payment.
  const [loanTouched, setLoanTouched] = useState(initial?.loanAmount != null)
  const [apr, setApr] = useState(str(initial?.loanAprPct))
  const [term, setTerm] = useState(str(initial?.loanTermMonths))
  const [firstPayment, setFirstPayment] = useState(initial?.loanFirstPaymentDate ?? '')
  const [value, setValue] = useState(str(initial?.currentValue))
  const [valueAsOf, setValueAsOf] = useState(initial?.currentValueAsOf ?? today)

  const suggestedLoan = useMemo(() => {
    const p = num(price)
    const d = num(down) ?? 0
    if (p == null || Number.isNaN(p) || Number.isNaN(d)) return ''
    return String(Math.max(0, p - d))
  }, [price, down])
  const effectiveLoanAmount = loanTouched ? loanAmount : suggestedLoan

  // Live preview of the installment and where the loan stands today.
  const preview = useMemo(() => {
    const a = num(effectiveLoanAmount)
    const r = num(apr)
    const n = num(term)
    if (!financed || a == null || r == null || n == null || [a, r, n].some(Number.isNaN) || a <= 0 || n < 1) return null
    const payment = monthlyPayment(a, r, Math.round(n))
    const status = firstPayment ? loanStatus({ amount: a, aprPct: r, termMonths: Math.round(n), firstPaymentDate: firstPayment }, today) : null
    return { payment, totalInterest: payment * Math.round(n) - a, status }
  }, [financed, effectiveLoanAmount, apr, term, firstPayment, today])


  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const fields = { price: num(price), down: num(down), value: num(value), loanAmount: num(effectiveLoanAmount), apr: num(apr), term: num(term) }
    if (Object.values(fields).some((v) => Number.isNaN(v))) {
      setError('Amounts must be numbers.')
      return
    }
    if (financed && (fields.loanAmount == null || fields.apr == null || fields.term == null || !firstPayment)) {
      setError('Fill in loan amount, APR, term and first payment date — or turn off "Financed".')
      return
    }

    startTransition(async () => {
      const result = await saveCarFinancing(carId, {
        purchasePrice: fields.price,
        purchaseDate: purchaseDate || null,
        downPayment: fields.down,
        loan: financed
          ? { amount: fields.loanAmount!, aprPct: fields.apr!, termMonths: Math.round(fields.term!), firstPaymentDate: firstPayment }
          : null,
        currentValue: fields.value,
        currentValueAsOf: fields.value != null ? valueAsOf || today : null,
      })
      if (result.error) {
        setError(result.error)
        toast.error(result.error)
        return
      }
      toast.success('Purchase & financing saved')
      router.refresh()
    })
  }

  return (
    <form id="financing" onSubmit={submit} className="glass rounded-2xl border border-white/[0.10] p-5 md:p-6 space-y-5 mb-10 scroll-mt-6">
      <div>
        <h2 className="text-white font-bold text-base">Purchase & financing</h2>
        <p className="text-[12px] text-white/55 mt-0.5">Private to your team. Used for real ROI, loan balance and equity.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className={LABEL}>Purchase price ($)</label>
          <input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} className={INPUT} placeholder="35000" />
        </div>
        <div>
          <label className={LABEL}>Purchase date</label>
          <input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} className={INPUT} />
        </div>
        <div>
          <label className={LABEL}>Down payment ($)</label>
          <input inputMode="decimal" value={down} onChange={(e) => setDown(e.target.value)} className={INPUT} placeholder={financed ? '5000' : 'Paid in full'} />
        </div>
      </div>

      <label className="flex items-center gap-2.5 text-sm text-white/80 cursor-pointer select-none">
        <input type="checkbox" checked={financed} onChange={(e) => setFinanced(e.target.checked)} className="w-4 h-4 accent-white" />
        Financed with a loan
      </label>

      {financed && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className={LABEL}>Loan amount ($)</label>
              <input inputMode="decimal" value={effectiveLoanAmount} onChange={(e) => { setLoanTouched(true); setLoanAmount(e.target.value) }} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>APR (%)</label>
              <input inputMode="decimal" value={apr} onChange={(e) => setApr(e.target.value)} className={INPUT} placeholder="6.5" />
            </div>
            <div>
              <label className={LABEL}>Term (months)</label>
              <input inputMode="numeric" value={term} onChange={(e) => setTerm(e.target.value)} className={INPUT} placeholder="60" />
            </div>
            <div>
              <label className={LABEL}>First payment</label>
              <input type="date" value={firstPayment} onChange={(e) => setFirstPayment(e.target.value)} className={INPUT} />
            </div>
          </div>
          {preview && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[12px]">
              <div className="rounded-xl bg-white/[0.04] px-3 py-2.5"><div className="text-white/55">Monthly payment</div><div className="text-white font-semibold text-sm tabular-nums">{formatMoney(preview.payment, { cents: 'always' })}</div></div>
              <div className="rounded-xl bg-white/[0.04] px-3 py-2.5"><div className="text-white/55">Total interest</div><div className="text-white font-semibold text-sm tabular-nums">{formatMoney(preview.totalInterest, { cents: false })}</div></div>
              {preview.status && (
                <>
                  <div className="rounded-xl bg-white/[0.04] px-3 py-2.5"><div className="text-white/55">Paid so far</div><div className="text-white font-semibold text-sm tabular-nums">{preview.status.paymentsMade} of {Math.round(num(term) ?? 0)}</div></div>
                  <div className="rounded-xl bg-white/[0.04] px-3 py-2.5"><div className="text-white/55">Balance today</div><div className="text-white font-semibold text-sm tabular-nums">{formatMoney(preview.status.balance, { cents: false })}</div></div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className={LABEL}>Current value ($, optional)</label>
          <input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} className={INPUT} placeholder="e.g. Kelley Blue Book" />
        </div>
        <div>
          <label className={LABEL}>Value as of</label>
          <input type="date" value={valueAsOf} onChange={(e) => setValueAsOf(e.target.value)} className={INPUT} disabled={!value} />
        </div>
      </div>

      {error && <p className="text-sm text-red-300">{error}</p>}
      <button type="submit" disabled={isPending} className="bg-white text-black font-semibold px-6 py-2.5 rounded-xl text-sm hover:bg-white/90 disabled:opacity-50 transition-colors">
        {isPending ? 'Saving…' : 'Save financing'}
      </button>
    </form>
  )
}
