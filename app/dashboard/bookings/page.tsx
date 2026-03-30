// app/dashboard/bookings/page.tsx
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/dashboard/PageHeader'
import StatCard from '@/components/dashboard/StatCard'
import BookingsTable from './BookingsTable'
import type { Reservation, Car } from '@/lib/supabase/types'

export default async function BookingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user!.id)
    .single()

  const tenantId = profile!.tenant_id

  const [{ data: reservations }, { data: cars }] = await Promise.all([
    supabase
      .from('reservations')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('pickup_date', { ascending: false }),
    supabase
      .from('cars')
      .select('id, make, model, model_full')
      .eq('tenant_id', tenantId),
  ])

  const rows = (reservations as Reservation[]) ?? []
  const carRows = (cars as Car[]) ?? []

  const confirmed = rows.filter((r) => r.status === 'confirmed').length
  const pending = rows.filter((r) => r.status === 'pending').length
  const totalRevenue = rows
    .filter((r) => r.status === 'completed')
    .reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0)

  return (
    <div className="max-w-6xl">
      <PageHeader title="Bookings" description="All reservations across your fleet." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total" value={rows.length} />
        <StatCard label="Confirmed" value={confirmed} />
        <StatCard label="Pending" value={pending} />
        <StatCard label="Completed revenue" value={`$${totalRevenue.toFixed(0)}`} />
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <BookingsTable reservations={rows} cars={carRows} />
      </div>
    </div>
  )
}
