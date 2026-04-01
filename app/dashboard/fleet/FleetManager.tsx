'use client'

import { useState, useTransition } from 'react'
import type { Car } from '@/lib/supabase/types'
import { deleteCar } from './actions'
import CarModal from './CarModal'

interface Props {
  initialCars: Car[]
}

export default function FleetManager({ initialCars }: Props) {
  const [filter, setFilter] = useState('')
  const [, startTransition] = useTransition()
  
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCar, setEditingCar] = useState<Car | null>(null)

  const filtered = initialCars.filter((c) => {
    const q = filter.toLowerCase()
    return (
      !q ||
      c.make.toLowerCase().includes(q) ||
      c.model.toLowerCase().includes(q) ||
      (c.model_full ?? '').toLowerCase().includes(q)
    )
  })

  function handleDelete(id: number) {
    if (!confirm('Decommission this car? This cannot be undone.')) return
    startTransition(async () => {
      await deleteCar(id)
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
          className="w-full max-w-sm bg-white/5 border border-white/10 text-white placeholder:text-white/40 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
        />
        <button
          onClick={openNew}
          className="bg-white text-black hover:bg-white/90 px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-lg shadow-white/10 flex-shrink-0"
        >
          + Add Vehicle
        </button>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="text-white/30 text-sm py-12 text-center bg-white/5 rounded-2xl border border-white/5">
          {filter ? 'No vehicles match your search.' : 'Your fleet is empty. Click "Add Vehicle" to register one.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((c) => (
            <div 
              key={c.id} 
              className="group relative bg-white/5 border border-white/10 rounded-3xl overflow-hidden hover:bg-white/10 transition-all duration-300 hover:-translate-y-1 shadow-2xl shadow-black/50 flex flex-col"
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
              </div>

              {/* Body */}
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-white font-bold text-lg leading-tight">
                      {c.make} {c.model_full || c.model}
                    </h3>
                    <p className="text-white/40 text-[11px] font-bold tracking-widest uppercase mt-1">
                      {c.year || 'N/A'} • {c.category || 'Economy'}
                    </p>
                  </div>
                </div>

                <div className="mt-auto pt-6 flex items-center justify-between border-t border-white/10">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-0.5">Daily Rate</span>
                    <span className="text-white font-medium">
                      {c.daily_rate != null ? `$${Number(c.daily_rate).toFixed(0)}` : '—'}
                    </span>
                  </div>
                  
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button
                      onClick={() => openEdit(c)}
                      className="bg-white/10 hover:bg-white/20 text-white w-9 h-9 rounded-full flex items-center justify-center transition-colors"
                      title="Edit Vehicle"
                    >
                      <span className="text-xs">✎</span>
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="bg-red-500/10 hover:bg-red-500/20 text-red-400 w-9 h-9 rounded-full flex items-center justify-center transition-colors"
                      title="Delete"
                    >
                      <span className="text-xs">✕</span>
                    </button>
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
