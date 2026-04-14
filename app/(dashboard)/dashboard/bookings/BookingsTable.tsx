'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { Reservation, Car } from '@/lib/supabase/types'
import { updateReservation, deleteReservation, bulkUpdateReservations } from './actions'
import BookingModal from './BookingModal'

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'bg-green-500/20 text-green-400',
  pending: 'bg-yellow-500/20 text-yellow-400',
  active: 'bg-blue-500/20 text-blue-400',
  completed: 'bg-white/10 text-white/40',
  cancelled: 'bg-red-500/20 text-red-400',
}

const PAGE_SIZE = 25

interface Props {
  reservations: Reservation[]
  cars: Car[]
  chargePerLevel: number
}

export default function BookingsTable({ reservations, cars, chargePerLevel }: Props) {
  const router = useRouter()
  const [filter, setFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [carFilter, setCarFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [isPending, startTransition] = useTransition()
  
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRes, setEditingRes] = useState<Reservation | null>(null)

  const carMap = useMemo(() => {
    return Object.fromEntries(cars.map((c) => [c.id, `${c.make} ${c.model_full || c.model}`]))
  }, [cars])

  const filtered = useMemo(() => {
    return reservations.filter((r) => {
      const q = filter.toLowerCase()
      const textMatch = !q ||
        r.customer_name?.toLowerCase().includes(q) ||
        r.customer_email?.toLowerCase().includes(q) ||
        carMap[r.car_id ?? -1]?.toLowerCase().includes(q)
      const statusMatch = !statusFilter || r.status === statusFilter
      const carMatch = !carFilter || String(r.car_id) === carFilter
      const fromMatch = !dateFrom || (r.pickup_date && r.pickup_date >= dateFrom)
      const toMatch = !dateTo || (r.pickup_date && r.pickup_date <= dateTo)
      return textMatch && statusMatch && carMatch && fromMatch && toMatch
    })
  }, [reservations, filter, statusFilter, carFilter, carMap, dateFrom, dateTo])

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, page])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))

  // Bulk actions
  function toggleAll() {
    if (selectedIds.size === paginated.length && paginated.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(paginated.map(r => r.id)))
    }
  }

  function toggleOne(id: number) {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }
  
  function handleBulkComplete() {
    if (!confirm(`Mark ${selectedIds.size} bookings as Completed?`)) return
    startTransition(async () => {
      await bulkUpdateReservations(Array.from(selectedIds), { status: 'completed' })
      setSelectedIds(new Set())
      router.refresh()
    })
  }
  
  function handleExportCsv() {
    if (selectedIds.size === 0) return
    const ids = Array.from(selectedIds)
    const rows = reservations.filter(r => ids.includes(r.id))
    const header = ['ID','Customer','Email','Phone','Vehicle','Pickup','Return','Total','Status']
    const csv = [header, ...rows.map(r => [
      r.id, r.customer_name, r.customer_email || '', r.customer_phone || '',
      carMap[r.car_id ?? -1] || '', r.pickup_date, r.return_date, 
      r.total_amount || 0, r.status
    ])].map(row => row.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `bookings-export.csv`
    a.click()
    setSelectedIds(new Set())
  }

  function openNew() {
    setEditingRes(null)
    setModalOpen(true)
  }

  function openEdit(r: Reservation) {
    setEditingRes(r)
    setModalOpen(true)
  }

  function handleDelete(id: number) {
    if (!confirm('Delete this reservation?')) return
    startTransition(async () => {
      await deleteReservation(id)
      router.refresh()
    })
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row gap-3 mb-6 justify-between items-start md:items-center flex-wrap">
        <div className="flex flex-wrap gap-3 flex-1">
          <input
            type="text"
            placeholder="Search by name, email, or car…"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value)
              setPage(1)
              setSelectedIds(new Set())
            }}
            className="w-full max-w-xs dash-input px-4 py-2.5"
          />
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); setSelectedIds(new Set()) }}
            className="dash-input px-4 py-2.5 text-white/75"
          >
            <option value="" className="bg-[#0d0d0d]">All Statuses</option>
            <option value="pending" className="bg-[#0d0d0d]">Pending</option>
            <option value="confirmed" className="bg-[#0d0d0d]">Confirmed</option>
            <option value="active" className="bg-[#0d0d0d]">Active</option>
            <option value="completed" className="bg-[#0d0d0d]">Completed</option>
            <option value="cancelled" className="bg-[#0d0d0d]">Cancelled</option>
          </select>
          <select
            value={carFilter}
            onChange={e => { setCarFilter(e.target.value); setPage(1); setSelectedIds(new Set()) }}
            className="dash-input px-4 py-2.5 text-white/75"
          >
            <option value="" className="bg-[#0d0d0d]">All Vehicles</option>
            {cars.map(c => (
              <option key={c.id} value={c.id} className="bg-[#0d0d0d]">
                {c.make} {c.model_full || c.model}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); setPage(1); setSelectedIds(new Set()) }}
              placeholder="From"
              title="From date"
              className="dash-input px-3 py-2.5 [color-scheme:dark]"
            />
            <span className="text-white/30 text-xs">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => { setDateTo(e.target.value); setPage(1); setSelectedIds(new Set()) }}
              placeholder="To"
              title="To date"
              className="dash-input px-3 py-2.5 [color-scheme:dark]"
            />
            {(dateFrom || dateTo) && (
              <button
                onClick={() => { setDateFrom(''); setDateTo(''); setPage(1) }}
                className="text-white/30 hover:text-white text-xs px-2 py-1 transition-colors"
                title="Clear date filter"
              >
                Clear
              </button>
            )}
          </div>
        </div>
        <button
          onClick={openNew}
          className="bg-white text-black hover:bg-white/90 px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-white/10 flex-shrink-0"
        >
          + Add Booking
        </button>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="bg-primary/20 border border-primary/30 rounded-xl p-3 mb-4 flex items-center justify-between text-sm animate-fade-in-up">
          <span className="font-semibold text-white ml-2">
            {selectedIds.size} booking{selectedIds.size > 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleBulkComplete}
              disabled={isPending}
              className="bg-white/10 hover:bg-white/20 px-4 py-1.5 rounded-lg text-white transition-all disabled:opacity-50"
            >
              Mark Completed
            </button>
            <button
              onClick={handleExportCsv}
              className="bg-white text-black hover:bg-white/90 px-4 py-1.5 rounded-lg font-semibold transition-all"
            >
              Export CSV
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="empty-state">
          {filter ? 'No bookings match your search.' : 'No bookings found. Click "Add Booking" to create one.'}
        </p>
      ) : (
        <>
          <div className="data-table">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-bold uppercase tracking-widest text-white/55 border-b border-white/[0.10] bg-white/[0.04]">
                  <th className="py-4 pl-6 pr-2 w-10">
                    <input 
                      type="checkbox" 
                      className="rounded border-white/20 bg-black/50 text-white focus:ring-1 focus:ring-white shadow-none cursor-pointer"
                      checked={selectedIds.size > 0 && selectedIds.size === paginated.length}
                      onChange={toggleAll}
                    />
                  </th>
                  <th className="py-4 pr-4">Customer</th>
                  <th className="py-4 pr-4">Car</th>
                  <th className="py-4 pr-4">Dates</th>
                  <th className="py-4 pr-4">Total</th>
                  <th className="py-4 pr-4">Status</th>
                  <th className="py-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.07]">
                {paginated.map((r) => (
                  <tr key={r.id} className={`hover:bg-white/5 transition-colors ${selectedIds.has(r.id) ? 'bg-white/5' : ''}`}>
                    <td className="py-4 pl-6 pr-2">
                      <input 
                        type="checkbox" 
                        className="rounded border-white/20 bg-black/50 text-white focus:ring-1 focus:ring-white shadow-none cursor-pointer"
                        checked={selectedIds.has(r.id)}
                        onChange={() => toggleOne(r.id)}
                      />
                    </td>
                    <td className="py-4 pr-4">
                      <div className="font-semibold text-white tracking-wide">{r.customer_name || '—'}</div>
                      <div className="text-white/55 text-[11px] mt-0.5">{r.customer_email || r.customer_phone}</div>
                    </td>
                    <td className="py-4 pr-4 text-white/80 font-medium">
                      {r.car_id ? carMap[r.car_id] ?? `Car #${r.car_id}` : '—'}
                    </td>
                    <td className="py-4 pr-4 text-white/70 text-xs">
                      <div><span className="text-white/45">Pick:</span> {r.pickup_date || '—'}</div>
                      <div className="mt-0.5"><span className="text-white/45">Ret:</span> {r.return_date || '—'}</div>
                    </td>
                    <td className="py-4 pr-4 text-white font-medium">
                      {r.total_amount != null ? `$${Number(r.total_amount).toLocaleString()}` : '—'}
                    </td>
                    <td className="py-4 pr-4">
                      <span className={`text-[10px] font-bold uppercase tracking-widest rounded-full px-2.5 py-1 ${STATUS_COLORS[r.status ?? ''] ?? 'bg-white/10 text-white/40'}`}>
                        {r.status || 'unknown'}
                      </span>
                    </td>
                    <td className="py-4 pr-6 text-right space-x-3">
                      <button
                        onClick={() => openEdit(r)}
                        className="text-white/65 hover:text-white transition-colors text-xs font-semibold"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="text-white/45 hover:text-red-400 transition-colors text-xs font-semibold"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between px-2 text-sm text-white/60">
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

      <BookingModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        reservation={editingRes}
        cars={cars}
        chargePerLevel={chargePerLevel}
      />
    </div>
  )
}
