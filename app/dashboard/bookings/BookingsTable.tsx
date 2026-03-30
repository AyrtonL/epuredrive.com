// app/dashboard/bookings/BookingsTable.tsx
'use client'

import { useState, useTransition } from 'react'
import type { Reservation, Car } from '@/lib/supabase/types'
import { updateReservation, deleteReservation } from './actions'

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'bg-green-500/20 text-green-400',
  pending: 'bg-yellow-500/20 text-yellow-400',
  completed: 'bg-white/10 text-white/40',
  cancelled: 'bg-red-500/20 text-red-400',
}

interface Props {
  reservations: Reservation[]
  cars: Car[]
}

export default function BookingsTable({ reservations, cars }: Props) {
  const [filter, setFilter] = useState('')
  const [, startTransition] = useTransition()

  const carMap = Object.fromEntries(cars.map((c) => [c.id, `${c.make} ${c.model_full || c.model}`]))

  const filtered = reservations.filter((r) => {
    const q = filter.toLowerCase()
    return (
      !q ||
      r.customer_name?.toLowerCase().includes(q) ||
      r.customer_email?.toLowerCase().includes(q) ||
      carMap[r.car_id ?? -1]?.toLowerCase().includes(q)
    )
  })

  function handleStatusChange(id: number, status: string) {
    startTransition(async () => {
      await updateReservation(id, { status })
    })
  }

  function handleDelete(id: number) {
    if (!confirm('Delete this reservation?')) return
    startTransition(async () => {
      await deleteReservation(id)
    })
  }

  return (
    <div>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name, email, or car…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full max-w-sm bg-white/5 border border-white/10 text-white placeholder:text-white/30 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-white/30"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-white/30 text-sm py-12 text-center">No bookings found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-white/40 border-b border-white/10">
                <th className="pb-3 pr-4 font-medium">Customer</th>
                <th className="pb-3 pr-4 font-medium">Car</th>
                <th className="pb-3 pr-4 font-medium">Pickup</th>
                <th className="pb-3 pr-4 font-medium">Return</th>
                <th className="pb-3 pr-4 font-medium">Total</th>
                <th className="pb-3 pr-4 font-medium">Status</th>
                <th className="pb-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-white/5 transition-colors">
                  <td className="py-3 pr-4">
                    <div className="font-medium text-white">{r.customer_name || '—'}</div>
                    <div className="text-white/40 text-xs">{r.customer_email}</div>
                  </td>
                  <td className="py-3 pr-4 text-white/70">
                    {r.car_id ? carMap[r.car_id] ?? `Car #${r.car_id}` : '—'}
                  </td>
                  <td className="py-3 pr-4 text-white/70">
                    {r.pickup_date ? new Date(r.pickup_date).toLocaleDateString() : '—'}
                  </td>
                  <td className="py-3 pr-4 text-white/70">
                    {r.return_date ? new Date(r.return_date).toLocaleDateString() : '—'}
                  </td>
                  <td className="py-3 pr-4 text-white font-medium">
                    {r.total_amount != null ? `$${Number(r.total_amount).toFixed(2)}` : '—'}
                  </td>
                  <td className="py-3 pr-4">
                    <select
                      value={r.status ?? ''}
                      onChange={(e) => handleStatusChange(r.id, e.target.value)}
                      className={`text-xs font-semibold rounded-full px-2 py-1 border-0 bg-transparent ${
                        STATUS_COLORS[r.status ?? ''] ?? 'text-white/40'
                      } cursor-pointer`}
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td className="py-3">
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="text-white/20 hover:text-red-400 transition-colors text-xs"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
