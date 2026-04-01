'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { CarService, Car } from '@/lib/supabase/types'
import { createService, updateService } from './actions'

interface Props {
  isOpen: boolean
  onClose: () => void
  service?: CarService | null
  cars: Car[]
}

export default function ServiceModal({ isOpen, onClose, service, cars }: Props) {
  const [isPending, startTransition] = useTransition()
  const [errorStr, setErrorStr] = useState<string | null>(null)
  const router = useRouter()
  
  const [formData, setFormData] = useState<Partial<CarService>>({})

  useEffect(() => {
    if (service) {
      setFormData(service)
    } else {
      setFormData({
        service_date: new Date().toISOString().split('T')[0]
      })
    }
    setErrorStr(null)
  }, [service, isOpen])

  if (!isOpen) return null

  const isEditing = !!service

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorStr(null)

    if (!formData.car_id || !formData.service_date) {
      setErrorStr('Car and Date are required.')
      return
    }

    const dataToSubmit: Omit<CarService, 'id' | 'tenant_id'> = {
      car_id: Number(formData.car_id),
      service_date: formData.service_date,
      service_type: formData.service_type || null,
      description: formData.description || null,
      amount: Number(formData.amount) || null,
      provider: formData.provider || null,
      next_service_date: formData.next_service_date || null,
      next_service_mileage: Number(formData.next_service_mileage) || null
    }

    startTransition(async () => {
      let result;
      if (isEditing && service?.id) {
        result = await updateService(service.id, dataToSubmit)
      } else {
        result = await createService(dataToSubmit as any)
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
      <div className="glass w-full max-w-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-fade-in-up my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
          <h3 className="text-lg font-bold text-white tracking-wide">
            {isEditing ? 'Edit Maintenance Record' : 'Log Maintenance'}
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

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Select Car</label>
              <select 
                required
                value={formData.car_id || ''} 
                onChange={e => setFormData({...formData, car_id: Number(e.target.value)})}
                className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white"
              >
                <option value="" disabled className="bg-[#0d0d0d]">Choose vehicle...</option>
                {cars.map(c => (
                  <option key={c.id} value={c.id} className="bg-[#0d0d0d]">
                    {c.make} {c.model_full || c.model}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Service Type</label>
                <select 
                  value={formData.service_type || ''} 
                  onChange={e => setFormData({...formData, service_type: e.target.value})}
                  className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white"
                >
                  <option value="" className="bg-[#0d0d0d]">General Maintenance</option>
                  <option value="oil_change" className="bg-[#0d0d0d]">Oil Change</option>
                  <option value="tires" className="bg-[#0d0d0d]">Tires / Rotation</option>
                  <option value="brakes" className="bg-[#0d0d0d]">Brakes</option>
                  <option value="inspection" className="bg-[#0d0d0d]">Inspection</option>
                  <option value="repair" className="bg-[#0d0d0d]">Repair</option>
                  <option value="cleaning" className="bg-[#0d0d0d]">Cleaning / Detail</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Provider</label>
                <input 
                  type="text" placeholder="e.g. Master Mechanic"
                  value={formData.provider || ''} 
                  onChange={e => setFormData({...formData, provider: e.target.value})}
                  className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white" 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Date</label>
                <input 
                  type="date" required
                  value={formData.service_date || ''} 
                  onChange={e => setFormData({...formData, service_date: e.target.value})}
                  className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white [color-scheme:dark]" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Cost ($)</label>
                <input 
                  type="number" step="0.01" min="0" required
                  value={formData.amount || ''} 
                  onChange={e => setFormData({...formData, amount: Number(e.target.value)})}
                  className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white" 
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Description</label>
              <textarea 
                required placeholder="e.g. Oil change, new tires..." rows={3}
                value={formData.description || ''} 
                onChange={e => setFormData({...formData, description: e.target.value})}
                className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white resize-none" 
              />
            </div>

            <div className="pt-4 border-t border-white/5">
              <h4 className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] mb-4">Next Service Reminders</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Due Date</label>
                  <input 
                    type="date"
                    value={formData.next_service_date || ''} 
                    onChange={e => setFormData({...formData, next_service_date: e.target.value})}
                    className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white [color-scheme:dark]" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Due Mileage (mi)</label>
                  <input 
                    type="number"
                    value={formData.next_service_mileage || ''} 
                    onChange={e => setFormData({...formData, next_service_mileage: Number(e.target.value)})}
                    className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white" 
                  />
                </div>
              </div>
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
              {isPending ? 'Logging...' : 'Log Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
