'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Transaction, Car } from '@/lib/supabase/types'
import { createTransaction, updateTransaction } from './actions'

interface Props {
  isOpen: boolean
  onClose: () => void
  expense?: Transaction | null
  cars: Car[]
}

export default function ExpenseModal({ isOpen, onClose, expense, cars }: Props) {
  const [isPending, startTransition] = useTransition()
  const [errorStr, setErrorStr] = useState<string | null>(null)
  const router = useRouter()
  
  const [formData, setFormData] = useState<Partial<Transaction>>({})

  useEffect(() => {
    if (expense) {
      setFormData(expense)
    } else {
      setFormData({
        transaction_date: new Date().toISOString().split('T')[0],
        category: 'maintenance',
      })
    }
    setErrorStr(null)
  }, [expense, isOpen])

  if (!isOpen) return null

  const isEditing = !!expense

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorStr(null)

    if (!formData.transaction_date || !formData.amount) {
      setErrorStr('Date and Amount are required.')
      return
    }

    const dataToSubmit: Omit<Transaction, 'id' | 'tenant_id'> = {
      transaction_date: formData.transaction_date,
      category: formData.category || 'maintenance',
      description: formData.description || null,
      amount: Number(formData.amount) || null,
      // Handle the case where user unsets the car
      car_id: formData.car_id ? Number(formData.car_id) : null,
    }

    startTransition(async () => {
      let result;
      if (isEditing && expense?.id) {
        result = await updateTransaction(expense.id, dataToSubmit)
      } else {
        result = await createTransaction(dataToSubmit as any)
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="glass w-full max-w-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-fade-in-up">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
          <h3 className="text-lg font-bold text-white tracking-wide">
            {isEditing ? 'Edit Expense' : 'Log New Expense'}
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

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Date</label>
                <input 
                  type="date" required
                  value={formData.transaction_date || ''} 
                  onChange={e => setFormData({...formData, transaction_date: e.target.value})}
                  className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white [color-scheme:dark]" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Amount ($)</label>
                <input 
                  type="number" step="0.01" required
                  value={formData.amount || ''} 
                  onChange={e => setFormData({...formData, amount: Number(e.target.value)})}
                  className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white" 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Category</label>
                <select 
                  value={formData.category || 'maintenance'} 
                  onChange={e => setFormData({...formData, category: e.target.value})}
                  className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white"
                >
                  <option value="maintenance" className="bg-[#0d0d0d]">🔧 Maintenance</option>
                  <option value="fuel" className="bg-[#0d0d0d]">⛽ Fuel</option>
                  <option value="insurance" className="bg-[#0d0d0d]">🛡️ Insurance</option>
                  <option value="registration" className="bg-[#0d0d0d]">📋 Registration / Tags</option>
                  <option value="cleaning" className="bg-[#0d0d0d]">🧹 Cleaning / Detailing</option>
                  <option value="parking" className="bg-[#0d0d0d]">🅿️ Parking</option>
                  <option value="toll" className="bg-[#0d0d0d]">🛣️ Toll / Sunpass</option>
                  <option value="software" className="bg-[#0d0d0d]">💻 Software / Subscriptions</option>
                  <option value="marketing" className="bg-[#0d0d0d]">📣 Marketing</option>
                  <option value="salary" className="bg-[#0d0d0d]">👤 Salary / Labor</option>
                  <option value="other" className="bg-[#0d0d0d]">📦 Other</option>
                </select>
              </div>
              
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Associated Car (Optional)</label>
                <select 
                  value={formData.car_id || ''} 
                  onChange={e => setFormData({...formData, car_id: e.target.value ? Number(e.target.value) : undefined})}
                  className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white"
                >
                  <option value="" className="bg-[#0d0d0d]">-- General / No Car --</option>
                  {cars.map(c => (
                    <option key={c.id} value={c.id} className="bg-[#0d0d0d]">
                      {c.make} {c.model_full || c.model}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Description</label>
              <textarea 
                required placeholder="e.g. Monthly parking fee" rows={2}
                value={formData.description || ''} 
                onChange={e => setFormData({...formData, description: e.target.value})}
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
              {isPending ? 'Saving...' : 'Save Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
