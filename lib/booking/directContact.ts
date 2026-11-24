/**
 * Bookings the operator enters by hand (phone, WhatsApp, walk-in, referral)
 * are the customers we can market to again — so we require a way to reach
 * them. Platform bookings (Turo/iCal/Upcar) are exempt: their contact data
 * comes from the platform and Turo forbids off-platform solicitation anyway.
 * Website checkouts collect email/phone in their own form.
 */
const OPERATOR_ENTERED_SOURCES = new Set(['admin', 'manual'])
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface DirectContactInput {
  source: string | null | undefined
  email: string | null | undefined
  phone: string | null | undefined
  /** Only new bookings are enforced, so editing legacy rows never gets blocked. */
  isNew: boolean
}

export function isDirectSource(source: string | null | undefined): boolean {
  return OPERATOR_ENTERED_SOURCES.has(source || 'admin')
}

export function directContactError(input: DirectContactInput): string | null {
  if (!input.isNew || !isDirectSource(input.source)) return null

  const email = (input.email ?? '').trim()
  const phone = (input.phone ?? '').trim()

  if (!email) return 'Customer email is required for direct bookings.'
  if (!EMAIL_RE.test(email)) return 'Enter a valid email address.'
  if (!phone) return 'Customer phone is required for direct bookings.'
  return null
}
