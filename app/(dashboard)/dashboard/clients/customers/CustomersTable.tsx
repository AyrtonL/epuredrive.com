'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { Customer } from '@/lib/supabase/types'
import { syncCustomersFromReservations, deleteCustomer } from './actions'

interface Props {
  customers: Customer[]
  reservations: any[]
  tenantId: string
}

const PAGE_SIZE = 25

export default function CustomersTable({ customers, reservations, tenantId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [syncMsg, setSyncMsg] = useState('')
  const [filter, setFilter] = useState('')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  // Calculate LTV for each customer
  const customersWithLTV = useMemo(() => {
    return customers.map(c => {
      const email = c.email?.toLowerCase().trim()
      const phone = c.phone?.trim()
      const name = c.name?.toLowerCase().trim()

      const matchingReservations = reservations.filter(r => {
        if (email && r.customer_email?.toLowerCase().trim() === email) return true
        if (phone && r.customer_phone?.trim() === phone) return true
        if (name && r.customer_name?.toLowerCase().trim() === name) return true
        return false
      })

      const ltv = matchingReservations.reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0)
      const count = matchingReservations.length
      return { ...c, ltv, count }
    })
  }, [customers, reservations])

  const filtered = useMemo(() => {
    if (!filter) return customersWithLTV
    const q = filter.toLowerCase()
    return customersWithLTV.filter(c =>
      (c.name ?? '').toLowerCase().includes(q) ||
      (c.email ?? '').toLowerCase().includes(q) ||
      (c.phone ?? '').includes(q)
    )
  }, [customersWithLTV, filter])

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, page])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))

  function handleSync() {
    setSyncMsg('Syncing...')
    startTransition(async () => {
      const result = await syncCustomersFromReservations()
      if (result.error) setSyncMsg('Error: ' + result.error)
      else {
        setSyncMsg(`✓ ${result.created} new customer${result.created !== 1 ? 's' : ''} added.`)
        router.refresh()
      }
    })
  }

  function handleDelete(id: number) {
    if (!confirm('Delete this customer record?')) return
    startTransition(async () => { await deleteCustomer(id); router.refresh() })
  }

  // Bulk Actions
  function toggleAll() {
    if (selectedIds.size === paginated.length && paginated.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(paginated.map(c => c.id)))
    }
  }

  function toggleOne(id: number) {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  function handleExportCsv() {
    if (selectedIds.size === 0) return
    const ids = Array.from(selectedIds)
    const selectedRows = customersWithLTV.filter(c => ids.includes(c.id))
    const header = ['Name','Email','Phone','LTV','Trips','Since']
    const csv = [header, ...selectedRows.map(c => [
      c.name, c.email || '', c.phone || '', c.ltv, c.count, c.created_at
    ])].map(row => row.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `customers-export.csv`
    a.click()
    setSelectedIds(new Set())
  }

  function handleBulkDelete() {
    if (!confirm(`Permanently delete ${selectedIds.size} customers?`)) return
    startTransition(async () => {
      for (const id of Array.from(selectedIds)) {
        await deleteCustomer(id)
      }
      setSelectedIds(new Set())
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="bg-primary/20 border border-primary/30 rounded-2xl p-4 flex items-center justify-between text-sm animate-fade-in-up">
          <span className="font-bold text-white px-2">
            {selectedIds.size} customer{selectedIds.size > 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-3">
             <button onClick={handleBulkDelete} disabled={isPending}
               className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-30">
               Delete Selected
             </button>
             <button onClick={handleExportCsv}
               className="bg-white text-black hover:bg-white/95 px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all">
               Export CSV
             </button>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <input type="text" placeholder="Search customers…" value={filter} onChange={e => { setFilter(e.target.value); setPage(1); setSelectedIds(new Set()); }}
          className="w-full max-w-sm bg-white/5 border border-white/10 text-white placeholder:text-white/40 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 transition-all" />
        <button onClick={handleSync} disabled={isPending}
          className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 flex-shrink-0">
          🔄 {isPending ? 'Syncing...' : 'Sync from Bookings'}
        </button>
      </div>
      {syncMsg && <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl text-sm">{syncMsg}</div>}

      {filtered.length === 0 ? (
        <p className="text-white/30 text-sm py-12 text-center">
          {filter ? 'No customers match your search.' : 'No customers yet. They are auto-created from bookings.'}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-bold uppercase tracking-widest text-white/40 border-b border-white/10 bg-black/20">
                <th className="py-4 pl-4 pr-2 w-10">
                  <input type="checkbox" checked={selectedIds.size > 0 && selectedIds.size === paginated.length} onChange={toggleAll}
                    className="rounded border-white/20 bg-black/50 text-white focus:ring-1 focus:ring-white cursor-pointer" />
                </th>
                <th className="py-4 pr-4">Customer Details</th>
                <th className="py-4 pr-4">Lifetime Value</th>
                <th className="py-4 pr-4">Total Trips</th>
                <th className="py-4 pr-4">Since</th>
                <th className="py-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {paginated.map(c => (
                <tr key={c.id} className={`hover:bg-white/5 transition-colors group ${selectedIds.has(c.id) ? 'bg-white/5' : ''}`}>
                  <td className="py-4 pl-4 pr-2">
                    <input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => toggleOne(c.id)}
                      className="rounded border-white/20 bg-black/50 text-white focus:ring-1 focus:ring-white cursor-pointer" />
                  </td>
                  <td className="py-4 pr-4">
                    <div className="text-white font-bold tracking-tight">{c.name}</div>
                    <div className="flex gap-2 mt-1">
                      {c.email && <span className="text-white/40 text-[10px] uppercase font-bold">{c.email}</span>}
                      {c.phone && <span className="text-white/20 text-[10px] uppercase font-bold">• {c.phone}</span>}
                    </div>
                  </td>
                  <td className="py-4 pr-4">
                    <div className="text-emerald-400 font-black tracking-tighter text-base">${(c.ltv || 0).toLocaleString()}</div>
                  </td>
                  <td className="py-4 pr-4">
                    <span className="bg-white/10 text-white/60 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter">
                      {c.count || 0} trip{c.count !== 1 ? 's' : ''}
                    </span>
                  </td>
                  <td className="py-4 pr-4 text-white/30 text-[10px] font-bold uppercase tracking-widest">
                    {c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="py-4 text-right pr-4">
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-white/40 font-bold uppercase tracking-widest pt-4">
          <div>Page {page} of {totalPages}</div>
          <div className="flex gap-2">
            <button onClick={() => { setPage(p => Math.max(1, p - 1)); setSelectedIds(new Set()); }} disabled={page === 1}
              className="bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl transition-all disabled:opacity-20">Prev</button>
            <button onClick={() => { setPage(p => Math.min(totalPages, p + 1)); setSelectedIds(new Set()); }} disabled={page === totalPages}
              className="bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl transition-all disabled:opacity-20">Next</button>
          </div>
        </div>
      )}
    </div>
  )
}
