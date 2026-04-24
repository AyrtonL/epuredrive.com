'use client'

// components/telematics/TripMap.tsx
// SSR-safe wrapper around the trip polyline map. Loaded via next/dynamic
// with ssr:false because react-leaflet touches `window` on import.
import dynamic from 'next/dynamic'

export interface TripMapPoint {
  lat: number
  lon: number
  recorded_at?: string
  speed_mph?: number | null
}

const TripMapInner = dynamic(() => import('./TripMapInner'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full rounded-2xl bg-white/5 animate-pulse" />
  ),
})

interface Props {
  points: TripMapPoint[]
  startPoint: TripMapPoint | null
  endPoint: TripMapPoint | null
}

export default function TripMap(props: Props) {
  return <TripMapInner {...props} />
}
