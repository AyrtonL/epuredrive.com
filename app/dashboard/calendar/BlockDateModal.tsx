'use client'

import { useState, useTransition, useEffect } from 'react'
import type { Car } from '@/lib/supabase/types'
import { createBlockedDate, createBlockedDateForAllCars } from './actions'

interface Props {
  isOpen: boolean
  onClose: () => void
  cars: Car[]
  defaultStartDate?: string
}

export default function BlockDateModal({ isOpen, onClose, cars, defaultStartDate }: Props) {
  const [isPending, startTransition] = useTransition()
  const [errorStr, setErrorStr] = useState<string | null>(null)
  const [carTarget, setCarTarget] = useState<string>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (isOpen) {
      setCarTarget('all')
      setStartDate(defaultStartDate || '')
      setEndDate(defaultStartDate || '')
      setReason('')
      setErrorStr(null)
    }
  }, [isOpen, defaultStartDate])

  if (!isOpen) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (endDate < startDate) {
      setErrorStr('End date must be after start date.')
      return
    }
    setErrorStr(null)
    startTransition(async () => {
      let result
      if (carTarget === 'all') {
        result = await createBlockedDateForAllCars({ start_date: startDate, end_date: endDate, reason: reason || undefined })
      } else {
        result = await createBlockedDate({ car_id: Number(carTarget), start_date: startDate, end_date: endDate, reason: reason || undefined })
      }
      if (result.error) setErrorStr(result.error)
      else onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="glass w-full max-w-lg rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-fade-in-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
          <h3 className="text-lg font-bold text-white tracking-wide">Block Dates</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors p-1">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorStr && (
            <div className="p-3 bg-red-500/20 text-red-300 rounded-xl text-sm border border-red-500/30">{errorStr}</div>
          )}

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Vehicle</label>
            <select
              value={carTarget}
              onChange={e => setCarTarget(e.target.value)}
              className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white"
            >
              <option value="all" className="bg-[#0d0d0d]">All Vehicles</option>
              {cars.map(c => (
                <option key={c.id} value={c.id} className="bg-[#0d0d0d]">
                  {c.make} {c.model_full || c.model}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Start Date</label>
              <input type="date" required value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white [color-scheme:dark]" />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">End Date</label>
              <input type="date" required value={endDate} onChange={e => setEndDate(e.target.value)}
                className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white [color-scheme:dark]" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Reason (optional)</label>
            <input type="text" placeholder="e.g. Maintenance, Personal use..."
              value={reason} onChange={e => setReason(e.target.value)}
              className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white" />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <button type="button" onClick={onClose}
              className="bg-white/5 text-white/80 hover:bg-white/10 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all">
              Cancel
            </button>
            <button type="submit" disabled={isPending}
              className="bg-red-500/80 hover:bg-red-500 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50">
              {isPending ? 'Blocking...' : 'Block Dates'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
