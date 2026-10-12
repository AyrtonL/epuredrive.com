// __tests__/lib/daily-schedule.test.ts
import { buildTenantSchedules, isDigestHour, scheduleSummary, type ScheduleReservation } from '@/lib/daily-schedule/build'
import { dailyScheduleEmail } from '@/lib/email/templates/daily-schedule'

const TODAY = '2026-10-12'

function res(partial: Partial<ScheduleReservation>): ScheduleReservation {
  return {
    id: '1',
    tenant_id: 't1',
    car_id: 1,
    booking_code: 'E-AAA',
    customer_name: 'Ana',
    customer_phone: null,
    pickup_date: TODAY,
    pickup_time: '10:00',
    return_date: '2026-10-15',
    return_time: null,
    status: 'confirmed',
    ...partial,
  }
}

const carName = (id: number | null): string => (id == null ? 'Unassigned' : `Car ${id}`)

describe('buildTenantSchedules', () => {
  it('groups pickups and returns for today per tenant', () => {
    const rows = [
      res({ id: '1', tenant_id: 't1', pickup_date: TODAY }),
      res({ id: '2', tenant_id: 't1', pickup_date: '2026-10-08', return_date: TODAY, status: 'active' }),
      res({ id: '3', tenant_id: 't2', pickup_date: TODAY }),
    ]
    const out = buildTenantSchedules(rows, TODAY, carName)
    expect(out.get('t1')?.pickups.map((i) => i.id)).toEqual(['1'])
    expect(out.get('t1')?.returns.map((i) => i.id)).toEqual(['2'])
    expect(out.get('t2')?.pickups.map((i) => i.id)).toEqual(['3'])
  })

  it('leaves out tenants with nothing today', () => {
    const rows = [res({ tenant_id: 't1', pickup_date: '2026-10-20', return_date: '2026-10-22' })]
    expect(buildTenantSchedules(rows, TODAY, carName).size).toBe(0)
  })

  it('skips cancelled and completed bookings', () => {
    const rows = [
      res({ id: '1', status: 'cancelled' }),
      res({ id: '2', status: 'completed', pickup_date: '2026-10-08', return_date: TODAY }),
    ]
    expect(buildTenantSchedules(rows, TODAY, carName).size).toBe(0)
  })

  it('sorts by time with untimed items last', () => {
    const rows = [
      res({ id: '1', pickup_time: null }),
      res({ id: '2', pickup_time: '14:30' }),
      res({ id: '3', pickup_time: '09:00' }),
    ]
    expect(buildTenantSchedules(rows, TODAY, carName).get('t1')?.pickups.map((i) => i.id)).toEqual(['3', '2', '1'])
  })

  it('resolves vehicle names and falls back for missing customers', () => {
    const rows = [res({ car_id: 7, customer_name: null })]
    const item = buildTenantSchedules(rows, TODAY, carName).get('t1')!.pickups[0]
    expect(item.vehicle).toBe('Car 7')
    expect(item.customer).toBe('Customer')
  })
})

describe('scheduleSummary', () => {
  it('describes both counts', () => {
    expect(scheduleSummary({ pickups: [{}, {}] as never, returns: [{}] as never })).toBe('2 pickups · 1 return')
  })

  it('omits an empty side', () => {
    expect(scheduleSummary({ pickups: [{}] as never, returns: [] })).toBe('1 pickup')
    expect(scheduleSummary({ pickups: [], returns: [{}, {}] as never })).toBe('2 returns')
  })
})

describe('isDigestHour', () => {
  it('is true only at 7am New York time, across DST', () => {
    expect(isDigestHour(new Date('2026-10-12T11:00:00Z'))).toBe(true) // EDT
    expect(isDigestHour(new Date('2026-10-12T12:00:00Z'))).toBe(false)
    expect(isDigestHour(new Date('2026-12-01T12:00:00Z'))).toBe(true) // EST
    expect(isDigestHour(new Date('2026-12-01T11:00:00Z'))).toBe(false)
  })
})

describe('dailyScheduleEmail', () => {
  it('lists pickups and returns and escapes user content', () => {
    const { subject, html } = dailyScheduleEmail({
      tenantName: 'ePure',
      dateLabel: 'Monday, Oct 12',
      pickups: [{ id: '1', customer: '<Ana>', vehicle: 'Audi Q3', time: '10:00', phone: '+1 305', bookingCode: 'E-AAA' }],
      returns: [{ id: '2', customer: 'Bo', vehicle: 'Porsche Cayenne', time: null, phone: null, bookingCode: null }],
    })
    expect(subject).toBe('Today: 1 pickup · 1 return — ePure')
    expect(html).toContain('&lt;Ana&gt;')
    expect(html).not.toContain('<Ana>')
    expect(html).toContain('Audi Q3')
    expect(html).toContain('10am')
    expect(html).toContain('Porsche Cayenne')
    expect(html).toContain('tel:+1305')
  })
})
