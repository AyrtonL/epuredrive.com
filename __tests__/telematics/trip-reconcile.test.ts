/**
 * @jest-environment node
 */
import { reconcileTrips, tripRow } from '@/lib/telematics/trip-reconcile'
import type { ProviderTrip } from '@/lib/telematics/types'

const device = { tenant_id: 't1', device_id: 'd1', car_id: 1, imei: '865' }

function trip(id: string, overrides: Partial<ProviderTrip> = {}): ProviderTrip {
  return {
    provider_trip_id: id,
    imei: '865',
    started_at: '2026-10-10T17:17:05.000Z',
    ended_at: '2026-10-10T17:40:00.000Z',
    start_lat: null,
    start_lon: null,
    end_lat: null,
    end_lon: null,
    distance_mi: 5.7,
    duration_s: 1375,
    max_speed_mph: 52.8,
    hard_braking_count: 0,
    hard_accel_count: 1,
    fuel_consumed_gal: 0.26,
    ...overrides,
  }
}

interface Calls {
  upserts: Array<{ rows: Record<string, unknown>[]; opts: unknown }>
  reservationUpdates: Array<{ patch: unknown; id: unknown }>
}

function mkSupabase(existing: unknown[], reservationId: string | null = null) {
  const calls: Calls = { upserts: [], reservationUpdates: [] }
  const sb = {
    from(table: string) {
      if (table === 'telematics_trips') {
        return {
          select: () => ({
            eq: () => ({ in: () => Promise.resolve({ data: existing, error: null }) }),
          }),
          upsert: (rows: Record<string, unknown>[], opts: unknown) => {
            calls.upserts.push({ rows, opts })
            return {
              select: () =>
                Promise.resolve({
                  data: rows.map((r, i) => ({
                    id: `row-${i}`,
                    started_at: r.started_at,
                    reservation_id: null,
                  })),
                  error: null,
                }),
            }
          },
          update: (patch: unknown) => ({
            eq: (_c: string, id: unknown) => {
              calls.reservationUpdates.push({ patch, id })
              return Promise.resolve({ error: null })
            },
          }),
        }
      }
      if (table === 'reservations') {
        const chain = {
          select: () => chain,
          eq: () => chain,
          lte: () => chain,
          gte: () => chain,
          maybeSingle: () =>
            Promise.resolve({ data: reservationId ? { id: reservationId } : null, error: null }),
        }
        return chain
      }
      throw new Error(`unexpected table ${table}`)
    },
  }
  return { sb: sb as never, calls }
}

describe('reconcileTrips', () => {
  test('inserts trips missing from DB and completes open ones; skips complete ones', async () => {
    const provider = {
      listTrips: jest.fn().mockResolvedValue([trip('a'), trip('b'), trip('c')]),
    }
    const { sb, calls } = mkSupabase([
      { bouncie_trip_id: 'a', ended_at: '2026-10-10T17:40:00Z', distance_mi: 5.7 }, // complete
      { bouncie_trip_id: 'b', ended_at: null, distance_mi: null }, // webhook lost the end
      // 'c' missing entirely
    ])

    const res = await reconcileTrips(sb, provider, 'tok', device, new Date('2026-10-09'))

    expect(res).toEqual({ fetched: 3, written: 2 })
    expect(calls.upserts).toHaveLength(1)
    expect(calls.upserts[0].rows.map((r) => r.bouncie_trip_id)).toEqual(['b', 'c'])
    expect(calls.upserts[0].opts).toEqual({ onConflict: 'tenant_id,bouncie_trip_id' })
    expect(calls.upserts[0].rows[0]).toMatchObject({
      distance_mi: 5.7,
      ended_at: '2026-10-10T17:40:00.000Z',
      car_id: 1,
      device_id: 'd1',
    })
  })

  test('ignores in-progress trips (no endTime) and writes nothing when all complete', async () => {
    const provider = {
      listTrips: jest
        .fn()
        .mockResolvedValue([trip('a'), trip('live', { ended_at: null })]),
    }
    const { sb, calls } = mkSupabase([
      { bouncie_trip_id: 'a', ended_at: '2026-10-10T17:40:00Z', distance_mi: 5.7 },
    ])

    const res = await reconcileTrips(sb, provider, 'tok', device, new Date('2026-10-09'))

    expect(res).toEqual({ fetched: 1, written: 0 })
    expect(calls.upserts).toHaveLength(0)
  })

  test('links newly written trips to the matching reservation', async () => {
    const provider = { listTrips: jest.fn().mockResolvedValue([trip('c')]) }
    const { sb, calls } = mkSupabase([], 'res-1')

    await reconcileTrips(sb, provider, 'tok', device, new Date('2026-10-09'))

    expect(calls.reservationUpdates).toEqual([
      { patch: { reservation_id: 'res-1' }, id: 'row-0' },
    ])
  })
})

describe('tripRow', () => {
  test('omits null optional fields so webhook-set coordinates are not clobbered', () => {
    const row = tripRow(device, trip('x'))
    expect(row).not.toHaveProperty('start_lat')
    expect(row).not.toHaveProperty('end_lon')
    expect(row).toHaveProperty('fuel_consumed_gal', 0.26)
  })
})
