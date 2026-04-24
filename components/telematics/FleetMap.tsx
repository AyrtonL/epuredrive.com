'use client'

// components/telematics/FleetMap.tsx
// Thin SSR-safe wrapper. react-leaflet touches `window` on import so we route
// everything through next/dynamic with ssr:false.
import dynamic from 'next/dynamic'
import type { MapVehicle } from './types'

const FleetMapInner = dynamic(() => import('./FleetMapInner'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full rounded-2xl bg-white/5 animate-pulse" />
  ),
})

interface Props {
  vehicles: MapVehicle[]
  onSelectCar: (carId: number) => void
  focusCarId: number | null
}

export default function FleetMap(props: Props) {
  return <FleetMapInner {...props} />
}
