// __tests__/lib/car-status.test.ts
import { carStatus, rentedDaysByCar } from '@/lib/fleet/car-status'
import type { Reservation } from '@/lib/supabase/types'

const TODAY = '2026-10-12'

function res(partial: Partial<Reservation>): Reservation {
  return {
    id: 'r1',
    car_id: 1,
    customer_name: 'Ana',
    pickup_date: '2026-10-10',
    return_date: '2026-10-24',
    status: 'active',
    total_amount: 100,
    ...partial,
  } as Reservation
}

describe('carStatus', () => {
  it('is on rent when a booking covers today', () => {
    const s = carStatus('active', [res({ customer_name: 'Bruno' })], TODAY)
    expect(s.kind).toBe('on_rent')
    expect(s.label).toBe('On rent')
    expect(s.detail).toBe('Bruno · back Oct 24')
  })

  it('counts a confirmed booking that started today as on rent', () => {
    const s = carStatus('active', [res({ status: 'confirmed', pickup_date: TODAY })], TODAY)
    expect(s.kind).toBe('on_rent')
  })

  it('flags an active rental past its return date as overdue', () => {
    const s = carStatus('active', [res({ pickup_date: '2026-10-01', return_date: '2026-10-10' })], TODAY)
    expect(s.kind).toBe('overdue')
    expect(s.detail).toBe('Ana · was due Oct 10')
  })

  it('is available with the next upcoming booking', () => {
    const rows = [
      res({ id: 'a', status: 'completed', pickup_date: '2026-09-01', return_date: '2026-09-05' }),
      res({ id: 'b', status: 'confirmed', pickup_date: '2026-12-22', return_date: '2026-12-28', customer_name: 'Later' }),
      res({ id: 'c', status: 'pending', pickup_date: '2026-12-18', return_date: '2026-12-20', customer_name: 'Sooner' }),
      res({ id: 'd', status: 'cancelled', pickup_date: '2026-11-01', return_date: '2026-11-03' }),
    ]
    const s = carStatus('active', rows, TODAY)
    expect(s.kind).toBe('available')
    expect(s.detail).toBe('Next: Sooner · Dec 18')
    expect(s.next?.id).toBe('c')
  })

  it('is available with nothing upcoming', () => {
    expect(carStatus('active', [], TODAY)).toMatchObject({ kind: 'available', detail: 'No upcoming bookings' })
  })

  it('reports maintenance and retired from the car status first', () => {
    expect(carStatus('maintenance', [res({})], TODAY).kind).toBe('maintenance')
    expect(carStatus('retired', [res({})], TODAY).kind).toBe('retired')
  })
})

describe('rentedDaysByCar', () => {
  it('counts rented days per car inside the window, ignoring cancelled and upcoming', () => {
    const rows = [
      res({ id: 'a', car_id: 1, pickup_date: '2026-10-01', return_date: '2026-10-05', status: 'completed' }),
      res({ id: 'b', car_id: 1, pickup_date: '2026-10-10', return_date: '2026-10-24', status: 'active' }),
      res({ id: 'c', car_id: 2, pickup_date: '2026-09-20', return_date: '2026-10-02', status: 'completed' }),
      res({ id: 'd', car_id: 2, pickup_date: '2026-10-05', return_date: '2026-10-06', status: 'cancelled' }),
      res({ id: 'e', car_id: 3, pickup_date: '2026-12-01', return_date: '2026-12-03', status: 'confirmed' }),
    ]
    const days = rentedDaysByCar(rows, '2026-10-01', TODAY)
    expect(days.get(1)).toBe(5 + 3) // Oct 1–5, Oct 10–12
    expect(days.get(2)).toBe(2) // Oct 1–2
    expect(days.get(3)).toBeUndefined()
  })
})
