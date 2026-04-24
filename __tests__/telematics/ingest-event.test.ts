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
          insert: (_row: Record<string, unknown>) => {
            calls.push({ table, op: 'insert' })
            return {
              select: () => ({
                single: () =>
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
