/**
 * @jest-environment node
 */
import { dispatchAlert, titleFor, bodyFor } from '@/lib/telematics/alerts'
import type { ProviderEvent } from '@/lib/telematics/types'
import type { TelematicsSeverity } from '@/lib/supabase/types'

// ── In-memory email spy, reset per test ──────────────────────────────────

interface EmailCall {
  tenant_id: string
  event_id: string
  severity: 'warning' | 'critical'
  title: string
  link: string
}

const emailCalls: EmailCall[] = []

jest.mock('../../lib/email/telematics', () => ({
  sendTelematicsAlertEmail: jest.fn((args: EmailCall) => {
    emailCalls.push(args)
    return Promise.resolve()
  }),
}))

beforeEach(() => {
  emailCalls.length = 0
})

// ── Supabase mock ────────────────────────────────────────────────────────

interface InsertCall {
  table: string
  row: Record<string, unknown>
}

interface MockSupabase {
  inserts: InsertCall[]
  from: (table: string) => {
    insert: (row: Record<string, unknown>) => Promise<{ data: null; error: null }>
    select: (_cols?: string) => {
      eq: (_col: string, _val: unknown) => {
        maybeSingle: () => Promise<{ data: unknown; error: null }>
      }
    }
  }
}

/**
 * Tiny fluent mock supporting:
 *   .from(table).insert(row)                                      → recorded
 *   .from(table).select(cols).eq(col, val).maybeSingle()          → scripted
 *
 * `prefsRow` is what `tenant_notification_prefs.select(...).maybeSingle()`
 * should return. Pass `null` for "no prefs row exists".
 */
function mkSupabase(prefsRow: { telematics_warning_email: boolean } | null = null): MockSupabase {
  const inserts: InsertCall[] = []
  return {
    inserts,
    from(table: string) {
      return {
        insert: (row: Record<string, unknown>) => {
          inserts.push({ table, row })
          return Promise.resolve({ data: null, error: null })
        },
        select: () => ({
          eq: () => ({
            maybeSingle: () => {
              if (table === 'tenant_notification_prefs') {
                return Promise.resolve({ data: prefsRow, error: null })
              }
              return Promise.resolve({ data: null, error: null })
            },
          }),
        }),
      }
    },
  }
}

