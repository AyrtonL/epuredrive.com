'use client'

// components/telematics/AlertRow.tsx
// Single alert row in the Alerts list. Renders the severity-colored shell +
// event type + car label + timestamp + Ack button + selection checkbox.
import { useTransition } from 'react'
import Link from 'next/link'
import { ackEventAction } from '@/app/(dashboard)/dashboard/telematics/alerts/actions'
import type {
  TelematicsEventType,
  TelematicsSeverity,
} from '@/lib/supabase/types'

export interface AlertRowData {
  id: string
  event_type: TelematicsEventType
  severity: TelematicsSeverity
  occurred_at: string
  acknowledged_at: string | null
  car_id: number | null
  car_label: string
}

interface Props {
  alert: AlertRowData
  selected: boolean
  onToggleSelect: (id: string, next: boolean) => void
}

const SEVERITY_STYLES: Record<TelematicsSeverity, string> = {
  critical: 'bg-red-500/10 text-red-300 border-red-500/30',
  warning: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  info: 'bg-white/5 text-white/50 border-white/10',
}

const EVENT_LABELS: Record<TelematicsEventType, string> = {
  ignition_on: 'Ignition on',
  ignition_off: 'Ignition off',
  trip_start: 'Trip start',
  trip_end: 'Trip end',
  geofence_enter: 'Geofence entered',
  geofence_exit: 'Geofence exited',
  speed_exceeded: 'Speed exceeded',
  hard_braking: 'Hard braking',
  hard_accel: 'Hard acceleration',
  dtc_new: 'Check-engine code',
  dtc_cleared: 'DTC cleared',
  battery_low: 'Battery low',
  offline: 'Device offline',
  online: 'Device online',
  connection_expired: 'Connection expired',
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function AlertRow({ alert, selected, onToggleSelect }: Props) {
  const [pending, startTransition] = useTransition()
  const ackDisabled = pending || alert.acknowledged_at !== null

  function handleAck() {
    startTransition(async () => {
      await ackEventAction(alert.id)
    })
  }

  const severityClass = SEVERITY_STYLES[alert.severity]
  const label = EVENT_LABELS[alert.event_type] ?? alert.event_type

  return (
    <li
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${severityClass} transition-opacity ${
        alert.acknowledged_at !== null ? 'opacity-60' : ''
      }`}
    >
      <input
        type="checkbox"
        checked={selected}
        disabled={alert.acknowledged_at !== null}
        onChange={(e) => onToggleSelect(alert.id, e.target.checked)}
        className="w-4 h-4 rounded bg-white/5 border-white/20"
        aria-label="Select alert"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold">{label}</span>
          <span className="text-xs opacity-70">&middot;</span>
          <span className="text-xs opacity-80 truncate">{alert.car_label}</span>
          <span className="text-xs opacity-70">&middot;</span>
          <span className="text-xs opacity-70">{formatTime(alert.occurred_at)}</span>
        </div>
        {alert.acknowledged_at !== null && (
          <div className="text-[11px] opacity-60 mt-0.5">Acknowledged</div>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {alert.car_id !== null && (
          <Link
            href={`/dashboard/telematics?focus=${alert.car_id}`}
            className="text-xs font-bold uppercase tracking-wider text-white/70 hover:text-white"
          >
            View on map
          </Link>
        )}
        <button
          type="button"
          onClick={handleAck}
          disabled={ackDisabled}
          className="bg-white/10 hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold uppercase tracking-wider text-white px-3 py-1.5 rounded-lg transition-colors"
        >
          {alert.acknowledged_at !== null ? 'Acked' : pending ? '...' : 'Ack'}
        </button>
      </div>
    </li>
  )
}

export { SEVERITY_STYLES, EVENT_LABELS }
