// app/dashboard/calendar/page.tsx
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/dashboard/PageHeader'
import CalendarClient from './CalendarClient'
import type { Reservation, Car } from '@/lib/supabase/types'

export default async function CalendarPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user!.id)
    .single()

  const tenantId = profile!.tenant_id

  const [{ data: reservations }, { data: cars }, { data: blockedDates }] = await Promise.all([
    supabase
      .from('reservations')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('pickup_date', { ascending: true }),
    supabase
      .from('cars')
      .select('id, make, model, model_full')
      .eq('tenant_id', tenantId),
    supabase
      .from('blocked_dates')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('start_date', { ascending: true })
      // Suppress error if table doesn't exist yet by just returning [] on error below
  ])

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader title="Calendar" description="Visual overview of your fleet's availability and reservations." />
      
      <div className="glass rounded-3xl p-6 md:p-8 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        <div className="relative z-10 w-full overflow-x-auto custom-scrollbar">
          <CalendarClient 
            reservations={(reservations as Reservation[]) ?? []} 
            cars={(cars as Car[]) ?? []} 
            blockedDates={blockedDates ?? []} 
          />
        </div>
      </div>
    </div>
  )
}
