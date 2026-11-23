import { findUnavailableCarIds } from '@/lib/booking/availability'

const window = { pickupDate: '2026-11-23', pickupTime: '10:00', returnDate: '2026-11-27', returnTime: '10:00' }

const res = (car_id: number, pickup_date: string, return_date: string, status = 'confirmed') => ({
  id: `${car_id}-${pickup_date}`,
  car_id,
  status,
  pickup_date,
  pickup_time: '10:00',
  return_date,
  return_time: '10:00',
})

describe('findUnavailableCarIds', () => {
  it('flags cars with an overlapping blocking reservation', () => {
    const ids = findUnavailableCarIds(window, [res(1, '2026-11-20', '2026-11-24'), res(2, '2026-12-01', '2026-12-05')], [])
    expect([...ids]).toEqual([1])
  })

  it('treats active (in-progress) rentals as blocking', () => {
    const ids = findUnavailableCarIds(window, [res(3, '2026-11-15', '2026-11-30', 'active')], [])
    expect(ids.has(3)).toBe(true)
  })

  it('ignores cancelled/completed reservations', () => {
    const ids = findUnavailableCarIds(
      window,
      [res(4, '2026-11-22', '2026-11-25', 'cancelled'), res(5, '2026-11-22', '2026-11-25', 'completed')],
      [],
    )
    expect(ids.size).toBe(0)
  })

  it('does not flag a return that ends exactly at the new pickup time', () => {
    const ids = findUnavailableCarIds(window, [res(6, '2026-11-20', '2026-11-23')], [])
    expect(ids.has(6)).toBe(false)
  })

  it('flags cars with operator blocked dates in range', () => {
    const ids = findUnavailableCarIds(window, [], [{ car_id: 7, start_date: '2026-11-26', end_date: '2026-11-28' }])
    expect([...ids]).toEqual([7])
  })
})
