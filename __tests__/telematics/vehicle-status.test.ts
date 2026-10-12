// __tests__/telematics/vehicle-status.test.ts
import { computeVehicleStatus, statusLabel } from '@/components/telematics/types'

const minutesAgo = (m: number): string => new Date(Date.now() - m * 60_000).toISOString()

describe('computeVehicleStatus', () => {
  it('is moving when a recent ping reports speed', () => {
    expect(computeVehicleStatus(minutesAgo(1), 30, true)).toBe('moving')
  })

  it('is parked (idle) when the device is online but the car has not pinged recently', () => {
    // Bouncie only reports while driving — a parked car on a healthy device is not "offline".
    expect(computeVehicleStatus(minutesAgo(360), null, true)).toBe('idle')
  })

  it('is offline when the device reports offline', () => {
    expect(computeVehicleStatus(minutesAgo(1), null, false)).toBe('offline')
  })

  it('falls back to ping age when the device state is unknown', () => {
    expect(computeVehicleStatus(minutesAgo(2), null, null)).toBe('idle')
    expect(computeVehicleStatus(minutesAgo(60), null, null)).toBe('offline')
  })

  it('is offline when the car has never been seen', () => {
    expect(computeVehicleStatus(null, null, true)).toBe('offline')
  })
})

describe('statusLabel', () => {
  it('labels a stationary car as Parked', () => {
    expect(statusLabel('idle')).toBe('Parked')
  })
})
