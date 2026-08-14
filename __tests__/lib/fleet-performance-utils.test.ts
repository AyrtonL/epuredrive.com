import { calcCarStats, calcFleetSummary } from '@/lib/utils/fleet-performance-utils'
import type { Reservation } from '@/lib/supabase/types'

const makeRes = (overrides: Partial<Reservation> = {}): Reservation => ({
  id: 1,
  booking_code: 'E-TEST01',
  car_id: 1,
  status: 'completed',
  pickup_date: '2026-04-01',
  return_date: '2026-04-05',
  total_amount: 500,
  odometer_out: 1000,
  odometer_in: 1200,
  customer_name: null,
  customer_email: null,
  customer_phone: null,
  pickup_time: null,
  return_time: null,
  pickup_location: null,
  return_location: null,
  source: null,
  notes: null,
  tenant_id: null,
  license_number: null,
  license_state: null,
  license_country: null,
  license_expiration_date: null,
  insurance_provider: null,
  insurance_policy_number: null,
  insurance_expiration_date: null,
  agreement_token: null,
  agreement_sent_at: null,
  agreement_signed_at: null,
  agreement_signed_ip: null,
  agreement_pdf_url: null,
  agreement_signature_url: null,
  review_token: null,
  customer_dob: null,
  customer_address: null,
  customer_zip: null,
  security_deposit: null,
  surcharge: null,
  amount_outstanding: null,
  payment_method: null,
  fuel_out: null,
  fuel_in: null,
  damage_checkin: null,
  damage_checkout: null,
  damage_diagram_checkin: null,
  damage_diagram_checkout: null,
  extras: null,
  review_email_sent_at: null,
  return_reminder_sent_at: null,
  stripe_payment_id: null,
  stripe_session_id: null,
  square_payment_id: null,
  tenant_signed_at: null,
  tenant_signature_url: null,
  tenant_signed_by: null,
  google_calendar_event_id: null,
  ...overrides,
})

describe('calcCarStats', () => {
  const dateFrom = '2026-04-01'
  const dateTo = '2026-04-30'
  const totalDays = 30

  it('calculates utilization for a single reservation spanning 4 days', () => {
    const result = calcCarStats(1, [makeRes()], dateFrom, dateTo)
    expect(result.utilization).toBe(Math.round((4 / totalDays) * 100))
  })

  it('calculates miles as odometer_in minus odometer_out', () => {
    const result = calcCarStats(1, [makeRes()], dateFrom, dateTo)
    expect(result.miles).toBe(200)
  })

  it('calculates revenue from total_amount', () => {
    const result = calcCarStats(1, [makeRes()], dateFrom, dateTo)
    expect(result.revenue).toBe(500)
  })

  it('excludes cancelled reservations from utilization and revenue', () => {
    const result = calcCarStats(1, [makeRes({ status: 'cancelled' })], dateFrom, dateTo)
    expect(result.utilization).toBe(0)
    expect(result.revenue).toBe(0)
  })

  it('excludes reservations for other cars', () => {
    const result = calcCarStats(1, [makeRes({ car_id: 2 })], dateFrom, dateTo)
    expect(result.utilization).toBe(0)
  })

  it('returns 0 miles when odometer data is missing', () => {
    const result = calcCarStats(1, [makeRes({ odometer_out: null as any, odometer_in: null as any })], dateFrom, dateTo)
    expect(result.miles).toBe(0)
  })

  it('calculates idle days as totalDays minus rented days', () => {
    const result = calcCarStats(1, [makeRes()], dateFrom, dateTo)
    expect(result.idleDays).toBe(totalDays - 4)
  })
})

describe('calcFleetSummary', () => {
  it('returns best performer by utilization', () => {
    const car1Stats = { utilization: 80, idleDays: 6, miles: 500, revenue: 2000 }
    const car2Stats = { utilization: 40, idleDays: 18, miles: 200, revenue: 800 }
    const result = calcFleetSummary([
      { carId: 1, name: 'BMW 530i', ...car1Stats },
      { carId: 2, name: 'Mercedes C300', ...car2Stats },
    ])
    expect(result.bestPerformer?.name).toBe('BMW 530i')
  })

  it('calculates average utilization', () => {
    const result = calcFleetSummary([
      { carId: 1, name: 'A', utilization: 80, idleDays: 6, miles: 0, revenue: 0 },
      { carId: 2, name: 'B', utilization: 40, idleDays: 18, miles: 0, revenue: 0 },
    ])
    expect(result.avgUtilization).toBe(60)
  })

  it('sums total miles', () => {
    const result = calcFleetSummary([
      { carId: 1, name: 'A', utilization: 50, idleDays: 15, miles: 300, revenue: 0 },
      { carId: 2, name: 'B', utilization: 50, idleDays: 15, miles: 200, revenue: 0 },
    ])
    expect(result.totalMiles).toBe(500)
  })

  it('returns null bestPerformer for empty array', () => {
    const result = calcFleetSummary([])
    expect(result.bestPerformer).toBeNull()
  })
})
