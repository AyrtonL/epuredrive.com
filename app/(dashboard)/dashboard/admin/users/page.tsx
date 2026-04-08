import { requireSuperuser } from '@/lib/supabase/admin-auth'
import PageHeader from '@/components/dashboard/PageHeader'
import UsersManager from './UsersManager'
import type { Profile, Tenant } from '@/lib/supabase/types'

export default async function AllUsersPage() {
  const { supabase } = await requireSuperuser()

  const [{ data: profiles }, { data: tenants }] = await Promise.all([
    supabase.from('profiles').select('id, full_name, role, tenant_id, created_at').order('created_at', { ascending: false }),
    supabase.from('tenants').select('id, name, brand_name'),
  ])

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-32">
      <PageHeader title="All Users" description={`${(profiles ?? []).length} registered users across all tenants.`} />
      <UsersManager
        profiles={(profiles as Profile[]) ?? []}
        tenants={(tenants as Tenant[]) ?? []}
      />
    </div>
  )
}
