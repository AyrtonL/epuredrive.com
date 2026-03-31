import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/dashboard/PageHeader'
import EmptyState from '@/components/dashboard/EmptyState'
import type { Customer } from '@/lib/supabase/types'

export default async function CustomersPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user!.id).single()

  const { data: customers } = await supabase
    .from('customers')
    .select('*')
    .eq('tenant_id', profile!.tenant_id)
    .order('name')

  const rows = (customers as Customer[]) ?? []

  return (
    <div className="max-w-5xl">
      <PageHeader title="Customers" description={`${rows.length} total`} />
      {rows.length === 0 ? (
        <EmptyState message="No customers yet. They are auto-created from bookings." />
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-white/40 border-b border-white/10">
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Email</th>
                <th className="px-6 py-4 font-medium">Phone</th>
                <th className="px-6 py-4 font-medium">Since</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((c) => (
                <tr key={c.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 text-white font-medium">{c.name}</td>
                  <td className="px-6 py-4 text-white/60">{c.email ?? '—'}</td>
                  <td className="px-6 py-4 text-white/60">{c.phone ?? '—'}</td>
                  <td className="px-6 py-4 text-white/40 text-xs">{c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
