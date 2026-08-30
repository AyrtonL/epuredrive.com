/** @jest-environment node */
import { processEmail } from '@/lib/email-sync/shared'
import type { ParsedEmail, EmailSync } from '@/lib/email-sync/types'

const rows: any[] = []
const state = {
  existing: null as any,
  // Row returned by syncUpcarCalendarEvent's `.select(...).eq('id', …).maybeSingle()`
  syncRow: null as any,
  carRow: { make: 'Audi', model: 'Q3', model_full: 'Q3' } as any,
}

const createReservationCalendarEvent = jest.fn().mockResolvedValue('epr-test')
const updateReservationCalendarEvent = jest.fn().mockResolvedValue(undefined)
const deleteReservationCalendarEvent = jest.fn().mockResolvedValue(undefined)

jest.mock('../../../lib/google-calendar', () => ({
  createReservationCalendarEvent: (...args: any[]) => createReservationCalendarEvent(...args),
  updateReservationCalendarEvent: (...args: any[]) => updateReservationCalendarEvent(...args),
  deleteReservationCalendarEvent: (...args: any[]) => deleteReservationCalendarEvent(...args),
  reservationEventId: (id: string | number) => 'epr' + id,
}))

jest.mock('../../../lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      const listResult = () =>
        Promise.resolve({ data: state.existing ? [state.existing] : [], error: null })
      const maybeSingle = () =>
        table === 'cars'
          ? Promise.resolve({ data: state.carRow, error: null })
          : Promise.resolve({ data: state.syncRow, error: null })
      const chain: any = {
        eq: () => chain,
        like: () => chain,
        limit: () => listResult(),
        maybeSingle,
      }
      return {
        select: () => chain,
        insert: (payload: any) => {
          rows.push(payload)
          return {
            select: () => ({
              single: () =>
                Promise.resolve({ data: { id: state.syncRow?.id ?? 'new-res-id' }, error: null }),
            }),
          }
        },
        update: (payload: any) => ({
          eq: () => {
            rows.push({ __update: payload })
            return Promise.resolve({ data: null, error: null })
          },
        }),
      }
    },
  }),
}))
jest.mock('../../../lib/booking-code', () => ({ generateBookingCode: () => 'E-TEST01' }))

const sync = { id: 's1', tenant_id: 't1' } as EmailSync
beforeEach(() => {
  rows.length = 0
  state.existing = null
  state.syncRow = null
  createReservationCalendarEvent.mockClear().mockResolvedValue('epr-test')
  updateReservationCalendarEvent.mockClear().mockResolvedValue(undefined)
  deleteReservationCalendarEvent.mockClear().mockResolvedValue(undefined)
})

const confirm: ParsedEmail = {
  type: 'confirm', source: 'upcar', messageId: 'm1', reservationId: '17776',
  customer_name: 'Justin Taylor', customer_phone: '+19292588593', customer_dob: '1994-12-01',
  vehicle_name: 'Audi Q3 2018', pickup_date: '2026-08-28', pickup_time: '12:30',
  return_date: '2026-08-30', return_time: '10:00', total_amount: 82.5, status: 'confirmed',
  pickup_location: '19707 Turnberry Way, Aventura, FL 33180', return_location: null,
}

const liveSyncRow = {
  id: 'new-res-id', car_id: 5, customer_name: 'Justin Taylor', customer_phone: '+19292588593',
  pickup_date: '2026-08-28', pickup_time: '12:30', pickup_location: 'Aventura',
  return_date: '2026-08-30', return_time: '10:00', return_location: null,
  booking_code: 'E-TEST01', notes: 'Upcar-Res #17776', google_calendar_event_id: null,
  status: 'confirmed',
}

it('inserts an Upcar confirm with the Upcar-Res marker and time/phone/dob', async () => {
  await processEmail(confirm, sync)
  expect(rows[0]).toMatchObject({
    source: 'upcar', customer_name: 'Justin Taylor', customer_phone: '+19292588593',
    customer_dob: '1994-12-01', pickup_time: '12:30', return_time: '10:00',
    pickup_location: '19707 Turnberry Way, Aventura, FL 33180',
    booking_code: 'E-TEST01',
  })
  expect(rows[0].notes).toContain('Upcar-Res #17776')
})

