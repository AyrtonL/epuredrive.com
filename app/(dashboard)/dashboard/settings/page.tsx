import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/dashboard/PageHeader'
import BrandSettings from './BrandSettings'

export default async function SettingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
  if (!profile?.tenant_id) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <PageHeader title="Settings" description="Tenant profile not found." />
        <div className="glass border border-white/10 rounded-3xl p-8 text-white/40 text-center italic">
          Account setup incomplete. Please contact support.
        </div>
      </div>
    )
  }

  const { data: tenant } = await supabase.from('tenants')
    .select('name, plan, slug, brand_name, primary_color, accent_color')
    .eq('id', profile.tenant_id).single()

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      <PageHeader title="Brand Settings" description="Customize your fleet's name, colors, and public URL." />
      <BrandSettings tenant={tenant} />
    </div>
  )
}
