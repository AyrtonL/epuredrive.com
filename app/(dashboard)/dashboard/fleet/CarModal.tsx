'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Car } from '@/lib/supabase/types'
import { createCar, updateCar } from './actions'

interface Props {
  isOpen: boolean
  onClose: () => void
  car?: Car | null // null means creating
}

export default function CarModal({ isOpen, onClose, car }: Props) {
  const [isPending, startTransition] = useTransition()
  const [errorStr, setErrorStr] = useState<string | null>(null)
  const router = useRouter()
  
  const [formData, setFormData] = useState<Partial<Car>>({})

  useEffect(() => {
    if (car) {
      setFormData(car)
    } else {
      setFormData({
        status: 'active',
        category: 'economy',
      })
    }
    setErrorStr(null)
  }, [car, isOpen])

  if (!isOpen) return null

  const isEditing = !!car

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorStr(null)

    // Ensure required fields
    if (!formData.make || !formData.model) {
      setErrorStr('Make and Model are required.')
      return
    }

    const dataToSubmit: Omit<Car, 'id' | 'tenant_id'> = {
      make: formData.make,
      model: formData.model,
      model_full: formData.model_full || null,
      year: Number(formData.year) || null,
      daily_rate: Number(formData.daily_rate) || null,
      category: formData.category || 'economy',
      status: formData.status || 'active',
      image_url: formData.image_url || null,
      gallery: formData.gallery || null,
      badge: formData.badge || null,
      seats: Number(formData.seats) || null,
      transmission: formData.transmission || null,
      hp: formData.hp || null,
      features: formData.features || null,
      description: formData.description || null,
      turo_vehicle_id: formData.turo_vehicle_id || null,
    }

    startTransition(async () => {
      let result;
      if (isEditing && car?.id) {
        result = await updateCar(car.id, dataToSubmit)
      } else {
        result = await createCar(dataToSubmit as any)
      }

      if (result.error) {
        setErrorStr(result.error)
      } else {
        router.refresh()
        onClose()
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="glass w-full max-w-2xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-fade-in-up my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
          <h3 className="text-lg font-bold text-white tracking-wide">
            {isEditing ? 'Edit Vehicle' : 'Add New Vehicle'}
          </h3>
          <button 
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors p-1"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {errorStr && (
            <div className="p-4 bg-red-500/20 text-red-300 rounded-xl text-sm border border-red-500/30">
              {errorStr}
            </div>
          )}

          {formData.image_url && (
            <div className="w-full flex justify-center mb-6">
              <img 
                src={formData.image_url.startsWith('http') ? formData.image_url : `/${formData.image_url}`} 
                alt="Preview" 
                className="h-32 object-cover rounded-xl border border-white/10 shadow-xl"
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Core Info */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Make</label>
              <input 
                type="text" required placeholder="e.g. Porsche"
                value={formData.make || ''} 
                onChange={e => setFormData({...formData, make: e.target.value})}
                className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Model</label>
              <input 
                type="text" required placeholder="e.g. 911"
                value={formData.model || ''} 
                onChange={e => setFormData({...formData, model: e.target.value})}
                className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white" 
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Full Name (Optional)</label>
              <input 
                type="text" placeholder="e.g. 911 Carrera S"
                value={formData.model_full || ''} 
                onChange={e => setFormData({...formData, model_full: e.target.value})}
                className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white" 
              />
            </div>

            {/* Price & Details */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Daily Rate ($)</label>
              <input 
                type="number" step="0.01" min="0" required
                value={formData.daily_rate || ''} 
                onChange={e => setFormData({...formData, daily_rate: Number(e.target.value)})}
                className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Year</label>
              <input 
                type="number" min="1900" max="2100"
                value={formData.year || ''} 
                onChange={e => setFormData({...formData, year: Number(e.target.value)})}
                className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white" 
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Image URL</label>
              <input 
                type="text" placeholder="https://..."
                value={formData.image_url || ''} 
                onChange={e => setFormData({...formData, image_url: e.target.value})}
                className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white" 
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Category</label>
              <select 
                value={formData.category || 'economy'} 
                onChange={e => setFormData({...formData, category: e.target.value})}
                className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white"
              >
                <option value="economy" className="bg-[#0d0d0d]">Economy</option>
                <option value="luxury" className="bg-[#0d0d0d]">Luxury</option>
                <option value="sports" className="bg-[#0d0d0d]">Sports</option>
                <option value="suv" className="bg-[#0d0d0d]">SUV</option>
              </select>
            </div>
            
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Status</label>
              <select 
                value={formData.status || 'active'} 
                onChange={e => setFormData({...formData, status: e.target.value})}
                className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white"
              >
                <option value="active" className="bg-[#0d0d0d]">Active</option>
                <option value="maintenance" className="bg-[#0d0d0d]">Maintenance</option>
                <option value="retired" className="bg-[#0d0d0d]">Retired</option>
              </select>
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Turo Vehicle ID (for CSV import matching)</label>
              <input 
                type="text" placeholder="e.g. 12345678 (from Turo URL)"
                value={formData.turo_vehicle_id || ''} 
                onChange={e => setFormData({...formData, turo_vehicle_id: e.target.value})}
                className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white" 
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-white/10">
            <button 
              type="button" 
              onClick={onClose}
              className="bg-white/5 text-white/80 hover:bg-white/10 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isPending}
              className="bg-white text-black hover:bg-white/90 px-6 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
            >
              {isPending ? 'Saving...' : 'Save Vehicle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
