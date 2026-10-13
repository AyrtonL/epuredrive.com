// lib/booking/dates.ts
//
// Server-side validation of a public booking window. The booking site sends
// YYYY-MM-DD dates and 12h times ("10:00 AM"); every public booking route
// (cash request, Stripe, Square) must validate the same way.

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const MAX_DAYS = 365
const DAY_MS = 86_400_000

export type WindowResult = { ok: true; days: number } | { ok: false; error: string }

/** "10:00 AM" → "10:00"; "14:30" passes through; anything else → null. */
export function to24h(time: string | null | undefined): string | null {
  if (!time) return null
  const t = time.trim()
  const h24 = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(t)
  if (h24) return `${h24[1]}:${h24[2]}`
  const h12 = /^(\d{1,2}):([0-5]\d)\s*(AM|PM)$/i.exec(t)
  if (!h12) return null
  const hour = Number(h12[1])
  if (hour < 1 || hour > 12) return null
  const isPm = h12[3].toUpperCase() === 'PM'
  const h = (hour % 12) + (isPm ? 12 : 0)
  return `${String(h).padStart(2, '0')}:${h12[2]}`
}

function parseIsoDate(value: string): number | null {
  if (!ISO_DATE.test(value)) return null
  const ms = Date.parse(`${value}T00:00:00Z`)
  if (Number.isNaN(ms)) return null
  // Reject roll-overs like 2026-02-31 → March 3
  return new Date(ms).toISOString().slice(0, 10) === value ? ms : null
}

/**
 * Pickup must be today or later (app timezone, passed in as `todayIso`),
 * return strictly after pickup, at most a year long.
 */
export function validateBookingWindow(pickupDate: string, returnDate: string, todayIso: string): WindowResult {
  const start = parseIsoDate(pickupDate)
  const end = parseIsoDate(returnDate)
  if (start === null || end === null) return { ok: false, error: 'Invalid dates' }
  if (pickupDate < todayIso) return { ok: false, error: 'Pickup date is in the past' }
  if (end <= start) return { ok: false, error: 'Return date must be after pickup date' }
  const days = Math.round((end - start) / DAY_MS)
  if (days > MAX_DAYS) return { ok: false, error: 'Rentals are limited to 365 days' }
  return { ok: true, days }
}
