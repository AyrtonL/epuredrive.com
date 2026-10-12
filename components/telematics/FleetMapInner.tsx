'use client'

// components/telematics/FleetMapInner.tsx
// The actual react-leaflet map. Rendered only via `next/dynamic({ ssr: false })`
// from FleetMap.tsx so window/document references can't fail during SSR.
import { useEffect, useMemo, useRef } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import { latLngBounds, type Map as LeafletMap } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import VehicleMarker from './VehicleMarker'
import type { MapVehicle } from './types'

// Miami fallback center — matches the rest of the app's Florida origin.
const FALLBACK_CENTER: [number, number] = [25.76, -80.19]
const DEFAULT_ZOOM = 11
const FOCUSED_ZOOM = 15
const FIT_PADDING_PX = 40
const FIT_MAX_ZOOM = 13

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

/**
 * On first render with coordinates, frames every vehicle. A centroid alone
 * lands between far-apart cars (Miami + Orlando → Okeechobee) and shows none.
 * Runs once so polling updates don't yank the view while the user pans.
 */
function FitToVehicles({ vehicles }: { vehicles: MapVehicle[] }) {
  const map = useMap()
  const fitted = useRef(false)
  useEffect(() => {
    if (fitted.current) return
    const points = vehicles
      .filter((v) => v.lat !== null && v.lon !== null)
      .map((v) => [v.lat, v.lon] as [number, number])
    if (points.length === 0) return
    fitted.current = true
    if (points.length === 1) {
      map.setView(points[0], FIT_MAX_ZOOM)
      return
    }
    map.fitBounds(latLngBounds(points), { padding: [FIT_PADDING_PX, FIT_PADDING_PX], maxZoom: FIT_MAX_ZOOM })
  }, [vehicles, map])
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
      <FitToVehicles vehicles={vehicles} />
      <FlyToFocused vehicles={vehicles} focusCarId={focusCarId} />
    </MapContainer>
  )
}
