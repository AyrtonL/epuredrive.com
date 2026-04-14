// app/dashboard/bookings/page.tsx
import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import PageHeader from '@/components/dashboard/PageHeader'
import StatCard from '@/components/dashboard/StatCard'
import BookingsTable from './BookingsTable'
import type { Reservation, Car } from '@/lib/supabase/types'

export default async function BookingsPage() {
  const { supabase, tenantId } = await requireTenantId()

  const [{ data: reservations }, { data: cars }, { data: tenant }] = await Promise.all([
    supabase
      .from('reservations')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('pickup_date', { ascending: false }),
    supabase
      .from('cars')
      .select('id, make, model, model_full')
      .eq('tenant_id', tenantId),
    supabase
      .from('tenants')
      .select('fuel_charge_per_level')
      .eq('id', tenantId)
      .single(),
  ])

  const rows = (reservations as Reservation[]) ?? []
  const carRows = (cars as Car[]) ?? []

  const confirmed = rows.filter((r) => r.status === 'confirmed').length
  const pending = rows.filter((r) => r.status === 'pending').length
  const totalRevenue = rows
    .filter((r) => r.status === 'completed')
    .reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0)

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader title="Bookings" description="All reservations across your fleet." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Bookings" value={rows.length} />
        <StatCard label="Confirmed" value={confirmed} />
        <StatCard label="Pending" value={pending} sub={pending > 0 ? 'needs attention' : undefined} />
        <StatCard label="Completed Revenue" value={`$${totalRevenue.toFixed(0)}`} />
      </div>

      <div className="glass border border-white/10 rounded-3xl p-6 md:p-8">
        <BookingsTable reservations={rows} cars={carRows} chargePerLevel={tenant?.fuel_charge_per_level ?? 20} />
      </div>
    </div>
  )
}
