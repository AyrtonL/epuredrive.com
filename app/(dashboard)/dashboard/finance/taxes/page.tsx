import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import PageHeader from '@/components/dashboard/PageHeader'
import StatCard from '@/components/dashboard/StatCard'
import type { Transaction } from '@/lib/supabase/types'

const TAX_CATEGORIES = [
  'Sales Tax',
  'Tourism Tax',
  'Rental Surcharge',
  'State Tax',
  'County Tax',
  'Other Tax',
] as const

export default async function TaxesPage() {
  const { supabase, tenantId } = await requireTenantId()

  // Fetch all transactions to compute tax-related figures
  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('transaction_date', { ascending: false })

  const rows = (transactions as Transaction[]) ?? []

  // Split by income vs expense
  const income = rows.filter(r => r.type === 'income')
  const expenses = rows.filter(r => r.type === 'expense')
  const taxExpenses = expenses.filter(r =>
    TAX_CATEGORIES.some(tc => (r.category ?? '').toLowerCase().includes(tc.toLowerCase()))
  )

  const totalIncome = income.reduce((s, r) => s + (Number(r.amount) || 0), 0)
  const totalExpenses = expenses.reduce((s, r) => s + (Number(r.amount) || 0), 0)
  const totalTaxPaid = taxExpenses.reduce((s, r) => s + (Number(r.amount) || 0), 0)
  const netProfit = totalIncome - totalExpenses

  // Group expenses by month for the table
  const monthlyMap = new Map<string, { income: number; expenses: number; tax: number }>()
  for (const r of rows) {
    if (!r.transaction_date) continue
    const month = r.transaction_date.slice(0, 7) // YYYY-MM
    const entry = monthlyMap.get(month) ?? { income: 0, expenses: 0, tax: 0 }
    const amt = Number(r.amount) || 0
    if (r.type === 'income') {
      entry.income += amt
    } else {
      entry.expenses += amt
      if (TAX_CATEGORIES.some(tc => (r.category ?? '').toLowerCase().includes(tc.toLowerCase()))) {
        entry.tax += amt
      }
    }
    monthlyMap.set(month, entry)
  }

  const months = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => b.localeCompare(a))

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader title="Taxes" description="Tax summary, deductions, and monthly breakdown for your business." />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard label="Total Revenue" value={`$${totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
        <StatCard label="Total Expenses" value={`$${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
        <StatCard label="Tax Paid" value={`$${totalTaxPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
        <StatCard label="Net Profit" value={`$${netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
      </div>

      {/* Tax Tips */}
      <div className="glass border border-amber-500/10 rounded-3xl p-6 md:p-8">
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-white font-bold text-sm mb-1">Tax Categorization Tip</h3>
            <p className="text-white/40 text-sm leading-relaxed">
              To see tax-related expenses here, categorize your transactions using tax categories like
              &quot;Sales Tax&quot;, &quot;Tourism Tax&quot;, &quot;Rental Surcharge&quot;, &quot;State Tax&quot;, or &quot;County Tax&quot;
              when adding expenses. This helps you track deductible amounts at tax time.
            </p>
          </div>
        </div>
      </div>

      {/* Monthly Breakdown */}
      <div className="glass border border-white/10 rounded-3xl p-6 md:p-8">
        <h3 className="text-white font-bold mb-6">Monthly Breakdown</h3>
        {months.length === 0 ? (
          <p className="text-white/30 text-sm">No transaction data yet. Add expenses and income in the Expenses page to see your tax breakdown.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] font-black uppercase tracking-widest text-white/30 border-b border-white/5">
                  <th className="text-left py-3 px-2">Month</th>
                  <th className="text-right py-3 px-2">Revenue</th>
                  <th className="text-right py-3 px-2">Expenses</th>
                  <th className="text-right py-3 px-2">Tax Paid</th>
                  <th className="text-right py-3 px-2">Net</th>
                </tr>
              </thead>
              <tbody>
                {months.map(([month, data]) => {
                  const net = data.income - data.expenses
                  const label = new Date(month + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
                  return (
                    <tr key={month} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-2 text-white/70 font-medium">{label}</td>
                      <td className="py-3 px-2 text-right text-emerald-400">${data.income.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="py-3 px-2 text-right text-red-400">${data.expenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="py-3 px-2 text-right text-amber-400">${data.tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className={`py-3 px-2 text-right font-bold ${net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        ${net.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
