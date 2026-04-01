'use client'

import { useState, useTransition, useMemo } from 'react'
import type { Customer } from '@/lib/supabase/types'
import { syncCustomersFromReservations, deleteCustomer } from './actions'

interface Props {
  customers: Customer[]
}

export default function CustomersTable({ customers }: Props) {
  const [isPending, startTransition] = useTransition()
  const [syncMsg, setSyncMsg] = useState('')
  const [filter, setFilter] = useState('')

  const filtered = useMemo(() => {
    if (!filter) return customers
    const q = filter.toLowerCase()
    return customers.filter(c =>
      (c.name ?? '').toLowerCase().includes(q) ||
      (c.email ?? '').toLowerCase().includes(q) ||
      (c.phone ?? '').includes(q)
    )
  }, [customers, filter])

  function handleSync() {
    setSyncMsg('Syncing...')
    startTransition(async () => {
      const result = await syncCustomersFromReservations()
      if (result.error) setSyncMsg('Error: ' + result.error)
      else setSyncMsg(`✓ ${result.created} new customer${result.created !== 1 ? 's' : ''} added.`)
    })
  }

  function handleDelete(id: number) {
    if (!confirm('Delete this customer record?')) return
    startTransition(async () => { await deleteCustomer(id) })
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 items-start md:items-center justify-between">
        <input type="text" placeholder="Search customers…" value={filter} onChange={e => setFilter(e.target.value)}
          className="w-full max-w-sm bg-white/5 border border-white/10 text-white placeholder:text-white/40 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 transition-all" />
        <button onClick={handleSync} disabled={isPending}
          className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 flex-shrink-0">
          🔄 {isPending ? 'Syncing...' : 'Sync from Bookings'}
        </button>
      </div>
      {syncMsg && <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl text-sm">{syncMsg}</div>}

      {filtered.length === 0 ? (
        <p className="text-white/30 text-sm py-12 text-center">
          {filter ? 'No customers match your search.' : 'No customers yet. They are auto-created from bookings.'}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-bold uppercase tracking-widest text-white/40 border-b border-white/10">
                <th className="pb-4 pr-4">Name</th>
                <th className="pb-4 pr-4">Email</th>
                <th className="pb-4 pr-4">Phone</th>
                <th className="pb-4 pr-4">Since</th>
                <th className="pb-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-white/5 transition-colors group">
                  <td className="py-4 pr-4 text-white font-medium">{c.name}</td>
                  <td className="py-4 pr-4">
                    {c.email ? <a href={`mailto:${c.email}`} className="text-white/60 hover:text-white transition-colors">{c.email}</a> : <span className="text-white/20">—</span>}
                  </td>
                  <td className="py-4 pr-4">
                    {c.phone ? <a href={`tel:${c.phone}`} className="text-white/60 hover:text-white transition-colors">{c.phone}</a> : <span className="text-white/20">—</span>}
                  </td>
                  <td className="py-4 pr-4 text-white/30 text-xs">
                    {c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="py-4">
                    <button onClick={() => handleDelete(c.id)} disabled={isPending}
                      className="text-white/20 hover:text-red-400 transition-colors text-xs opacity-0 group-hover:opacity-100 disabled:opacity-20">
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
