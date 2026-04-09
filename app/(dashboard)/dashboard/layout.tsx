// app/dashboard/layout.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getFeatureFlags } from '@/lib/supabase/feature-flags'
import Sidebar from '@/components/dashboard/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()

  // Fetch feature flags for sidebar gating (only if user has a tenant)
  const featureFlags = profile?.tenant_id
    ? await getFeatureFlags(profile.tenant_id, ['turo_sync', 'custom_domains', 'api_access', 'webhooks'])
    : {}

  return (
    <div className="bg-background text-primary min-h-screen selection:bg-white/30 selection:text-white">
      <div className="flex h-screen overflow-hidden bg-black">
        <Sidebar email={user.email ?? ''} role={profile?.role ?? null} featureFlags={featureFlags} />
        <main className="flex-1 overflow-y-auto pt-20 px-6 pb-6 md:pt-10 md:px-10 md:pb-10 lg:px-12 lg:pb-12 relative z-0">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-hero-glow opacity-30 -z-10 pointer-events-none" />
          <div className="animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
