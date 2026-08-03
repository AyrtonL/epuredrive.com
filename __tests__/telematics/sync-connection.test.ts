/**
 * @jest-environment node
 */
import { syncConnection } from '@/lib/telematics/sync'
import type { TelematicsConnection } from '@/lib/supabase/types'

// We mock the provider registry so we can drive listVehicles / refresh
// outcomes directly. The real BouncieProvider hits the network.
jest.mock('../../lib/telematics/registry', () => ({
  getProvider: jest.fn(),
}))

import { getProvider } from '@/lib/telematics/registry'

interface TrackedUpdate {
  table: string
  match: Record<string, unknown>
  patch: Record<string, unknown>
}
interface TrackedInsert {
  table: string
  row: Record<string, unknown>
}
interface TrackedUpsert {
  table: string
  row: Record<string, unknown>
  opts: Record<string, unknown>
}

interface MockSupabase {
  inserts: TrackedInsert[]
  updates: TrackedUpdate[]
  upserts: TrackedUpsert[]
  setDevice: (imei: string, dev: unknown) => void
  from: (table: string) => unknown
}

// Build a flexible supabase stub that supports the call shapes used by
// sync.ts + ingestLocationUpdate:
//   - .update(patch).eq(col, val)
//   - .insert(row)
//   - .upsert(row, opts)
//   - .select('...').eq().eq().maybeSingle()
function mkSupabase(): MockSupabase {
  const inserts: TrackedInsert[] = []
  const updates: TrackedUpdate[] = []
  const upserts: TrackedUpsert[] = []
  const devicesByImei: Record<string, unknown> = {}

  const sb: MockSupabase = {
    inserts,
    updates,
    upserts,
    setDevice(imei: string, dev: unknown) {
      devicesByImei[imei] = dev
    },
    from(table: string) {
      if (table === 'telematics_devices') {
        return {
          select: (_cols: string) => ({
            eq: (_col1: string, _val1: unknown) => ({
              eq: (_col2: string, val2: unknown) => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: devicesByImei[String(val2)] ?? null,
                    error: null,
                  }),
              }),
            }),
          }),
          // ingestLocationUpdate also calls .update(...).eq('id', ...) on
          // telematics_devices when it forwards a position.
          update: (patch: Record<string, unknown>) => ({
            eq: (col: string, val: unknown) => {
              updates.push({ table, match: { [col]: val }, patch })
              return Promise.resolve({ data: null, error: null })
            },
          }),
          // seedDevice() calls .upsert(row, opts).select(cols).single() when
          // a vehicle has no matching device row yet.
          upsert: (row: Record<string, unknown>, opts: Record<string, unknown>) => {
            upserts.push({ table, row, opts })
            const seeded = {
              id: `dev-${String(row.imei)}`,
              car_id: null,
              last_seen_at: row.last_seen_at ?? null,
              mil_on: row.mil_on ?? null,
            }
            devicesByImei[String(row.imei)] = seeded
            return {
              select: (_cols: string) => ({
                single: () => Promise.resolve({ data: seeded, error: null }),
              }),
            }
          },
        }
      }

      if (table === 'telematics_connections') {
        return {
          update: (patch: Record<string, unknown>) => ({
            eq: (col: string, val: unknown) => {
              updates.push({ table, match: { [col]: val }, patch })
              return Promise.resolve({ data: null, error: null })
            },
          }),
        }
      }

      if (table === 'telematics_events') {
        return {
          // ingestEvent() chains .insert(row).select('id').single(), while
          // the connection_expired path (sync.ts) just awaits .insert(row)
          // directly — support both by returning a thenable that also
          // exposes .select().single().
          insert: (row: Record<string, unknown>) => {
            inserts.push({ table, row })
            const result = { data: { id: `evt-${inserts.length}` }, error: null }
            return {
              then: (resolve: (v: typeof result) => void) => resolve(result),
              select: (_cols: string) => ({
                single: () => Promise.resolve(result),
              }),
            }
          },
        }
      }

      if (table === 'notifications' || table === 'tenant_notification_prefs') {
        // dispatchAlert() side effects — irrelevant to sync reconciliation
        // tests, and any failure here is swallowed by ingestEvent's
        // try/catch, so a minimal stub is enough.
        return {
          insert: () => Promise.resolve({ data: null, error: null }),
          select: () => ({
            eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
          }),
        }
      }

      // telematics_positions + cars: accept upsert/update silently so
      // ingestLocationUpdate doesn't blow up.
      if (table === 'telematics_positions') {
        return {
          upsert: (row: Record<string, unknown>, opts: Record<string, unknown>) => {
            upserts.push({ table, row, opts })
            return Promise.resolve({ data: null, error: null })
          },
        }
      }
      if (table === 'cars') {
        return {
          update: (patch: Record<string, unknown>) => ({
            eq: (col: string, val: unknown) => {
              updates.push({ table, match: { [col]: val }, patch })
              return Promise.resolve({ data: null, error: null })
            },
          }),
        }
      }

      // Catch-all
      return {
        insert: (row: Record<string, unknown>) => {
          inserts.push({ table, row })
          return Promise.resolve({ data: null, error: null })
        },
      }
    },
  }

  return sb
}

