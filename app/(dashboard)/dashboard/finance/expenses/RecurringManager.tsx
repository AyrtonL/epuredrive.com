'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useToast } from '@/components/ui/Toast'
import { carDisplayName } from '@/lib/utils/car-display-name'
import { formatDate, formatMoney } from '@/lib/utils/format'
import { categoryName, nextOccurrence, occurrenceDates, type RecurringFrequency, type RecurringRule } from '@/lib/expenses/recurring'
import { deleteRecurringExpense, saveRecurringExpense } from './recurring-actions'

export interface LoanSummary {
  carId: number
  carName: string
  payment: number
  paymentsMade: number
  termMonths: number
  nextDue: string | null
}

interface CarOption {
  id: number
  make: string
  model: string
  model_full: string | null
}

interface Props {
  rules: RecurringRule[]
  loans: LoanSummary[]
  cars: CarOption[]
  today: string
}

const CATEGORIES: Array<[string, string]> = [
  ['insurance', '🛡️ Insurance'],
  ['registration', '📋 Registration / Tags'],
  ['toll', '🛣️ Toll / Sunpass'],
  ['parking', '🅿️ Parking / Storage'],
  ['software', '💻 Software / Subscriptions'],
  ['marketing', '📣 Marketing'],
  ['office', '🏢 Office & Admin'],
  ['banking', '💳 Banking & Fees'],
  ['other', '📦 Other'],
]

const FREQUENCY_LABEL: Record<RecurringFrequency, string> = { monthly: 'month', quarterly: 'quarter', yearly: 'year' }

const INPUT = 'w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-white/30'
const LABEL = 'block text-[12px] text-white/60 mb-1'

interface Draft {
  id: string | null
  carId: string
  category: string
  description: string
  amount: string
  frequency: RecurringFrequency
  startDate: string
  endDate: string
}

const emptyDraft = (today: string): Draft => ({
  id: null, carId: '', category: 'insurance', description: '', amount: '', frequency: 'monthly', startDate: today, endDate: '',
})

