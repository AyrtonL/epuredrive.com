import type { ParsedEmail } from './types'

// ── Turo email parsing ────────────────────────────────────────────────────────

const MONTH_MAP: Record<string, string> = {
  January: '01', February: '02', March: '03', April: '04',
  May: '05', June: '06', July: '07', August: '08',
  September: '09', October: '10', November: '11', December: '12',
}

function parseTuroDate(str: string): string | null {
  const m = str.match(/(\w+)\s+(\d{1,2}),\s+(\d{4})/)
  if (!m || !MONTH_MAP[m[1]]) return null
  return `${m[3]}-${MONTH_MAP[m[1]]}-${String(m[2]).padStart(2, '0')}`
}

// M/D/YY or M/D/YYYY (Turo's structured footer) → ISO YYYY-MM-DD
function parseSlashDate(str: string): string | null {
  const m = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/)
  if (!m) return null
  const yyyy = m[3].length === 2 ? `20${m[3]}` : m[3]
  return `${yyyy}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`
}

export function parseTuroEmail(body: string, subject: string, messageId: string): ParsedEmail | null {
  const fullText = subject + ' ' + body

  const isCancelled = /cancel/i.test(subject)
  const isModified = /changed their trip|modif|updated.*trip|trip.*updated/i.test(subject)
  const isConfirmed = /is booked|cha.?ching|trip.*booked|booked.*trip/i.test(fullText)
  const isReturned = /has returned your/i.test(subject)

  if (!isConfirmed && !isCancelled && !isModified && !isReturned) return null

  // The Turo Reservation ID is stable across all of a booking's emails - use it as the
  // primary key so they all update the one row. Format varies: "Reservation ID #123" on
  // confirm/modify/upcoming emails, "Reservation ID: #123" on the return-confirmation email.
  const resIdMatch = fullText.match(/Reservation ID:?\s*#?(\d+)/i) || subject.match(/\((\d{6,})\)/)
  const reservationId = resIdMatch?.[1] ?? null

  // Guest name: the subject is the most reliable source across all three email types.
  const subjGuest =
    subject.match(/^(.+?)[’']s trip with your/i) ||
    subject.match(/^(.+?) has (?:changed|canceled|cancelled|returned)/i)
  const bodyGuest =
    body.match(/Cha-?ching!\s*(.+?)[’']s trip with your/i) ||
    body.match(/(.+?)[’']s trip with your/i)
  const guestName = (subjGuest?.[1] || bodyGuest?.[1] || '').trim() || null

  if (isCancelled) {
    return { type: 'cancel', messageId, reservationId, customer_name: guestName, pickup_date: null, return_date: null }
  }

  // The return-confirmation email carries the final reconciled "Total paid" for the trip
  // (extra miles, late fees, etc. already applied) - the one place Turo gives a settled
  // amount instead of the booking-time estimate. No dates/vehicle needed: this only
  // refreshes total_amount on the existing reservation, matched by reservationId.
  if (isReturned) {
    const totalMatch = body.match(/Total paid[^$]*\$([0-9,]+(?:\.\d{2})?)/i)
    if (!reservationId || !totalMatch) return null
    return {
      type: 'return',
      messageId,
      reservationId,
      customer_name: guestName,
      pickup_date: null,
      return_date: null,
      total_amount: parseFloat(totalMatch[1].replace(/,/g, '')),
    }
  }

  // Turo sometimes appends the delivery location ("Audi A3 at Fort Lauderdale ... Airport").
  // Strip the " at <location>" suffix so the vehicle name matches a fleet car.
  const vehicleMatch = body.match(/trip with your (.+?) is (?:booked|confirmed|modified)/i)
  const vehicleName = vehicleMatch?.[1]?.replace(/\s+at\s+.+$/i, '').trim() ?? ''

  // Dates: prose ("booked from ... to ...") for confirmations; structured footer
  // ("Trip start: 7/10/26 ... Trip end: ...") for modifications and as a fallback.
  const datesMatch = body.match(/booked from (.+?\d{4}).+? to (.+?\d{4})/i)
  let pickupDate = datesMatch ? parseTuroDate(datesMatch[1]) : null
  let returnDate = datesMatch ? parseTuroDate(datesMatch[2]) : null
  if (!pickupDate) {
    const m = body.match(/Trip start:?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i)
    if (m) pickupDate = parseSlashDate(m[1])
  }
  if (!returnDate) {
    const m = body.match(/Trip end:?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i)
    if (m) returnDate = parseSlashDate(m[1])
  }
  if (!pickupDate || !returnDate) return null

  const amountMatch =
    body.match(/You[’']ll earn \$([0-9,]+(?:\.\d{2})?)/i) ||
    body.match(/total earnings will be \$([0-9,]+(?:\.\d{2})?)/i) ||
    body.match(/You earn:?\s*\$([0-9,]+(?:\.\d{2})?)/i)

  return {
    type: isModified ? 'modify' : 'confirm',
    messageId,
    reservationId,
    customer_name: guestName,
    vehicle_name: vehicleName,
    pickup_date: pickupDate,
    return_date: returnDate,
    total_amount: amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : null,
    source: 'turo',
    status: 'confirmed',
  }
}
