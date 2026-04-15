import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import PageHeader from '@/components/dashboard/PageHeader'
import ChangePasswordForm from './ChangePasswordForm'

export default async function SecurityPage() {
  const { supabase } = await requireTenantId()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-fade-in pb-32">
      <PageHeader
        title="Security"
        description="Manage your password and account security."
      />

      <div className="glass border border-white/10 rounded-3xl p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-white font-bold">Password</h3>
            <p className="text-white/40 text-xs mt-1">
              Signed in as <span className="text-white/60">{user?.email}</span>
            </p>
          </div>
        </div>

        <ChangePasswordForm />
      </div>
    </div>
  )
}
