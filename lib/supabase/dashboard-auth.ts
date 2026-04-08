import { redirect } from 'next/navigation'
import { createClient } from './server'

/**
 * Fetches the authenticated user's tenant_id for dashboard pages.
 * Redirects to /login if not authenticated, or /dashboard/settings if profile is incomplete.
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

  if (!profile?.tenant_id) redirect('/dashboard/settings')

  return { supabase, tenantId: profile.tenant_id }
}
