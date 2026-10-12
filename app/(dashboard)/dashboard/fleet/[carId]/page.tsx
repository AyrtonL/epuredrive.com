import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import PageHeader from '@/components/dashboard/PageHeader'
import CarEditForm from './CarEditForm'
import RecallsPanel, { type CarRecall } from './RecallsPanel'
import CarSummary, { type LastService, type SummaryBooking } from './CarSummary'
import type { Car, Reservation } from '@/lib/supabase/types'
import { carDisplayName, categoryLabel } from '@/lib/utils/car-display-name'
import { daysAgoISO, sumEarnedRevenue, todayISO } from '@/lib/finance/revenue'
import { carStatus, rentedDaysByCar } from '@/lib/fleet/car-status'

interface Props {
  params: { carId: string }
}

const WINDOW_DAYS = 30
const LIST_LIMIT = 5

const toSummary = (r: Reservation): SummaryBooking => ({
  id: r.id,
  bookingCode: r.booking_code,
  customer: r.customer_name || 'Customer',
  pickup: r.pickup_date,
  ret: r.return_date,
  status: r.status,
  total: r.total_amount != null ? Number(r.total_amount) : null,
})

export default async function CarEditPage({ params }: Props) {
  const { supabase, tenantId } = await requireTenantId()

  const carId = Number(params.carId)
  const today = todayISO()
  const [{ data: car }, { data: recalls }, { data: reservations }, { data: services }, { data: maintenanceTx }] = await Promise.all([
    supabase.from('cars').select('*').eq('id', carId).eq('tenant_id', tenantId).single(),
    supabase
      .from('car_recalls')
      .select('id, campaign_number, component, summary, consequence, remedy, report_received_date, park_it, park_outside, matched_make, matched_model, matched_year, status')
      .eq('car_id', carId)
      .eq('tenant_id', tenantId)
      .neq('status', 'baseline')
      .order('status', { ascending: true })
      .order('report_received_date', { ascending: false }),
    supabase
      .from('reservations')
      .select('id, booking_code, car_id, customer_name, pickup_date, return_date, status, total_amount')
      .eq('car_id', carId)
      .eq('tenant_id', tenantId)
      .neq('status', 'cancelled')
      .order('pickup_date', { ascending: false }),
    supabase
      .from('car_services')
      .select('service_date, service_type, description, cost')
      .eq('car_id', carId)
      .eq('tenant_id', tenantId)
      .order('service_date', { ascending: false })
      .limit(1),
    // Most operators log maintenance as an expense rather than a service record.
    supabase
      .from('transactions')
      .select('transaction_date, description, amount')
      .eq('car_id', carId)
      .eq('tenant_id', tenantId)
      .eq('category', 'maintenance')
      .order('transaction_date', { ascending: false })
      .limit(1),
  ])

  if (!car) notFound()

  const c = car as Car
  const rows = (reservations ?? []) as Reservation[]
  const status = carStatus(c.status, rows, today)
  const completed = rows.filter((r) => r.status === 'completed')
  const rentedDays = rentedDaysByCar(rows, daysAgoISO(WINDOW_DAYS - 1), today).get(c.id) ?? 0

  const upcoming = rows
    .filter((r) => ['pending', 'confirmed', 'active'].includes(r.status ?? '') && (r.return_date == null || r.return_date >= today || r.status === 'active'))
    .sort((a, b) => (a.pickup_date ?? '').localeCompare(b.pickup_date ?? ''))
    .slice(0, LIST_LIMIT)
    .map(toSummary)
  const recent = completed.slice(0, LIST_LIMIT).map(toSummary)

  const svc = services?.[0]
  const tx = maintenanceTx?.[0]
  const candidates: LastService[] = [
    svc?.service_date ? { date: svc.service_date, label: svc.service_type || svc.description || 'Service', amount: svc.cost != null ? Number(svc.cost) : null } : null,
    tx?.transaction_date ? { date: tx.transaction_date, label: tx.description || 'Maintenance', amount: tx.amount != null ? Number(tx.amount) : null } : null,
  ].filter((x): x is LastService => x != null)
  const lastService = candidates.sort((a, b) => b.date.localeCompare(a.date))[0] ?? null

  const subtitle = [c.year, categoryLabel(c.category), c.color, c.plate ? `Plate ${c.plate}` : null].filter(Boolean).join(' · ')

  return (
    <div className="max-w-screen-xl mx-auto">
      <div className="mb-2">
        <Link href="/dashboard/fleet" className="text-sm text-white/55 hover:text-white transition-colors">
          ← Back to fleet
        </Link>
      </div>
      <PageHeader title={carDisplayName(c)} description={subtitle || undefined} />
      <CarSummary
        today={today}
        status={status}
        revenue={sumEarnedRevenue(rows)}
        trips={completed.length}
        utilizationPct={Math.min(100, Math.round((rentedDays / WINDOW_DAYS) * 100))}
        windowDays={WINDOW_DAYS}
        upcoming={upcoming}
        recent={recent}
        lastService={lastService}
        gps={c.telematics_device_id ? { lastSeenAt: c.last_seen_at } : null}
        mileage={c.mileage ?? null}
      />
      <div className="max-w-3xl">
        {recalls && recalls.length > 0 && <RecallsPanel recalls={recalls as CarRecall[]} vin={c.vin} />}
        <h2 className="text-white font-bold text-base mb-4">Vehicle details</h2>
        <CarEditForm car={c} />
      </div>
    </div>
  )
}
