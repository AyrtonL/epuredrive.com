// lib/marketing/channels.ts
//
// Booking-channel analytics for the Marketing page: how much of the business
// is direct (ours) vs Turo (platform-owned), what each is worth, and how many
// customers come back. Revenue follows lib/finance/revenue.ts (earned =
// completed) so these numbers never disagree with the finance pages.

import { revenueBucket } from '@/lib/finance/revenue'

export type Channel = 'direct' | 'turo' | 'other'

export const CHANNEL_LABELS: Record<Channel, string> = {
  direct: 'Direct (you + website)',
  turo: 'Turo',
  other: 'Other platforms',
}

const DIRECT_SOURCES = new Set(['admin', 'manual', 'web', 'website', 'stripe'])

export interface ChannelReservation {
  source: string | null
  status: string | null
  total_amount: number | string | null
  pickup_date: string | null
  return_date: string | null
  customer_name: string | null
  customer_email: string | null
  customer_phone: string | null
}

export interface ChannelRow {
  channel: Channel
  bookings: number
  earnedBookings: number
  earnedRevenue: number
  avgPerEarnedBooking: number
  avgDays: number
}

export interface ChannelStats {
  channels: ChannelRow[]
  totalBookings: number
  directShare: number
  uniqueCustomers: number
  repeatCustomers: number
  directEmailCapture: number
}

export function channelOf(source: string | null | undefined): Channel {
  const s = (source ?? '').toLowerCase()
  if (!s || DIRECT_SOURCES.has(s)) return 'direct'
  if (s === 'turo') return 'turo'
  return 'other'
}

function isCounted(r: ChannelReservation): boolean {
  return revenueBucket(r.status) !== 'excluded'
}

function rentalDays(r: ChannelReservation): number | null {
  if (!r.pickup_date || !r.return_date) return null
  const ms = Date.parse(`${r.return_date}T00:00:00Z`) - Date.parse(`${r.pickup_date}T00:00:00Z`)
  return Number.isFinite(ms) && ms >= 0 ? Math.max(1, ms / 86_400_000) : null
}

/** Stable identity for a customer across bookings: email, then phone digits, then name. */
export function customerKey(r: ChannelReservation): string | null {
  const email = r.customer_email?.trim().toLowerCase()
  if (email) return `e:${email}`
  const digits = r.customer_phone?.replace(/\D/g, '').slice(-10)
  if (digits && digits.length >= 7) return `p:${digits}`
  const name = r.customer_name?.trim().toLowerCase().replace(/\s+/g, ' ')
  return name ? `n:${name}` : null
}

function channelRow(channel: Channel, rows: ChannelReservation[]): ChannelRow {
  const earned = rows.filter((r) => revenueBucket(r.status) === 'earned')
  const earnedRevenue = earned.reduce((s, r) => s + (Number(r.total_amount) || 0), 0)
  const days = rows.map(rentalDays).filter((d): d is number => d != null)
  return {
    channel,
    bookings: rows.length,
    earnedBookings: earned.length,
    earnedRevenue,
    avgPerEarnedBooking: earned.length ? earnedRevenue / earned.length : 0,
    avgDays: days.length ? days.reduce((a, b) => a + b, 0) / days.length : 0,
  }
}

export function computeChannelStats(reservations: readonly ChannelReservation[]): ChannelStats {
  const counted = reservations.filter(isCounted)
  const channels = (['direct', 'turo', 'other'] as const).map((c) =>
    channelRow(c, counted.filter((r) => channelOf(r.source) === c)),
  )

  const visits = new Map<string, number>()
  for (const r of counted) {
    const key = customerKey(r)
    if (key) visits.set(key, (visits.get(key) ?? 0) + 1)
  }

  const direct = counted.filter((r) => channelOf(r.source) === 'direct')
  const directWithEmail = direct.filter((r) => r.customer_email?.trim()).length

  return {
    channels,
    totalBookings: counted.length,
    directShare: counted.length ? direct.length / counted.length : 0,
    uniqueCustomers: visits.size,
    repeatCustomers: [...visits.values()].filter((n) => n > 1).length,
    directEmailCapture: direct.length ? directWithEmail / direct.length : 0,
  }
}
