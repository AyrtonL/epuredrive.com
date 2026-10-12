// lib/utils/format.ts
//
// One display format for money and dates across the dashboard, so tables
// stop mixing "$216.9", "2026-12-28" and "8/2/2026".

import { APP_TZ } from '@/lib/finance/revenue'

const EMPTY = '—'
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

/**
 * "$650", "$216.90", "-$461.23". `cents: false` rounds to whole dollars;
 * `cents: 'always'` keeps two decimals (accounting tables).
 */
export function formatMoney(
  value: number | string | null | undefined,
  { cents = true }: { cents?: boolean | 'always' } = {},
): string {
  if (value == null || value === '') return EMPTY
  const n = Number(value)
  if (!Number.isFinite(n)) return EMPTY

  const abs = Math.abs(n)
  const showCents = cents === 'always' || (cents && Math.round(abs * 100) % 100 !== 0)
  const digits = showCents ? 2 : 0
  const text = abs.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })
  return n < 0 && Number(text.replace(/,/g, '')) !== 0 ? `-$${text}` : `$${text}`
}

/** "Dec 28, 2026". Plain dates are taken as-is; timestamps use the app timezone. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return EMPTY
  const isDateOnly = DATE_ONLY.test(value)
  const date = new Date(isDateOnly ? `${value}T12:00:00Z` : value)
  if (Number.isNaN(date.getTime())) return EMPTY
  return date.toLocaleDateString('en-US', {
    timeZone: isDateOnly ? 'UTC' : APP_TZ,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
