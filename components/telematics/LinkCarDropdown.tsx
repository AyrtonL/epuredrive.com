'use client'

// components/telematics/LinkCarDropdown.tsx
// Dropdown that assigns (or unlinks) a telematics device to/from a car.
// Calls the linkDeviceAction server action. Disabled while pending.
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { linkDeviceAction } from '@/app/(dashboard)/dashboard/telematics/devices/actions'

export interface CarOption {
  id: number
  label: string
}

interface Props {
  deviceId: string
  currentCarId: number | null
  cars: CarOption[]
  onError?: (message: string) => void
}

const UNLINK_VALUE = '__unlink__'

export default function LinkCarDropdown({ deviceId, currentCarId, cars, onError }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [value, setValue] = useState<string>(
    currentCarId === null ? UNLINK_VALUE : String(currentCarId),
  )

  function handleChange(next: string) {
    setValue(next)
    const carId = next === UNLINK_VALUE ? null : Number(next)
    startTransition(async () => {
      const result = await linkDeviceAction(deviceId, carId)
      if (result.error) {
        // Revert on failure.
        setValue(currentCarId === null ? UNLINK_VALUE : String(currentCarId))
        onError?.(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <select
      value={value}
      disabled={pending}
      onChange={(e) => handleChange(e.target.value)}
      className="bg-white/5 border border-white/10 text-white/80 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-white/30 disabled:opacity-50"
    >
      <option value={UNLINK_VALUE}>Unlinked</option>
      {cars.map((car) => (
        <option key={car.id} value={car.id}>
          {car.label}
        </option>
      ))}
    </select>
  )
}
