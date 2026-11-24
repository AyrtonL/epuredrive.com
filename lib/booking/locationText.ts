// lib/booking/locationText.ts
//
// The pickup_location string stored on a public booking. For a "deliver to
// your address" location the customer's address is appended, so the operator
// sees where to bring the car. Stays parseable by resolveLocationFee
// (label + " (" prefix) and within prepareBooking's 200-char cap.

import type { PickupLocation } from '@/lib/supabase/types'

const MAX_LEN = 200

export function pickupLocationText(location: PickupLocation | null, deliveryAddress = ''): string {
  if (!location) return 'Not specified'
  const base = `${location.label}${location.fee > 0 ? ` ($${location.fee})` : ' (Free)'}`
  const address = deliveryAddress.replace(/\s+/g, ' ').trim()
  if (!location.delivery_to_customer || !address) return base
  return `${base} — ${address}`.slice(0, MAX_LEN)
}
