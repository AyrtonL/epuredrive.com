import { requireSuperuser } from '@/lib/supabase/admin-auth'
import PageHeader from '@/components/dashboard/PageHeader'
import TenantsManager from './TenantsManager'
import type { Tenant } from '@/lib/supabase/types'

export default async function TenantsPage() {
  const { supabase } = await requireSuperuser()

  const [{ data: tenants }, { data: profileRows }, { data: carCounts }, { data: bookingCounts }, { data: ownerRows }] = await Promise.all([
    supabase.from('tenants').select('*').order('name'),
    supabase.from('profiles').select('tenant_id'),
    supabase.from('cars').select('tenant_id'),
    supabase.from('reservations').select('tenant_id'),
    supabase.rpc('get_tenant_owners'),
  ])

  const rows = (tenants as Tenant[]) ?? []

  const memberCountMap: Record<string, number> = {}
  for (const p of profileRows ?? []) {
    if (p.tenant_id) memberCountMap[p.tenant_id] = (memberCountMap[p.tenant_id] ?? 0) + 1
  }

  const carCountMap: Record<string, number> = {}
  for (const c of carCounts ?? []) {
    if (c.tenant_id) carCountMap[c.tenant_id] = (carCountMap[c.tenant_id] ?? 0) + 1
  }

  const bookingCountMap: Record<string, number> = {}
  for (const b of bookingCounts ?? []) {
    if (b.tenant_id) bookingCountMap[b.tenant_id] = (bookingCountMap[b.tenant_id] ?? 0) + 1
  }

  const ownerMap: Record<string, { name: string; email: string }> = {}
  for (const o of (ownerRows as { tenant_id: string; owner_name: string; owner_email: string }[]) ?? []) {
    ownerMap[o.tenant_id] = { name: o.owner_name, email: o.owner_email }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-32">
      <PageHeader title="Tenants" description={`${rows.length} organizations on the platform.`} />
      <TenantsManager
        tenants={rows}
        memberCounts={memberCountMap}
        carCounts={carCountMap}
        bookingCounts={bookingCountMap}
        owners={ownerMap}
      />
    </div>
  )
}
