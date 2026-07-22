'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { Consignment, ConsignmentOwner, Car, Reservation, Transaction } from '@/lib/supabase/types'
import { deleteOwner, deleteConsignment } from './actions'
import { groupOwnerPayouts } from '@/lib/consignments/payouts'
import OwnerModal from './OwnerModal'
import ConsignmentModal from './ConsignmentModal'

interface Props {
  owners: ConsignmentOwner[]
  consignments: Consignment[]
  cars: Car[]
  reservations: Reservation[]
  expenses: Transaction[]
}

const money = (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`

export default function ConsignmentsManager({ owners, consignments, cars, reservations, expenses }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const [ownerModalOpen, setOwnerModalOpen] = useState(false)
  const [editingOwner, setEditingOwner] = useState<ConsignmentOwner | null>(null)

  const [carModalOpen, setCarModalOpen] = useState(false)
  const [carOwnerId, setCarOwnerId] = useState<string>('')
  const [carDefaultPct, setCarDefaultPct] = useState<number | null>(70)
  const [editingCar, setEditingCar] = useState<Consignment | null>(null)

  const carMap = useMemo(
    () => Object.fromEntries(cars.map(c => [c.id, `${c.make} ${c.model_full || c.model}`])),
    [cars]
  )

  const groups = useMemo(
    () => groupOwnerPayouts({ owners, consignments, reservations, expenses, from: fromDate, to: toDate }),
    [owners, consignments, reservations, expenses, fromDate, toDate]
  )

  // Cars already consigned (to exclude from the Add-Car dropdown).
  const consignedCarIds = useMemo(() => new Set(consignments.map(c => c.car_id)), [consignments])

  function openNewOwner() { setEditingOwner(null); setOwnerModalOpen(true) }
  function openEditOwner(o: ConsignmentOwner) { setEditingOwner(o); setOwnerModalOpen(true) }

  function openAddCar(o: ConsignmentOwner) {
    setCarOwnerId(o.id); setCarDefaultPct(o.default_percentage == null ? 70 : Number(o.default_percentage)); setEditingCar(null); setCarModalOpen(true)
  }
  function openEditCar(o: ConsignmentOwner, c: Consignment) {
    setCarOwnerId(o.id); setCarDefaultPct(o.default_percentage == null ? 70 : Number(o.default_percentage)); setEditingCar(c); setCarModalOpen(true)
  }

  function handleDeleteOwner(o: ConsignmentOwner) {
    if (!confirm(`Delete owner ${o.name}? This cannot be undone.`)) return
    startTransition(async () => {
      const { error } = await deleteOwner(o.id)
      if (error) alert(error)
      else router.refresh()
    })
  }

  function handleDeleteCar(id: string) {
    if (!confirm('Remove this car from the consignment? This cannot be undone.')) return
    startTransition(async () => { await deleteConsignment(id); router.refresh() })
  }

  // For the car modal: allow the currently-edited car plus any not-yet-consigned car.
  const selectableCars = useMemo(() => {
    const editingId = editingCar?.car_id
    return cars.filter(c => !consignedCarIds.has(c.id) || c.id === editingId)
  }, [cars, consignedCarIds, editingCar])

  return (
    <div>
      {/* Period filter + New Owner */}
      <div className="flex flex-wrap gap-4 mb-6 items-center justify-between">
        <div className="flex gap-3 items-center flex-wrap">
          <span className="text-xs text-white/40 uppercase tracking-widest font-bold">Period:</span>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-white/20" />
          <span className="text-white/30">→</span>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-white/20" />
          {(fromDate || toDate) && (
            <button onClick={() => { setFromDate(''); setToDate('') }} className="text-xs text-white/40 hover:text-white transition-colors">Clear</button>
          )}
        </div>
        <button onClick={openNewOwner}
          className="bg-white text-black hover:bg-white/90 px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-white/10">
          + New Owner
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="text-white/30 text-sm py-12 text-center bg-white/5 rounded-2xl border border-white/5">
          No owners yet. Click &quot;New Owner&quot; to add a vehicle owner.
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(g => (
            <div key={g.owner.id} className="glass border border-white/10 rounded-3xl overflow-hidden">
              {/* Owner header */}
              <div className="px-6 pt-5 pb-4 border-b border-white/10 flex items-start justify-between gap-4">
                <div>
                  <div className="text-white font-bold text-base">{g.owner.name}</div>
                  <div className="text-white/40 text-xs mt-1">
                    {g.owner.email || ''}{g.owner.phone ? ` · ${g.owner.phone}` : ''}
                    {g.owner.default_percentage != null ? ` · default ${Number(g.owner.default_percentage)}%` : ''}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => openAddCar(g.owner)}
                    className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-full text-xs font-semibold transition-colors">+ Add car</button>
                  <button onClick={() => openEditOwner(g.owner)}
                    className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors text-xs">✎</button>
                  <button onClick={() => handleDeleteOwner(g.owner)}
                    className="w-8 h-8 bg-red-500/10 hover:bg-red-500/20 rounded-full flex items-center justify-center text-red-400 transition-colors text-xs">✕</button>
                </div>
              </div>

              {/* Combined payout */}
              <div className="px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-4 border-b border-white/10">
                {[
                  ['Combined Owner Payout', money(g.totalOwnerShare), 'text-emerald-400'],
                  ["éPure's Share", money(g.totalEpureShare), 'text-blue-400'],
                  ['Completed Revenue', money(g.totalEarnedGross), 'text-white/60'],
                  ['In Progress (active)', money(g.totalActiveOwnerShare), 'text-amber-400/70'],
                ].map(([label, value, cls]) => (
                  <div key={label as string}>
                    <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1">{label}</div>
                    <div className={`text-lg font-black tracking-tighter ${cls}`}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Per-car breakdown */}
              {g.cars.length === 0 ? (
                <div className="px-6 py-6 text-white/30 text-sm text-center">
                  No cars yet. Click &quot;+ Add car&quot; to consign a vehicle to {g.owner.name}.
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {g.cars.map(cp => {
                    const con = cp.consignment
                    const contract = con.contract_start && con.contract_end
                      ? `${con.contract_start} → ${con.contract_end}`
                      : con.contract_start ? `From ${con.contract_start}` : 'No contract dates'
                    return (
                      <div key={con.id} className="px-6 py-4 flex flex-wrap items-center justify-between gap-4 group">
                        <div className="min-w-[180px]">
                          <div className="text-white/90 font-medium text-sm">
                            {con.car_id != null ? carMap[con.car_id] ?? `Car #${con.car_id}` : '—'}
                          </div>
                          <div className="text-white/30 text-xs mt-0.5">📅 {contract}</div>
                        </div>
                        <div className="flex items-center gap-6 text-right flex-wrap">
                          <div>
                            <div className="text-[9px] text-white/30 uppercase tracking-widest">Split</div>
                            <div className="text-sm font-bold text-emerald-300">{cp.ownerPct}%</div>
                          </div>
                          <div>
                            <div className="text-[9px] text-white/30 uppercase tracking-widest">Completed</div>
                            <div className="text-sm font-bold text-white/70">{money(cp.earnedGross)}</div>
                          </div>
                          <div>
                            <div className="text-[9px] text-white/30 uppercase tracking-widest">Expenses</div>
                            <div className="text-sm font-bold text-red-400/60">-{money(cp.expenses)}</div>
                          </div>
                          <div>
                            <div className="text-[9px] text-white/30 uppercase tracking-widest">Owner Share</div>
                            <div className="text-sm font-black text-emerald-400">{money(cp.ownerShare)}</div>
                          </div>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEditCar(g.owner, con)}
                              className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors text-xs">✎</button>
                            <button onClick={() => handleDeleteCar(con.id)}
                              className="w-8 h-8 bg-red-500/10 hover:bg-red-500/20 rounded-full flex items-center justify-center text-red-400 transition-colors text-xs">✕</button>
                          </div>
                        </div>
                        {con.notes && <div className="w-full mt-2 p-3 bg-white/5 rounded-xl text-xs text-white/40 italic">{con.notes}</div>}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <OwnerModal isOpen={ownerModalOpen} onClose={() => setOwnerModalOpen(false)} owner={editingOwner} />
      <ConsignmentModal
        isOpen={carModalOpen}
        onClose={() => setCarModalOpen(false)}
        ownerId={carOwnerId}
        defaultPercentage={carDefaultPct}
        consignment={editingCar}
        cars={selectableCars}
      />
    </div>
  )
}
