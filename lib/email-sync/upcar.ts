import type { ParsedEmail } from './types'

const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7,
  august: 8, september: 9, october: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9,
  oct: 10, nov: 11, dec: 12,
}

const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`

function to24h(hour: number, minute: number, ampm: string): string {
  let h = hour % 12
  if (/pm/i.test(ampm)) h += 12
  return `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

// "08/28/2026 12:30 PM" -> { date: "2026-08-28", time: "12:30" }
function parseSlashDateTime(str: string): { date: string; time: string } | null {
  const m = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)/i)
  if (!m) return null
  return {
    date: iso(+m[3], +m[1], +m[2]),
    time: to24h(+m[4], +m[5], m[6]),
  }
}

// "Fri, Aug 28 - 12:30 PM" (no year) or "Friday, August 28, 2026 at 1:30 PM"
function parseNamedDateTime(
  str: string,
  reference: Date,
): { date: string; time: string } | null {
  // with explicit year
  let m = str.match(/([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4}).*?(\d{1,2}):(\d{2})\s*(AM|PM)/i)
  if (m && MONTHS[m[1].toLowerCase()]) {
    return { date: iso(+m[3], MONTHS[m[1].toLowerCase()], +m[2]), time: to24h(+m[4], +m[5], m[6]) }
  }
  // no year — infer from the email received date
  m = str.match(/([A-Za-z]{3,}),?\s+(\d{1,2})\s*[-–]\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i)
  if (m && MONTHS[m[1].toLowerCase()]) {
    const month = MONTHS[m[1].toLowerCase()]
    const day = +m[2]
    let year = reference.getUTCFullYear()
    // A booking email arrives around the trip; the trip may already have started a
    // few days ago, but a date that lands many months in the past really belongs
    // to next year. Roll forward only past a ~6-month grace window.
    const candidate = Date.UTC(year, month - 1, day)
    if (candidate < reference.getTime() - 183 * 24 * 60 * 60 * 1000) year += 1
    return { date: iso(year, month, day), time: to24h(+m[3], +m[4], m[5]) }
  }
  return null
}

function bookingId(subject: string, body: string): string | null {
  return (
    subject.match(/Booking\s+(\d+)/i)?.[1] ??
    subject.match(/Trip\s+(?:ID:?\s*)?(\d+)/i)?.[1] ??
    body.match(/Booking ID:?\s*(\d+)/i)?.[1] ??
    body.match(/Trip ID:?\s*(\d+)/i)?.[1] ??
    null
  )
}