it('car-swap modify updates only car/vehicle, not dates', async () => {
  state.existing = { id: 'r1', status: 'confirmed' }
  state.syncRow = { ...liveSyncRow, id: 'r1' }
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

it('never writes status on an Upcar modify (also when the existing row is confirmed)', async () => {
  const mod: ParsedEmail = {
    type: 'modify', source: 'upcar', messageId: 'm3', reservationId: '17776',
    customer_name: 'Justin Taylor', pickup_date: '2026-08-28', pickup_time: '11:30',
    return_date: '2026-08-30', return_time: '10:00', total_amount: 82.5,
  }

  state.existing = { id: 'r1', status: 'completed' }
  state.syncRow = { ...liveSyncRow, id: 'r1', status: 'completed' }
  await processEmail(mod, sync)
  let upd = rows.find((r) => r.__update)?.__update
  expect(upd).not.toHaveProperty('status')
  expect(upd.pickup_time).toBe('11:30')

  rows.length = 0
  state.existing = { id: 'r1', status: 'confirmed' }
  state.syncRow = { ...liveSyncRow, id: 'r1' }
  await processEmail(mod, sync)
  upd = rows.find((r) => r.__update)?.__update
  expect(upd).not.toHaveProperty('status')
  expect(upd.pickup_time).toBe('11:30')
})

it('skips insert AND update for an orphan Upcar car-swap with no existing reservation', async () => {
  state.existing = null
  const swap: ParsedEmail = {
    type: 'modify', source: 'upcar', messageId: 'm4', reservationId: '17776',
    customer_name: 'Justin Taylor', vehicle_name: 'Audi Q3 2018',
    pickup_date: null, return_date: null,
  }
  await processEmail(swap, sync)
  expect(rows).toHaveLength(0)
})

// ── Google Calendar sync (Upcar only) ────────────────────────────────────────

it('Upcar confirm insert → creates a calendar event with carName/bookingCode/dates', async () => {
  state.syncRow = { ...liveSyncRow }
  await processEmail(confirm, sync)
  expect(createReservationCalendarEvent).toHaveBeenCalledTimes(1)
  const [tenantId, resId, details] = createReservationCalendarEvent.mock.calls[0]
  expect(tenantId).toBe('t1')
  expect(resId).toBe('new-res-id')
  expect(details).toMatchObject({
    carName: 'Audi Q3',
    bookingCode: 'E-TEST01',
    pickupDate: '2026-08-28',
    returnDate: '2026-08-30',
  })
  expect(updateReservationCalendarEvent).not.toHaveBeenCalled()
  // event id persisted back onto the reservation row
  expect(rows.some((r) => r.__update?.google_calendar_event_id === 'epr-test')).toBe(true)
})

it('Upcar confirm whose row already has an event id → updates instead of creating', async () => {
  state.existing = { id: 'r1', status: 'confirmed' }
  state.syncRow = { ...liveSyncRow, id: 'r1', google_calendar_event_id: 'epr-existing' }
  await processEmail({ ...confirm, messageId: 'm9' }, sync)
  expect(updateReservationCalendarEvent).toHaveBeenCalledTimes(1)
  expect(updateReservationCalendarEvent.mock.calls[0][1]).toBe('epr-existing')
  expect(createReservationCalendarEvent).not.toHaveBeenCalled()
})

it('Upcar cancel with an existing event id → deletes the calendar event', async () => {
  state.existing = { id: 'r1', status: 'confirmed' }
  state.syncRow = { ...liveSyncRow, id: 'r1', google_calendar_event_id: 'epr-existing' }
  const cancel: ParsedEmail = {
    type: 'cancel', source: 'upcar', messageId: 'mc', reservationId: '17776',
    customer_name: 'Justin Taylor', pickup_date: null, return_date: null,
  }
  await processEmail(cancel, sync)
  expect(deleteReservationCalendarEvent).toHaveBeenCalledWith('t1', 'epr-existing')
})

it('a throwing calendar helper never breaks the poll (reservation write still happened)', async () => {
  const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
  createReservationCalendarEvent.mockRejectedValueOnce(new Error('calendar API down'))
  state.syncRow = { ...liveSyncRow }
  await expect(processEmail(confirm, sync)).resolves.toBeUndefined()
  expect(rows[0]).toMatchObject({ source: 'upcar', booking_code: 'E-TEST01' })
  spy.mockRestore()
})

it('Turo confirm → no calendar calls, insert unchanged', async () => {
  const turo: ParsedEmail = {
    type: 'confirm', source: 'turo', messageId: 't1m', reservationId: '60079137',
    customer_name: 'Alex Doe', vehicle_name: 'BMW 3 Series 2022',
    pickup_date: '2026-09-01', return_date: '2026-09-05',
    total_amount: 500, status: 'confirmed',
  }
  await processEmail(turo, sync)
  expect(rows[0]).toMatchObject({ source: 'turo', customer_name: 'Alex Doe', booking_code: 'E-TEST01' })
  expect(createReservationCalendarEvent).not.toHaveBeenCalled()
  expect(updateReservationCalendarEvent).not.toHaveBeenCalled()
  expect(deleteReservationCalendarEvent).not.toHaveBeenCalled()
})
