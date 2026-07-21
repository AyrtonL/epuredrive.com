import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import PageHeader from '@/components/dashboard/PageHeader'
import TaxesClient from './TaxesClient'
import type { Transaction, TaxSetting, Reservation } from '@/lib/supabase/types'

export default async function TaxesPage() {
  const { supabase, tenantId } = await requireTenantId()

  const [{ data: transactions }, { data: taxSettings }, { data: reservations }] = await Promise.all([
    supabase
      .from('transactions')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('transaction_date', { ascending: false }),
    supabase
      .from('tax_settings')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true }),
    // Rental income = completed reservations (the app never writes income
    // transactions, so revenue must come from reservations to avoid a $0 bug).
    supabase
      .from('reservations')
      .select('total_amount, status, pickup_date, return_date')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed'),
  ])

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader title="Taxes" description="Tax settings, estimated liability, and monthly breakdown for your business." />
      <TaxesClient
        transactions={(transactions as Transaction[]) ?? []}
        reservations={(reservations as Reservation[]) ?? []}
        taxSettings={(taxSettings as TaxSetting[]) ?? []}
        tenantId={tenantId}
      />
    </div>
  )
}
