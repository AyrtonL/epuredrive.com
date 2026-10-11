/**
 * @jest-environment node
 */
import { BouncieProvider } from '@/lib/telematics/bouncie'

const mockVehicle = {
  imei: '123', vin: '1HG123', nickName: 'Civic',
  model: { year: 2022, make: 'Honda', model: 'Civic' },
  stats: {
    lastUpdated: new Date(Date.now() - 60_000).toISOString(), // 1 min ago → online
    location: { lat: 25.76, lon: -80.19 },
    odometer: 42015,
    batteryStatus: 'normal',
    mil: { milOn: false },
  },
}

describe('BouncieProvider.listVehicles', () => {
  const provider = new BouncieProvider()

  beforeEach(() => { jest.restoreAllMocks() })

  test('maps Bouncie vehicle shape to ProviderVehicle', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify([mockVehicle]), {
        status: 200, headers: { 'content-type': 'application/json' },
      }),
    )
    const [v] = await provider.listVehicles('token')
    expect(v).toMatchObject({
      imei: '123',
      vin: '1HG123',
      nickname: 'Civic',
      online: true,
      last_lat: 25.76,
      last_lon: -80.19,
      odometer_mi: 42015,
      mil_on: false,
    })
  })

  test('maps a lit MIL (check engine) flag through to mil_on', async () => {
    const litVehicle = {
      ...mockVehicle,
      stats: { ...mockVehicle.stats, mil: { milOn: true } },
    }
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify([litVehicle]), {
        status: 200, headers: { 'content-type': 'application/json' },
      }),
    )
    const [v] = await provider.listVehicles('token')
    expect(v.mil_on).toBe(true)
  })

  test('joins qualifiedDtcList codes into mil_codes', async () => {
    const withCodes = {
      ...mockVehicle,
      stats: {
        ...mockVehicle.stats,
        mil: {
          milOn: true,
          qualifiedDtcList: [
            { code: 'P0420', name: ['Catalyst System Efficiency Below Threshold'] },
            { code: 'P0301', name: ['Cylinder 1 Misfire Detected'] },
          ],
        },
      },
    }
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify([withCodes]), {
        status: 200, headers: { 'content-type': 'application/json' },
      }),
    )
    const [v] = await provider.listVehicles('token')
    expect(v.mil_codes).toBe('P0420,P0301')
  })

  test('mil_codes is null when qualifiedDtcList is empty', async () => {
    const noCodes = {
      ...mockVehicle,
      stats: { ...mockVehicle.stats, mil: { milOn: false, qualifiedDtcList: [] } },
    }
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify([noCodes]), {
        status: 200, headers: { 'content-type': 'application/json' },
      }),
    )
    const [v] = await provider.listVehicles('token')
    expect(v.mil_codes).toBeNull()
  })

  test('marks vehicle offline when lastUpdated is >6h old', async () => {
    const stale = {
      ...mockVehicle,
      stats: { ...mockVehicle.stats, lastUpdated: new Date(Date.now() - 7 * 3600_000).toISOString() },
    }
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify([stale]), {
        status: 200, headers: { 'content-type': 'application/json' },
      }),
    )
    const [v] = await provider.listVehicles('token')
    expect(v.online).toBe(false)
  })

  test('handles missing stats gracefully', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify([{ imei: 'x', vin: null, nickName: null, model: null, stats: null }]), {
        status: 200, headers: { 'content-type': 'application/json' },
      }),
    )
    const [v] = await provider.listVehicles('token')
    expect(v.imei).toBe('x')
    expect(v.online).toBe(false)
    expect(v.odometer_mi).toBeNull()
    expect(v.last_lat).toBeNull()
    expect(v.mil_on).toBeNull()
  })
})

describe('BouncieProvider.listTrips', () => {
  const provider = new BouncieProvider()
  beforeEach(() => { jest.restoreAllMocks() })

  test('maps trip with gpsTrail endpoints and counters', async () => {
    const trip = {
      transactionId: 'trip-99', imei: '123',
      startTime: '2026-04-23T10:00:00Z',
      endTime: '2026-04-23T10:30:00Z',
      distance: 12.4, duration: 1800, maxSpeed: 64,
      hardBrakingCount: 1, hardAccelerationCount: 2,
      gpsTrail: [
        { lat: 25.76, lon: -80.19, timestamp: 't1', speed: 10 },
        { lat: 25.80, lon: -80.20, timestamp: 't2', speed: 42 },
      ],
    }
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify([trip]), {
        status: 200, headers: { 'content-type': 'application/json' },
      }),
    )
    const [t] = await provider.listTrips('token', '123', new Date('2026-04-23T00:00:00Z'))
    expect(t.provider_trip_id).toBe('trip-99')
    expect(t.start_lat).toBe(25.76)
    expect(t.end_lat).toBe(25.80)
    expect(t.distance_mi).toBe(12.4)
    expect(t.duration_s).toBe(1800)
    expect(t.hard_braking_count).toBe(1)
    expect(t.hard_accel_count).toBe(2)
    expect(t.max_speed_mph).toBe(64)
  })

  test('real /trips shape: derives duration from timestamps and sends both window bounds', async () => {
    const trip = {
      transactionId: '865-969-202610', imei: '865',
      startTime: '2026-10-05T22:50:20.000Z', endTime: '2026-10-05T23:07:50.000Z',
      distance: 5.7, maxSpeed: 52.8, fuelConsumed: 0.264,
      hardBrakingCount: 0, hardAccelerationCount: 0,
      gps: { type: 'LineString', coordinates: [[-80.14884, 25.952], [-80.15, 25.96]] },
    }
    const spy = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify([trip]), {
        status: 200, headers: { 'content-type': 'application/json' },
      }),
    )
    const [t] = await provider.listTrips(
      'token', '865', new Date('2026-10-05T00:00:00Z'), new Date('2026-10-06T00:00:00Z'),
    )
    expect(t.duration_s).toBe(1050)
    expect(t.distance_mi).toBe(5.7)
    expect(t.start_lat).toBe(25.952)
    expect(t.start_lon).toBe(-80.14884)
    expect(t.end_lat).toBe(25.96)
    const url = String(spy.mock.calls[0][0])
    expect(url).toContain('gps-format=geojson')
    expect(url).toContain('starts-after=2026-10-05T00%3A00%3A00.000Z')
    expect(url).toContain('ends-before=2026-10-06T00%3A00%3A00.000Z')
  })
})
