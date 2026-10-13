import { parseTuroEmail, parseTuroTime } from '@/lib/email-sync/turo'

// Bodies mirror the real Turo plain-text templates (names/ids anonymized).
const BOOKED_BODY = `
Gustavo’s trip is booked.

    Cha-ching! Gustavo’s trip with your Porsche Cayenne at Miami International Airport is booked from Wednesday, October 28, 2026, 10:30 AM to Sunday, November 1, 2026, 10:00 AM.

You’ll earn $447.12.

    Porsche Cayenne 2021

            booked by Gustavo

            Trip start: 10/28/26 10:30 am
        Trip end: 11/1/26 10:00 am

            You earn: $447.12
            Reservation ID #61234567
`

const CHANGED_BODY = `
Hi I would like to keep using the car

    Volkswagen Atlas 2023

            booked by Michelle

            Trip start: 8/23/26 10:00 PM
        Trip end: 9/4/26 12:30 AM

            You earn: $535.05
            Reservation ID #60647021
`

describe('parseTuroTime', () => {
  it.each([
    ['10:30 am', '10:30'],
    ['10:00 PM', '22:00'],
    ['12:00 AM', '00:00'],
    ['12:15 pm', '12:15'],
    ['9:05 AM', '09:05'],
  ])('%s → %s', (input, expected) => {
    expect(parseTuroTime(input)).toBe(expected)
  })

  it('returns null for garbage', () => {
    expect(parseTuroTime('soon')).toBeNull()
    expect(parseTuroTime('13:00 PM')).toBeNull()
  })
})

describe('parseTuroEmail times', () => {
  it('extracts pickup/return times from a booked email', () => {
    const parsed = parseTuroEmail(BOOKED_BODY, 'Gustavo’s trip with your Porsche Cayenne is booked!', 'm1')
    expect(parsed).toMatchObject({
      type: 'confirm',
      pickup_date: '2026-10-28',
      return_date: '2026-11-01',
      pickup_time: '10:30',
      return_time: '10:00',
      reservationId: '61234567',
    })
  })

  it('extracts PM / past-midnight times from a changed-trip email', () => {
    const parsed = parseTuroEmail(
      CHANGED_BODY,
      'Michelle has changed their trip with your Volkswagen Atlas (60647021)',
      'm2',
    )
    expect(parsed).toMatchObject({
      type: 'modify',
      pickup_date: '2026-08-23',
      return_date: '2026-09-04',
      pickup_time: '22:00',
      return_time: '00:30',
    })
  })

  it('falls back to the prose sentence when the footer has no times', () => {
    const body = BOOKED_BODY.replace(/Trip start:.*\n.*Trip end:.*\n/, '')
    const parsed = parseTuroEmail(body, 'Gustavo’s trip with your Porsche Cayenne is booked!', 'm3')
    expect(parsed).toMatchObject({ pickup_time: '10:30', return_time: '10:00' })
  })

  it('leaves times null when the email has none (dates only)', () => {
    const body = `Ana’s trip with your Audi A3 is booked\n Trip start: 10/1/26\n Trip end: 10/3/26\n`
    const parsed = parseTuroEmail(body, 'Ana’s trip with your Audi A3 is booked!', 'm4')
    expect(parsed?.pickup_date).toBe('2026-10-01')
    expect(parsed?.pickup_time).toBeNull()
    expect(parsed?.return_time).toBeNull()
  })
})
