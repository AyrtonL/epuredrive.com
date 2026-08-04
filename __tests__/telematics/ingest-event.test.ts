/**
 * @jest-environment node
 */
import { ingestEvent } from '@/lib/telematics/ingest'
import type { ProviderEvent } from '@/lib/telematics/types'

// Silence the email module: we only care about the notifications insert here.
jest.mock('../../lib/email/telematics', () => ({
  sendTelematicsAlertEmail: jest.fn(() => Promise.resolve()),
}))

function mkEvent(
  type: ProviderEvent['type'] = 'connection_expired',
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
    payload: {},
    ...overrides,
  }
}

/**
 * Build a supabase stub where specific tables return an error on insert.
 * telematics_events.insert still returns a row id so we exercise the
 * dispatchAlert path, but notifications.insert throws/returns an error to
 * simulate a transient DB failure on the alert dispatch.
 */
function mkSupabaseWithNotificationsError(): {
  calls: Array<{ table: string; op: string }>
  client: unknown
} {
  const calls: Array<{ table: string; op: string }> = []
  const client = {
    from(table: string) {
      if (table === 'telematics_events') {
        return {
          // ingestEvent() now upserts (dedupe on tenant_id/device_id/
          // event_type/occurred_at) instead of a plain insert.
          upsert: (_row: Record<string, unknown>, _opts: Record<string, unknown>) => {
            calls.push({ table, op: 'insert' })
            return {
              select: () => ({
                maybeSingle: () =>
                  Promise.resolve({ data: { id: 'ev-xyz' }, error: null }),
              }),
            }
          },
        }
      }
      if (table === 'notifications') {
        return {
          insert: (_row: Record<string, unknown>) => {
            calls.push({ table, op: 'insert' })
            // Return an error-shaped response — supabase-js does NOT throw
            // on query errors, but dispatchAlert doesn't check this error,
            // so to prove the try/catch guards against *any* throw we
            // reject the promise.
            return Promise.reject(new Error('notifications table down'))
          },
        }
      }
      if (table === 'telematics_geofences') {
        // classifyEvent short-circuits before touching this for
        // connection_expired, so this stub is a defensive catch-all.
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: null, error: null }),
              }),
            }),
          }),
        }
      }
      return {
        insert: () => Promise.resolve({ data: null, error: null }),
      }
    },
  }
  return { calls, client }
}

describe('ingestEvent — dispatchAlert failure isolation (HIGH #1)', () => {
  test('does not throw when dispatchAlert rejects (webhook loop stays alive)', async () => {
    const { calls, client } = mkSupabaseWithNotificationsError()
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

    // connection_expired → severity:critical, shouldNotify:true → dispatchAlert runs
    await expect(
      ingestEvent(client as never, {
        tenant_id: 't1',
        device_id: 'd1',
        car_id: 42,
        event: mkEvent('connection_expired'),
      }),
    ).resolves.toBeUndefined()

    // event row was still written
    expect(calls.find((c) => c.table === 'telematics_events')).toBeDefined()
    // dispatchAlert was entered and attempted the notifications insert
    expect(calls.find((c) => c.table === 'notifications')).toBeDefined()
    // and its failure was logged via the ingest guard (not rethrown)
    expect(warnSpy).toHaveBeenCalledWith(
      '[telematics] dispatchAlert failed',
      'notifications table down',
    )

    warnSpy.mockRestore()
  })
})

/**
 * Build a supabase stub that tracks a single telematics_devices row's
 * mil_on state and every telematics_events insert, for exercising
 * isStaleMilEvent's transition gating.
 */
function mkSupabaseWithDevice(initialMilOn: boolean | null): {
  events: Array<Record<string, unknown>>
  device: { mil_on: boolean | null }
  client: unknown
} {
  const events: Array<Record<string, unknown>> = []
  const device = { mil_on: initialMilOn }
  const client = {
    from(table: string) {
      if (table === 'telematics_devices') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: { mil_on: device.mil_on }, error: null }),
            }),
          }),
          update: (patch: { mil_on: boolean }) => ({
            eq: () => {
              device.mil_on = patch.mil_on
              return Promise.resolve({ data: null, error: null })
            },
          }),
        }
      }
      if (table === 'telematics_events') {
        return {
          upsert: (row: Record<string, unknown>) => {
            events.push(row)
            return {
              select: () => ({
                maybeSingle: () =>
                  Promise.resolve({ data: { id: `ev-${events.length}` }, error: null }),
              }),
            }
          },
        }
      }
      return {
        insert: () => Promise.resolve({ data: null, error: null }),
        select: () => ({
          eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
        }),
      }
    },
  }
  return { events, device, client }
}

describe('ingestEvent — MIL transition gating', () => {
  test('a genuine ON transition (mil_on false→true) is recorded and updates device state', async () => {
    const { events, device, client } = mkSupabaseWithDevice(false)

    await ingestEvent(client as never, {
      tenant_id: 't1',
      device_id: 'd1',
      car_id: 42,
      event: mkEvent('dtc_new', { payload: { code: 'P0420' } }),
    })

    expect(events).toHaveLength(1)
    expect(device.mil_on).toBe(true)
  })

  test('Bouncie resending mil ON while already known-on is dropped, not re-alerted', async () => {
    // Reproduces the production bug: Bouncie's 'mil' webhook has no "off"
    // value and resends "ON" repeatedly while the light stays lit — this
    // must not create a fresh alert every time.
    const { events, device, client } = mkSupabaseWithDevice(true)

    await ingestEvent(client as never, {
      tenant_id: 't1',
      device_id: 'd1',
      car_id: 42,
      event: mkEvent('dtc_new', { occurred_at: '2026-04-23T13:00:00Z' }),
    })

    expect(events).toHaveLength(0)
    expect(device.mil_on).toBe(true)
  })

  test('a genuine cleared transition (mil_on true→false) is recorded', async () => {
    const { events, device, client } = mkSupabaseWithDevice(true)

    await ingestEvent(client as never, {
      tenant_id: 't1',
      device_id: 'd1',
      car_id: 42,
      event: mkEvent('dtc_cleared'),
    })

    expect(events).toHaveLength(1)
    expect(device.mil_on).toBe(false)
  })

  test('a redundant cleared event when already off is dropped', async () => {
    const { events, device, client } = mkSupabaseWithDevice(false)

    await ingestEvent(client as never, {
      tenant_id: 't1',
      device_id: 'd1',
      car_id: 42,
      event: mkEvent('dtc_cleared'),
    })

    expect(events).toHaveLength(0)
    expect(device.mil_on).toBe(false)
  })
})
