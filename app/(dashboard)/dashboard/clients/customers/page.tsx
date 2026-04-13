import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import PageHeader from '@/components/dashboard/PageHeader'
import StatCard from '@/components/dashboard/StatCard'
import CustomersTable from './CustomersTable'
import type { Customer } from '@/lib/supabase/types'

export default async function CustomersPage() {
  const { supabase, tenantId } = await requireTenantId()

  const [{ data: customers }, { data: reservations }] = await Promise.all([
    supabase.from('customers').select('*').eq('tenant_id', tenantId).order('name'),
    supabase.from('reservations').select('customer_name, customer_email, customer_phone, total_amount').eq('tenant_id', tenantId)
  ])

  const rows = (customers as Customer[]) ?? []
  const resRows = reservations ?? []
  const totalLTV = resRows.reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0)

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader title="Customers" description="Your customer database and lifetime value." />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Total Customers" value={rows.length} />
        <StatCard label="Total Bookings" value={resRows.length} />
        <StatCard label="Total Revenue" value={`$${totalLTV.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} sub="from all reservations" />
      </div>
      <div className="glass border border-white/10 rounded-3xl p-6 md:p-8">
        <CustomersTable
          customers={rows}
          reservations={resRows}
          tenantId={tenantId}
        />
      </div>
    </div>
  )
}
