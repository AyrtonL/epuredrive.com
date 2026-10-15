import Link from 'next/link'
import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import PageHeader from '@/components/dashboard/PageHeader'
import StatCard from '@/components/dashboard/StatCard'
import ExpensesTable from './ExpensesTable'
import RecurringManager, { type LoanSummary } from './RecurringManager'
import type { Transaction, Car } from '@/lib/supabase/types'
import { formatMoney } from '@/lib/utils/format'
import { todayISO } from '@/lib/finance/revenue'
import { installmentSchedule, loanStatus } from '@/lib/finance/car-roi'
import { carDisplayName } from '@/lib/utils/car-display-name'
import { isOperatingExpense, LOAN_PRINCIPAL_CATEGORY } from '@/lib/expenses/recurring'
import { toRule } from '@/lib/expenses/sync'
import { fetchConsignedCarIds, sortCarsOwnedFirst } from '@/lib/fleet/ownership'

interface Props {
  searchParams?: { tab?: string }
}

export default async function ExpensesPage({ searchParams }: Props) {
  const { supabase, tenantId } = await requireTenantId()
  const tab = searchParams?.tab === 'recurring' ? 'recurring' : 'all'
  const today = todayISO()

  const [{ data: transactions }, { data: cars }, { data: rules }, { data: financing }, consignedIds] = await Promise.all([
    supabase.from('transactions').select('*').eq('tenant_id', tenantId).order('transaction_date', { ascending: false }),
    supabase.from('cars').select('id, make, model, model_full, status').eq('tenant_id', tenantId),
    supabase.from('recurring_expenses').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: true }),
    supabase
      .from('car_financing')
      .select('car_id, loan_amount, loan_apr, loan_term_months, loan_first_payment_date')
      .eq('tenant_id', tenantId)
      .not('loan_amount', 'is', null),
    fetchConsignedCarIds(supabase, tenantId),
  ])

  const rows = (transactions as Transaction[]) ?? []
  const carRows = sortCarsOwnedFirst((cars as Car[]) ?? [], consignedIds)

  // Loan principal is debt repayment: listed, but not part of expenses totals.
  const operatingTotal = rows.filter(isOperatingExpense).reduce((s, r) => s + (Number(r.amount) || 0), 0)
  const principalTotal = rows.filter((r) => r.category === LOAN_PRINCIPAL_CATEGORY).reduce((s, r) => s + (Number(r.amount) || 0), 0)

  const loans: LoanSummary[] = (financing ?? []).map((f) => {
    const terms = { amount: Number(f.loan_amount), aprPct: Number(f.loan_apr), termMonths: Number(f.loan_term_months), firstPaymentDate: f.loan_first_payment_date as string }
    const status = loanStatus(terms, today)
    const car = carRows.find((c) => c.id === f.car_id)
    return {
      carId: f.car_id,
      carName: car ? carDisplayName(car) : `Car #${f.car_id}`,
      payment: status.payment,
      paymentsMade: status.paymentsMade,
      termMonths: terms.termMonths,
      nextDue: installmentSchedule(terms).find((i) => i.dueDate > today)?.dueDate ?? null,
    }
  })

  const tabClass = (active: boolean) =>
    `px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${active ? 'bg-white text-black' : 'text-white/65 hover:text-white hover:bg-white/[0.06]'}`

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader title="Business Expenses" description="One-off and recurring costs. Loan payments are added automatically from each car’s financing." />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Total Expenses" value={formatMoney(operatingTotal)} sub="operating costs, incl. loan interest" />
        <StatCard label="Loan principal paid" value={formatMoney(principalTotal)} sub="debt repayment, not an expense" />
        <StatCard label="Total Records" value={rows.length} />
      </div>

      <div className="flex gap-2">
        <Link href="/dashboard/finance/expenses" className={tabClass(tab === 'all')}>All expenses</Link>
        <Link href="/dashboard/finance/expenses?tab=recurring" className={tabClass(tab === 'recurring')}>
          Recurring{(rules?.length ?? 0) + loans.length > 0 ? ` · ${(rules?.length ?? 0) + loans.length}` : ''}
        </Link>
      </div>

      <div className="glass border border-white/10 rounded-3xl p-6 md:p-8">
        {tab === 'recurring' ? (
          <RecurringManager
            rules={(rules ?? []).map(toRule)}
            loans={loans}
            cars={carRows.filter((c) => c.status !== 'retired')}
            today={today}
          />
        ) : (
          <ExpensesTable expenses={rows} cars={carRows} />
        )}
      </div>
    </div>
  )
}
