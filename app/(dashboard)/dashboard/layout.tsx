// app/dashboard/layout.tsx
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getFeatureFlags } from '@/lib/supabase/feature-flags'
import Sidebar from '@/components/dashboard/Sidebar'
import HelpButton from '@/components/dashboard/HelpButton'
import SignUpCompleteTracker from '@/components/analytics/SignUpCompleteTracker'
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

  // Fetch tenant plan, branding, and feature flags (only if user has a tenant)
  let plan = 'free'
  let featureFlags: Record<string, boolean> = {}
  let tenantName: string | null = null
  let tenantLogoUrl: string | null = null

  if (profile?.tenant_id) {
    const [{ data: tenant }, flags] = await Promise.all([
      supabase
        .from('tenants')
        .select('plan, name, brand_name, logo_url')
        .eq('id', profile.tenant_id)
        .single(),
      getFeatureFlags(profile.tenant_id, ['turo_sync', 'quickbooks_sync', 'custom_domains', 'api_access', 'webhooks']),
    ])
    plan = tenant?.plan ?? 'free'
    tenantName = tenant?.brand_name || tenant?.name || null
    tenantLogoUrl = tenant?.logo_url || null
    featureFlags = flags
  }

  return (
    <div className="bg-background text-primary min-h-screen selection:bg-white/30 selection:text-white">
      <Suspense fallback={null}>
        <SignUpCompleteTracker />
      </Suspense>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar email={user.email ?? ''} role={profile?.role ?? null} name={profile?.full_name ?? null} tenantName={tenantName} tenantLogoUrl={tenantLogoUrl} featureFlags={featureFlags} />
        <main className="flex-1 overflow-y-auto pt-20 px-6 pb-6 md:pt-10 md:px-10 md:pb-10 lg:px-12 lg:pb-12 relative z-0 bg-dot-pattern">
          <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-hero-glow opacity-35 -z-10 pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-[500px] h-[500px] bg-hero-glow opacity-10 -z-10 pointer-events-none" />
          <Suspense fallback={<DashboardPageSkeleton />}>
            <div className="animate-fade-in">
              {children}
            </div>
          </Suspense>
        </main>
      </div>
      <HelpButton plan={plan} />
    </div>
  )
}

function DashboardPageSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-48 bg-white/5 rounded-lg" />
        <div className="h-4 w-72 bg-white/5 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white/5 border border-white/5 rounded-2xl p-6 space-y-3">
            <div className="h-3 w-20 bg-white/5 rounded" />
            <div className="h-8 w-24 bg-white/5 rounded-lg" />
          </div>
        ))}
      </div>
      <div className="bg-white/5 border border-white/5 rounded-2xl p-6 space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="h-10 w-10 bg-white/5 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 bg-white/5 rounded" />
              <div className="h-3 w-1/2 bg-white/5 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
