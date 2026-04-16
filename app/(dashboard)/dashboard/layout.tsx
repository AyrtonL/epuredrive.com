// app/dashboard/layout.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getFeatureFlags } from '@/lib/supabase/feature-flags'
import Sidebar from '@/components/dashboard/Sidebar'
import HelpButton from '@/components/dashboard/HelpButton'
import { notifyInviterOnFirstLogin } from '@/lib/team/invite-notifier'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, tenant_id, full_name, invited_by_user_id, invite_accepted_notified_at')
    .eq('id', user.id)
    .single()

  if (profile?.invited_by_user_id && !profile?.invite_accepted_notified_at) {
    notifyInviterOnFirstLogin({
      memberUserId: user.id,
      memberEmail: user.email ?? '',
      memberName: profile.full_name ?? '',
      inviterUserId: profile.invited_by_user_id,
      role: profile.role ?? 'staff',
      tenantId: profile.tenant_id ?? '',
    }).catch(() => {})
  }

  // Fetch tenant plan and feature flags (only if user has a tenant)
  let plan = 'free'
  let featureFlags: Record<string, boolean> = {}

  if (profile?.tenant_id) {
    const [{ data: tenant }, flags] = await Promise.all([
      supabase.from('tenants').select('plan').eq('id', profile.tenant_id).single(),
      getFeatureFlags(profile.tenant_id, ['turo_sync', 'quickbooks_sync', 'custom_domains', 'api_access', 'webhooks']),
    ])
    plan = tenant?.plan ?? 'free'
    featureFlags = flags
  }

  return (
    <div className="bg-background text-primary min-h-screen selection:bg-white/30 selection:text-white">
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar email={user.email ?? ''} role={profile?.role ?? null} name={profile?.full_name ?? null} featureFlags={featureFlags} />
        <main className="flex-1 overflow-y-auto pt-20 px-6 pb-6 md:pt-10 md:px-10 md:pb-10 lg:px-12 lg:pb-12 relative z-0 bg-dot-pattern">
          <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-hero-glow opacity-35 -z-10 pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-[500px] h-[500px] bg-hero-glow opacity-10 -z-10 pointer-events-none" />
          <div className="animate-fade-in">
            {children}
          </div>
        </main>
      </div>
      <HelpButton plan={plan} />
    </div>
  )
}
