import { createClient } from '@/lib/supabase/server'
import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import { getEffectivePlan } from '@/lib/plan/effective-plan'
import AgreementSettings from './AgreementSettings'

export default async function AgreementSettingsPage() {
  const { tenantId } = await requireTenantId()
  const supabase = createClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, brand_name, plan, logo_url, primary_color, company_address, company_phone, agreement_clauses, agreement_template_url')
    .eq('id', tenantId)
    .single()

  // Pass the effective plan so the custom-template gate respects free-launch mode
  const tenantWithEffectivePlan = tenant
    ? { ...tenant, plan: getEffectivePlan(tenant.plan) }
    : null

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-white font-bold text-xl">Rental Agreement</h2>
        <p className="text-white/40 text-sm mt-1">
          Configure your company details and custom clauses shown in every rental agreement.
        </p>
      </div>
      <AgreementSettings tenant={tenantWithEffectivePlan as any} />
    </div>
  )
}
