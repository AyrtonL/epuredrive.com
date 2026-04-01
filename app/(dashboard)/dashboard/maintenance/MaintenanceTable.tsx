'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { CarService, Car } from '@/lib/supabase/types'
import { deleteService } from './actions'
import ServiceModal from './ServiceModal'

const PAGE_SIZE = 15

interface Props {
  services: CarService[]
  cars: Car[]
}

export default function MaintenanceTable({ services, cars }: Props) {
  const router = useRouter()
  const [filter, setFilter] = useState('')
  const [isPending, startTransition] = useTransition()
  
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingService, setEditingService] = useState<CarService | null>(null)

  const carMap = useMemo(() => {
    return Object.fromEntries(cars.map((c) => [c.id, `${c.make} ${c.model_full || c.model}`]))
  }, [cars])

  const filtered = useMemo(() => {
    return services.filter((s) => {
      const q = filter.toLowerCase()
      return !q || 
             (s.description ?? '').toLowerCase().includes(q) || 
             carMap[s.car_id ?? -1]?.toLowerCase().includes(q) ||
             (s.service_date ?? '').includes(q)
    })
  }, [services, filter, carMap])

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, page])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))

  function handleDelete(id: number) {
    if (!confirm('Delete this maintenance record?')) return
    startTransition(async () => {
      await deleteService(id)
      router.refresh()
    })
  }

  function openNew() {
    setEditingService(null)
    setModalOpen(true)
  }

  function openEdit(s: CarService) {
    setEditingService(s)
    setModalOpen(true)
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 justify-between items-start md:items-center">
        <input
          type="text"
          placeholder="Search logs by car, date, description…"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value)
            setPage(1)
          }}
          className="w-full max-w-sm bg-white/5 border border-white/10 text-white placeholder:text-white/40 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
        />
        <button
          onClick={openNew}
          className="bg-white text-black hover:bg-white/90 px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-lg shadow-white/10"
        >
          + Log Maintenance
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="text-white/30 text-sm py-12 text-center bg-white/5 rounded-2xl border border-white/5">
          {filter ? 'No records match your search.' : 'No maintenance records found.'}
        </p>
      ) : (
        <>
          <div className="overflow-x-auto bg-white/5 border border-white/10 rounded-2xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-bold uppercase tracking-widest text-white/40 border-b border-white/10 bg-black/20">
                  <th className="py-4 pl-6 pr-4">Vehicle</th>
                  <th className="py-4 pr-4">Type</th>
                  <th className="py-4 pr-4">Date</th>
                  <th className="py-4 pr-4">Description</th>
                  <th className="py-4 pr-4 text-primary">Next Service</th>
                  <th className="py-4 pr-4">Cost</th>
                  <th className="py-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paginated.map((s) => (
                  <tr key={s.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 pl-6 pr-4 font-semibold text-white tracking-wide">
                      {s.car_id ? carMap[s.car_id] ?? `Car #${s.car_id}` : '—'}
                    </td>
                    <td className="py-4 pr-4">
                      <span className="px-2.5 py-1 bg-white/10 text-white/80 rounded-full text-[10px] font-bold uppercase border border-white/5 whitespace-nowrap">
                        {(s.service_type || 'General').replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-4 pr-4 text-white/80 font-medium whitespace-nowrap">
                      {s.service_date || '—'}
                    </td>
                    <td className="py-4 pr-4 text-white/60">
                      <div className="line-clamp-2 max-w-xs">
                        {s.description || '—'}
                        {s.provider && <div className="text-[10px] text-white/30 italic mt-0.5">at {s.provider}</div>}
                      </div>
                    </td>
                    <td className="py-4 pr-4">
                      {s.next_service_date || s.next_service_mileage ? (
                        <div className="space-y-0.5">
                          {s.next_service_date && <div className="text-xs text-primary font-medium">{s.next_service_date}</div>}
                          {s.next_service_mileage && <div className="text-[10px] text-white/40 uppercase tracking-tighter">{s.next_service_mileage.toLocaleString()} mi</div>}
                        </div>
                      ) : '—'}
                    </td>
                    <td className="py-4 pr-4 text-white font-medium">
                      {s.amount != null ? `$${Number(s.amount).toLocaleString()}` : '—'}
                    </td>
                    <td className="py-4 pr-6 text-right space-x-3">
                      <button
                        onClick={() => openEdit(s)}
                        className="text-white/50 hover:text-white transition-colors text-xs font-semibold"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        disabled={isPending}
                        className="text-white/30 hover:text-red-400 transition-colors text-xs font-semibold disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between px-2 text-sm text-white/50">
              <div>
                Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg disabled:opacity-30 transition-colors"
                >
                  Previous
                </button>
                <div className="px-3 py-1.5 bg-white/5 rounded-lg text-white font-medium">
                  {page} / {totalPages}
                </div>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg disabled:opacity-30 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <ServiceModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        service={editingService}
        cars={cars}
      />
    </div>
  )
}
