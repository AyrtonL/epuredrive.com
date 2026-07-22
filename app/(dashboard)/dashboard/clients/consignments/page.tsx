import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import PageHeader from '@/components/dashboard/PageHeader'
import ConsignmentsManager from './ConsignmentsManager'
import type { Consignment, ConsignmentOwner, Car, Reservation, Transaction } from '@/lib/supabase/types'

export default async function ConsignmentsPage() {
  const { supabase, tenantId } = await requireTenantId()

  const [{ data: owners }, { data: consignments }, { data: cars }, { data: reservations }, { data: transactions }] = await Promise.all([
    supabase.from('consignment_owners').select('*').eq('tenant_id', tenantId).order('name'),
    supabase.from('consignments').select('*').eq('tenant_id', tenantId),
    supabase.from('cars').select('id, make, model, model_full').eq('tenant_id', tenantId),
    supabase.from('reservations').select('*').eq('tenant_id', tenantId),
    supabase.from('transactions').select('*').eq('tenant_id', tenantId),
  ])

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader title="Consignments" description="Manage revenue splits for third-party vehicle owners." />
      <ConsignmentsManager
        owners={(owners as ConsignmentOwner[]) ?? []}
        consignments={(consignments as Consignment[]) ?? []}
        cars={(cars as Car[]) ?? []}
        reservations={(reservations as Reservation[]) ?? []}
        expenses={(transactions as Transaction[]) ?? []}
      />
    </div>
  )
}
