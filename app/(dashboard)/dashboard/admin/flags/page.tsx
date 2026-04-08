import { requireSuperuser } from '@/lib/supabase/admin-auth'
import PageHeader from '@/components/dashboard/PageHeader'
import FlagsManager from './FlagsManager'

export default async function FeatureFlagsPage() {
  const { supabase } = await requireSuperuser()

  const { data: flags } = await supabase
    .from('feature_flags')
    .select('key, label, description, enabled, scope, updated_at')
    .order('key')

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-fade-in pb-32">
      <PageHeader title="Feature Flags" description="Toggle features globally or per tenant. Changes take effect immediately." />
      <FlagsManager flags={flags ?? []} />
    </div>
  )
}
