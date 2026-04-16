import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import PageHeader from '@/components/dashboard/PageHeader'
import TaxesClient from './TaxesClient'
import type { Transaction, TaxSetting } from '@/lib/supabase/types'

export default async function TaxesPage() {
  const { supabase, tenantId } = await requireTenantId()

  const [{ data: transactions }, { data: taxSettings }] = await Promise.all([
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
  ])

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader title="Taxes" description="Tax settings, estimated liability, and monthly breakdown for your business." />
      <TaxesClient
        transactions={(transactions as Transaction[]) ?? []}
        taxSettings={(taxSettings as TaxSetting[]) ?? []}
        tenantId={tenantId}
      />
    </div>
  )
}
