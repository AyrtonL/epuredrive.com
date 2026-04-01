import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/dashboard/PageHeader'
import ConsignmentsManager from './ConsignmentsManager'
import type { Consignment, Car, Reservation } from '@/lib/supabase/types'

export default async function ConsignmentsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user!.id).single()
  const tenantId = profile!.tenant_id

  const [{ data: consignments }, { data: cars }, { data: reservations }] = await Promise.all([
    supabase.from('consignments').select('*').eq('tenant_id', tenantId).order('car_id'),
    supabase.from('cars').select('id, make, model, model_full, daily_rate').eq('tenant_id', tenantId),
    supabase.from('reservations').select('car_id, total_amount, status, pickup_date').eq('tenant_id', tenantId).neq('status', 'cancelled'),
  ])

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader title="Consignments" description="Manage revenue splits for third-party vehicle owners." />
      <ConsignmentsManager
        consignments={(consignments as Consignment[]) ?? []}
        cars={(cars as Car[]) ?? []}
        reservations={(reservations as Reservation[]) ?? []}
      />
    </div>
  )
}
