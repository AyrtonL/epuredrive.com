import { redirect } from 'next/navigation'
import { createClient } from './server'

/**
 * Guards admin pages — redirects non-superusers.
 * Returns the supabase client and the superuser's profile id.
 */
export async function requireSuperuser() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'superuser') redirect('/dashboard')

  return { supabase, userId: user.id }
}
