/**
 * @jest-environment node
 */
import { BouncieProvider } from '@/lib/telematics/bouncie'

const provider = new BouncieProvider()

describe('parseWebhookPayload', () => {
  test('parses trip-end event', () => {
    const body = JSON.stringify({
      eventType: 'trip-end', imei: '123', timestamp: '2026-04-23T12:00:00Z',
      data: { transactionId: 'trip-99', distance: 12.4, maxSpeed: 64, hardBrakingCount: 1 },
    })
    const [ev] = provider.parseWebhookPayload(body)
    expect(ev.type).toBe('trip_end')
    expect(ev.imei).toBe('123')
    expect(ev.occurred_at).toBe('2026-04-23T12:00:00Z')
    expect(ev.payload).toMatchObject({ transactionId: 'trip-99', distance: 12.4 })
  })

  test('parses location-update with lat/lon/odometer', () => {
    const body = JSON.stringify({
      eventType: 'location-update', imei: '123', timestamp: '2026-04-23T12:01:00Z',
      data: { lat: 25.76, lon: -80.19, odometer: 42015, speed: 42 },
    })
    const [ev] = provider.parseWebhookPayload(body)
    expect(ev.type).toBe('location_update')
    expect(ev.lat).toBe(25.76)
    expect(ev.lon).toBe(-80.19)
    expect(ev.odometer_mi).toBe(42015)
    expect(ev.speed_mph).toBe(42)
  })

  test('parses mil-on as dtc_new', () => {
    const body = JSON.stringify({
      eventType: 'mil-on', imei: '123', timestamp: '2026-04-23T12:02:00Z',
      data: { code: 'P0420', description: 'Catalyst inefficiency' },
    })
    const [ev] = provider.parseWebhookPayload(body)
    expect(ev.type).toBe('dtc_new')
    expect(ev.payload.code).toBe('P0420')
  })

  test('parses hard-braking', () => {
    const body = JSON.stringify({
      eventType: 'hard-braking', imei: '123', timestamp: '2026-04-23T12:03:00Z',
      data: { lat: 25.76, lon: -80.19, speed: 55 },
    })
    const [ev] = provider.parseWebhookPayload(body)
    expect(ev.type).toBe('hard_braking')
  })

  test('accepts array payloads (batched)', () => {
    const body = JSON.stringify([
      { eventType: 'ignition-on',  imei: '1', timestamp: '2026-04-23T12:00:00Z' },
      { eventType: 'ignition-off', imei: '1', timestamp: '2026-04-23T12:01:00Z' },
    ])
    const evs = provider.parseWebhookPayload(body)
    expect(evs).toHaveLength(2)
    expect(evs[0].type).toBe('ignition_on')
    expect(evs[1].type).toBe('ignition_off')
  })

  test('drops unknown event types silently (no throw)', () => {
    const body = JSON.stringify({ eventType: 'something-new', imei: '1', timestamp: 't' })
    expect(() => provider.parseWebhookPayload(body)).not.toThrow()
    expect(provider.parseWebhookPayload(body)).toHaveLength(0)
  })

  test('returns [] on malformed JSON', () => {
    expect(provider.parseWebhookPayload('not json{')).toEqual([])
  })

  test('skips items missing required fields', () => {
    const body = JSON.stringify([
      { eventType: 'trip-end', imei: '1', timestamp: 't' },
      { eventType: 'trip-end' }, // missing imei & timestamp
      {}, // completely empty
    ])
    expect(provider.parseWebhookPayload(body)).toHaveLength(1)
  })
})
