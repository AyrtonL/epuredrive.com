// components/telematics/types.ts
// Shared shapes for the Telematics dashboard client components.
// Keep these minimal — we ship only what the map/drawer/list UI consumes,
// not full Car rows, to keep the polling payload small.

export type VehicleStatus = 'moving' | 'idle' | 'offline'

export interface MapVehicle {
  id: number
  plate: string | null
  make: string | null
  model: string | null
  lat: number | null
  lon: number | null
  last_seen_at: string | null
  status: VehicleStatus
}

const OFFLINE_THRESHOLD_MS = 10 * 60 * 1000 // 10 min without ping → offline

/**
 * Compute a derived status for UI coloring. Strictly presentational — never
 * written back to the DB.
 */
export function computeVehicleStatus(
  lastSeenAt: string | null,
  speedMph: number | null,
  online: boolean | null,
): VehicleStatus {
  if (!lastSeenAt) return 'offline'
  const ts = new Date(lastSeenAt).getTime()
  if (Number.isNaN(ts)) return 'offline'
  if (Date.now() - ts > OFFLINE_THRESHOLD_MS) return 'offline'
  if (online === false) return 'offline'
  if (speedMph !== null && speedMph > 1) return 'moving'
  return 'idle'
}

export function statusColor(status: VehicleStatus): string {
  switch (status) {
    case 'moving':
      return '#34d399' // emerald-400
    case 'idle':
      return '#f59e0b' // amber-500
    case 'offline':
    default:
      return '#6b7280' // gray-500
  }
}

export function statusLabel(status: VehicleStatus): string {
  switch (status) {
    case 'moving':
      return 'Moving'
    case 'idle':
      return 'Idle'
    case 'offline':
    default:
      return 'Offline'
  }
}

export function formatRelative(iso: string | null): string {
  if (!iso) return 'Never'
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return 'Never'
  const diff = Math.max(0, Date.now() - then)
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m} min ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} hr${h === 1 ? '' : 's'} ago`
  const d = Math.floor(h / 24)
  return `${d} day${d === 1 ? '' : 's'} ago`
}
