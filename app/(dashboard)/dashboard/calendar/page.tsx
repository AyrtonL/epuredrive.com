// app/dashboard/calendar/page.tsx
import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import PageHeader from '@/components/dashboard/PageHeader'
import CalendarClient from './CalendarClient'
import type { Reservation, Car } from '@/lib/supabase/types'

export default async function CalendarPage() {
  const { supabase, tenantId } = await requireTenantId()

  const [{ data: reservations }, { data: cars }, { data: blockedDates }, { data: consignments }] = await Promise.all([
    supabase
      .from('reservations')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('pickup_date', { ascending: true }),
    supabase
      .from('cars')
      // daily_rate is required so the reservation detail modal can render the
      // late-fee estimate (overdue days × daily rate) instead of showing $0.
      .select('id, make, model, model_full, daily_rate, status, plate')
      .eq('tenant_id', tenantId),
    supabase
      .from('blocked_dates')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('start_date', { ascending: true }),
    supabase.from('consignments').select('car_id').eq('tenant_id', tenantId),
  ])

  return (
    <div className="max-w-screen-2xl mx-auto space-y-6">
      <PageHeader title="Calendar" description="Visual overview of your fleet's availability and reservations." />
      
      <CalendarClient
        reservations={(reservations as Reservation[]) ?? []}
        cars={(cars as Car[]) ?? []}
        blockedDates={blockedDates ?? []}
        consignedCarIds={Array.from(new Set((consignments ?? []).map((c) => c.car_id as number)))}
      />
    </div>
  )
}
