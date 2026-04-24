// app/(dashboard)/dashboard/telematics/trips/export/route.ts
// CSV export for the Trips page.
// GET /dashboard/telematics/trips/export?from=...&to=...&car_ids=...&min_distance=...
//
// Security:
//   - requireTenantId → session → tenant_id (redirects if unauthenticated)
//   - isFeatureEnabled gate (defense-in-depth)
//   - All reads tenant-scoped via admin client with explicit eq('tenant_id')
//
// Output format:
//   - RFC 4180 CSV with a header row
//   - UTF-8, no BOM
//   - Values that contain commas, newlines, or quotes are wrapped in
//     double-quotes; literal quotes are doubled.
import { NextResponse } from 'next/server'
import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { isFeatureEnabled } from '@/lib/supabase/feature-flags'

const BOUNCIE_FLAG = 'bouncie_telematics'
const MAX_ROWS = 5000
const DEFAULT_WINDOW_DAYS = 7

interface TripRaw {
  id: string
  started_at: string
  ended_at: string | null
  distance_mi: number | null
  duration_s: number | null
  max_speed_mph: number | null
  hard_braking_count: number | null
  hard_accel_count: number | null
  car_id: number | null
  reservation_id: string | null
}

interface CarLookup {
  id: number
  make: string | null
  model: string | null
  plate: string | null
}

interface ReservationLookup {
  id: string
  booking_code: string | null
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return ''
  const s = String(value)
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function parseDate(raw: string | null, fallback: Date): Date {
  if (!raw) return fallback
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? fallback : d
}

function parseCarIds(raw: string | null): number[] {
  if (!raw) return []
  return raw
    .split(',')
    .map((s) => Number.parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0)
    .slice(0, 500)
}

function formatMinutes(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return ''
  const m = Math.round(seconds / 60)
  return String(m)
}

export async function GET(request: Request) {
  const { tenantId } = await requireTenantId()

  const enabled = await isFeatureEnabled(tenantId, BOUNCIE_FLAG)
  if (!enabled) {
    return NextResponse.json(
      { error: 'Bouncie telematics is not enabled for this workspace.' },
      { status: 403 },
    )
  }

  const url = new URL(request.url)
  const now = new Date()
  const defaultFrom = new Date(now.getTime() - DEFAULT_WINDOW_DAYS * 86_400_000)
  const from = parseDate(url.searchParams.get('from'), defaultFrom)
  const to = parseDate(url.searchParams.get('to'), now)
  const carIds = parseCarIds(url.searchParams.get('car_ids'))
  const minDistanceRaw = url.searchParams.get('min_distance')
  const minDistance =
    minDistanceRaw && Number.isFinite(Number(minDistanceRaw))
      ? Math.max(0, Number(minDistanceRaw))
      : null

  const admin = createAdminClient()

  let tripsQuery = admin
    .from('telematics_trips')
    .select(
      'id, started_at, ended_at, distance_mi, duration_s, max_speed_mph, hard_braking_count, hard_accel_count, car_id, reservation_id',
    )
    .eq('tenant_id', tenantId)
    .gte('started_at', from.toISOString())
    .lte('started_at', to.toISOString())
    .order('started_at', { ascending: false })
    .limit(MAX_ROWS)

  if (carIds.length > 0) tripsQuery = tripsQuery.in('car_id', carIds)
  if (minDistance !== null) tripsQuery = tripsQuery.gte('distance_mi', minDistance)

  const { data: tripsData, error } = await tripsQuery
  if (error) {
    return NextResponse.json({ error: 'Could not load trips.' }, { status: 500 })
  }
  const trips = (tripsData as TripRaw[] | null) ?? []

  const carIdsInResults = Array.from(
    new Set(trips.map((t) => t.car_id).filter((v): v is number => v !== null)),
  )
  const reservationIds = Array.from(
    new Set(trips.map((t) => t.reservation_id).filter((v): v is string => v !== null)),
  )

  const [{ data: carsData }, { data: reservationsData }] = await Promise.all([
    carIdsInResults.length > 0
      ? admin
          .from('cars')
          .select('id, make, model, plate')
          .eq('tenant_id', tenantId)
          .in('id', carIdsInResults)
      : Promise.resolve({ data: [] }),
    reservationIds.length > 0
      ? admin
          .from('reservations')
          .select('id, booking_code')
          .eq('tenant_id', tenantId)
          .in('id', reservationIds)
      : Promise.resolve({ data: [] }),
  ])

  const carsById = new Map<number, CarLookup>()
  for (const c of (carsData as CarLookup[] | null) ?? []) carsById.set(c.id, c)
  const reservationsById = new Map<string, ReservationLookup>()
  for (const r of (reservationsData as ReservationLookup[] | null) ?? [])
    reservationsById.set(r.id, r)

  const header = [
    'trip_id',
    'started_at',
    'ended_at',
    'car_make',
    'car_model',
    'car_plate',
    'booking_code',
    'distance_mi',
    'duration_min',
    'max_speed_mph',
    'hard_braking',
    'hard_accel',
  ]
  const lines: string[] = [header.join(',')]

  for (const t of trips) {
    const car = t.car_id !== null ? carsById.get(t.car_id) ?? null : null
    const reservation =
      t.reservation_id !== null ? reservationsById.get(t.reservation_id) ?? null : null
    lines.push(
      [
        csvEscape(t.id),
        csvEscape(t.started_at),
        csvEscape(t.ended_at),
        csvEscape(car?.make ?? ''),
        csvEscape(car?.model ?? ''),
        csvEscape(car?.plate ?? ''),
        csvEscape(reservation?.booking_code ?? ''),
        csvEscape(t.distance_mi ?? ''),
        csvEscape(formatMinutes(t.duration_s)),
        csvEscape(t.max_speed_mph ?? ''),
        csvEscape(t.hard_braking_count ?? ''),
        csvEscape(t.hard_accel_count ?? ''),
      ].join(','),
    )
  }

  const csv = lines.join('\r\n')
  const today = now.toISOString().slice(0, 10)
  return new Response(csv, {
    status: 200,
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="trips-${today}.csv"`,
      'cache-control': 'no-store',
    },
  })
}