function guestName(body: string): string | null {
  const m =
    body.match(/Guest DL Name:?\s*([A-Za-z][A-Za-z .'’-]+?)(?=\s+\*|\s+(?:Guest|Booking|Start|Trip|Pickup|Car|DOB|License|Your)\b|\s*$)/i) ||
    body.match(/Guest Name:?\s*([A-Za-z][A-Za-z .'’-]+?)(?=\s+\*|\s+(?:Guest|Booking|Start|Trip|Pickup|Car|DOB|License|Message|Your)\b|\s*$)/i) ||
    body.match(/Guest:?\s*([A-Za-z][A-Za-z .'’-]+?)(?=\s+\*|\s+(?:Guest|Booking|Start|Trip|Pickup|Car|DOB|License|Your)\b|\s*$)/i)
  return m ? m[1].trim() : null
}

function vehicleName(body: string): string | undefined {
  const m =
    body.match(/New Car:?\s*(.+?)(?=\s*(?:You can|$|\n))/i) ||
    body.match(/\bCar:?\s*(.+?)(?=\s*(?:\*|Guest|License|You can|$|\n))/i) ||
    body.match(/booking request for (.+?) from /i)
  if (!m) return undefined
  return m[1].replace(/\s+at\s+.+$/i, '').trim()
}

function earnings(body: string): number | null {
  const m = body.match(/Your (?:Estimated |Total )?(?:Total )?Earnings:?\s*\$([0-9,]+(?:\.\d{2})?)/i)
  return m ? parseFloat(m[1].replace(/,/g, '')) : null
}

function phone(body: string): string | null {
  const m = body.match(/Guest Phone:?\s*(\+?[\d][\d\s()-]{6,}\d)/i)
  return m ? m[1].replace(/[^\d+]/g, '') : null
}

function dob(body: string): string | null {
  const m = body.match(/Guest DOB:?\s*(\d{1,2})\/(\d{4})/i)
  return m ? `${m[2]}-${String(+m[1]).padStart(2, '0')}-01` : null
}

/**
 * Parse an Upcar host email (`support@upcar.ai`) into a ParsedEmail, or null if
 * it is not a booking lifecycle email we act on.
 *
 * @param reference  the email's received date, used to infer the year on the
 *                   year-less "Start Date: Fri, Aug 28" format. Defaults to now.
 */
export function parseUpcarEmail(
  body: string,
  subject: string,
  messageId: string,
  reference: Date = new Date(),
): ParsedEmail | null {
  const s = subject
  const isAccepted = /\bAccepted\b|Car Has Been Booked/i.test(s)
  const isModification = /Modification (?:Approved|Auto-Approved)/i.test(s)
  const isCarSwap = /Car Swap Accepted/i.test(s)
  const isCancel = /\b(cancell?ed|cancel|declined)\b/i.test(s)

  // Explicitly ignored booking-adjacent emails
  if (
    /New Booking Request|Change Requested|New Message From|Please Check Out|Vehicle Not Returned|DL Photos|Device Login|OTP|payout setup|Listing Approved/i.test(s)
  ) {
    return null
  }
  if (!isAccepted && !isModification && !isCarSwap && !isCancel) return null

  const reservationId = bookingId(s, body)

  if (isCancel) {
    return {
      type: 'cancel', source: 'upcar', messageId, reservationId,
      customer_name: guestName(body), pickup_date: null, return_date: null,
    }
  }

  if (isCarSwap) {
    // TODO(upcar): a swap email carries no dates — only the new car. Update car_id only.
    return {
      type: 'modify', source: 'upcar', messageId, reservationId,
      customer_name: guestName(body), vehicle_name: vehicleName(body),
      pickup_date: null, return_date: null,
    }
  }

  // Accepted + Modification both carry dates/times/earnings
  let pickup: { date: string; time: string } | null = null
  let ret: { date: string; time: string } | null = null

  if (isModification) {
    // "Trip start <old> <new>"  — the LAST datetime before "Trip end" is the new value
    const startBlock = body.match(/Trip start\b([\s\S]*?)Trip end\b/i)?.[1] ?? ''
    const endBlock = body.match(/Trip end\b([\s\S]*?)(?:Your (?:Total )?Earnings|View Booking|$)/i)?.[1] ?? ''
    const lastDT = (blk: string) => {
      const all = blk.match(/\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}\s*(?:AM|PM)/gi)
      return all?.length ? parseSlashDateTime(all[all.length - 1]) : null
    }
    pickup = lastDT(startBlock)
    ret = lastDT(endBlock)
  } else {
    const startStr = body.match(/Start (?:Date|Time):?\s*(.+?)(?=\s+End (?:Date|Time):)/i)?.[1] ?? ''
    const endStr = body.match(/End (?:Date|Time):?\s*(.+?)(?=\s+(?:Pickup|Return|Your|Miles|Important|$))/i)?.[1] ?? ''
    pickup = parseNamedDateTime(startStr, reference)
    ret = parseNamedDateTime(endStr, reference)
  }

  if (!pickup || !ret) return null

  return {
    type: isModification ? 'modify' : 'confirm',
    source: 'upcar',
    messageId,
    reservationId,
    customer_name: guestName(body),
    customer_phone: isAccepted ? phone(body) : null,
    customer_dob: isAccepted ? dob(body) : null,
    vehicle_name: vehicleName(body),
    pickup_date: pickup.date,
    pickup_time: pickup.time,
    return_date: ret.date,
    return_time: ret.time,
    total_amount: earnings(body),
    ...(isModification ? {} : { status: 'confirmed' }),
  }
}