function mkEvent(
  type: ProviderEvent['type'],
  payload: Record<string, unknown> = {},
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

async function call(
  severity: TelematicsSeverity,
  event: ProviderEvent,
  prefsRow: { telematics_warning_email: boolean } | null = null,
): Promise<MockSupabase> {
  const sb = mkSupabase(prefsRow)
  await dispatchAlert(sb as never, {
    tenant_id: 't1',
    car_id: 42,
    event_id: 'ev-1',
    severity,
    event,
  })
  return sb
}

// ── Tests ────────────────────────────────────────────────────────────────

describe('dispatchAlert', () => {
  test('critical event inserts notification with severity in metadata and emails', async () => {
    const sb = await call(
      'critical',
      mkEvent('geofence_exit', { geofence_name: 'Miami HQ', geofence_id: 'g1' }),
    )
    const notif = sb.inserts.find((i) => i.table === 'notifications')
    expect(notif).toBeDefined()
    expect(notif?.row).toMatchObject({
      tenant_id: 't1',
      user_id: null,
      event: 'telematics_alert',
      title: 'Vehicle left geofence: Miami HQ',
      read: false,
    })
    const metadata = notif?.row.metadata as Record<string, unknown>
    expect(metadata).toMatchObject({
      severity: 'critical',
      event_id: 'ev-1',
      event_type: 'geofence_exit',
      car_id: 42,
      link: '/dashboard/telematics/alerts?event=ev-1',
    })

    // Email sent on critical
    expect(emailCalls).toHaveLength(1)
    expect(emailCalls[0]).toMatchObject({
      tenant_id: 't1',
      event_id: 'ev-1',
      severity: 'critical',
      title: 'Vehicle left geofence: Miami HQ',
      link: '/dashboard/telematics/alerts?event=ev-1',
    })
  })

  test('warning event inserts notification but does NOT email when tenant has not opted in', async () => {
    const sb = await call(
      'warning',
      mkEvent('speed_exceeded', { speed: 95 }),
      null, // no tenant_notification_prefs row
    )
    const notif = sb.inserts.find((i) => i.table === 'notifications')
    expect(notif).toBeDefined()
    expect(notif?.row).toMatchObject({
      title: 'Speed exceeded (95 mph)',
      event: 'telematics_alert',
    })
    const metadata = notif?.row.metadata as Record<string, unknown>
    expect(metadata).toMatchObject({ severity: 'warning', event_id: 'ev-1' })

    // Default = opt-out, so no email on warning.
    expect(emailCalls).toHaveLength(0)
  })

  test('warning event DOES email when tenant_notification_prefs.telematics_warning_email = true', async () => {
    const sb = await call(
      'warning',
      mkEvent('speed_exceeded', { speed: 95 }),
      { telematics_warning_email: true },
    )
    const notif = sb.inserts.find((i) => i.table === 'notifications')
    expect(notif).toBeDefined()

    // Email sent on warning when opted in.
    expect(emailCalls).toHaveLength(1)
    expect(emailCalls[0]).toMatchObject({
      tenant_id: 't1',
      event_id: 'ev-1',
      severity: 'warning',
      title: 'Speed exceeded (95 mph)',
    })
  })

  test('warning event does NOT email when telematics_warning_email = false (explicit opt-out)', async () => {
    await call(
      'warning',
      mkEvent('speed_exceeded', { speed: 95 }),
      { telematics_warning_email: false },
    )
    expect(emailCalls).toHaveLength(0)
  })

  test('info event still inserts notification when called but does not email', async () => {
    // Normally ingestEvent filters info out before calling dispatchAlert, but
    // the function itself must still be deterministic if called directly.
    const sb = await call('info', mkEvent('ignition_on'))
    const notif = sb.inserts.find((i) => i.table === 'notifications')
    expect(notif).toBeDefined()
    expect((notif?.row.metadata as { severity?: unknown }).severity).toBe('info')
    expect(emailCalls).toHaveLength(0)
  })

  test('email failure does not throw (ingestion stays alive)', async () => {
    const mod = await import('../../lib/email/telematics')
    const mocked = mod.sendTelematicsAlertEmail as jest.Mock
    mocked.mockRejectedValueOnce(new Error('resend down'))
    // Silence the expected console.warn so test output stays clean.
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    await expect(
      call('critical', mkEvent('connection_expired')),
    ).resolves.toBeDefined()
    expect(emailCalls).toHaveLength(0) // rejected, so no call recorded
    expect(warnSpy).toHaveBeenCalledWith(
      '[telematics/alerts] email send failed:',
      'resend down',
    )
    warnSpy.mockRestore()
  })
})

describe('titleFor / bodyFor', () => {
  test('titleFor covers main event types', () => {
    expect(titleFor('geofence_exit', {})).toBe('Vehicle left geofence')
    expect(titleFor('geofence_exit', { geofence_name: 'Zone A' })).toBe(
      'Vehicle left geofence: Zone A',
    )
    expect(titleFor('speed_exceeded', { speed: 80 })).toBe('Speed exceeded (80 mph)')
    expect(titleFor('dtc_new', { code: 'P0420' })).toBe('New diagnostic code: P0420')
    expect(titleFor('battery_low', {})).toBe('Low battery voltage')
    expect(titleFor('connection_expired', {})).toContain('reconnect')
  })

  test('bodyFor composes coords and speed when present', () => {
    const event = {
      provider_event_id: null,
      imei: '123',
      type: 'speed_exceeded' as const,
      occurred_at: '2026-04-23T12:00:00Z',
      lat: 25.7617,
      lon: -80.1918,
      speed_mph: 95,
      odometer_mi: null,
      payload: {},
    }
    expect(bodyFor(event)).toBe('25.7617, -80.1918 · 95 mph')
  })

  test('bodyFor is empty when neither coords nor speed present', () => {
    const event = {
      provider_event_id: null,
      imei: '123',
      type: 'connection_expired' as const,
      occurred_at: '2026-04-23T12:00:00Z',
      lat: null,
      lon: null,
      speed_mph: null,
      odometer_mi: null,
      payload: {},
    }
    expect(bodyFor(event)).toBe('')
  })
})
