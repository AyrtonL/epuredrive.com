// app/(dashboard)/dashboard/telematics/trips/page.tsx
// Trips — §6.3 of the telematics design spec.
// Default window: last 7 days. Filters via searchParams:
//   - from, to (ISO date strings)
//   - car_ids (comma-separated integer list)
//   - min_distance (miles, number)
//
// Joins telematics_trips with cars (plate, make, model) and reservations
// (booking_code). Renders <TripsTable /> which owns the client filter bar and
// the row-click detail modal.
import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import PageHeader from '@/components/dashboard/PageHeader'
import TripsTable, {
  type CarOption,
  type TripRow,
} from '@/components/telematics/TripsTable'

interface TripRaw {
  id: string
  car_id: number | null
  reservation_id: string | null
  started_at: string
  ended_at: string | null
  distance_mi: number | null
  duration_s: number | null
  max_speed_mph: number | null
  hard_braking_count: number | null
  hard_accel_count: number | null
}

interface CarRaw {
  id: number
  make: string | null
  model: string | null
  plate: string | null
}

interface ReservationRaw {
  id: string
  booking_code: string | null
}

interface Props {
  searchParams: {
    from?: string
    to?: string
    car_ids?: string
    min_distance?: string
  }
}

const DEFAULT_WINDOW_DAYS = 7
const MAX_ROWS = 500

function carLabel(car: CarRaw | undefined, fallback: number | null): string {
  if (!car) return fallback !== null ? `Car ${fallback}` : 'Unknown car'
  const name = [car.make, car.model].filter(Boolean).join(' ') || `Car ${car.id}`
  return car.plate ? `${name} (${car.plate})` : name
}

function parseDate(raw: string | undefined, fallback: Date): Date {
  if (!raw) return fallback
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? fallback : d
}

function parseCarIds(raw: string | undefined): number[] {
  if (!raw) return []
  return raw
    .split(',')
    .map((s) => Number.parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0)
    .slice(0, 500)
}

export const dynamic = 'force-dynamic'

export default async function TelematicsTripsPage({ searchParams }: Props) {
  const { supabase, tenantId } = await requireTenantId()

  const now = new Date()
  const defaultFrom = new Date(now.getTime() - DEFAULT_WINDOW_DAYS * 86_400_000)
  const fromDate = parseDate(searchParams?.from, defaultFrom)
  const toDate = parseDate(searchParams?.to, now)
  const carIdFilters = parseCarIds(searchParams?.car_ids)
  const minDistanceRaw = searchParams?.min_distance
  const minDistance =
    minDistanceRaw && Number.isFinite(Number(minDistanceRaw))
      ? Math.max(0, Number(minDistanceRaw))
      : null

  let tripsQuery = supabase
    .from('telematics_trips')
    .select(
      'id, car_id, reservation_id, started_at, ended_at, distance_mi, duration_s, max_speed_mph, hard_braking_count, hard_accel_count',
    )
    .eq('tenant_id', tenantId)
    .gte('started_at', fromDate.toISOString())
    .lte('started_at', toDate.toISOString())
    .order('started_at', { ascending: false })
    .limit(MAX_ROWS)

  if (carIdFilters.length > 0) tripsQuery = tripsQuery.in('car_id', carIdFilters)
  if (minDistance !== null) tripsQuery = tripsQuery.gte('distance_mi', minDistance)

  const [{ data: trips }, { data: cars }] = await Promise.all([
    tripsQuery,
    supabase
      .from('cars')
      .select('id, make, model, plate')
      .eq('tenant_id', tenantId)
      .order('id'),
  ])

  const tripRows = (trips as TripRaw[] | null) ?? []
  const carRows = (cars as CarRaw[] | null) ?? []
  const carsById = new Map<number, CarRaw>()
  for (const c of carRows) carsById.set(c.id, c)

  const reservationIds = Array.from(
    new Set(
      tripRows
        .map((t) => t.reservation_id)
        .filter((v): v is string => v !== null),
    ),
  )

  const reservationsById = new Map<string, ReservationRaw>()
  if (reservationIds.length > 0) {
    const { data: reservations } = await supabase
      .from('reservations')
      .select('id, booking_code')
      .eq('tenant_id', tenantId)
      .in('id', reservationIds)
    for (const r of (reservations as ReservationRaw[] | null) ?? []) {
      reservationsById.set(r.id, r)
    }
  }

  const hydrated: TripRow[] = tripRows.map((t) => {
    const car = t.car_id !== null ? carsById.get(t.car_id) : undefined
    const reservation =
      t.reservation_id !== null
        ? reservationsById.get(t.reservation_id)
        : undefined
    return {
      id: t.id,
      car_id: t.car_id,
      car_label: carLabel(car, t.car_id),
      booking_code: reservation?.booking_code ?? null,
      started_at: t.started_at,
      ended_at: t.ended_at,
      distance_mi: t.distance_mi,
      duration_s: t.duration_s,
      max_speed_mph: t.max_speed_mph,
      hard_braking_count: t.hard_braking_count,
      hard_accel_count: t.hard_accel_count,
    }
  })

  const carOptions: CarOption[] = carRows.map((c) => ({
    id: c.id,
    label: carLabel(c, c.id),
  }))

  const subtitle =
    tripRows.length === 0
      ? 'No trips in the selected window'
      : `${tripRows.length} trip${tripRows.length === 1 ? '' : 's'}`

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader title="Trips" description={subtitle} />
      <TripsTable
        trips={hydrated}
        cars={carOptions}
        initialFilters={{
          from: fromDate.toISOString(),
          to: toDate.toISOString(),
          carIds: carIdFilters,
          minDistance: minDistance === null ? '' : String(minDistance),
        }}
      />
    </div>
  )
}
