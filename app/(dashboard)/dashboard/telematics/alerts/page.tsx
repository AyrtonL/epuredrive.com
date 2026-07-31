// app/(dashboard)/dashboard/telematics/alerts/page.tsx
// Alerts — §6.4 of the telematics design spec.
// Loads server-side:
//   - Events filtered by searchParams (status / severity / type / car / dates)
//   - Cars for the picker
//   - Total unacked count (for the summary badge)
// Hands data to <AlertsClient /> which owns the 15s router.refresh() poll,
// filter bar, bulk selection, and ack actions.
import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import PageHeader from '@/components/dashboard/PageHeader'
import AlertsClient, {
  type CarOption,
  type StatusFilter,
  type SeverityFilter,
  type TypeFilter,
} from '@/components/telematics/AlertsClient'
import type { AlertRowData } from '@/components/telematics/AlertRow'
import type {
  TelematicsEventType,
  TelematicsSeverity,
} from '@/lib/supabase/types'

interface EventRaw {
  id: string
  event_type: TelematicsEventType
  severity: TelematicsSeverity
  occurred_at: string
  acknowledged_at: string | null
  car_id: number | null
}

interface CarRaw {
  id: number
  make: string | null
  model: string | null
  plate: string | null
}

interface Props {
  searchParams: {
    status?: string
    severity?: string
    type?: string
    car_id?: string
    from?: string
    to?: string
  }
}

const DEFAULT_WINDOW_DAYS = 14
const MAX_ROWS = 500

const ALLOWED_EVENT_TYPES = new Set<TelematicsEventType>([
  'ignition_on',
  'ignition_off',
  'trip_start',
  'trip_end',
  'geofence_enter',
  'geofence_exit',
  'speed_exceeded',
  'hard_braking',
  'hard_accel',
  'dtc_new',
  'dtc_cleared',
  'battery_low',
  'offline',
  'online',
  'connection_expired',
  'vin_changed',
])

function parseStatus(raw: string | undefined): StatusFilter {
  if (raw === 'acked' || raw === 'all') return raw
  return 'unacked'
}

function parseSeverity(raw: string | undefined): SeverityFilter {
  if (raw === 'critical' || raw === 'warning' || raw === 'info') return raw
  return 'all'
}

function parseType(raw: string | undefined): TypeFilter {
  if (!raw) return 'all'
  return ALLOWED_EVENT_TYPES.has(raw as TelematicsEventType)
    ? (raw as TelematicsEventType)
    : 'all'
}

function parseCarId(raw: string | undefined): number | null {
  if (!raw) return null
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

function parseDate(raw: string | undefined, fallback: Date): Date {
  if (!raw) return fallback
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? fallback : d
}

function carLabel(car: CarRaw | undefined, fallback: number | null): string {
  if (!car) return fallback !== null ? `Car ${fallback}` : 'Unknown car'
  const name = [car.make, car.model].filter(Boolean).join(' ') || `Car ${car.id}`
  return car.plate ? `${name} (${car.plate})` : name
}

export const dynamic = 'force-dynamic'

export default async function TelematicsAlertsPage({ searchParams }: Props) {
  const { supabase, tenantId } = await requireTenantId()

  const status = parseStatus(searchParams?.status)
  const severity = parseSeverity(searchParams?.severity)
  const type = parseType(searchParams?.type)
  const carId = parseCarId(searchParams?.car_id)

  const now = new Date()
  const defaultFrom = new Date(now.getTime() - DEFAULT_WINDOW_DAYS * 86_400_000)
  const fromDate = parseDate(searchParams?.from, defaultFrom)
  const toDate = parseDate(searchParams?.to, now)

  let query = supabase
    .from('telematics_events')
    .select(
      'id, event_type, severity, occurred_at, acknowledged_at, car_id',
    )
    .eq('tenant_id', tenantId)
    .gte('occurred_at', fromDate.toISOString())
    .lte('occurred_at', toDate.toISOString())
    .order('occurred_at', { ascending: false })
    .limit(MAX_ROWS)

  if (status === 'unacked') query = query.is('acknowledged_at', null)
  else if (status === 'acked') query = query.not('acknowledged_at', 'is', null)
  if (severity !== 'all') query = query.eq('severity', severity)
  if (type !== 'all') query = query.eq('event_type', type)
  if (carId !== null) query = query.eq('car_id', carId)

  const [{ data: events }, { data: cars }, { count: unackedCount }] =
    await Promise.all([
      query,
      supabase
        .from('cars')
        .select('id, make, model, plate')
        .eq('tenant_id', tenantId)
        .order('id'),
      supabase
        .from('telematics_events')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .is('acknowledged_at', null),
    ])

  const eventRows = (events as EventRaw[] | null) ?? []
  const carRows = (cars as CarRaw[] | null) ?? []
  const carsById = new Map<number, CarRaw>()
  for (const c of carRows) carsById.set(c.id, c)

  const alerts: AlertRowData[] = eventRows.map((e) => ({
    id: e.id,
    event_type: e.event_type,
    severity: e.severity,
    occurred_at: e.occurred_at,
    acknowledged_at: e.acknowledged_at,
    car_id: e.car_id,
    car_label: carLabel(
      e.car_id !== null ? carsById.get(e.car_id) : undefined,
      e.car_id,
    ),
  }))

  const carOptions: CarOption[] = carRows.map((c) => ({
    id: c.id,
    label: carLabel(c, c.id),
  }))

  const subtitle =
    (unackedCount ?? 0) === 0
      ? 'All clear — no unacknowledged alerts'
      : `${unackedCount} unacked alert${unackedCount === 1 ? '' : 's'}`

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader title="Alerts" description={subtitle} />
      <AlertsClient
        alerts={alerts}
        cars={carOptions}
        totalUnacked={unackedCount ?? 0}
        initialFilters={{
          status,
          severity,
          type,
          carId,
          from: fromDate.toISOString(),
          to: toDate.toISOString(),
        }}
      />
    </div>
  )
}
