'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { CarService, Car } from '@/lib/supabase/types'
import { updateCarMileage } from './actions'
import ServiceModal from './ServiceModal'

interface Props {
  cars: Car[]
  services: CarService[]
}

export default function FleetMileagePanel({ cars, services }: Props) {
  const router = useRouter()
  const [editingCarId, setEditingCarId] = useState<number | null>(null)
  const [mileageInput, setMileageInput] = useState('')
  const [isPending, startTransition] = useTransition()
  const [modalOpen, setModalOpen] = useState(false)
  const [preselectedCarId, setPreselectedCarId] = useState<number | null>(null)

  function getCarServiceInfo(carId: number) {
    const carServices = services.filter(s => s.car_id === carId)
    const withMileage = [...carServices]
      .filter(s => s.next_service_mileage)
      .sort((a, b) => new Date(b.service_date ?? 0).getTime() - new Date(a.service_date ?? 0).getTime())[0]
    const withDate = [...carServices]
      .filter(s => s.next_service_date)
      .sort((a, b) => new Date(b.service_date ?? 0).getTime() - new Date(a.service_date ?? 0).getTime())[0]
    return {
      nextMileage: withMileage?.next_service_mileage ?? null,
      nextDate: withDate?.next_service_date ?? null,
    }
  }

  function openMileageEdit(car: Car) {
    setEditingCarId(car.id)
    setMileageInput(car.mileage != null ? String(car.mileage) : '')
  }

  function saveMileage(carId: number) {
    const miles = Number(mileageInput)
    if (!miles || miles <= 0) return
    startTransition(async () => {
      await updateCarMileage(carId, miles)
      setEditingCarId(null)
      router.refresh()
    })
  }

  function openServiceForCar(carId: number) {
    setPreselectedCarId(carId)
    setModalOpen(true)
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 glass">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-bold text-white tracking-wide">Fleet Mileage</h3>
          <p className="text-[11px] text-white/40 mt-0.5">Current mileage and next service per vehicle — click mileage to update</p>
        </div>
        <button
          onClick={() => { setPreselectedCarId(null); setModalOpen(true) }}
          className="bg-white text-black hover:bg-white/90 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-white/10"
        >
          + Log Maintenance
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-white/40 border-b border-white/10">
              <th className="pb-3 pr-4">Vehicle</th>
              <th className="pb-3 pr-4">Current Mileage</th>
              <th className="pb-3 pr-4">Next Service (mi)</th>
              <th className="pb-3 pr-4">Next Service (date)</th>
              <th className="pb-3 pr-4">Remaining</th>
              <th className="pb-3 pr-4">Status</th>
              <th className="pb-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {cars.map(car => {
              const { nextMileage, nextDate } = getCarServiceInfo(car.id)
              const remaining = nextMileage != null && car.mileage != null ? nextMileage - car.mileage : null
              const isOverdue = remaining != null && remaining <= 0
              const isWarning = remaining != null && remaining > 0 && remaining <= 1000
              const isOk = remaining != null && remaining > 1000
              const isEditingThis = editingCarId === car.id

              return (
                <tr key={car.id} className="hover:bg-white/5 transition-colors">
                  <td className="py-4 pr-4 font-semibold text-white">
                    {car.make} {car.model_full || car.model}
                  </td>

                  <td className="py-4 pr-4">
                    {isEditingThis ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={mileageInput}
                          onChange={e => setMileageInput(e.target.value)}
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === 'Enter') saveMileage(car.id)
                            if (e.key === 'Escape') setEditingCarId(null)
                          }}
                          className="w-28 bg-white/10 border border-white/20 rounded-lg px-2.5 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/30"
                        />
                        <button
                          onClick={() => saveMileage(car.id)}
                          disabled={isPending}
                          className="text-xs font-bold text-green-400 hover:text-green-300 disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingCarId(null)}
                          className="text-xs text-white/30 hover:text-white/60"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => openMileageEdit(car)}
                        className="flex items-center gap-2 group"
                      >
                        <span className="text-white/80 font-medium group-hover:text-white transition-colors">
                          {car.mileage != null ? `${car.mileage.toLocaleString()} mi` : '—'}
                        </span>
                        {car.telematics_device_id ? (
                          <span
                            className="ml-1 px-1.5 py-0.5 text-[10px] rounded bg-emerald-500/15 text-emerald-300"
                            title="Mileage auto-synced from Bouncie"
                          >
                            auto
                          </span>
                        ) : (
                          <span
                            className="ml-1 px-1.5 py-0.5 text-[10px] rounded bg-white/5 text-white/40"
                            title="Mileage entered manually"
                          >
                            manual
                          </span>
                        )}
                        <span className="text-[10px] text-white/20 group-hover:text-white/50 transition-colors">✎</span>
                      </button>
                    )}
                  </td>

                  <td className="py-4 pr-4 text-white/70 font-medium">
                    {nextMileage != null
                      ? `${nextMileage.toLocaleString()} mi`
                      : <span className="text-white/25">—</span>}
                  </td>

                  <td className="py-4 pr-4 text-white/70">
                    {nextDate ?? <span className="text-white/25">—</span>}
                  </td>

                  <td className="py-4 pr-4">
                    {remaining != null ? (
                      <span className={`font-medium ${
                        isOverdue ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-white/60'
                      }`}>
                        {isOverdue
                          ? `${Math.abs(remaining).toLocaleString()} mi overdue`
                          : `${remaining.toLocaleString()} mi`}
                      </span>
                    ) : <span className="text-white/25">—</span>}
                  </td>

                  <td className="py-4 pr-4">
                    {isOverdue && (
                      <span className="px-2 py-0.5 bg-red-500/15 text-red-400 rounded-full text-[10px] font-bold uppercase border border-red-500/25">
                        Overdue
                      </span>
                    )}
                    {isWarning && (
                      <span className="px-2 py-0.5 bg-amber-500/15 text-amber-400 rounded-full text-[10px] font-bold uppercase border border-amber-500/25">
                        Due Soon
                      </span>
                    )}
                    {isOk && (
                      <span className="px-2 py-0.5 bg-green-500/15 text-green-400 rounded-full text-[10px] font-bold uppercase border border-green-500/25">
                        OK
                      </span>
                    )}
                    {remaining == null && <span className="text-white/20 text-xs">—</span>}
                  </td>

                  <td className="py-4 text-right">
                    <button
                      onClick={() => openServiceForCar(car.id)}
                      className="text-white/50 hover:text-white text-xs font-semibold transition-colors"
                    >
                      Log Service
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <ServiceModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        service={null}
        cars={cars}
        preselectedCarId={preselectedCarId}
      />
    </div>
  )
}
