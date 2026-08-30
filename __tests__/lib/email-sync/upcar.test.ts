/** @jest-environment node */
import { readFileSync } from 'fs'
import { join } from 'path'
import { parseUpcarEmail } from '@/lib/email-sync/upcar'

const fx = (name: string) =>
  readFileSync(join(__dirname, 'fixtures/upcar', name), 'utf-8')

describe('parseUpcarEmail', () => {
  it('parses an Accepted email into a confirm', () => {
    const p = parseUpcarEmail(
      fx('accepted.txt'),
      'Booking 17776 Accepted - Your Car Has Been Booked',
      'msg-accepted',
    )
    expect(p).toMatchObject({
      type: 'confirm',
      source: 'upcar',
      status: 'confirmed',
      reservationId: '17776',
      customer_name: 'Justin Taylor',
      customer_phone: '+19292588593',
      customer_dob: '1994-12-01',
      vehicle_name: 'Audi Q3 2018',
      pickup_date: '2026-08-28',
      return_date: '2026-08-30',
      pickup_time: '12:30',
      return_time: '10:00',
      total_amount: 82.5,
      messageId: 'msg-accepted',
    })
  })

  it('infers the year for the year-less Accepted date from the email received date', () => {
    // received Dec 2026, trip "Jan 3" with no year -> should roll to 2027
    const body = fx('accepted.txt')
      .replace('Fri, Aug 28 - 12:30 PM', 'Sat, Jan 3 - 09:00 AM')
      .replace('Sun, Aug 30 - 10:00 AM', 'Mon, Jan 5 - 11:00 AM')
    const p = parseUpcarEmail(body, 'Booking 17776 Accepted', 'm', new Date('2026-12-20T00:00:00Z'))
    expect(p?.pickup_date).toBe('2027-01-03')
    expect(p?.return_date).toBe('2027-01-05')
  })

  it('parses a Modification Approved email, taking the NEW (not struck-through) datetime', () => {
    const p = parseUpcarEmail(
      fx('modification-approved.txt'),
      'Booking 17776 Modification Approved',
      'msg-mod',
    )
    expect(p).toMatchObject({
      type: 'modify',
      source: 'upcar',
      reservationId: '17776',
      vehicle_name: 'Audi Q3 2018',
      pickup_date: '2026-08-28',
      pickup_time: '11:30',        // the SECOND time on the "Trip start" line
      return_date: '2026-08-30',
      return_time: '10:00',
      total_amount: 82.5,
    })
    expect(p?.status).toBeUndefined()
  })

  it('parses a Car Swap Accepted email as a modify carrying only the new car', () => {
    const p = parseUpcarEmail(
      fx('car-swap-accepted.txt'),
      'Booking 17776 Car Swap Accepted',
      'msg-swap',
    )
    expect(p).toMatchObject({
      type: 'modify',
      source: 'upcar',
      reservationId: '17776',
      vehicle_name: 'Audi Q3 2018',
      pickup_date: null,
      return_date: null,
    })
  })

  it('treats a cancellation subject as a cancel', () => {
    const p = parseUpcarEmail(
      'Hi Ayrton, your booking has been cancelled. Booking ID: 17776 Guest Name: Justin Taylor',
      'Booking 17776 Cancelled',
      'msg-cancel',
    )
    expect(p).toMatchObject({ type: 'cancel', source: 'upcar', reservationId: '17776' })
  })

  it.each([
    ['booking-request.txt', 'Booking 17776 New Booking Request - Action Required'],
    ['check-out.txt', 'Please Check Out Your Trip 17776'],
  ])('ignores %s', (file, subject) => {
    expect(parseUpcarEmail(fx(file), subject, 'm')).toBeNull()
  })

  it.each([
    'Booking 17776 New Message From Justin',
    'New Device Login Alert',
    'Your OTP Code',
    'Complete your Upcar payout setup',
    'Renter DL Photos Submitted for Trip ID: 17776',
    'Upcar is now live in 18 states',
  ])('ignores non-booking subject: %s', (subject) => {
    expect(parseUpcarEmail('some body text', subject, 'm')).toBeNull()
  })

  it('returns null when a required date cannot be parsed', () => {
    const body = fx('accepted.txt').replace('Start Date: Fri, Aug 28 - 12:30 PM', 'Start Date: unknown')
    expect(parseUpcarEmail(body, 'Booking 17776 Accepted', 'm')).toBeNull()
  })
})
