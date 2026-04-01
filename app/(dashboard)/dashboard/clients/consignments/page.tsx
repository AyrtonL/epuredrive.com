import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/dashboard/PageHeader'
import ConsignmentsManager from './ConsignmentsManager'
import type { Consignment, Car, Reservation } from '@/lib/supabase/types'

export default async function ConsignmentsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user!.id).single()
  const tenantId = profile!.tenant_id

  const [{ data: consignments }, { data: cars }, { data: reservations }, { data: transactions }] = await Promise.all([
    supabase.from('consignments').select('*').eq('tenant_id', tenantId).order('owner_name'),
    supabase.from('cars').select('id, make, model, model_full').eq('tenant_id', tenantId),
    supabase.from('reservations').select('*').eq('tenant_id', tenantId),
    supabase.from('transactions').select('*').eq('tenant_id', tenantId)
  ])

  const rows = (consignments as Consignment[]) ?? []

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader title="Consignments" description="Manage revenue splits for third-party vehicle owners." />
      <ConsignmentsManager 
        consignments={rows} 
        cars={(cars as Car[]) ?? []} 
        reservations={(reservations as Reservation[]) ?? []} 
        expenses={(transactions as any[]) ?? []}
      />
    </div>
  )
}
