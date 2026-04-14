import type { Reservation } from '@/lib/supabase/types'

export interface CarStats {
  carId: number
  name: string
  utilization: number  // percentage 0-100
  idleDays: number
  miles: number
  revenue: number
}

export interface FleetSummary {
  avgUtilization: number
  totalMiles: number
  bestPerformer: CarStats | null
}

export function calcCarStats(
  carId: number,
  reservations: Reservation[],
  dateFrom: string,
  dateTo: string
): Omit<CarStats, 'carId' | 'name'> {
  const start = new Date(dateFrom)
  const end = new Date(dateTo)
  const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1)

  const carRes = reservations.filter(r => r.car_id === carId && r.status !== 'cancelled')

  let rentedDays = 0
  let miles = 0
  let revenue = 0

  for (const r of carRes) {
    if (!r.pickup_date) continue
    const p = new Date(r.pickup_date)
    const rt = new Date(r.return_date || r.pickup_date)
    const overlapStart = Math.max(start.getTime(), p.getTime())
    const overlapEnd = Math.min(end.getTime(), rt.getTime())
    if (overlapEnd > overlapStart) {
      rentedDays += Math.ceil((overlapEnd - overlapStart) / 86400000)
    }
    if (r.odometer_out != null && r.odometer_in != null) {
      miles += Math.max(0, r.odometer_in - r.odometer_out)
    }
    revenue += Number(r.total_amount) || 0
  }

  const utilization = Math.min(100, Math.round((rentedDays / totalDays) * 100))
  return { utilization, idleDays: totalDays - rentedDays, miles, revenue }
}

export function calcFleetSummary(cars: CarStats[]): FleetSummary {
  if (cars.length === 0) return { avgUtilization: 0, totalMiles: 0, bestPerformer: null }

  const avgUtilization = Math.round(cars.reduce((s, c) => s + c.utilization, 0) / cars.length)
  const totalMiles = cars.reduce((s, c) => s + c.miles, 0)
  const bestPerformer = cars.reduce((best, c) => c.utilization > best.utilization ? c : best, cars[0])

  return { avgUtilization, totalMiles, bestPerformer }
}
