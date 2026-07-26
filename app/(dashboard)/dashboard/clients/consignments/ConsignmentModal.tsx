'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Consignment, Car } from '@/lib/supabase/types'
import { createConsignment, updateConsignment, type ConsignmentInput } from './actions'
import ModalPortal from '@/components/ui/ModalPortal'
import DatePicker from '@/components/ui/DatePicker'

interface Props {
  isOpen: boolean
  onClose: () => void
  ownerId: string
  consignment?: Consignment | null
  cars: Car[]
  defaultPercentage?: number | null
}

const inputCls =
  'w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white'
const labelCls = 'text-[11px] font-bold text-white/50 uppercase tracking-widest'

export default function ConsignmentModal({ isOpen, onClose, ownerId, consignment, cars, defaultPercentage }: Props) {
  const [isPending, startTransition] = useTransition()
  const [errorStr, setErrorStr] = useState<string | null>(null)
  const router = useRouter()
  const [form, setForm] = useState<Partial<Consignment>>({})

  useEffect(() => {
    setForm(consignment ?? { owner_percentage: defaultPercentage ?? 70 })
    setErrorStr(null)
  }, [consignment, isOpen, defaultPercentage])

  if (!isOpen) return null
  const isEditing = !!consignment

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.car_id) {
      setErrorStr('Please select a vehicle.')
      return
    }
    const data: ConsignmentInput = {
      owner_id: ownerId,
      car_id: Number(form.car_id),
      owner_percentage: Number(form.owner_percentage) || 70,
      contract_start: form.contract_start || null,
      contract_end: form.contract_end || null,
      notes: form.notes || null,
    }
    startTransition(async () => {
      const result = isEditing && consignment?.id
        ? await updateConsignment(consignment.id, data)
        : await createConsignment(data)
      if (result.error) setErrorStr(result.error)
      else { router.refresh(); onClose() }
    })
  }

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
        <div className="glass w-full max-w-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-fade-in-up my-auto">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
            <h3 className="text-lg font-bold text-white">{isEditing ? 'Edit Car' : 'Add Car'}</h3>
            <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">✕</button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
            {errorStr && <div className="p-3 bg-red-500/20 text-red-300 rounded-xl text-sm border border-red-500/30">{errorStr}</div>}

            <div className="space-y-1">
              <label className={labelCls}>Vehicle</label>
              <select required value={form.car_id || ''} onChange={e => setForm({ ...form, car_id: Number(e.target.value) })}
                className={inputCls}>
                <option value="" disabled className="bg-[#0d0d0d]">Select vehicle...</option>
                {cars.map(c => <option key={c.id} value={c.id} className="bg-[#0d0d0d]">{c.make} {c.model_full || c.model}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className={labelCls}>Owner Split % (e.g. 70 = owner gets 70%)</label>
              <input type="number" min="0" max="100" step="1" required value={form.owner_percentage ?? 70}
                onChange={e => setForm({ ...form, owner_percentage: Number(e.target.value) })} className={inputCls} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className={labelCls}>Contract Start</label>
                <DatePicker value={form.contract_start || ''} onChange={(v) => setForm({ ...form, contract_start: v })}
                  className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Contract End</label>
                <DatePicker value={form.contract_end || ''} onChange={(v) => setForm({ ...form, contract_end: v })}
                  min={form.contract_start || undefined} className={inputCls} />
              </div>
            </div>

            <div className="space-y-1">
              <label className={labelCls}>Notes</label>
              <textarea rows={2} value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })}
                className={`${inputCls} resize-none`} />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
              <button type="button" onClick={onClose} className="bg-white/5 hover:bg-white/10 text-white/80 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all">Cancel</button>
              <button type="submit" disabled={isPending} className="bg-white text-black hover:bg-white/90 px-6 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50">
                {isPending ? 'Saving...' : 'Save Car'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  )
}
