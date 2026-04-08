import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import PageHeader from '@/components/dashboard/PageHeader'
import TeamManager from './TeamManager'
import type { Profile } from '@/lib/supabase/types'

export default async function TeamPage() {
  const { supabase, tenantId } = await requireTenantId()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: members } = await supabase
    .from('profiles').select('id, full_name, role, created_at').eq('tenant_id', tenantId).order('created_at')

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader title="Team" description="Manage members and roles with dashboard access." />
      <div className="glass border border-white/10 rounded-3xl p-6 md:p-8">
        <TeamManager members={(members as Profile[]) ?? []} currentUserId={user!.id} />
      </div>
    </div>
  )
}
