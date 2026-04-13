import { redirect } from 'next/navigation'
import { createClient } from './server'

/**
 * Fetches the authenticated user's tenant_id for dashboard pages.
 * - Redirects to /login if not authenticated.
 * - If the user has no profile but has invite metadata (tenant_id + role in
 *   user_metadata), auto-creates the profile and returns the tenant_id.
 * - Redirects to /dashboard/settings if profile is still incomplete after that.
 */
export async function requireTenantId(): Promise<{ supabase: ReturnType<typeof createClient>; tenantId: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id, full_name')
    .eq('id', user.id)
    .single()

  if (profile?.tenant_id) {
    // Force name collection for invited users who haven't completed onboarding
    if (!profile.full_name) redirect('/dashboard/onboarding')
    return { supabase, tenantId: profile.tenant_id }
  }

  // No profile yet — check if this is an invited user with metadata
  const meta = user.user_metadata as { tenant_id?: string; role?: string } | undefined
  if (meta?.tenant_id && meta?.role) {
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        tenant_id: meta.tenant_id,
        role: meta.role,
        full_name: null, // Set during onboarding
      })

    if (!error) {
      redirect('/dashboard/onboarding')
    }
  }

  // No profile and no invite metadata — send to settings to complete setup
  redirect('/dashboard/settings')
}
