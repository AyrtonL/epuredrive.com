/**
 * @jest-environment node
 */
import { reservationEventId, createReservationCalendarEvent } from '@/lib/google-calendar'

const maybeSingle = jest.fn()
const update = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ data: null, error: null }) })

jest.mock('../../lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({ maybeSingle }),
        }),
      }),
      update,
    }),
  }),
}))

const CONNECTION = {
  id: 'conn-1',
  tenant_id: 'tenant-1',
  access_token: 'tok',
  refresh_token: 'ref',
  calendar_id: 'primary',
}

const DETAILS = {
  customerName: 'Jane',
  customerPhone: null,
  carName: 'Audi A3',
  pickupDate: '2026-09-01',
  pickupTime: '10:00',
  pickupLocation: 'Aventura',
  returnDate: '2026-09-05',
  returnTime: '10:00',
  returnLocation: null,
  bookingCode: 'E-TEST01',
  notes: null,
}

describe('reservationEventId', () => {
  test('is deterministic for the same reservation id', () => {
    expect(reservationEventId('abc-123')).toBe(reservationEventId('abc-123'))
    expect(reservationEventId(42)).toBe(reservationEventId('42'))
  })

  test('differs across reservations', () => {
    expect(reservationEventId('a')).not.toBe(reservationEventId('b'))
  })

  test('only uses base32hex-safe characters Google accepts', () => {
    expect(reservationEventId('some-uuid-value')).toMatch(/^[a-v0-9]{5,1024}$/)
  })
})

describe('createReservationCalendarEvent', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
    maybeSingle.mockResolvedValue({ data: CONNECTION, error: null })
    update.mockClear()
  })

  test('sends the deterministic id in the insert body', async () => {
    let capturedBody: Record<string, unknown> = {}
    jest.spyOn(global, 'fetch').mockImplementation(async (_url, init) => {
      capturedBody = JSON.parse(String(init?.body ?? '{}'))
      return new Response(JSON.stringify({ id: capturedBody.id }), { status: 200 })
    })

    const id = await createReservationCalendarEvent('tenant-1', 'res-1', DETAILS)

    expect(id).toBe(reservationEventId('res-1'))
    expect(capturedBody.id).toBe(reservationEventId('res-1'))
  })

  test('treats a 409 conflict as success and returns the same id', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: { code: 409 } }), { status: 409 }),
    )

    const id = await createReservationCalendarEvent('tenant-1', 'res-1', DETAILS)

    expect(id).toBe(reservationEventId('res-1'))
  })

  test('still throws on a real API failure', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response('boom', { status: 500 }))

    await expect(createReservationCalendarEvent('tenant-1', 'res-1', DETAILS)).rejects.toThrow(
      /Calendar event creation failed: 500/,
    )
  })

  test('returns null when the tenant has no active connection', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null })

    const id = await createReservationCalendarEvent('tenant-1', 'res-1', DETAILS)

    expect(id).toBeNull()
  })
})
