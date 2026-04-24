/**
 * @jest-environment node
 */
import { ingestLocationUpdate } from '@/lib/telematics/ingest'
import type { ProviderEvent } from '@/lib/telematics/types'

interface InsertCall {
  table: string
  row: Record<string, unknown>
}

interface UpdateCall {
  table: string
  match: Record<string, unknown>
  patch: Record<string, unknown>
}

interface MockSupabase {
  inserts: InsertCall[]
  updates: UpdateCall[]
  from: (table: string) => {
    insert: (row: Record<string, unknown>) => Promise<{ data: null; error: null }>
    update: (patch: Record<string, unknown>) => {
      eq: (col: string, val: unknown) => Promise<{ data: null; error: null }>
    }
  }
}

function mkSupabase(): MockSupabase {
  const inserts: InsertCall[] = []
  const updates: UpdateCall[] = []
  const sb = {
    inserts,
    updates,
    from(table: string) {
      return {
        insert: (row: Record<string, unknown>) => {
          inserts.push({ table, row })
          return Promise.resolve({ data: null, error: null })
        },
        update: (patch: Record<string, unknown>) => ({
          eq: (col: string, val: unknown) => {
            updates.push({ table, match: { [col]: val }, patch })
            return Promise.resolve({ data: null, error: null })
          },
        }),
      }
    },
  }
  return sb
}

function mkEvent(overrides: Partial<ProviderEvent> = {}): ProviderEvent {
  return {
    provider_event_id: null,
    imei: '123',
    type: 'location_update',
    occurred_at: '2026-04-23T12:00:00Z',
    lat: 25.76,
    lon: -80.19,
    speed_mph: 42,
    odometer_mi: 42015,
    payload: {},
    ...overrides,
  }
}

describe('ingestLocationUpdate', () => {
  test('inserts position, updates device, and updates car', async () => {
    const sb = mkSupabase()
    await ingestLocationUpdate(sb as never, {
      tenant_id: 't1',
      device_id: 'd1',
      car_id: 42,
      event: mkEvent(),
    })

    // position insert
    const pos = sb.inserts.find((i) => i.table === 'telematics_positions')
    expect(pos).toBeDefined()
    expect(pos?.row).toMatchObject({
      tenant_id: 't1',
      device_id: 'd1',
      car_id: 42,
      lat: 25.76,
      lon: -80.19,
      speed_mph: 42,
      odometer_mi: 42015,
      recorded_at: '2026-04-23T12:00:00Z',
    })

    // device update
    const dev = sb.updates.find((u) => u.table === 'telematics_devices')
    expect(dev).toBeDefined()
    expect(dev?.patch).toMatchObject({
      last_seen_at: '2026-04-23T12:00:00Z',
      online: true,
    })
    expect(dev?.match).toEqual({ id: 'd1' })

    // car update
    const car = sb.updates.find((u) => u.table === 'cars')
    expect(car).toBeDefined()
    expect(car?.patch).toMatchObject({
      last_lat: 25.76,
      last_lon: -80.19,
      last_seen_at: '2026-04-23T12:00:00Z',
      mileage: 42015,
    })
    expect(car?.match).toEqual({ id: 42 })
  })

  test('skips car update when car_id is null', async () => {
    const sb = mkSupabase()
    await ingestLocationUpdate(sb as never, {
      tenant_id: 't1',
      device_id: 'd1',
      car_id: null,
      event: mkEvent({ lat: 0, lon: 0, speed_mph: null, odometer_mi: null }),
    })
    expect(sb.inserts.find((i) => i.table === 'telematics_positions')).toBeDefined()
    expect(sb.updates.find((u) => u.table === 'cars')).toBeUndefined()
    // device still updated
    expect(sb.updates.find((u) => u.table === 'telematics_devices')).toBeDefined()
  })

  test('skips entirely when lat/lon is null', async () => {
    const sb = mkSupabase()
    await ingestLocationUpdate(sb as never, {
      tenant_id: 't1',
      device_id: 'd1',
      car_id: 42,
      event: mkEvent({ lat: null, lon: null }),
    })
    expect(sb.inserts).toHaveLength(0)
    expect(sb.updates).toHaveLength(0)
  })

  test('omits mileage from car patch when odometer_mi is null', async () => {
    const sb = mkSupabase()
    await ingestLocationUpdate(sb as never, {
      tenant_id: 't1',
      device_id: 'd1',
      car_id: 42,
      event: mkEvent({ odometer_mi: null }),
    })
    const car = sb.updates.find((u) => u.table === 'cars')
    expect(car).toBeDefined()
    expect(car?.patch).not.toHaveProperty('mileage')
    expect(car?.patch).toMatchObject({
      last_lat: 25.76,
      last_lon: -80.19,
      last_seen_at: '2026-04-23T12:00:00Z',
    })
  })

  test('picks up heading and ignition from payload', async () => {
    const sb = mkSupabase()
    await ingestLocationUpdate(sb as never, {
      tenant_id: 't1',
      device_id: 'd1',
      car_id: 42,
      event: mkEvent({ payload: { heading: 180, ignition: true } }),
    })
    const pos = sb.inserts.find((i) => i.table === 'telematics_positions')
    expect(pos?.row).toMatchObject({ heading: 180, ignition: true })
  })
})
