import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import PageHeader from '@/components/dashboard/PageHeader'
import ExtrasManager from './ExtrasManager'
import type { RentalExtra } from '@/lib/supabase/types'

export default async function ExtrasPage() {
  const { supabase, tenantId } = await requireTenantId()

  const { data } = await supabase
    .from('rental_extras')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('sort_order')
    .order('created_at')

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-32">
      <PageHeader
        title="Rental Extras"
        description="Configure add-ons that customers can select during booking (GPS, child seat, insurance, etc.)."
      />
      <ExtrasManager extras={(data as RentalExtra[]) ?? []} />
    </div>
  )
}
