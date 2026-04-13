import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import { isFeatureEnabled } from '@/lib/supabase/feature-flags'
import PageHeader from '@/components/dashboard/PageHeader'
import DomainSettings from './DomainSettings'

export default async function DomainPage() {
  const { supabase, tenantId } = await requireTenantId()

  const [{ data: tenant }, customDomainsEnabled] = await Promise.all([
    supabase.from('tenants').select('name, slug, brand_name, plan, custom_domain').eq('id', tenantId).single(),
    isFeatureEnabled(tenantId, 'custom_domains'),
  ])

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-fade-in pb-32">
      <PageHeader title="Custom Domain" description="Configure your public-facing fleet URL and custom domain." />
      <DomainSettings tenant={tenant} customDomainsEnabled={customDomainsEnabled} />
    </div>
  )
}
