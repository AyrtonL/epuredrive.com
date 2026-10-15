// lib/__tests__/fleet-ownership.test.ts
import { sortCarsOwnedFirst, sortOwnedFirst } from '../fleet/ownership'

describe('sortCarsOwnedFirst', () => {
  const cars = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]

  it('puts owned cars first and keeps incoming order within each group', () => {
    const out = sortCarsOwnedFirst(cars, new Set([1, 3]))
    expect(out.map((c) => c.id)).toEqual([2, 4, 1, 3])
  })

  it('does not mutate the input', () => {
    sortCarsOwnedFirst(cars, new Set([1]))
    expect(cars.map((c) => c.id)).toEqual([1, 2, 3, 4])
  })

  it('applies the secondary comparator inside each group', () => {
    const out = sortCarsOwnedFirst(cars, new Set([2, 3]), (a, b) => b.id - a.id)
    expect(out.map((c) => c.id)).toEqual([4, 1, 3, 2])
  })
})

describe('sortOwnedFirst', () => {
  it('sorts derived rows by id and treats a missing id as owned', () => {
    const rows = [
      { carId: 9, pct: 90 },
      { carId: null, pct: 10 },
      { carId: 5, pct: 50 },
    ]
    const out = sortOwnedFirst(rows, new Set([9]), (r) => r.carId, (a, b) => b.pct - a.pct)
    expect(out.map((r) => r.carId)).toEqual([5, null, 9])
  })
})
