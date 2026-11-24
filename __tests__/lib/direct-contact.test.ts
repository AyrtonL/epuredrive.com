import { directContactError } from '@/lib/booking/directContact'

describe('directContactError', () => {
  it('requires email and phone on a new admin booking', () => {
    expect(directContactError({ source: 'admin', email: '', phone: '', isNew: true })).toMatch(/email/i)
  })

  it('requires phone when only email is given', () => {
    expect(directContactError({ source: 'manual', email: 'a@b.co', phone: ' ', isNew: true })).toMatch(/phone/i)
  })

  it('rejects a malformed email', () => {
    expect(directContactError({ source: 'admin', email: 'nope', phone: '3055551234', isNew: true })).toMatch(/valid email/i)
  })

  it('passes with valid email and phone', () => {
    expect(directContactError({ source: 'admin', email: 'a@b.co', phone: '305-555-1234', isNew: true })).toBeNull()
  })

  it('does not require contact for Turo bookings', () => {
    expect(directContactError({ source: 'turo', email: '', phone: '', isNew: true })).toBeNull()
  })

  it('does not block edits of older bookings that lack contact info', () => {
    expect(directContactError({ source: 'admin', email: '', phone: '', isNew: false })).toBeNull()
  })

  it('treats a missing source as admin', () => {
    expect(directContactError({ source: undefined, email: '', phone: '', isNew: true })).toMatch(/email/i)
  })
})
