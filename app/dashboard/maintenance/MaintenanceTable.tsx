'use client'

import { useState, useTransition } from 'react'
import type { CarService, Car } from '@/lib/supabase/types'
import { deleteService } from './actions'

interface Props {
  services: CarService[]
  cars: Car[]
}

export default function MaintenanceTable({ services, cars }: Props) {
  const [filter, setFilter] = useState('')
  const [, startTransition] = useTransition()
  const carMap = Object.fromEntries(cars.map((c) => [c.id, `${c.make} ${c.model_full || c.model}`]))

  const filtered = services.filter((s) => {
    const q = filter.toLowerCase()
    return !q || (s.description ?? '').toLowerCase().includes(q) || carMap[s.car_id ?? -1]?.toLowerCase().includes(q)
  })

  function handleDelete(id: number) {
    if (!confirm('Delete this service record?')) return
    startTransition(async () => { await deleteService(id) })
  }

  return (
    <div>
      <input
        type="text"
        placeholder="Search…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="mb-4 w-full max-w-sm bg-white/5 border border-white/10 text-white placeholder:text-white/30 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-white/30"
      />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-white/40 border-b border-white/10">
              <th className="pb-3 pr-4 font-medium">Car</th>
              <th className="pb-3 pr-4 font-medium">Date</th>
              <th className="pb-3 pr-4 font-medium">Description</th>
              <th className="pb-3 pr-4 font-medium">Cost</th>
              <th className="pb-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map((s) => (
              <tr key={s.id} className="hover:bg-white/5 transition-colors">
                <td className="py-3 pr-4 text-white/70">{s.car_id ? carMap[s.car_id] ?? `Car #${s.car_id}` : '—'}</td>
                <td className="py-3 pr-4 text-white/70">{s.service_date ? new Date(s.service_date).toLocaleDateString() : '—'}</td>
                <td className="py-3 pr-4 text-white/70">{s.description ?? '—'}</td>
                <td className="py-3 pr-4 text-white">{s.amount != null ? `$${Number(s.amount).toFixed(2)}` : '—'}</td>
                <td className="py-3">
                  <button onClick={() => handleDelete(s.id)} className="text-xs text-white/20 hover:text-red-400 transition-colors">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="text-white/30 text-sm py-12 text-center">No maintenance records.</p>}
      </div>
    </div>
  )
}
