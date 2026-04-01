'use client'

import { useState, useTransition, useMemo } from 'react'
import type { Consignment, Car, Reservation } from '@/lib/supabase/types'
import { deleteConsignment } from './actions'
import ConsignmentModal from './ConsignmentModal'

interface Props {
  consignments: Consignment[]
  cars: Car[]
  reservations: Reservation[]
}

export default function ConsignmentsManager({ consignments, cars, reservations }: Props) {
  const [, startTransition] = useTransition()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Consignment | null>(null)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const carMap = useMemo(() => Object.fromEntries(cars.map(c => [c.id, `${c.make} ${c.model_full || c.model}`])), [cars])

  function handleDelete(id: number) {
    if (!confirm('Delete this consignment? This cannot be undone.')) return
    startTransition(async () => { await deleteConsignment(id) })
  }

  return (
    <div>
      {/* Period Filter */}
      <div className="flex flex-wrap gap-4 mb-6 items-center justify-between">
        <div className="flex gap-3 items-center flex-wrap">
          <span className="text-xs text-white/40 uppercase tracking-widest font-bold">Period:</span>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} placeholder="From"
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-white/20" />
          <span className="text-white/30">→</span>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} placeholder="To"
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-white/20" />
          {(fromDate || toDate) && (
            <button onClick={() => { setFromDate(''); setToDate('') }} className="text-xs text-white/40 hover:text-white transition-colors">Clear</button>
          )}
        </div>
        <button onClick={() => { setEditing(null); setModalOpen(true) }}
          className="bg-white text-black hover:bg-white/90 px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-white/10">
          + New Consignment
        </button>
      </div>

      {consignments.length === 0 ? (
        <div className="text-white/30 text-sm py-12 text-center bg-white/5 rounded-2xl border border-white/5">
          No consignments yet. Click &quot;New Consignment&quot; to add a vehicle owner split.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {consignments.map(con => {
            const ownerPct = con.owner_percentage ?? 70
            const epurePct = 100 - ownerPct

            const carRevenue = reservations
              .filter(r => {
                if (r.car_id !== con.car_id) return false
                if (fromDate && (r.pickup_date ?? '') < fromDate) return false
                if (toDate && (r.pickup_date ?? '') > toDate) return false
                return true
              })
              .reduce((s, r) => s + (Number(r.total_amount) || 0), 0)

            const ownerRevenue = carRevenue * ownerPct / 100
            const epureRevenue = carRevenue * epurePct / 100

            const contractDates = con.contract_start && con.contract_end
              ? `${con.contract_start} → ${con.contract_end}`
              : con.contract_start ? `From ${con.contract_start}` : 'No contract dates'

            return (
              <div key={con.id} className="glass border border-white/10 rounded-3xl overflow-hidden group">
                {/* Header */}
                <div className="px-6 pt-5 pb-4 border-b border-white/10 flex items-start justify-between">
                  <div>
                    <div className="text-white font-bold text-base">{con.owner_name}</div>
                    <div className="text-white/40 text-xs mt-1">
                      {con.owner_email || ''}{con.owner_phone ? ` · ${con.owner_phone}` : ''}
                    </div>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditing(con); setModalOpen(true) }}
                      className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors text-xs">
                      ✎
                    </button>
                    <button onClick={() => handleDelete(con.id)}
                      className="w-8 h-8 bg-red-500/10 hover:bg-red-500/20 rounded-full flex items-center justify-center text-red-400 transition-colors text-xs">
                      ✕
                    </button>
                  </div>
                </div>

                {/* Car + Split */}
                <div className="px-6 py-4 border-b border-white/10">
                  <div className="text-white/80 font-medium text-sm mb-3">
                    {con.car_id ? carMap[con.car_id] ?? `Car #${con.car_id}` : '—'}
                  </div>
                  <div className="flex gap-2">
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/20">
                      Owner {ownerPct}%
                    </span>
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/10 text-white/60 border border-white/10">
                      éPure {epurePct}%
                    </span>
                  </div>
                </div>

                {/* Revenue Stats */}
                <div className="px-6 py-4 grid grid-cols-3 gap-3">
                  {[
                    ['Total Revenue', `$${carRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, 'text-white'],
                    ["Owner's Share", `$${ownerRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, 'text-emerald-400'],
                    ["éPure's Share", `$${epureRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, 'text-blue-400'],
                  ].map(([label, value, cls]) => (
                    <div key={label as string}>
                      <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1">{label}</div>
                      <div className={`text-base font-bold ${cls}`}>{value}</div>
                    </div>
                  ))}
                </div>

                {/* Contract */}
                <div className="px-6 pb-5 text-xs text-white/30">📅 {contractDates}</div>
                {con.notes && <div className="mx-6 mb-5 p-3 bg-white/5 rounded-xl text-xs text-white/40 italic">{con.notes}</div>}
              </div>
            )
          })}
        </div>
      )}

      <ConsignmentModal isOpen={modalOpen} onClose={() => setModalOpen(false)} consignment={editing} cars={cars} />
    </div>
  )
}
