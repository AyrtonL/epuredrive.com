'use client'

import { useState, useTransition, useEffect } from 'react'
import type { Reservation, Car } from '@/lib/supabase/types'
import { createReservation, updateReservation } from './actions'

interface Props {
  isOpen: boolean
  onClose: () => void
  reservation?: Reservation | null // null means creating a new one
  cars: Car[]
}

export default function BookingModal({ isOpen, onClose, reservation, cars }: Props) {
  const [isPending, startTransition] = useTransition()
  const [errorStr, setErrorStr] = useState<string | null>(null)
  
  const [formData, setFormData] = useState<Partial<Reservation>>({})

  useEffect(() => {
    if (reservation) {
      setFormData(reservation)
    } else {
      setFormData({
        status: 'pending',
        source: 'admin'
      })
    }
    setErrorStr(null)
  }, [reservation, isOpen])

  if (!isOpen) return null

  const isEditing = !!reservation

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorStr(null)

    // Data prep
    const dataToSubmit = {
      car_id: Number(formData.car_id),
      customer_name: formData.customer_name || null,
      customer_email: formData.customer_email || null,
      customer_phone: formData.customer_phone || null,
      pickup_date: formData.pickup_date || null,
      pickup_time: formData.pickup_time || '10:00',
      return_date: formData.return_date || null,
      return_time: formData.return_time || '10:00',
      pickup_location: formData.pickup_location || 'Aventura',
      total_amount: Number(formData.total_amount) || null,
      status: formData.status || 'pending',
      source: formData.source || 'admin',
      notes: formData.notes || null,
    }

    startTransition(async () => {
      let result;
      if (isEditing && reservation?.id) {
        result = await updateReservation(reservation.id, dataToSubmit)
      } else {
        result = await createReservation(dataToSubmit as any)
      }

      if (result.error) {
        setErrorStr(result.error)
      } else {
        onClose()
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="glass w-full max-w-2xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-fade-in-up">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
          <h3 className="text-lg font-bold text-white tracking-wide">
            {isEditing ? 'Edit Booking' : 'Add New Booking'}
          </h3>
          <button 
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors p-1"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {errorStr && (
            <div className="p-4 bg-red-500/20 text-red-300 rounded-xl text-sm border border-red-500/30">
              {errorStr}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Customer Contact */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Customer Name</label>
              <input 
                type="text" required
                value={formData.customer_name || ''} 
                onChange={e => setFormData({...formData, customer_name: e.target.value})}
                className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Vehicle</label>
              <select 
                required
                value={formData.car_id || ''} 
                onChange={e => setFormData({...formData, car_id: Number(e.target.value)})}
                className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white"
              >
                <option value="" disabled className="bg-[#0d0d0d]">Select Car...</option>
                {cars.map(c => (
                  <option key={c.id} value={c.id} className="bg-[#0d0d0d]">
                    {c.make} {c.model_full || c.model}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Email</label>
              <input 
                type="email" 
                value={formData.customer_email || ''} 
                onChange={e => setFormData({...formData, customer_email: e.target.value})}
                className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Phone</label>
              <input 
                type="text" 
                value={formData.customer_phone || ''} 
                onChange={e => setFormData({...formData, customer_phone: e.target.value})}
                className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white" 
              />
            </div>

            {/* Dates */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Pickup Date</label>
              <input 
                type="date" required
                value={formData.pickup_date || ''} 
                onChange={e => setFormData({...formData, pickup_date: e.target.value})}
                className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white [color-scheme:dark]" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Pickup Time</label>
              <input 
                type="time"
                value={formData.pickup_time || '10:00'} 
                onChange={e => setFormData({...formData, pickup_time: e.target.value})}
                className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white [color-scheme:dark]" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Return Date</label>
              <input 
                type="date" required
                value={formData.return_date || ''} 
                onChange={e => setFormData({...formData, return_date: e.target.value})}
                className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white [color-scheme:dark]" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Return Time</label>
              <input 
                type="time"
                value={formData.return_time || '10:00'} 
                onChange={e => setFormData({...formData, return_time: e.target.value})}
                className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white [color-scheme:dark]" 
              />
            </div>

            {/* Location & Financials */}
            <div className="space-y-1 md:col-span-2">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Pickup Location</label>
              <input 
                type="text" placeholder="e.g. Aventura, Miami Airport..."
                value={formData.pickup_location || ''} 
                onChange={e => setFormData({...formData, pickup_location: e.target.value})}
                className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white" 
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Total Amount ($)</label>
              <input 
                type="number" step="0.01" min="0" required
                value={formData.total_amount || ''} 
                onChange={e => setFormData({...formData, total_amount: Number(e.target.value)})}
                className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Status</label>
              <select 
                value={formData.status || ''} 
                onChange={e => setFormData({...formData, status: e.target.value})}
                className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white"
              >
                <option value="pending" className="bg-[#0d0d0d]">Pending</option>
                <option value="confirmed" className="bg-[#0d0d0d]">Confirmed</option>
                <option value="active" className="bg-[#0d0d0d]">Active</option>
                <option value="completed" className="bg-[#0d0d0d]">Completed</option>
                <option value="cancelled" className="bg-[#0d0d0d]">Cancelled</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Source</label>
              <select 
                value={formData.source || 'admin'} 
                onChange={e => setFormData({...formData, source: e.target.value})}
                className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white"
              >
                <option value="admin" className="bg-[#0d0d0d]">Admin</option>
                <option value="turo" className="bg-[#0d0d0d]">Turo</option>
                <option value="ical" className="bg-[#0d0d0d]">iCal</option>
                <option value="direct" className="bg-[#0d0d0d]">Direct</option>
              </select>
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Notes (internal)</label>
              <textarea 
                rows={2} placeholder="Internal notes, special requests..."
                value={formData.notes || ''} 
                onChange={e => setFormData({...formData, notes: e.target.value})}
                className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white resize-none" 
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
              {isPending ? 'Saving...' : 'Save Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
