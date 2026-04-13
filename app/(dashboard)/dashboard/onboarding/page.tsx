import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import OnboardingForm from './OnboardingForm'

export default async function OnboardingPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, tenant_id')
    .eq('id', user.id)
    .single()

  // Already completed onboarding → go to dashboard
  if (profile?.full_name) redirect('/dashboard')
  // No profile at all → can't onboard yet
  if (!profile?.tenant_id) redirect('/login')

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <OnboardingForm email={user.email ?? ''} />
    </div>
  )
}
