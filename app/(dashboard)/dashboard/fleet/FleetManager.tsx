'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Car } from '@/lib/supabase/types'
import { deleteCar } from './actions'
import CarModal from './CarModal'
import { useToast } from '@/components/ui/Toast'

interface Props {
  initialCars: Car[]
  consignedCarIds?: number[]
}

export default function FleetManager({ initialCars, consignedCarIds = [] }: Props) {
  const consignedIds = new Set(consignedCarIds)
  const router = useRouter()
  const toast = useToast()
  const [filter, setFilter] = useState('')
  const [showRetired, setShowRetired] = useState(false)
  const [, startTransition] = useTransition()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingCar, setEditingCar] = useState<Car | null>(null)

  const retiredCount = initialCars.filter((c) => c.status === 'retired').length
  const filtered = initialCars.filter((c) => {
    if (!showRetired && c.status === 'retired') return false
    const q = filter.toLowerCase()
    return (
      !q ||
      c.make.toLowerCase().includes(q) ||
      c.model.toLowerCase().includes(q) ||
      (c.model_full ?? '').toLowerCase().includes(q) ||
      (c.plate ?? '').toLowerCase().includes(q) ||
      String(c.year ?? '').includes(q)
    )
  })

  function handleDelete(id: number, name: string) {
    if (!confirm(`Retire ${name}? It will be moved out of your active fleet, but all its bookings, revenue, and service history are kept.`)) return
    startTransition(async () => {
      const result = await deleteCar(id)
      if (result.error) {
        toast.error(`Could not retire vehicle: ${result.error}`)
        return
      }
      toast.success(`${name} retired. History preserved.`)
      router.refresh()
    })
  }

  function openNew() {
    setEditingCar(null)
    setModalOpen(true)
  }

  function openEdit(c: Car) {
    setEditingCar(c)
    setModalOpen(true)
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 mb-8 justify-between items-start md:items-center">
        <input
          type="text"
          placeholder="Search by make or model…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full max-w-sm dash-input px-4 py-3"
        />
        <div className="flex items-center gap-3 flex-shrink-0">
          {retiredCount > 0 && (
            <button
              onClick={() => setShowRetired((v) => !v)}
              className={`px-4 py-3 rounded-xl text-xs font-bold transition-all border ${
                showRetired
                  ? 'bg-white/10 border-white/20 text-white'
                  : 'bg-white/[0.03] border-white/10 text-white/50 hover:text-white/80'
              }`}
            >
              {showRetired ? 'Hide' : 'Show'} retired ({retiredCount})
            </button>
          )}
          <button
            onClick={openNew}
            className="bg-white text-black hover:bg-white/90 px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-lg shadow-white/10"
          >
            + Add Vehicle
          </button>
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="empty-state">
          {filter ? 'No vehicles match your search.' : 'Your fleet is empty. Click "Add Vehicle" to register one.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((c) => (
            <div 
              key={c.id} 
              className="group relative bg-white/[0.07] border border-white/[0.13] rounded-2xl overflow-hidden hover:bg-white/[0.11] transition-all duration-300 hover:-translate-y-1 flex flex-col"
              style={{boxShadow: '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)'}}
            >
              {/* Image Header */}
              <div className="h-48 w-full bg-black/40 relative overflow-hidden">
                {c.image_url ? (
                  <img
                    src={c.image_url.startsWith('http') ? c.image_url : `/${c.image_url}`}
                    alt={`${c.make} ${c.model}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/20 text-xs tracking-widest uppercase font-bold">
                    No Image
                  </div>
                )}
                {/* Status Badge */}
                <div className="absolute top-4 right-4">
                  <span className={`text-[10px] uppercase tracking-widest font-bold px-3 py-1 rounded-full backdrop-blur-md border ${
                    c.status === 'active' ? 'bg-green-500/20 text-green-300 border-green-500/30' :
                    c.status === 'retired' ? 'bg-red-500/20 text-red-300 border-red-500/30' :
                    'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                  }`}>
                    {c.status || 'Active'}
                  </span>
                </div>
                {/* Consignment Badge */}
                {consignedIds.has(c.id) && (
                  <div className="absolute top-4 left-4">
                    <span className="text-[10px] uppercase tracking-widest font-bold px-3 py-1 rounded-full backdrop-blur-md border bg-purple-500/20 text-purple-300 border-purple-500/30">
                      Consignment
                    </span>
                  </div>
                )}
              </div>

              {/* Body */}
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-white font-bold text-lg leading-tight">
                      {c.make} {c.model_full || c.model}
                    </h3>
                    <p className="text-white/55 text-[11px] font-semibold tracking-widest uppercase mt-1">
                      {c.year || 'N/A'} • {c.category || 'Economy'}
                    </p>
                  </div>
                </div>

                <div className="mt-auto pt-6 flex items-center justify-between border-t border-white/[0.12]">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-white/55 uppercase tracking-widest font-bold mb-0.5">Daily Rate</span>
                    <span className="text-white font-medium">
                      {c.daily_rate != null ? `$${Number(c.daily_rate).toFixed(0)}` : '—'}
                    </span>
                  </div>
                  
                  <div className="flex gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
                    <button
                      onClick={() => openEdit(c)}
                      className="bg-white/10 hover:bg-white/20 text-white w-9 h-9 rounded-full flex items-center justify-center transition-colors"
                      title="Edit Vehicle"
                    >
                      <span className="text-xs">✎</span>
                    </button>
                    {c.status !== 'retired' && (
                      <button
                        onClick={() => handleDelete(c.id, `${c.make} ${c.model_full || c.model}`)}
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-400 w-9 h-9 rounded-full flex items-center justify-center transition-colors"
                        title="Retire vehicle"
                      >
                        <span className="text-xs">✕</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <CarModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        car={editingCar} 
      />
    </div>
  )
}
