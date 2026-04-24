'use client'

// components/telematics/VehicleMarker.tsx
// Custom Leaflet marker colored by vehicle status (moving / idle / offline).
// We build a divIcon from an inline SVG so we don't have to ship PNG assets
// and don't hit the webpack "marker-icon.png 404" issue that plain
// L.Icon.Default causes in a bundler.
import type { ReactNode } from 'react'
import { Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { statusColor, statusLabel, type MapVehicle } from './types'

function buildDivIcon(color: string): L.DivIcon {
  const html = `
    <span style="
      display:block;
      width:22px;
      height:22px;
      border-radius:999px;
      background:${color};
      border:3px solid rgba(255,255,255,0.95);
      box-shadow:0 2px 6px rgba(0,0,0,0.45);
    "></span>`
  return L.divIcon({
    className: 'telematics-vehicle-marker',
    html,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -11],
  })
}

interface Props {
  vehicle: MapVehicle
  onSelect: (carId: number) => void
  children?: ReactNode
}

export default function VehicleMarker({ vehicle, onSelect, children }: Props) {
  if (vehicle.lat === null || vehicle.lon === null) return null
  const color = statusColor(vehicle.status)
  const label = [vehicle.make, vehicle.model].filter(Boolean).join(' ') || 'Vehicle'
  return (
    <Marker
      position={[vehicle.lat, vehicle.lon]}
      icon={buildDivIcon(color)}
      eventHandlers={{ click: () => onSelect(vehicle.id) }}
    >
      <Popup>
        <div style={{ minWidth: 140 }}>
          <div style={{ fontWeight: 700 }}>{vehicle.plate ?? label}</div>
          <div style={{ fontSize: 12, color: '#555' }}>{label}</div>
          <div style={{ fontSize: 11, color, marginTop: 4 }}>
            {statusLabel(vehicle.status)}
          </div>
          {children}
        </div>
      </Popup>
    </Marker>
  )
}
