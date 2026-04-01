import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/dashboard/PageHeader'
import CustomersTable from './CustomersTable'
import type { Customer } from '@/lib/supabase/types'

export default async function CustomersPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user!.id).single()

  const { data: customers } = await supabase
    .from('customers').select('*').eq('tenant_id', profile!.tenant_id).order('name')

  const rows = (customers as Customer[]) ?? []

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader title="Customers" description={`${rows.length} total customers`} />
      <div className="glass border border-white/10 rounded-3xl p-6 md:p-8">
        <CustomersTable customers={rows} />
      </div>
    </div>
  )
}