export default function RecurringManager({ rules, loans, cars, today }: Props) {
  const router = useRouter()
  const toast = useToast()
  const [isPending, startTransition] = useTransition()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [error, setError] = useState<string | null>(null)

  const carName = (id: number | null): string => {
    if (id == null) return 'Company-wide'
    const c = cars.find((x) => x.id === id)
    return c ? carDisplayName(c) : `Car #${id}`
  }

  // How many past expenses saving this draft will create — shown before saving.
  const pastCount = useMemo(() => {
    if (!draft || !draft.startDate) return 0
    return occurrenceDates(
      { frequency: draft.frequency, startDate: draft.startDate, endDate: draft.endDate || null, active: true },
      today,
    ).length
  }, [draft, today])

  const monthlyTotal = rules.reduce((s, r) => s + (r.active ? r.amount / ({ monthly: 1, quarterly: 3, yearly: 12 }[r.frequency]) : 0), 0)
    + loans.filter((l) => l.paymentsMade < l.termMonths).reduce((s, l) => s + l.payment, 0)

  function edit(r: RecurringRule) {
    setError(null)
    setDraft({
      id: r.id, carId: r.carId != null ? String(r.carId) : '', category: r.category, description: r.description ?? '',
      amount: String(r.amount), frequency: r.frequency, startDate: r.startDate, endDate: r.endDate ?? '',
    })
  }

  function save(e: React.FormEvent) {
    e.preventDefault()
    if (!draft) return
    const amount = Number(draft.amount.replace(/[$,\s]/g, ''))
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter an amount greater than 0.')
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await saveRecurringExpense(draft.id, {
        carId: draft.carId ? Number(draft.carId) : null,
        category: draft.category,
        description: draft.description.trim() || null,
        amount,
        frequency: draft.frequency,
        startDate: draft.startDate,
        endDate: draft.endDate || null,
      })
      if (result.error) {
        setError(result.error)
        toast.error(result.error)
        return
      }
      toast.success(result.created ? `Saved · ${result.created} expense${result.created === 1 ? '' : 's'} added` : 'Saved')
      setDraft(null)
      router.refresh()
    })
  }

  function remove(r: RecurringRule) {
    if (!confirm(`Stop "${r.description || categoryName(r.category)}"? No new expenses will be created.`)) return
    const removePast = confirm('Also delete the expenses it already created?\n\nOK = delete them · Cancel = keep them in your books')
    startTransition(async () => {
      const result = await deleteRecurringExpense(r.id, removePast)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Recurring expense stopped')
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-white font-bold text-base">Recurring expenses</div>
          <div className="text-[12px] text-white/55">
            Added to Expenses automatically on each due date · {formatMoney(monthlyTotal, { cents: false })}/month in total
          </div>
        </div>
        {!draft && (
          <button onClick={() => { setError(null); setDraft(emptyDraft(today)) }} className="bg-white text-black px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-white/90 transition-all">
            + Add recurring
          </button>
        )}
      </div>

      {draft && (
        <form onSubmit={save} className="rounded-2xl border border-white/[0.14] bg-white/[0.04] p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className={LABEL}>Category</label>
              <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} className={INPUT}>
                {CATEGORIES.map(([v, l]) => <option key={v} value={v} className="bg-[#0d0d0d]">{l}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Vehicle</label>
              <select value={draft.carId} onChange={(e) => setDraft({ ...draft, carId: e.target.value })} className={INPUT}>
                <option value="" className="bg-[#0d0d0d]">Company-wide (no vehicle)</option>
                {cars.map((c) => <option key={c.id} value={c.id} className="bg-[#0d0d0d]">{carDisplayName(c)}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Amount ($)</label>
              <input inputMode="decimal" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} className={INPUT} placeholder="180" required />
            </div>
            <div>
              <label className={LABEL}>Every</label>
              <select value={draft.frequency} onChange={(e) => setDraft({ ...draft, frequency: e.target.value as RecurringFrequency })} className={INPUT}>
                <option value="monthly" className="bg-[#0d0d0d]">Month</option>
                <option value="quarterly" className="bg-[#0d0d0d]">Quarter (3 months)</option>
                <option value="yearly" className="bg-[#0d0d0d]">Year</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={LABEL}>Description</label>
              <input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} className={INPUT} placeholder="e.g. Progressive policy #1234" maxLength={200} />
            </div>
            <div>
              <label className={LABEL}>First charge</label>
              <input type="date" value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} className={INPUT} required />
            </div>
            <div>
              <label className={LABEL}>Ends (optional)</label>
              <input type="date" value={draft.endDate} onChange={(e) => setDraft({ ...draft, endDate: e.target.value })} className={INPUT} />
            </div>
          </div>
          {pastCount > 0 && (
            <p className="text-[12px] text-amber-200/90">
              Saving adds {pastCount} past expense{pastCount === 1 ? '' : 's'} (from {formatDate(draft.startDate)} to today)
              {draft.id ? ', replacing the ones this rule created before' : ''}.
            </p>
          )}
          {error && <p className="text-sm text-red-300">{error}</p>}
          <div className="flex gap-3">
            <button type="submit" disabled={isPending} className="bg-white text-black font-semibold px-5 py-2.5 rounded-xl text-sm hover:bg-white/90 disabled:opacity-50">
              {isPending ? 'Saving…' : draft.id ? 'Save changes' : 'Save'}
            </button>
            <button type="button" onClick={() => setDraft(null)} className="px-5 py-2.5 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/[0.06]">Cancel</button>
          </div>
        </form>
      )}

      {rules.length === 0 && loans.length === 0 && !draft ? (
        <div className="empty-state">No recurring expenses yet. Add insurance, registration or subscriptions once and they’ll be logged every period.</div>
      ) : (
        <ul className="divide-y divide-white/[0.06] rounded-2xl border border-white/[0.10] overflow-hidden">
          {rules.map((r) => {
            const next = nextOccurrence(r, today)
            return (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div className="min-w-0">
                  <div className="text-sm text-white font-medium">{r.description || categoryName(r.category)}</div>
                  <div className="text-[12px] text-white/55">
                    {categoryName(r.category)} · {carName(r.carId)} · since {formatDate(r.startDate)}{r.endDate ? ` until ${formatDate(r.endDate)}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm text-white tabular-nums">{formatMoney(r.amount)}<span className="text-white/50"> / {FREQUENCY_LABEL[r.frequency]}</span></div>
                    <div className="text-[12px] text-white/55">{next ? `Next: ${formatDate(next)}` : 'Ended'}</div>
                  </div>
                  <button onClick={() => edit(r)} className="text-[12px] px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-white/80">Edit</button>
                  <button onClick={() => remove(r)} className="text-[12px] px-3 py-1.5 rounded-lg text-red-300/80 hover:bg-red-500/10">Stop</button>
                </div>
              </li>
            )
          })}
          {loans.map((l) => (
            <li key={`loan-${l.carId}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 bg-white/[0.02]">
              <div className="min-w-0">
                <div className="text-sm text-white font-medium">Loan payment · {l.carName}</div>
                <div className="text-[12px] text-white/55">
                  Automatic from the car’s financing · split into interest and principal · {l.paymentsMade} of {l.termMonths} paid
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm text-white tabular-nums">{formatMoney(l.payment, { cents: 'always' })}<span className="text-white/50"> / month</span></div>
                  <div className="text-[12px] text-white/55">{l.nextDue ? `Next: ${formatDate(l.nextDue)}` : 'Paid off'}</div>
                </div>
                <Link href={`/dashboard/fleet/${l.carId}#financing`} className="text-[12px] px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-white/80">Edit loan</Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
