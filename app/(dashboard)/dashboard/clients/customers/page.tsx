import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/dashboard/PageHeader'
import CustomersTable from './CustomersTable'
import type { Customer } from '@/lib/supabase/types'

export default async function CustomersPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user!.id).single()

  const [{ data: customers }, { data: reservations }] = await Promise.all([
    supabase.from('customers').select('*').eq('tenant_id', profile!.tenant_id).order('name'),
    supabase.from('reservations').select('customer_name, customer_email, customer_phone, total_amount').eq('tenant_id', profile!.tenant_id)
  ])

  const rows = (customers as Customer[]) ?? []

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader title="Customers" description={`${rows.length} total customers`} />
      <div className="glass border border-white/10 rounded-3xl p-6 md:p-8">
        <CustomersTable 
          customers={rows} 
          reservations={reservations ?? []} 
          tenantId={profile!.tenant_id} 
        />
      </div>
    </div>
  )
}
