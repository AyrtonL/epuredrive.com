/**
 * lib/ical-parser.ts
 * Ported from legacy dashboard.js parseIcal()
 * Converts iCalendar (.ics) text into reservation insertion objects.
 */

export interface ParsedEvent {
  car_id: number
  customer_name: string
  customer_email: string
  customer_phone: string
  pickup_date: string
  return_date: string
  status: string
  source: string
  notes: string
}

function toDate(s: string): string {
  const raw = s.replace(/[TZ\-]/g, '').slice(0, 8)
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`
}

function prevDay(d: string): string {
  const dt = new Date(d + 'T12:00:00')
  dt.setDate(dt.getDate() - 1)
  return dt.toISOString().slice(0, 10)
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

export function parseIcal(icsText: string, carId: number, sourceName = 'Calendar'): ParsedEvent[] {
  const events: ParsedEvent[] = []
  const today = todayStr()

  // RFC 5545: unfold continuation lines
  const unfolded = icsText.replace(/\r?\n[ \t]/g, '')
  const vevents = unfolded.split(/BEGIN:VEVENT/i).slice(1)

  const src = /turo/i.test(sourceName) ? 'turo'
    : /airbnb/i.test(sourceName) ? 'ical'
    : 'ical'

  vevents.forEach(block => {
    const get = (key: string) => {
      const m = block.match(new RegExp(`^${key}(?:;[^:]*)?:(.+)`, 'im'))
      return m ? m[1].trim() : null
    }

    const dtstart = get('DTSTART')
    const dtend = get('DTEND')
    if (!dtstart) return

    const start = toDate(dtstart)
    const isAllDay = !dtstart.includes('T')
    let end = dtend ? toDate(dtend) : start

    // iCal all-day DTEND is exclusive (next day after last night)
    if (isAllDay && end > start) end = prevDay(end)
    if (end < today) return // skip past events

    // Parse description for guest details
    const rawDesc = (get('DESCRIPTION') || '')
      .replace(/\\n/g, '\n').replace(/\\N/g, '\n')
      .replace(/\\,/g, ',').replace(/\\;/g, ';')

    const fromDesc = (...keys: string[]) => {
      for (const k of keys) {
        const m = rawDesc.match(new RegExp(k + '\\s*:?\\s*([^\\n]+)', 'i'))
        if (m) return m[1].trim()
      }
      return null
    }

    const phone = fromDesc('Pickup Phone', 'Dropoff Phone', 'Telephone', 'Phone', 'Tel') ?? ''
    const email = fromDesc('Email') ?? ''
    const resId = fromDesc('Reservation Number', 'Reservation #', 'Reservation ID', 'Trip ID', 'Confirmation')

    let guestName = fromDesc('Guest', 'Guests', 'Renter', 'Traveler', 'Visitor')
    if (!guestName) {
      const raw = (get('SUMMARY') || '').trim()
      guestName = raw
        .replace(/\s*[-–]\s*(Turo|Airbnb|VRBO|Booking\.com)\b.*/i, '')
        .replace(/\b(Turo|Airbnb|VRBO)\b\s*(Reservation|Booking|Trip|Guest)?\s*/gi, '')
        .replace(/^(Reserved|Reservation|Booking|Blocked|Busy)$/i, '')
        .trim()
    }
    if (!guestName) guestName = `${sourceName} Guest`

    const notes = resId ? `${sourceName} #${resId}` : `Imported from [${sourceName}]`

    events.push({
      car_id: carId,
      customer_name: guestName,
      customer_email: email,
      customer_phone: phone,
      pickup_date: start,
      return_date: end,
      status: 'confirmed',
      source: src,
      notes,
    })
  })

  return events
}
