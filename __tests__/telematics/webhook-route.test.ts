/**
 * @jest-environment node
 *
 * Integration test for POST /api/telematics/webhook/bouncie.
 *
 * We mock:
 *   - '@/lib/supabase/admin'    → service-role supabase stub
 *   - '@/lib/email/telematics'  → silence the email sender (dispatchAlert)
 *
 * We assert:
 *   1. Invalid/missing Authorization → 401, no writes.
 *   2. Valid auth, fresh timestamp → 200 + expected ingest writes.
 *   3. content-length > 1 MiB → 413, no body read.
 *   4. Valid auth but stale timestamp (10 min old) → 200 + no writes.
 *
 * Bouncie has no HMAC signature scheme — it echoes the configured authKey
 * verbatim in the Authorization / X-Bouncie-Authorization headers.
 */

// Silence email module so dispatchAlert's import works in node env.
jest.mock('../../lib/email/telematics', () => ({
  sendTelematicsAlertEmail: jest.fn(() => Promise.resolve()),
}))

// ── Mock supabase admin client ────────────────────────────────────────────

interface Recorder {
  tables: Record<string, { inserts: unknown[]; upserts: unknown[]; updates: unknown[] }>
  deviceLookupImei: string | null
  deviceLookupStatus: string | null
}

const recorder: Recorder = {
  tables: {},
  deviceLookupImei: null,
  deviceLookupStatus: null,
}

function ensureTable(t: string) {
  if (!recorder.tables[t]) {
    recorder.tables[t] = { inserts: [], upserts: [], updates: [] }
  }
  return recorder.tables[t]
}

function buildAdminClient() {
  const lookupResult = {
    id: 'd1',
    tenant_id: 't1',
    car_id: 42,
    connection: { id: 'c1', status: 'active' },
  }

  const makeQuery = (table: string) => {
    const state = { filters: {} as Record<string, unknown> }
    const api: Record<string, unknown> = {
      insert: (row: Record<string, unknown>) => {
        ensureTable(table).inserts.push(row)
        return {
          select: () => ({
            single: () => Promise.resolve({ data: { id: 'ev-1' }, error: null }),
          }),
        }
      },
      upsert: (row: Record<string, unknown>, opts: Record<string, unknown>) => {
        ensureTable(table).upserts.push({ row, opts })
        return Promise.resolve({ data: null, error: null })
      },
      update: (patch: Record<string, unknown>) => ({
        eq: (_col: string, _val: unknown) => {
          ensureTable(table).updates.push(patch)
          return {
            eq: (_c2: string, _v2: unknown) => Promise.resolve({ data: null, error: null }),
            select: () => ({
              maybeSingle: () => Promise.resolve({ data: { id: 'trip-1', started_at: '2026-04-23T10:00:00Z' }, error: null }),
            }),
          }
        },
      }),
      select: (_cols?: string) => {
        const q: Record<string, unknown> = {}
        q.eq = (col: string, val: unknown) => {
          state.filters[col] = val
          if (table === 'telematics_devices') {
            if (col === 'imei') recorder.deviceLookupImei = String(val)
            if (col === 'connection.status') recorder.deviceLookupStatus = String(val)
          }
          return q
        }
        q.maybeSingle = () => {
          if (table === 'telematics_devices') {
            return Promise.resolve({ data: lookupResult, error: null })
          }
          if (table === 'telematics_geofences') {
            return Promise.resolve({ data: null, error: null })
          }
          if (table === 'reservations') {
            return Promise.resolve({ data: null, error: null })
          }
          return Promise.resolve({ data: null, error: null })
        }
        q.single = () => Promise.resolve({ data: lookupResult, error: null })
        q.lte = (_c: string, _v: unknown) => q
        q.gte = (_c: string, _v: unknown) => q
        return q
      },
    }
    return api
  }

  return {
    from(table: string) {
      ensureTable(table)
      return makeQuery(table)
    },
  }
}

jest.mock('../../lib/supabase/admin', () => ({
  createAdminClient: () => buildAdminClient(),
}))

// ── Helpers ───────────────────────────────────────────────────────────────

const SECRET = 'test-webhook-secret'

function makeRequest(body: string, authKey: string | null, contentLength?: string) {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'content-length': contentLength ?? String(Buffer.byteLength(body)),
  }
  if (authKey) headers['x-bouncie-authorization'] = authKey
  return new Request('https://app.epuredrive.com/api/telematics/webhook/bouncie', {
    method: 'POST',
    body,
    headers,
  })
}

function resetRecorder() {
  recorder.tables = {}
  recorder.deviceLookupImei = null
  recorder.deviceLookupStatus = null
}

function tripDataBody(timestamp: string): string {
  return JSON.stringify({
    eventType: 'tripData',
    imei: '123',
    vin: 'VIN1',
    transactionId: 'txn-1',
    data: [{ timestamp, speed: 42, gps: { lat: 25.76, lon: -80.19, heading: 100 } }],
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe('POST /api/telematics/webhook/bouncie', () => {
  let POST: (req: Request) => Promise<Response>

  beforeAll(async () => {
    process.env.BOUNCIE_WEBHOOK_SECRET = SECRET
    // Import AFTER env + mocks are in place.
    const mod = await import('../../app/api/telematics/webhook/bouncie/route')
    POST = mod.POST as typeof POST
  })

  beforeEach(() => {
    resetRecorder()
  })

  test('rejects invalid authorization with 401', async () => {
    const body = tripDataBody(new Date().toISOString())
    const res = await POST(makeRequest(body, 'wrong-key'))
    expect(res.status).toBe(401)
    expect(recorder.tables['telematics_positions']?.upserts?.length ?? 0).toBe(0)
  })

  test('rejects missing authorization with 401', async () => {
    const body = tripDataBody(new Date().toISOString())
    const res = await POST(makeRequest(body, null))
    expect(res.status).toBe(401)
  })

  test('accepts valid auth + fresh timestamp → 200 and writes', async () => {
    const body = tripDataBody(new Date().toISOString())
    const res = await POST(makeRequest(body, SECRET))
    expect(res.status).toBe(200)

    // device lookup used the active-connection join
    expect(recorder.deviceLookupImei).toBe('123')
    expect(recorder.deviceLookupStatus).toBe('active')

    // tripData sample → location_update → positions upsert
    expect(recorder.tables['telematics_positions']?.upserts?.length ?? 0).toBe(1)
  })

  test('rejects oversized payload with 413 (content-length > 1 MiB)', async () => {
    const tinyBody = '{}'
    const huge = String(1_048_577) // > 1 MiB
    const res = await POST(makeRequest(tinyBody, SECRET, huge))
    expect(res.status).toBe(413)
    // No writes because we rejected before auth verification even runs.
    expect(Object.keys(recorder.tables).length).toBe(0)
  })

  test('drops stale timestamps (>300 s old) even when auth is valid', async () => {
    const staleTs = new Date(Date.now() - 10 * 60 * 1000).toISOString() // 10 min ago
    const body = tripDataBody(staleTs)
    const res = await POST(makeRequest(body, SECRET))
    expect(res.status).toBe(200)
    // The event was filtered before ingest — no position written.
    expect(recorder.tables['telematics_positions']?.upserts?.length ?? 0).toBe(0)
    // Device lookup never happened either (loop is empty).
    expect(recorder.deviceLookupImei).toBeNull()
  })
})
