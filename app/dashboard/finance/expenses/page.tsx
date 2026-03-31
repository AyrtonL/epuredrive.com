import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/dashboard/PageHeader'
import StatCard from '@/components/dashboard/StatCard'
import EmptyState from '@/components/dashboard/EmptyState'
import type { Transaction } from '@/lib/supabase/types'

export default async function ExpensesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user!.id).single()

  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('tenant_id', profile!.tenant_id)
    .order('transaction_date', { ascending: false })

  const rows = (transactions as Transaction[]) ?? []
  const total = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0)

  return (
    <div className="max-w-5xl">
      <PageHeader title="Expenses" />
      <div className="grid grid-cols-2 gap-4 mb-8">
        <StatCard label="Total expenses" value={`$${total.toFixed(0)}`} />
        <StatCard label="Records" value={rows.length} />
      </div>
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        {rows.length === 0 ? (
          <EmptyState message="No expense records." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-white/40 border-b border-white/10">
                  <th className="pb-3 pr-4 font-medium">Date</th>
                  <th className="pb-3 pr-4 font-medium">Category</th>
                  <th className="pb-3 pr-4 font-medium">Description</th>
                  <th className="pb-3 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 pr-4 text-white/60">{r.transaction_date ? new Date(r.transaction_date).toLocaleDateString() : '—'}</td>
                    <td className="py-3 pr-4 text-white/60 capitalize">{r.category ?? '—'}</td>
                    <td className="py-3 pr-4 text-white/60">{r.description ?? '—'}</td>
                    <td className="py-3 text-white font-medium">{r.amount != null ? `$${Number(r.amount).toFixed(2)}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
