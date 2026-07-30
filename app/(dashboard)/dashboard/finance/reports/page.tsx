import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import PageHeader from '@/components/dashboard/PageHeader'
import ReportsClient from './ReportsClient'
import type { Reservation, Transaction, Car, Consignment } from '@/lib/supabase/types'

export default async function ReportsPage() {
  const { supabase, tenantId } = await requireTenantId()

  const [{ data: reservations }, { data: transactions }, { data: cars }, { data: consignments }] = await Promise.all([
    supabase.from('reservations').select('*').eq('tenant_id', tenantId),
    supabase.from('transactions').select('*').eq('tenant_id', tenantId).order('transaction_date', { ascending: false }),
    supabase.from('cars').select('id, make, model, model_full').eq('tenant_id', tenantId),
    supabase.from('consignments').select('car_id, owner_percentage').eq('tenant_id', tenantId),
  ])

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader title="Reports" description="Filter by date range, track revenue and expenses, download CSV exports." />
      <ReportsClient
        reservations={(reservations as Reservation[]) ?? []}
        expenses={(transactions as Transaction[]) ?? []}
        cars={(cars as Pick<Car, 'id' | 'make' | 'model' | 'model_full'>[]) ?? []}
        consignments={(consignments as Pick<Consignment, 'car_id' | 'owner_percentage'>[]) ?? []}
      />
    </div>
  )
}
