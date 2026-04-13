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
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (profile?.tenant_id) {
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
        full_name: user.email ?? null,
      })

    if (!error) {
      return { supabase, tenantId: meta.tenant_id }
    }
  }

  // No profile and no invite metadata — send to settings to complete setup
  redirect('/dashboard/settings')
}