function mkConnection(
  overrides: Partial<TelematicsConnection> = {},
): TelematicsConnection {
  return {
    id: 'conn-1',
    tenant_id: 't1',
    provider: 'bouncie',
    access_token: 'at-existing',
    refresh_token: 'rt-existing',
    // far-future by default so needsRefresh() is false
    token_expires_at: '2099-01-01T00:00:00.000Z',
    scope: null,
    account_email: null,
    connected_at: '2026-01-01T00:00:00.000Z',
    last_sync_at: null,
    status: 'active',
    error_message: null,
    ...overrides,
  }
}

describe('syncConnection', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  test('refreshes an expiring token and updates the connection row', async () => {
    const newTokens = {
      access_token: 'at-new',
      refresh_token: 'rt-new',
      expires_at: '2099-06-01T00:00:00.000Z',
      scope: 'read:vehicles',
      account_email: null,
    }
    const listVehicles = jest.fn().mockResolvedValue([])
    ;(getProvider as jest.Mock).mockReturnValue({
      refreshAccessToken: jest.fn().mockResolvedValue(newTokens),
      listVehicles,
    })

    const sb = mkSupabase()
    // token_expires_at = 30s in the future → needsRefresh() triggers
    const expiringSoon = new Date(Date.now() + 30_000).toISOString()

    await syncConnection(
      sb as never,
      mkConnection({ token_expires_at: expiringSoon }),
    )

    // token row was patched with refreshed values
    const tokenPatch = sb.updates.find(
      (u) =>
        u.table === 'telematics_connections' &&
        u.patch.access_token === 'at-new',
    )
    expect(tokenPatch).toBeDefined()
    expect(tokenPatch?.patch).toMatchObject({
      access_token: 'at-new',
      refresh_token: 'rt-new',
      token_expires_at: '2099-06-01T00:00:00.000Z',
      status: 'active',
      error_message: null,
    })
    expect(tokenPatch?.match).toEqual({ id: 'conn-1' })

    // listVehicles was called with the NEW token, not the stale one
    expect(listVehicles).toHaveBeenCalledWith('at-new')

    // last_sync_at bump on success (no listVehicles error)
    const successPatch = sb.updates.find(
      (u) =>
        u.table === 'telematics_connections' && u.patch.last_sync_at !== undefined,
    )
    expect(successPatch).toBeDefined()
    expect(successPatch?.patch).toMatchObject({ error_message: null })

    // no connection_expired event was emitted
    expect(
      sb.inserts.find(
        (i) =>
          i.table === 'telematics_events' &&
          i.row.event_type === 'connection_expired',
      ),
    ).toBeUndefined()
  })

  test('marks connection expired and emits connection_expired event when refresh fails', async () => {
    ;(getProvider as jest.Mock).mockReturnValue({
      refreshAccessToken: jest
        .fn()
        .mockRejectedValue(new Error('HTTP 400 invalid_grant')),
      listVehicles: jest.fn(), // must not be called
    })

    const sb = mkSupabase()
    const expiringSoon = new Date(Date.now() + 30_000).toISOString()
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

    await syncConnection(
      sb as never,
      mkConnection({ token_expires_at: expiringSoon }),
    )

    // status set to 'expired' with sanitized error_message
    const expiredPatch = sb.updates.find(
      (u) =>
        u.table === 'telematics_connections' && u.patch.status === 'expired',
    )
    expect(expiredPatch).toBeDefined()
    expect(expiredPatch?.patch).toMatchObject({ status: 'expired' })
    expect(typeof expiredPatch?.patch.error_message).toBe('string')
    expect(expiredPatch?.match).toEqual({ id: 'conn-1' })

    // connection_expired event inserted (critical)
    const expiredEvent = sb.inserts.find(
      (i) =>
        i.table === 'telematics_events' &&
        i.row.event_type === 'connection_expired',
    )
    expect(expiredEvent).toBeDefined()
    expect(expiredEvent?.row).toMatchObject({
      tenant_id: 't1',
      event_type: 'connection_expired',
      severity: 'critical',
    })
    expect(expiredEvent?.row.payload).toMatchObject({
      reason: 'refresh_failed',
    })

    // listVehicles must NOT have been called after a failed refresh
    const prov = (getProvider as jest.Mock).mock.results[0].value
    expect(prov.listVehicles).not.toHaveBeenCalled()

    // and we must not have written the raw error object — only a string msg.
    // (safeErr always returns a string.)
    expect(typeof expiredPatch?.patch.error_message).toBe('string')

    warnSpy.mockRestore()
  })

  test('sets status=error with sanitized message when listVehicles throws', async () => {
    ;(getProvider as jest.Mock).mockReturnValue({
      refreshAccessToken: jest.fn(),
      listVehicles: jest
        .fn()
        .mockRejectedValue(
          new Error('fetch failed with Bearer abc123xyz in url'),
        ),
    })

    const sb = mkSupabase()
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

    // token not near expiry → refresh path is skipped
    await syncConnection(sb as never, mkConnection())

    const errorPatch = sb.updates.find(
      (u) =>
        u.table === 'telematics_connections' && u.patch.status === 'error',
    )
    expect(errorPatch).toBeDefined()
    expect(errorPatch?.patch).toMatchObject({ status: 'error' })
    const msg = errorPatch?.patch.error_message
    expect(typeof msg).toBe('string')
    // Bearer tokens must be redacted before being written to the DB.
    expect(String(msg)).not.toContain('abc123xyz')
    expect(String(msg)).toContain('[redacted]')

    // last_sync_at success path was NOT hit
    const syncPatch = sb.updates.find(
      (u) =>
        u.table === 'telematics_connections' &&
        u.patch.last_sync_at !== undefined &&
        u.patch.status === undefined,
    )
    expect(syncPatch).toBeUndefined()

    warnSpy.mockRestore()
  })

  test('auto-seeds a telematics_devices row for a vehicle with no existing device, then ingests its position', async () => {
    const vehicle = {
      imei: 'imei-new',
      vin: 'VIN123',
      nickname: 'New Car',
      online: true,
      last_seen_at: '2026-07-30T20:00:00.000Z',
      last_lat: 25.7,
      last_lon: -80.2,
      odometer_mi: 1000,
      battery_voltage: null,
      mil_on: null,
    }
    ;(getProvider as jest.Mock).mockReturnValue({
      refreshAccessToken: jest.fn(),
      listVehicles: jest.fn().mockResolvedValue([vehicle]),
    })

    const sb = mkSupabase()
    // no setDevice() call — imei-new has no matching row yet

    await syncConnection(sb as never, mkConnection())

    // device row was created via upsert (not skipped)
    const seedUpsert = sb.upserts.find(
      (u) => u.table === 'telematics_devices' && u.row.imei === 'imei-new',
    )
    expect(seedUpsert).toBeDefined()
    expect(seedUpsert?.row).toMatchObject({
      tenant_id: 't1',
      connection_id: 'conn-1',
      imei: 'imei-new',
      vin: 'VIN123',
      nickname: 'New Car',
    })
    expect(seedUpsert?.opts).toMatchObject({ onConflict: 'tenant_id,imei' })

    // freshly seeded device (devSeen === provSeen) is not "fresher", so no
    // position write is expected on this same pass — it self-heals the
    // device row and lets the *next* cycle pick up movement.
    const positionUpsert = sb.upserts.find((u) => u.table === 'telematics_positions')
    expect(positionUpsert).toBeUndefined()

    // sync still completes successfully
    const successPatch = sb.updates.find(
      (u) =>
        u.table === 'telematics_connections' && u.patch.last_sync_at !== undefined,
    )
    expect(successPatch).toBeDefined()
  })

  test('recovers a missed check-engine (MIL) webhook by diffing provider state against the last known device state', async () => {
    const vehicle = {
      imei: 'imei-cayenne',
      vin: 'VIN-CAYENNE',
      nickname: 'Cayenne',
      online: true,
      last_seen_at: '2026-08-03T10:00:00.000Z',
      last_lat: null,
      last_lon: null,
      odometer_mi: null,
      battery_voltage: null,
      mil_on: true, // Bouncie's /vehicles endpoint reports the light is on...
    }
    ;(getProvider as jest.Mock).mockReturnValue({
      refreshAccessToken: jest.fn(),
      listVehicles: jest.fn().mockResolvedValue([vehicle]),
    })

    const sb = mkSupabase()
    // ...but our last recorded state (from before/missed webhook) says off.
    sb.setDevice('imei-cayenne', {
      id: 'dev-cayenne',
      car_id: 42,
      last_seen_at: '2026-08-03T09:00:00.000Z',
      mil_on: false,
    })

    await syncConnection(sb as never, mkConnection())

    const dtcEvent = sb.inserts.find(
      (i) => i.table === 'telematics_events' && i.row.event_type === 'dtc_new',
    )
    expect(dtcEvent).toBeDefined()
    expect(dtcEvent?.row).toMatchObject({
      tenant_id: 't1',
      device_id: 'dev-cayenne',
      car_id: 42,
      event_type: 'dtc_new',
      severity: 'warning',
    })

    // the device's recorded mil_on state is updated so the next cycle
    // doesn't re-fire the same alert.
    const milPatch = sb.updates.find(
      (u) =>
        u.table === 'telematics_devices' &&
        u.match.id === 'dev-cayenne' &&
        u.patch.mil_on === true,
    )
    expect(milPatch).toBeDefined()
  })

  test('does not re-emit a dtc_new event when provider MIL state matches the last recorded state', async () => {
    const vehicle = {
      imei: 'imei-steady',
      vin: 'VIN-STEADY',
      nickname: 'Steady',
      online: true,
      last_seen_at: '2026-08-03T10:00:00.000Z',
      last_lat: null,
      last_lon: null,
      odometer_mi: null,
      battery_voltage: null,
      mil_on: true,
    }
    ;(getProvider as jest.Mock).mockReturnValue({
      refreshAccessToken: jest.fn(),
      listVehicles: jest.fn().mockResolvedValue([vehicle]),
    })

    const sb = mkSupabase()
    sb.setDevice('imei-steady', {
      id: 'dev-steady',
      car_id: 7,
      last_seen_at: '2026-08-03T09:00:00.000Z',
      mil_on: true, // already recorded as on — no new transition
    })

    await syncConnection(sb as never, mkConnection())

    const dtcEvent = sb.inserts.find(
      (i) => i.table === 'telematics_events' && i.row.event_type === 'dtc_new',
    )
    expect(dtcEvent).toBeUndefined()
  })

  test('does not attempt MIL reconciliation when the provider does not report mil_on', async () => {
    const vehicle = {
      imei: 'imei-unsupported',
      vin: null,
      nickname: null,
      online: true,
      last_seen_at: '2026-08-03T10:00:00.000Z',
      last_lat: null,
      last_lon: null,
      odometer_mi: null,
      battery_voltage: null,
      mil_on: null, // provider doesn't expose MIL state
    }
    ;(getProvider as jest.Mock).mockReturnValue({
      refreshAccessToken: jest.fn(),
      listVehicles: jest.fn().mockResolvedValue([vehicle]),
    })

    const sb = mkSupabase()
    sb.setDevice('imei-unsupported', {
      id: 'dev-unsupported',
      car_id: null,
      last_seen_at: '2026-08-03T09:00:00.000Z',
      mil_on: false,
    })

    await syncConnection(sb as never, mkConnection())

    const dtcEvent = sb.inserts.find(
      (i) => i.table === 'telematics_events' && i.row.event_type === 'dtc_new',
    )
    expect(dtcEvent).toBeUndefined()
  })
})
