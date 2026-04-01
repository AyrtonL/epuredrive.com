import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/dashboard/PageHeader'
import BrandSettings from './BrandSettings'

export default async function SettingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile, error: profileErr } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
  
  if (profileErr || !profile?.tenant_id) {
    return (
      <div className="max-w-4xl mx-auto py-20 px-6">
        <PageHeader title="Settings" description="System configuration." />
        <div className="mt-12 flex flex-col items-center justify-center p-12 glass border border-white/10 rounded-[2.5rem] text-center space-y-4">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-400">
             <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          </div>
          <h2 className="text-xl font-bold text-white">Profile Incomplete</h2>
          <p className="text-white/40 max-w-sm text-sm">We couldn't find a tenant associated with your account. Please contact support to finalize your onboarding.</p>
        </div>
      </div>
    )
  }

  const { data: tenant, error: tenantErr } = await supabase.from('tenants').select('*').eq('id', profile.tenant_id).single()
  
  if (tenantErr || !tenant) {
    return (
      <div className="max-w-4xl mx-auto py-20 px-6">
        <PageHeader title="Settings" description="System configuration." />
        <div className="mt-12 flex flex-col items-center justify-center p-12 glass border border-white/10 rounded-[2.5rem] text-center space-y-4">
          <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center text-orange-400">
             <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <h2 className="text-xl font-bold text-white">Tenant Not Found</h2>
          <p className="text-white/40 max-w-sm text-sm">The organization assigned to your profile is currently unavailable or has been deactivated.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-fade-in pb-32">
      <PageHeader title="Settings" description="Manage your brand identity and financial configuration." />
      <BrandSettings tenant={tenant} />
    </div>
  )
}
