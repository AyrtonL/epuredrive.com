'use client'

// components/telematics/GeofenceEditorInner.tsx
// The actual Leaflet + leaflet-draw editor. Mounted only via
// next/dynamic({ ssr: false }) from GeofenceEditor.tsx.
//
// Notes
//   - leaflet-draw registers plugin methods on the L namespace at import
//     time; we therefore rely on a dynamic import + runtime calls.
//   - @types/leaflet-draw exists but doesn't cover the whole plugin API;
//     we use `// @ts-expect-error` where the typings are incomplete. The
//     authoritative safety net is the Zod validation on the server action.
//   - Polygon is emitted as GeoJSON { type: 'Polygon', coordinates: [[[lon,lat],...]] }
//     with a closing vertex equal to the first vertex — matching our
//     TelematicsGeofence shape.
import { useEffect, useMemo, useRef } from 'react'
import { MapContainer, TileLayer } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw/dist/leaflet.draw.css'
import 'leaflet-draw'
import type { GeoJsonPolygon } from '@/lib/supabase/types'

const FALLBACK_CENTER: [number, number] = [25.76, -80.19]
const DEFAULT_ZOOM = 11

interface Props {
  polygon: GeoJsonPolygon | null
  onChange: (polygon: GeoJsonPolygon | null) => void
}

function polygonCentroid(polygon: GeoJsonPolygon | null): [number, number] {
  if (!polygon || !polygon.coordinates[0]?.length) return FALLBACK_CENTER
  const ring = polygon.coordinates[0]
  let sumLat = 0
  let sumLon = 0
  // Skip the closing duplicate vertex when averaging.
  const points = ring[ring.length - 1] && ring[ring.length - 1][0] === ring[0][0]
    ? ring.slice(0, -1)
    : ring
  for (const [lon, lat] of points) {
    sumLat += lat
    sumLon += lon
  }
  return [sumLat / points.length, sumLon / points.length]
}

function toGeoJsonPolygon(latlngs: L.LatLng[]): GeoJsonPolygon {
  const ring: [number, number][] = latlngs.map((p) => [p.lng, p.lat])
  // Close the ring (GeoJSON requires first vertex == last vertex).
  if (
    ring.length > 0 &&
    (ring[0][0] !== ring[ring.length - 1][0] ||
      ring[0][1] !== ring[ring.length - 1][1])
  ) {
    ring.push([ring[0][0], ring[0][1]])
  }
  return { type: 'Polygon', coordinates: [ring] }
}

function polygonToLatLngs(polygon: GeoJsonPolygon): [number, number][] {
  const ring = polygon.coordinates[0] ?? []
  // Drop closing vertex for Leaflet (it closes rings implicitly).
  const open =
    ring.length > 1 &&
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1]
      ? ring.slice(0, -1)
      : ring
  return open.map(([lon, lat]) => [lat, lon])
}

function DrawControl({
  polygon,
  onChange,
}: {
  polygon: GeoJsonPolygon | null
  onChange: (polygon: GeoJsonPolygon | null) => void
}) {
  // We mount the draw control manually instead of using a wrapper — the
  // react-leaflet-draw packages are laggy behind react-leaflet's current
  // versions, and pulling a plain Leaflet control in is simpler and more
  // robust.
  const mapInstance = useLeafletMap()
  const featureGroupRef = useRef<L.FeatureGroup | null>(null)
  const onChangeRef = useRef(onChange)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    if (!mapInstance) return

    const featureGroup = new L.FeatureGroup()
    featureGroupRef.current = featureGroup
    mapInstance.addLayer(featureGroup)

    // Seed existing polygon.
    if (polygon) {
      const latlngs = polygonToLatLngs(polygon)
      if (latlngs.length >= 3) {
        const poly = L.polygon(latlngs, {
          color: '#34d399',
          fillColor: '#34d399',
          fillOpacity: 0.15,
        })
        featureGroup.addLayer(poly)
      }
    }

    // leaflet-draw augments L at runtime; @types/leaflet-draw typings cover this.
    const drawControl = new L.Control.Draw({
      edit: {
        featureGroup,
        remove: true,
      },
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: false,
          shapeOptions: {
            color: '#34d399',
            fillColor: '#34d399',
            fillOpacity: 0.15,
          },
          // leaflet-draw hint; server validates the real cap (101 inc. close).
          maxPoints: 100,
        },
        polyline: false,
        rectangle: false,
        circle: false,
        marker: false,
        circlemarker: false,
      },
    })
    mapInstance.addControl(drawControl)

    // Only one polygon at a time — we emit the latest shape to the parent.
    const handleCreated = (e: L.LeafletEvent) => {
      const layer = (e as unknown as { layer: L.Polygon }).layer
      // Clear any previous polygons (we keep a single one).
      featureGroup.clearLayers()
      featureGroup.addLayer(layer)
      const latlngs = (layer.getLatLngs()[0] ?? []) as L.LatLng[]
      onChangeRef.current(toGeoJsonPolygon(latlngs))
    }
    const handleEdited = (e: L.LeafletEvent) => {
      const layers = (e as unknown as { layers: L.LayerGroup }).layers
      layers.eachLayer((l) => {
        const poly = l as L.Polygon
        const latlngs = (poly.getLatLngs()[0] ?? []) as L.LatLng[]
        onChangeRef.current(toGeoJsonPolygon(latlngs))
      })
    }
    const handleDeleted = () => {
      onChangeRef.current(null)
    }

    mapInstance.on(L.Draw.Event.CREATED, handleCreated)
    mapInstance.on(L.Draw.Event.EDITED, handleEdited)
    mapInstance.on(L.Draw.Event.DELETED, handleDeleted)

    return () => {
      mapInstance.off(L.Draw.Event.CREATED, handleCreated)
      mapInstance.off(L.Draw.Event.EDITED, handleEdited)
      mapInstance.off(L.Draw.Event.DELETED, handleDeleted)
      mapInstance.removeControl(drawControl)
      mapInstance.removeLayer(featureGroup)
    }
    // Intentionally only bind once — polygon changes don't reset the map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapInstance])

  return null
}

// Tiny shim so DrawControl can `useMap()` without importing from react-leaflet
// at module top level (keeps the file tree-shakable on SSR bundles).
function useLeafletMap(): L.Map | null {
  // dynamic import to avoid loading react-leaflet at SSR
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useMap } = require('react-leaflet') as typeof import('react-leaflet')
  return useMap()
}

export default function GeofenceEditorInner({ polygon, onChange }: Props) {
  const center = useMemo(() => polygonCentroid(polygon), [polygon])

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
      <DrawControl polygon={polygon} onChange={onChange} />
    </MapContainer>
  )
}
