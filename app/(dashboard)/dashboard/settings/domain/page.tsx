import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import { isFeatureEnabled } from '@/lib/supabase/feature-flags'
import { getEffectivePlan, isPlanAtLeast } from '@/lib/plan/effective-plan'
import PageHeader from '@/components/dashboard/PageHeader'
import DomainSettings from './DomainSettings'

/** Minimum plan required for a tenant to configure a custom domain. */
const CUSTOM_DOMAIN_MIN_PLAN = 'pro'

export default async function DomainPage() {
  const { supabase, tenantId } = await requireTenantId()

  const [{ data: tenant }, flagEnabled] = await Promise.all([
    supabase.from('tenants').select('name, slug, brand_name, plan, custom_domain').eq('id', tenantId).single(),
    isFeatureEnabled(tenantId, 'custom_domains'),
  ])

  // `custom_domains` is a single global on/off switch (no per-plan gating in
  // isFeatureEnabled itself), so plan eligibility is enforced separately here.
  const effectivePlan = getEffectivePlan(tenant?.plan)
  const customDomainsEnabled = flagEnabled && isPlanAtLeast(effectivePlan, CUSTOM_DOMAIN_MIN_PLAN)

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-fade-in pb-32">
      <PageHeader title="Custom Domain" description="Configure your public-facing fleet URL and custom domain." />
      <DomainSettings tenant={tenant} customDomainsEnabled={customDomainsEnabled} />
    </div>
  )
}
