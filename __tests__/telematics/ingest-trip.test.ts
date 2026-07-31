/**
 * @jest-environment node
 *
 * Bouncie assembles one trip out of up to four separate webhook deliveries
 * correlated by transactionId (bouncie_trip_id): tripStart → tripData (n) →
 * tripMetrics → tripEnd. Each ingest* function below only writes the
 * columns it actually knows about.
 */
import { ingestTripStart, ingestTripMetrics, ingestTripEnd } from '@/lib/telematics/ingest'
import type { ProviderEvent } from '@/lib/telematics/types'

interface TrackedUpsert {
  table: string
  row: Record<string, unknown>
  opts: Record<string, unknown>
}
interface TrackedUpdate {
  table: string
  patch: Record<string, unknown>
  match: Record<string, unknown>
}
interface ReservationQueryCapture {
  tenant_id?: unknown
  car_id?: unknown
  lte?: { column: string; value: unknown }
  gte?: { column: string; value: unknown }
  called: boolean
}

interface MockSupabase {
  upserts: TrackedUpsert[]
  updates: TrackedUpdate[]
  reservationQuery: ReservationQueryCapture
  from: (table: string) => unknown
}

function mkSupabase(opts: {
  reservation?: { id: string } | null
  tripEndRow?: { id: string; started_at: string } | null
} = {}): MockSupabase {
  const upserts: TrackedUpsert[] = []
  const updates: TrackedUpdate[] = []
  const reservationQuery: ReservationQueryCapture = { called: false }
  const tripEndRow = opts.tripEndRow ?? { id: 'trip-1', started_at: '2026-04-23T10:00:00Z' }
  const reservation = opts.reservation ?? null

  // Recursive chain: .eq(...).eq(...)... can be awaited directly (thenable)
  // or continued with .select(cols).maybeSingle()/.single().
  function updateChain(table: string, patch: Record<string, unknown>, match: Record<string, unknown>) {
    const node: Record<string, unknown> = {
      eq: (col: string, val: unknown) => updateChain(table, patch, { ...match, [col]: val }),
      select: (_cols: string) => ({
        maybeSingle: () => {
          updates.push({ table, patch, match })
          return Promise.resolve({ data: tripEndRow, error: null })
        },
      }),
      then: (resolve: (v: { data: null; error: null }) => void) => {
        updates.push({ table, patch, match })
        resolve({ data: null, error: null })
      },
    }
    return node
  }

  const sb: MockSupabase = {
    upserts,
    updates,
    reservationQuery,
    from(table: string) {
      if (table === 'telematics_trips') {
        return {
          upsert: (row: Record<string, unknown>, upsertOpts: Record<string, unknown>) => {
            upserts.push({ table, row, opts: upsertOpts })
            return Promise.resolve({ data: null, error: null })
          },
          update: (patch: Record<string, unknown>) => updateChain(table, patch, {}),
        }
      }
      if (table === 'cars') {
        return {
          update: (patch: Record<string, unknown>) => updateChain(table, patch, {}),
        }
      }
      if (table === 'reservations') {
        return {
          select: () => ({
            eq: (col1: string, val1: unknown) => {
              if (col1 === 'tenant_id') reservationQuery.tenant_id = val1
              if (col1 === 'car_id') reservationQuery.car_id = val1
              return {
                eq: (col2: string, val2: unknown) => {
                  if (col2 === 'tenant_id') reservationQuery.tenant_id = val2
                  if (col2 === 'car_id') reservationQuery.car_id = val2
                  return {
                    lte: (lteCol: string, lteVal: unknown) => {
                      reservationQuery.lte = { column: lteCol, value: lteVal }
                      return {
                        gte: (gteCol: string, gteVal: unknown) => {
                          reservationQuery.gte = { column: gteCol, value: gteVal }
                          reservationQuery.called = true
                          return {
                            maybeSingle: () => Promise.resolve({ data: reservation, error: null }),
                          }
                        },
                      }
                    },
                  }
                },
              }
            },
          }),
        }
      }
      throw new Error(`unexpected table ${table}`)
    },
  }
  return sb
}

function mkEvent(
  type: ProviderEvent['type'],
  payload: Record<string, unknown>,
  overrides: Partial<ProviderEvent> = {},
): ProviderEvent {
  return {
    provider_event_id: null,
    imei: '123',
    type,
    occurred_at: '2026-04-23T12:00:00Z',
    lat: null,
    lon: null,
    speed_mph: null,
    odometer_mi: null,
    payload,
    ...overrides,
  }
}

describe('ingestTripStart', () => {
  test('creates the trip row and bumps car mileage from the start odometer', async () => {
    const sb = mkSupabase()
    await ingestTripStart(sb as never, {
      tenant_id: 't1',
      device_id: 'd1',
      car_id: 42,
      event: mkEvent('trip_start', { transactionId: 'txn-1' }, { odometer_mi: 45678.9, occurred_at: '2026-04-23T10:00:00Z' }),
    })

    expect(sb.upserts).toHaveLength(1)
    expect(sb.upserts[0]).toMatchObject({
      table: 'telematics_trips',
      row: {
        tenant_id: 't1', device_id: 'd1', car_id: 42,
        started_at: '2026-04-23T10:00:00Z',
        hard_braking_count: 0, hard_accel_count: 0,
        bouncie_trip_id: 'txn-1',
      },
      opts: { onConflict: 'tenant_id,bouncie_trip_id' },
    })

    const carUpdate = sb.updates.find((u) => u.table === 'cars')
    expect(carUpdate?.patch).toMatchObject({ mileage: 45679 })
  })

  test('returns early when transactionId is missing', async () => {
    const sb = mkSupabase()
    await ingestTripStart(sb as never, {
      tenant_id: 't1', device_id: 'd1', car_id: 42,
      event: mkEvent('trip_start', {}),
    })
    expect(sb.upserts).toHaveLength(0)
  })
})

