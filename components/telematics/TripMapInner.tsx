'use client'

// components/telematics/TripMapInner.tsx
// Inner trip map component — renders the route polyline plus start/end
// markers. Mounted only via next/dynamic({ ssr: false }) from TripMap.tsx.
import { useMemo } from 'react'
import {
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  Popup,
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { TripMapPoint } from './TripMap'

const FALLBACK_CENTER: [number, number] = [25.76, -80.19]
const DEFAULT_ZOOM = 13

interface Props {
  points: TripMapPoint[]
  startPoint: TripMapPoint | null
  endPoint: TripMapPoint | null
}

function polylineBounds(points: TripMapPoint[]): [number, number] {
  if (points.length === 0) return FALLBACK_CENTER
  let sumLat = 0
  let sumLon = 0
  for (const p of points) {
    sumLat += p.lat
    sumLon += p.lon
  }
  return [sumLat / points.length, sumLon / points.length]
}

export default function TripMapInner({ points, startPoint, endPoint }: Props) {
  const center = useMemo(() => polylineBounds(points), [points])
  const path: [number, number][] = useMemo(
    () => points.map((p) => [p.lat, p.lon]),
    [points],
  )

  return (
    <MapContainer
      center={center}
      zoom={DEFAULT_ZOOM}
      style={{ height: '100%', width: '100%', borderRadius: '1rem' }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {path.length >= 2 && (
        <Polyline
          positions={path}
          pathOptions={{ color: '#34d399', weight: 4, opacity: 0.8 }}
        />
      )}
      {startPoint && (
        <CircleMarker
          center={[startPoint.lat, startPoint.lon]}
          radius={8}
          pathOptions={{ color: '#34d399', fillColor: '#34d399', fillOpacity: 0.9 }}
        >
          <Popup>Start</Popup>
        </CircleMarker>
      )}
      {endPoint && (
        <CircleMarker
          center={[endPoint.lat, endPoint.lon]}
          radius={8}
          pathOptions={{ color: '#f87171', fillColor: '#f87171', fillOpacity: 0.9 }}
        >
          <Popup>End</Popup>
        </CircleMarker>
      )}
    </MapContainer>
  )
}
