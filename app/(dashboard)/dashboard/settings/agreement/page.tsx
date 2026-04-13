import { createClient } from '@/lib/supabase/server'
import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import AgreementSettings from './AgreementSettings'

export default async function AgreementSettingsPage() {
  const { tenantId } = await requireTenantId()
  const supabase = createClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, brand_name, plan, company_address, company_phone, agreement_clauses, agreement_template_url')
    .eq('id', tenantId)
    .single()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-white font-bold text-xl">Rental Agreement</h2>
        <p className="text-white/40 text-sm mt-1">
          Configure your company details and custom clauses shown in every rental agreement.
        </p>
      </div>
      <AgreementSettings tenant={tenant as any} />
    </div>
  )
}
