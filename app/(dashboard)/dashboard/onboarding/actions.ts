'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function completeOnboarding(
  firstName: string,
  lastName: string
): Promise<{ error: string } | never> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const first = firstName.trim()
  const last = lastName.trim()

  if (!first || !last) {
    return { error: 'First name and last name are required.' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ full_name: `${first} ${last}` })
    .eq('id', user.id)

  if (error) {
    return { error: 'Could not save your name. Please try again.' }
  }

  redirect('/dashboard')
}
