'use client'

import { useState, useTransition, useEffect } from 'react'
import type { Consignment, Car } from '@/lib/supabase/types'
import { createConsignment, updateConsignment } from './actions'

interface Props {
  isOpen: boolean
  onClose: () => void
  consignment?: Consignment | null
  cars: Car[]
}

export default function ConsignmentModal({ isOpen, onClose, consignment, cars }: Props) {
  const [isPending, startTransition] = useTransition()
  const [errorStr, setErrorStr] = useState<string | null>(null)
  const [formData, setFormData] = useState<Partial<Consignment>>({})

  useEffect(() => {
    setFormData(consignment ?? { owner_percentage: 70 })
    setErrorStr(null)
  }, [consignment, isOpen])

  if (!isOpen) return null
  const isEditing = !!consignment

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.car_id || !formData.owner_name) {
      setErrorStr('Car and Owner Name are required.')
      return
    }
    const data: Omit<Consignment, 'id' | 'tenant_id'> = {
      car_id: Number(formData.car_id),
      owner_name: formData.owner_name,
      owner_email: formData.owner_email || null,
      owner_phone: formData.owner_phone || null,
      owner_percentage: Number(formData.owner_percentage) || 70,
      contract_start: formData.contract_start || null,
      contract_end: formData.contract_end || null,
      notes: formData.notes || null,
    }
    startTransition(async () => {
      const result = isEditing && consignment?.id
        ? await updateConsignment(consignment.id, data)
        : await createConsignment(data as any)
      if (result.error) setErrorStr(result.error)
      else onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="glass w-full max-w-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-fade-in-up my-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
          <h3 className="text-lg font-bold text-white">{isEditing ? 'Edit Consignment' : 'New Consignment'}</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {errorStr && <div className="p-3 bg-red-500/20 text-red-300 rounded-xl text-sm border border-red-500/30">{errorStr}</div>}

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Vehicle</label>
            <select required value={formData.car_id || ''} onChange={e => setFormData({ ...formData, car_id: Number(e.target.value) })}
              className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white">
              <option value="" disabled className="bg-[#0d0d0d]">Select vehicle...</option>
              {cars.map(c => <option key={c.id} value={c.id} className="bg-[#0d0d0d]">{c.make} {c.model_full || c.model}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1 col-span-2">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Owner Name</label>
              <input type="text" required placeholder="John Smith" value={formData.owner_name || ''} onChange={e => setFormData({ ...formData, owner_name: e.target.value })}
                className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white" />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Owner Email</label>
              <input type="email" value={formData.owner_email || ''} onChange={e => setFormData({ ...formData, owner_email: e.target.value })}
                className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white" />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Owner Phone</label>
              <input type="text" value={formData.owner_phone || ''} onChange={e => setFormData({ ...formData, owner_phone: e.target.value })}
                className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Owner Split % (e.g. 70 = owner gets 70%)</label>
            <input type="number" min="0" max="100" step="1" required value={formData.owner_percentage ?? 70} onChange={e => setFormData({ ...formData, owner_percentage: Number(e.target.value) })}
              className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Contract Start</label>
              <input type="date" value={formData.contract_start || ''} onChange={e => setFormData({ ...formData, contract_start: e.target.value })}
                className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white [color-scheme:dark]" />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Contract End</label>
              <input type="date" value={formData.contract_end || ''} onChange={e => setFormData({ ...formData, contract_end: e.target.value })}
                className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white [color-scheme:dark]" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Notes</label>
            <textarea rows={2} value={formData.notes || ''} onChange={e => setFormData({ ...formData, notes: e.target.value })}
              className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white resize-none" />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <button type="button" onClick={onClose} className="bg-white/5 hover:bg-white/10 text-white/80 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all">Cancel</button>
            <button type="submit" disabled={isPending} className="bg-white text-black hover:bg-white/90 px-6 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50">
              {isPending ? 'Saving...' : 'Save Consignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
