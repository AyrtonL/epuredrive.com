'use client'

// components/telematics/GeofenceEditor.tsx
// SSR-safe wrapper around the Leaflet + leaflet-draw editor. The inner
// component references `window` and Leaflet globals at import time, so it
// must be loaded dynamically with ssr:false.
import dynamic from 'next/dynamic'
import type { GeoJsonPolygon } from '@/lib/supabase/types'

const GeofenceEditorInner = dynamic(() => import('./GeofenceEditorInner'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full rounded-2xl bg-white/5 animate-pulse" />
  ),
})

interface Props {
  polygon: GeoJsonPolygon | null
  onChange: (polygon: GeoJsonPolygon | null) => void
}

export default function GeofenceEditor(props: Props) {
  return <GeofenceEditorInner {...props} />
}
