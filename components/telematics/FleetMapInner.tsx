'use client'

// components/telematics/FleetMapInner.tsx
// The actual react-leaflet map. Rendered only via `next/dynamic({ ssr: false })`
// from FleetMap.tsx so window/document references can't fail during SSR.
import { useEffect, useMemo, useRef } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import type { Map as LeafletMap } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import VehicleMarker from './VehicleMarker'
import type { MapVehicle } from './types'

// Miami fallback center — matches the rest of the app's Florida origin.
const FALLBACK_CENTER: [number, number] = [25.76, -80.19]
const DEFAULT_ZOOM = 11
const FOCUSED_ZOOM = 15

interface Props {
  vehicles: MapVehicle[]
  onSelectCar: (carId: number) => void
  focusCarId: number | null
}

function computeCentroid(vehicles: MapVehicle[]): [number, number] {
  const coords = vehicles.filter(
    (v): v is MapVehicle & { lat: number; lon: number } =>
      v.lat !== null && v.lon !== null,
  )
  if (coords.length === 0) return FALLBACK_CENTER
  let sumLat = 0
  let sumLon = 0
  for (const c of coords) {
    sumLat += c.lat
    sumLon += c.lon
  }
  return [sumLat / coords.length, sumLon / coords.length]
}

/**
 * Flies the map to the focused car, if one is selected and has coordinates.
 * Runs as a child of <MapContainer /> so it can call useMap().
 */
function FlyToFocused({
  vehicles,
  focusCarId,
}: {
  vehicles: MapVehicle[]
  focusCarId: number | null
}) {
  const map = useMap()
  useEffect(() => {
    if (focusCarId === null) return
    const target = vehicles.find((v) => v.id === focusCarId)
    if (!target || target.lat === null || target.lon === null) return
    map.flyTo([target.lat, target.lon], FOCUSED_ZOOM, { duration: 0.8 })
  }, [focusCarId, vehicles, map])
  return null
}

export default function FleetMapInner({ vehicles, onSelectCar, focusCarId }: Props) {
  const center = useMemo(() => computeCentroid(vehicles), [vehicles])
  const mapRef = useRef<LeafletMap | null>(null)

  return (
    <MapContainer
      center={center}
      zoom={DEFAULT_ZOOM}
      style={{ height: '100%', width: '100%', borderRadius: '1rem' }}
      scrollWheelZoom
      ref={(instance) => {
        mapRef.current = instance
      }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {vehicles.map((v) => (
        <VehicleMarker key={v.id} vehicle={v} onSelect={onSelectCar} />
      ))}
      <FlyToFocused vehicles={vehicles} focusCarId={focusCarId} />
    </MapContainer>
  )
}
