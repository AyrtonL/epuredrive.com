// lib/fleet/document-expiry.ts
//
// Vehicle registration / insurance expiry: status for the UI, and which
// alerts are due. Each expiry date alerts once per threshold (30 days, 7
// days, expired); renewing the document changes the date and starts over.

export type ExpiryKind = 'registration' | 'insurance'
export type ExpiryState = 'expired' | 'soon' | 'ok' | 'missing'

export const ALERT_THRESHOLDS = [30, 7, 0] as const
const SOON_DAYS = 30

export interface ExpiryStatus {
  state: ExpiryState
  daysLeft: number | null
  label: string
}

export interface ExpiryAlert {
  carId: number
  kind: ExpiryKind
  expiry: string
  daysLeft: number
  threshold: (typeof ALERT_THRESHOLDS)[number]
  /** carId:kind:expiry:threshold — the dedup key stored once sent */
  key: string
}

interface CarDocs {
  id: number
  registration_expiry?: string | null
  insurance_expiry?: string | null
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000)
}

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`

export function expiryStatus(date: string | null | undefined, today: string): ExpiryStatus {
  if (!date) return { state: 'missing', daysLeft: null, label: 'Not set' }
  const daysLeft = daysBetween(today, date.slice(0, 10))
  if (daysLeft < 0) return { state: 'expired', daysLeft, label: `Expired ${plural(-daysLeft, 'day')} ago` }
  if (daysLeft === 0) return { state: 'expired', daysLeft, label: 'Expires today' }
  if (daysLeft <= SOON_DAYS) return { state: 'soon', daysLeft, label: `Expires in ${plural(daysLeft, 'day')}` }
  return { state: 'ok', daysLeft, label: 'Valid' }
}

export const expiryKey = (carId: number, kind: ExpiryKind, expiry: string, threshold: number) =>
  `${carId}:${kind}:${expiry}:${threshold}`

/** Alerts due today that haven't been sent (`sentKeys` from car_document_alerts). */
export function dueExpiryAlerts(cars: readonly CarDocs[], today: string, sentKeys: ReadonlySet<string>): ExpiryAlert[] {
  const out: ExpiryAlert[] = []
  for (const car of cars) {
    for (const kind of ['registration', 'insurance'] as const) {
      const expiry = (kind === 'registration' ? car.registration_expiry : car.insurance_expiry)?.slice(0, 10)
      if (!expiry) continue
      const daysLeft = daysBetween(today, expiry)
      // Most severe threshold crossed (0 = expired, then 7, then 30).
      const threshold = [...ALERT_THRESHOLDS].reverse().find((t) => daysLeft <= t)
      if (threshold === undefined) continue
      const key = expiryKey(car.id, kind, expiry, threshold)
      if (sentKeys.has(key)) continue
      out.push({ carId: car.id, kind, expiry, daysLeft, threshold, key })
    }
  }
  return out
}
