import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import PageHeader from '@/components/dashboard/PageHeader'
import StatCard from '@/components/dashboard/StatCard'
import ExpensesTable from './ExpensesTable'
import type { Transaction, Car } from '@/lib/supabase/types'

export default async function ExpensesPage() {
  const { supabase, tenantId } = await requireTenantId()

  const [{ data: transactions }, { data: cars }] = await Promise.all([
    supabase.from('transactions').select('*').eq('tenant_id', tenantId).order('transaction_date', { ascending: false }),
    supabase.from('cars').select('id, make, model, model_full').eq('tenant_id', tenantId)
  ])

  const rows = (transactions as Transaction[]) ?? []
  const carRows = (cars as Car[]) ?? []
  
  const total = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0)

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader title="Business Expenses" description="Track category-based outgoings and maintenance overhead." />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatCard label="Total Expenses" value={`$${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
        <StatCard label="Total Records" value={rows.length} />
      </div>

      <div className="glass border border-white/10 rounded-3xl p-6 md:p-8">
        <ExpensesTable expenses={rows} cars={carRows} />
      </div>
    </div>
  )
}
