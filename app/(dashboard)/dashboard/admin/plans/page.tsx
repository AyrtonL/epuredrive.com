import { requireSuperuser } from '@/lib/supabase/admin-auth'
import PageHeader from '@/components/dashboard/PageHeader'
import PlansManager from './PlansManager'

export default async function AdminPlansPage() {
  const { supabase } = await requireSuperuser()

  const { data: tenants } = await supabase.from('tenants').select('id, name, brand_name, plan')

  const tenantRows = tenants ?? []
  const planCounts: Record<string, number> = {}
  for (const t of tenantRows) {
    const p = t.plan || 'free'
    planCounts[p] = (planCounts[p] ?? 0) + 1
  }

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-fade-in pb-32">
      <PageHeader title="Plans & Billing" description="Configure plan tiers, pricing, and tenant limits." />
      <PlansManager
        planCounts={planCounts}
        tenants={tenantRows.map(t => ({ id: t.id, name: t.brand_name || t.name, plan: t.plan || 'free' }))}
      />
    </div>
  )
}
