/** @jest-environment node */
import { processEmail } from '@/lib/email-sync/shared'
import type { ParsedEmail, EmailSync } from '@/lib/email-sync/types'

const rows: any[] = []
const state = { existing: null as any }

jest.mock('../../../lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          eq: () => ({ like: () => ({ limit: () => Promise.resolve({ data: state.existing ? [state.existing] : [], error: null }) }) }),
          like: () => ({ limit: () => Promise.resolve({ data: state.existing ? [state.existing] : [], error: null }) }),
        }),
      }),
      insert: (payload: any) => { rows.push(payload); return Promise.resolve({ error: null }) },
      update: (payload: any) => ({ eq: () => { rows.push({ __update: payload }); return Promise.resolve({ data: null, error: null }) } }),
    }),
  }),
}))
jest.mock('../../../lib/booking-code', () => ({ generateBookingCode: () => 'E-TEST01' }))

const sync = { id: 's1', tenant_id: 't1' } as EmailSync
beforeEach(() => { rows.length = 0; state.existing = null })

const confirm: ParsedEmail = {
  type: 'confirm', source: 'upcar', messageId: 'm1', reservationId: '17776',
  customer_name: 'Justin Taylor', customer_phone: '+19292588593', customer_dob: '1994-12-01',
  vehicle_name: 'Audi Q3 2018', pickup_date: '2026-08-28', pickup_time: '12:30',
  return_date: '2026-08-30', return_time: '10:00', total_amount: 82.5, status: 'confirmed',
}

it('inserts an Upcar confirm with the Upcar-Res marker and time/phone/dob', async () => {
  await processEmail(confirm, sync)
  expect(rows).toHaveLength(1)
  expect(rows[0]).toMatchObject({
    source: 'upcar', customer_name: 'Justin Taylor', customer_phone: '+19292588593',
    customer_dob: '1994-12-01', pickup_time: '12:30', return_time: '10:00',
    booking_code: 'E-TEST01',
  })
  expect(rows[0].notes).toContain('Upcar-Res #17776')
})

it('car-swap modify updates only car/vehicle, not dates', async () => {
  state.existing = { id: 'r1', status: 'confirmed' }
  const swap: ParsedEmail = {
    type: 'modify', source: 'upcar', messageId: 'm2', reservationId: '17776',
    customer_name: 'Justin Taylor', vehicle_name: 'Audi Q3 2018',
    pickup_date: null, return_date: null,
  }
  await processEmail(swap, sync)
  const upd = rows.find((r) => r.__update)?.__update
  expect(upd).toBeDefined()
  expect(upd).not.toHaveProperty('pickup_date')
  expect(upd).not.toHaveProperty('status')
})

it('does not regress a protected (completed) status on modify', async () => {
  state.existing = { id: 'r1', status: 'completed' }
  const mod: ParsedEmail = {
    type: 'modify', source: 'upcar', messageId: 'm3', reservationId: '17776',
    customer_name: 'Justin Taylor', pickup_date: '2026-08-28', pickup_time: '11:30',
    return_date: '2026-08-30', return_time: '10:00', total_amount: 82.5,
  }
  await processEmail(mod, sync)
  const upd = rows.find((r) => r.__update)?.__update
  expect(upd).not.toHaveProperty('status')
  expect(upd.pickup_time).toBe('11:30')
})