describe('ingestTripMetrics', () => {
  test('patches aggregate stats matched by bouncie_trip_id', async () => {
    const sb = mkSupabase()
    await ingestTripMetrics(sb as never, {
      tenant_id: 't1', device_id: 'd1', car_id: 42,
      event: mkEvent('trip_metrics', {
        transactionId: 'txn-1', tripTime: 1800, tripDistance: 12.5,
        maxSpeed: 65, hardBrakingCounts: 2, hardAccelerationCounts: 1,
      }),
    })

    const update = sb.updates.find((u) => u.table === 'telematics_trips')
    expect(update).toBeDefined()
    expect(update?.patch).toMatchObject({
      duration_s: 1800, distance_mi: 12.5, max_speed_mph: 65,
      hard_braking_count: 2, hard_accel_count: 1,
    })
    expect(update?.match).toMatchObject({ tenant_id: 't1', bouncie_trip_id: 'txn-1' })
  })

  test('skips the update entirely when no numeric fields are present', async () => {
    const sb = mkSupabase()
    await ingestTripMetrics(sb as never, {
      tenant_id: 't1', device_id: 'd1', car_id: 42,
      event: mkEvent('trip_metrics', { transactionId: 'txn-1' }),
    })
    expect(sb.updates.filter((u) => u.table === 'telematics_trips')).toHaveLength(0)
  })

  test('returns early when transactionId is missing', async () => {
    const sb = mkSupabase()
    await ingestTripMetrics(sb as never, {
      tenant_id: 't1', device_id: 'd1', car_id: 42,
      event: mkEvent('trip_metrics', { tripDistance: 5 }),
    })
    expect(sb.updates).toHaveLength(0)
  })
})

describe('ingestTripEnd', () => {
  test('closes the trip, matches a reservation by the trip start date, and bumps mileage', async () => {
    const reservationId = '00000000-0000-0000-0000-000000000099'
    const sb = mkSupabase({
      reservation: { id: reservationId },
      tripEndRow: { id: 'trip-1', started_at: '2026-04-23T10:00:00Z' },
    })
    await ingestTripEnd(sb as never, {
      tenant_id: 't1', device_id: 'd1', car_id: 42,
      event: mkEvent('trip_end', { transactionId: 'txn-1', fuelConsumed: 0.8 }, {
        odometer_mi: 45691.4, occurred_at: '2026-04-23T12:00:00Z',
      }),
    })

    const closeUpdate = sb.updates.find(
      (u) => u.table === 'telematics_trips' && u.patch.ended_at !== undefined,
    )
    expect(closeUpdate?.patch).toMatchObject({ ended_at: '2026-04-23T12:00:00Z', fuel_consumed_gal: 0.8 })
    expect(closeUpdate?.match).toMatchObject({ tenant_id: 't1', bouncie_trip_id: 'txn-1' })

    // Reservation query used the trip's *start* date (from the row), not tripEnd's own timestamp.
    expect(sb.reservationQuery.tenant_id).toBe('t1')
    expect(sb.reservationQuery.car_id).toBe(42)
    expect(sb.reservationQuery.lte).toEqual({ column: 'pickup_date', value: '2026-04-23' })
    expect(sb.reservationQuery.gte).toEqual({ column: 'return_date', value: '2026-04-23' })

    const reservationUpdate = sb.updates.find((u) => u.patch.reservation_id !== undefined)
    expect(reservationUpdate?.patch.reservation_id).toBe(reservationId)
    expect(reservationUpdate?.match).toMatchObject({ id: 'trip-1' })

    const carUpdate = sb.updates.find((u) => u.table === 'cars')
    expect(carUpdate?.patch).toMatchObject({ mileage: 45691 })
  })

  test('leaves reservation unmatched when no reservation covers the trip date', async () => {
    const sb = mkSupabase({ reservation: null })
    await ingestTripEnd(sb as never, {
      tenant_id: 't1', device_id: 'd1', car_id: 42,
      event: mkEvent('trip_end', { transactionId: 'txn-2' }),
    })
    expect(sb.reservationQuery.called).toBe(true)
    expect(sb.updates.some((u) => u.patch.reservation_id !== undefined)).toBe(false)
  })

  test('skips reservation lookup entirely when car_id is null', async () => {
    const sb = mkSupabase({ reservation: { id: 'should-not-be-used' } })
    await ingestTripEnd(sb as never, {
      tenant_id: 't1', device_id: 'd1', car_id: null,
      event: mkEvent('trip_end', { transactionId: 'txn-3' }),
    })
    expect(sb.reservationQuery.called).toBe(false)
  })

  test('returns early when transactionId is missing', async () => {
    const sb = mkSupabase()
    await ingestTripEnd(sb as never, {
      tenant_id: 't1', device_id: 'd1', car_id: 42,
      event: mkEvent('trip_end', {}),
    })
    expect(sb.updates).toHaveLength(0)
  })
})
