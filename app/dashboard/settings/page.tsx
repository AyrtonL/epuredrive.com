import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/dashboard/PageHeader'
import BrandSettings from './BrandSettings'

export default async function SettingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user!.id).single()
  const { data: tenant } = await supabase.from('tenants')
    .select('name, plan, slug, brand_name, primary_color, accent_color')
    .eq('id', profile!.tenant_id).single()

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader title="Brand Settings" description="Customize your fleet's name, colors, and public URL." />
      <BrandSettings tenant={tenant} />
    </div>
  )
}
