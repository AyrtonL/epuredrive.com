'use client'

// components/telematics/DeviceRow.tsx
// One row in the Devices table. Presentational shell around <LinkCarDropdown />.
import { useState } from 'react'
import LinkCarDropdown, { type CarOption } from './LinkCarDropdown'
import { formatRelative } from './types'

export interface DeviceRowData {
  id: string
  imei: string
  nickname: string | null
  vin: string | null
  online: boolean
  battery_voltage: number | null
  last_seen_at: string | null
  car_id: number | null
}

interface Props {
  device: DeviceRowData
  cars: CarOption[]
}

function StatusPill({ online, battery }: { online: boolean; battery: number | null }) {
  const color = online ? 'text-emerald-300' : 'text-white/50'
  const dot = online ? 'bg-emerald-400' : 'bg-white/30'
  const batteryLabel = battery === null ? '—' : `${battery.toFixed(1)}V`
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider">
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      <span className={color}>{online ? 'online' : 'offline'}</span>
      <span className="text-white/40">&middot; {batteryLabel}</span>
    </span>
  )
}

export default function DeviceRow({ device, cars }: Props) {
  const [error, setError] = useState<string | null>(null)
  const nickname = device.nickname?.trim() || `Device ${device.imei.slice(-6)}`

  return (
    <tr className="border-t border-white/[0.06] hover:bg-white/[0.02] transition-colors">
      <td className="py-3 px-4">
        <div className="text-white/90 font-semibold text-sm">{nickname}</div>
        <div className="text-white/40 text-[11px] font-mono mt-0.5">IMEI {device.imei}</div>
        <div className="text-white/30 text-[10px] mt-0.5">
          Last seen {formatRelative(device.last_seen_at)}
        </div>
      </td>
      <td className="py-3 px-4">
        <StatusPill online={device.online} battery={device.battery_voltage} />
      </td>
      <td className="py-3 px-4">
        <LinkCarDropdown
          deviceId={device.id}
          currentCarId={device.car_id}
          cars={cars}
          onError={setError}
        />
        {error && <div className="text-red-300 text-[11px] mt-1">{error}</div>}
      </td>
      <td className="py-3 px-4 text-white/70 text-sm font-mono">{device.vin ?? '—'}</td>
    </tr>
  )
}
