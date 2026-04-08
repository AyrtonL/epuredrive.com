import { requireSuperuser } from '@/lib/supabase/admin-auth'
import PageHeader from '@/components/dashboard/PageHeader'
import FlagsManager from './FlagsManager'

export default async function FeatureFlagsPage() {
  const { supabase } = await requireSuperuser()

  const [{ data: flags }, { data: overrides }, { data: tenants }] = await Promise.all([
    supabase
      .from('feature_flags')
      .select('key, label, description, enabled, scope, updated_at')
      .order('key'),
    supabase
      .from('tenant_feature_flags')
      .select('flag_key, tenant_id, enabled'),
    supabase
      .from('tenants')
      .select('id, name, brand_name')
      .order('name'),
  ])

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-fade-in pb-32">
      <PageHeader title="Feature Flags" description="Toggle features globally or per tenant. Changes take effect immediately." />
      <FlagsManager
        flags={flags ?? []}
        overrides={overrides ?? []}
        tenants={(tenants ?? []).map(t => ({ id: t.id, name: t.brand_name || t.name }))}
      />
    </div>
  )
}
