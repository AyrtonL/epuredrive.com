'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { Transaction, Car } from '@/lib/supabase/types'
import { deleteTransaction, bulkCreateTransactions } from './actions'
import ExpenseModal from './ExpenseModal'

const PAGE_SIZE = 15

interface Props {
  expenses: Transaction[]
  cars: Car[]
}

export default function ExpensesTable({ expenses, cars }: Props) {
  const router = useRouter()
  const [filter, setFilter] = useState('')
  const [isPending, startTransition] = useTransition()
  
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Transaction | null>(null)

  const carMap = useMemo(() => {
    return Object.fromEntries(cars.map((c) => [c.id, `${c.make} ${c.model_full || c.model}`]))
  }, [cars])

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      const q = filter.toLowerCase()
      return !q || 
             (e.description ?? '').toLowerCase().includes(q) || 
             (e.category ?? '').toLowerCase().includes(q) || 
             carMap[e.car_id ?? -1]?.toLowerCase().includes(q)
    })
  }, [expenses, filter, carMap])

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, page])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))

  function handleDelete(id: number) {
    if (!confirm('Delete this expense record?')) return
    startTransition(async () => {
      await deleteTransaction(id)
      router.refresh()
    })
  }

  function openNew() {
    setEditingExpense(null)
    setModalOpen(true)
  }

  function openEdit(e: Transaction) {
    setEditingExpense(e)
    setModalOpen(true)
  }

  async function handleImportCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const text = await file.text()
    const lines = text.split(/\r?\n/).filter(line => line.trim())
    if (lines.length < 2) return

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z_]/g, ''))
    const records: Omit<Transaction, 'id' | 'tenant_id'>[] = []

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      const fields: string[] = []
      let cur = '', inQ = false
      for (let j = 0; j < line.length; j++) {
        const c = line[j]
        if (c === '"') inQ = !inQ
        else if (c === ',' && !inQ) { fields.push(cur.trim()); cur = '' }
        else cur += c
      }
      fields.push(cur.trim())

      const row: Record<string, string> = {}
      headers.forEach((h, idx) => { row[h] = fields[idx] || '' })

      const amount = parseFloat(row.amount || row.cost || row.total)
      const date = row.date || row.expense_date || new Date().toISOString().split('T')[0]
      const category = (row.category || row.type || 'other').toLowerCase()
      const description = row.description || row.notes || ''

      if (!isNaN(amount)) {
        records.push({
          transaction_date: date,
          amount,
          category,
          description,
          car_id: null
        })
      }
    }

    if (records.length > 0) {
      startTransition(async () => {
        const res = await bulkCreateTransactions(records)
        if (res.error) alert(`Import failed: ${res.error}`)
        else {
          alert(`Successfully imported ${res.count} records!`)
          router.refresh()
        }
      })
    }
    // Reset file input
    e.target.value = ''
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 justify-between items-start md:items-center">
        <input
          type="text"
          placeholder="Search expenses…"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value)
            setPage(1)
          }}
          className="w-full max-w-sm bg-white/5 border border-white/10 text-white placeholder:text-white/40 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
        />
        <div className="flex gap-3 w-full md:w-auto">
          <input
            type="file"
            id="csv-import"
            accept=".csv"
            onChange={handleImportCSV}
            className="hidden"
          />
          <button
            onClick={() => document.getElementById('csv-import')?.click()}
            disabled={isPending}
            className="flex-1 md:flex-none bg-white/5 text-white hover:bg-white/10 px-6 py-3 rounded-xl text-sm font-semibold border border-white/10 transition-all disabled:opacity-50"
          >
            {isPending ? 'Importing...' : 'Import CSV'}
          </button>
          <button
            onClick={openNew}
            className="flex-1 md:flex-none bg-white text-black hover:bg-white/90 px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-lg shadow-white/10"
          >
            + Log Expense
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-white/30 text-sm py-12 text-center bg-white/5 rounded-2xl border border-white/5">
          {filter ? 'No records match your search.' : 'No expenses found.'}
        </p>
      ) : (
        <>
          <div className="overflow-x-auto bg-white/5 border border-white/10 rounded-2xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-bold uppercase tracking-widest text-white/40 border-b border-white/10 bg-black/20">
                  <th className="py-4 pl-6 pr-4">Date</th>
                  <th className="py-4 pr-4">Category</th>
                  <th className="py-4 pr-4">Description</th>
                  <th className="py-4 pr-4">Associated Car</th>
                  <th className="py-4 pr-4">Amount</th>
                  <th className="py-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paginated.map((e) => (
                  <tr key={e.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 pl-6 pr-4 text-white/80 font-medium whitespace-nowrap">
                      {e.transaction_date || '—'}
                    </td>
                    <td className="py-4 pr-4">
                      <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded bg-white/5 text-white/60">
                        {e.category || 'General'}
                      </span>
                    </td>
                    <td className="py-4 pr-4 text-white/80">
                      {e.description || '—'}
                    </td>
                    <td className="py-4 pr-4 text-white/60 text-xs">
                      {e.car_id ? carMap[e.car_id] ?? `Car #${e.car_id}` : '—'}
                    </td>
                    <td className="py-4 pr-4 text-white font-medium">
                      {e.amount != null ? `$${Number(e.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                    </td>
                    <td className="py-4 pr-6 text-right space-x-3">
                      <button
                        onClick={() => openEdit(e)}
                        className="text-white/50 hover:text-white transition-colors text-xs font-semibold"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(e.id)}
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

      <ExpenseModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        expense={editingExpense}
        cars={cars}
      />
    </div>
  )
}
