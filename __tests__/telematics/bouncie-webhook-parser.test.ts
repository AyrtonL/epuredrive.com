/**
 * @jest-environment node
 *
 * Bouncie webhook deliveries are flat objects shaped per
 * https://docs.bouncie.dev/openapi.json `webhooks` — not the generic
 * { eventType, imei, timestamp, data } envelope.
 */
import { BouncieProvider } from '@/lib/telematics/bouncie'

const provider = new BouncieProvider()

describe('parseWebhookPayload', () => {
  test('parses connect as online', () => {
    const body = JSON.stringify({
      eventType: 'connect', imei: '123', vin: 'VIN1',
      connect: { timestamp: '2026-04-23T12:00:00Z', timeZone: 'America/Chicago', latitude: 25.76, longitude: -80.19 },
    })
    const [ev] = provider.parseWebhookPayload(body)
    expect(ev.type).toBe('online')
    expect(ev.imei).toBe('123')
    expect(ev.occurred_at).toBe('2026-04-23T12:00:00Z')
    expect(ev.lat).toBe(25.76)
    expect(ev.lon).toBe(-80.19)
  })

  test('parses disconnect as offline', () => {
    const body = JSON.stringify({
      eventType: 'disconnect', imei: '123', vin: 'VIN1',
      disconnect: { timestamp: '2026-04-23T12:00:00Z', timeZone: 'America/Chicago', latitude: 25.76, longitude: -80.19 },
    })
    const [ev] = provider.parseWebhookPayload(body)
    expect(ev.type).toBe('offline')
  })

  test('parses battery low as battery_low', () => {
    const body = JSON.stringify({
      eventType: 'battery', imei: '123', vin: 'VIN1',
      battery: { timestamp: '2026-04-23T12:00:00Z', value: 'low' },
    })
    const [ev] = provider.parseWebhookPayload(body)
    expect(ev.type).toBe('battery_low')
    expect(ev.payload.value).toBe('low')
  })

  test('drops battery event when value is normal', () => {
    const body = JSON.stringify({
      eventType: 'battery', imei: '123', vin: 'VIN1',
      battery: { timestamp: '2026-04-23T12:00:00Z', value: 'normal' },
    })
    expect(provider.parseWebhookPayload(body)).toHaveLength(0)
  })

  test('parses mil as dtc_new with the DTC code', () => {
    const body = JSON.stringify({
      eventType: 'mil', imei: '123', vin: 'VIN1',
      mil: { timestamp: '2026-04-23T12:00:00Z', value: 'ON', codes: 'P0420' },
    })
    const [ev] = provider.parseWebhookPayload(body)
    expect(ev.type).toBe('dtc_new')
    expect(ev.payload.code).toBe('P0420')
  })

  test('parses vinChange as vin_changed', () => {
    const body = JSON.stringify({
      eventType: 'vinChange', imei: '123', vin: 'NEWVIN',
      vinChange: { timestamp: '2026-04-23T12:00:00Z', timeZone: 'America/Chicago', oldVin: 'OLDVIN', newVin: 'NEWVIN' },
    })
    const [ev] = provider.parseWebhookPayload(body)
    expect(ev.type).toBe('vin_changed')
    expect(ev.payload).toMatchObject({ oldVin: 'OLDVIN', newVin: 'NEWVIN' })
  })

  test('parses tripStart with odometer', () => {
    const body = JSON.stringify({
      eventType: 'tripStart', imei: '123', vin: 'VIN1', transactionId: 'txn-1',
      start: { timestamp: '2026-04-23T12:00:00Z', timeZone: 'America/Chicago', odometer: 45678.9 },
    })
    const [ev] = provider.parseWebhookPayload(body)
    expect(ev.type).toBe('trip_start')
    expect(ev.odometer_mi).toBe(45678.9)
    expect(ev.payload.transactionId).toBe('txn-1')
  })

  test('parses tripData into one location_update per sample', () => {
    const body = JSON.stringify({
      eventType: 'tripData', imei: '123', vin: 'VIN1', transactionId: 'txn-1',
      data: [
        { timestamp: '2026-04-23T12:00:00Z', speed: 45, gps: { lat: 25.76, lon: -80.19, heading: 135 } },
        { timestamp: '2026-04-23T12:01:00Z', speed: 50, gps: { lat: 25.77, lon: -80.20, heading: 140 } },
      ],
    })
    const evs = provider.parseWebhookPayload(body)
    expect(evs).toHaveLength(2)
    expect(evs.every((e) => e.type === 'location_update')).toBe(true)
    expect(evs[0]).toMatchObject({ lat: 25.76, lon: -80.19, speed_mph: 45 })
    expect(evs[1]).toMatchObject({ lat: 25.77, lon: -80.20, speed_mph: 50 })
  })

  test('parses tripMetrics as internal-only trip_metrics', () => {
    const body = JSON.stringify({
      eventType: 'tripMetrics', imei: '123', vin: 'VIN1', transactionId: 'txn-1',
      metrics: {
        timestamp: '2026-04-23T12:30:00Z', tripTime: 1800, tripDistance: 12.5,
        totalIdlingTime: 300, maxSpeed: 65, averageDriveSpeed: 35.5,
        hardBrakingCounts: 2, hardAccelerationCounts: 1,
      },
    })
    const [ev] = provider.parseWebhookPayload(body)
    expect(ev.type).toBe('trip_metrics')
    expect(ev.payload).toMatchObject({
      transactionId: 'txn-1', tripDistance: 12.5, hardBrakingCounts: 2, hardAccelerationCounts: 1,
    })
  })

  test('parses tripEnd with odometer and fuel consumed', () => {
    const body = JSON.stringify({
      eventType: 'tripEnd', imei: '123', vin: 'VIN1', transactionId: 'txn-1',
      end: { timestamp: '2026-04-23T12:32:00Z', timeZone: 'America/Chicago', odometer: 45691.4, fuelConsumed: 0.8 },
    })
    const [ev] = provider.parseWebhookPayload(body)
    expect(ev.type).toBe('trip_end')
    expect(ev.odometer_mi).toBe(45691.4)
    expect(ev.payload).toMatchObject({ transactionId: 'txn-1', fuelConsumed: 0.8 })
  })

  test('parses applicationGeozone ENTER/EXIT as geofence_enter/geofence_exit', () => {
    const enter = JSON.stringify({
      eventType: 'applicationGeozone', imei: '123', vin: 'VIN1', transactionId: 'txn-1',
      geozone: { id: 'geo-1', name: 'Home', event: 'ENTER', timestamp: '2026-04-23T12:00:00Z', location: { lat: 25.76, lon: -80.19, heading: 135 } },
    })
    const [enterEv] = provider.parseWebhookPayload(enter)
    expect(enterEv.type).toBe('geofence_enter')
    expect(enterEv.payload).toMatchObject({ geofence_id: 'geo-1', geofence_name: 'Home' })

    const exit = JSON.stringify({
      eventType: 'userGeozone', imei: '123', vin: 'VIN1', transactionId: 'txn-1',
      geozone: { id: 'geo-1', name: 'Home', event: 'EXIT', timestamp: '2026-04-23T12:05:00Z', location: { lat: 25.76, lon: -80.19, heading: 135 } },
    })
    const [exitEv] = provider.parseWebhookPayload(exit)
    expect(exitEv.type).toBe('geofence_exit')
  })

  test('drops unknown event types silently (no throw)', () => {
    const body = JSON.stringify({ eventType: 'something-new', imei: '1' })
    expect(() => provider.parseWebhookPayload(body)).not.toThrow()
    expect(provider.parseWebhookPayload(body)).toHaveLength(0)
  })

  test('returns [] on malformed JSON', () => {
    expect(provider.parseWebhookPayload('not json{')).toEqual([])
  })

  test('skips items missing required fields', () => {
    const body = JSON.stringify([
      { eventType: 'connect', imei: '1', connect: { timestamp: 't', latitude: 1, longitude: 1 } },
      { eventType: 'connect' }, // missing imei & connect
      {}, // completely empty
    ])
    expect(provider.parseWebhookPayload(body)).toHaveLength(1)
  })
})
