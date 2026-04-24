/**
 * @jest-environment node
 */
import { ingestTripEnd } from '@/lib/telematics/ingest'
import type { ProviderEvent } from '@/lib/telematics/types'

interface UpsertCall {
  table: string
  row: Record<string, unknown>
  opts: Record<string, unknown>
}

interface ReservationRow {
  id: string
}

interface ReservationQueryCapture {
  tenant_id?: unknown
  car_id?: unknown
  lte?: { column: string; value: unknown }
  gte?: { column: string; value: unknown }
}

interface MockSupabase {
  upserts: UpsertCall[]
  reservationQuery: ReservationQueryCapture
  from: (table: string) => unknown
}

function mkSupabase(reservation: ReservationRow | null = null): MockSupabase {
  const upserts: UpsertCall[] = []
  const reservationQuery: ReservationQueryCapture = {}

  const sb: MockSupabase = {
    upserts,
    reservationQuery,
    from(table: string) {
      if (table === 'reservations') {
        return {
          select: () => ({
            eq: (col1: string, val1: unknown) => {
              reservationQuery.tenant_id = col1 === 'tenant_id' ? val1 : reservationQuery.tenant_id
              reservationQuery.car_id = col1 === 'car_id' ? val1 : reservationQuery.car_id
              return {
                eq: (col2: string, val2: unknown) => {
                  reservationQuery.tenant_id = col2 === 'tenant_id' ? val2 : reservationQuery.tenant_id
                  reservationQuery.car_id = col2 === 'car_id' ? val2 : reservationQuery.car_id
                  return {
                    lte: (lteCol: string, lteVal: unknown) => {
                      reservationQuery.lte = { column: lteCol, value: lteVal }
                      return {
                        gte: (gteCol: string, gteVal: unknown) => {
                          reservationQuery.gte = { column: gteCol, value: gteVal }
                          return {
                            maybeSingle: () =>
                              Promise.resolve({ data: reservation, error: null }),
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
      return {
        upsert: (row: Record<string, unknown>, opts: Record<string, unknown>) => {
          upserts.push({ table, row, opts })
          return Promise.resolve({ data: null, error: null })
        },
      }
    },
  }
  return sb
}

function mkTripEvent(
  payload: Record<string, unknown>,
  overrides: Partial<ProviderEvent> = {},
): ProviderEvent {
  return {
    provider_event_id: null,
    imei: '123',
    type: 'trip_end',
    occurred_at: '2026-04-23T12:00:00Z',
    lat: null,
    lon: null,
    speed_mph: null,
    odometer_mi: null,
    payload,
    ...overrides,
  }
}

describe('ingestTripEnd', () => {
  test('matches reservation when trip falls inside pickup/return window', async () => {
    const reservationId = '00000000-0000-0000-0000-000000000099'
    const sb = mkSupabase({ id: reservationId })
    await ingestTripEnd(sb as never, {
      tenant_id: 't1',
      device_id: 'd1',
      car_id: 42,
      event: mkTripEvent({
        transactionId: 'bounce-trip-1',
        startTime: '2026-04-23T10:00:00Z',
        endTime: '2026-04-23T12:00:00Z',
        distance: 12.4,
        maxSpeed: 62,
        hardBrakingCount: 1,
        hardAccelerationCount: 0,
        duration: 7200,
        gpsTrail: [
          { lat: 25.76, lon: -80.19 },
          { lat: 25.9, lon: -80.0 },
        ],
      }),
    })

    expect(sb.upserts).toHaveLength(1)
    const call = sb.upserts[0]
    expect(call.table).toBe('telematics_trips')
    expect(call.row).toMatchObject({
      tenant_id: 't1',
      device_id: 'd1',
      car_id: 42,
      reservation_id: reservationId,
      bouncie_trip_id: 'bounce-trip-1',
      started_at: '2026-04-23T10:00:00Z',
      ended_at: '2026-04-23T12:00:00Z',
      distance_mi: 12.4,
      duration_s: 7200,
      max_speed_mph: 62,
      hard_braking_count: 1,
      hard_accel_count: 0,
      start_lat: 25.76,
      start_lon: -80.19,
      end_lat: 25.9,
      end_lon: -80.0,
    })
    expect(call.opts).toMatchObject({ onConflict: 'tenant_id,bouncie_trip_id' })

    // Reservation query constrained to tenant + car + date window around startTime
    expect(sb.reservationQuery.tenant_id).toBe('t1')
    expect(sb.reservationQuery.car_id).toBe(42)
    expect(sb.reservationQuery.lte).toEqual({ column: 'pickup_date', value: '2026-04-23' })
    expect(sb.reservationQuery.gte).toEqual({ column: 'return_date', value: '2026-04-23' })
  })

  test('leaves reservation_id null when no match', async () => {
    const sb = mkSupabase(null)
    await ingestTripEnd(sb as never, {
      tenant_id: 't1',
      device_id: 'd1',
      car_id: 42,
      event: mkTripEvent({
        transactionId: 'bounce-trip-2',
        startTime: '2026-04-23T10:00:00Z',
        endTime: '2026-04-23T12:00:00Z',
        distance: 5,
      }),
    })
    expect(sb.upserts).toHaveLength(1)
    expect(sb.upserts[0].row.reservation_id).toBeNull()
    // Defaults for missing counters
    expect(sb.upserts[0].row).toMatchObject({
      hard_braking_count: 0,
      hard_accel_count: 0,
      distance_mi: 5,
      start_lat: null,
      end_lat: null,
    })
  })

  test('skips reservation lookup when car_id is null', async () => {
    const sb = mkSupabase({ id: 'should-not-be-used' })
    await ingestTripEnd(sb as never, {
      tenant_id: 't1',
      device_id: 'd1',
      car_id: null,
      event: mkTripEvent({
        transactionId: 'bounce-trip-3',
        startTime: '2026-04-23T10:00:00Z',
        endTime: '2026-04-23T12:00:00Z',
        distance: 1,
      }),
    })
    expect(sb.upserts).toHaveLength(1)
    expect(sb.upserts[0].row.reservation_id).toBeNull()
    // The reservations query helpers were never invoked
    expect(sb.reservationQuery.tenant_id).toBeUndefined()
  })

  test('returns early (no upsert) when transactionId or startTime missing', async () => {
    const sb = mkSupabase(null)
    await ingestTripEnd(sb as never, {
      tenant_id: 't1',
      device_id: 'd1',
      car_id: 42,
      event: mkTripEvent({ distance: 5 }), // no transactionId / startTime
    })
    expect(sb.upserts).toHaveLength(0)
  })
})
