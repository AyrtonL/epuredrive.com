'use client'

import { useState, useMemo } from 'react'
import type { Reservation, Transaction } from '@/lib/supabase/types'

interface Props {
  reservations: Reservation[]
  expenses: Transaction[]
}

function fmt(n: number) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// Returns YYYY-MM-DD for N days ago
function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

function today() {
  return new Date().toISOString().split('T')[0]
}

export default function ReportsClient({ reservations, expenses }: Props) {
  const [dateFrom, setDateFrom] = useState(daysAgo(30))
  const [dateTo, setDateTo] = useState(today())

  // Quick range presets
  const presets = [
    { label: 'Last 7 days', from: daysAgo(7), to: today() },
    { label: 'Last 30 days', from: daysAgo(30), to: today() },
    { label: 'Last 90 days', from: daysAgo(90), to: today() },
    { label: 'This year', from: `${new Date().getFullYear()}-01-01`, to: today() },
  ]

  function applyPreset(from: string, to: string) {
    setDateFrom(from)
    setDateTo(to)
  }

  // Filter completed reservations by date range
  const filteredRes = useMemo(() => {
    return reservations.filter((r) => {
      if (r.status !== 'completed') return false
      if (!r.pickup_date) return false
      return r.pickup_date >= dateFrom && r.pickup_date <= dateTo
    })
  }, [reservations, dateFrom, dateTo])

  // Filter expenses by date range
  const filteredExp = useMemo(() => {
    return expenses.filter((e) => {
      if (!e.transaction_date) return false
      return e.transaction_date >= dateFrom && e.transaction_date <= dateTo
    })
  }, [expenses, dateFrom, dateTo])

  const totalRevenue = filteredRes.reduce((s, r) => s + (Number(r.total_amount) || 0), 0)
  const totalExpenses = filteredExp.reduce((s, e) => s + (Number(e.amount) || 0), 0)
  const netProfit = totalRevenue - totalExpenses
  const completedCount = filteredRes.length

  // Revenue grouped by month
  const byMonth = useMemo(() => {
    const map: Record<string, number> = {}
    filteredRes.forEach((r) => {
      const month = r.pickup_date!.slice(0, 7)
      map[month] = (map[month] ?? 0) + (Number(r.total_amount) || 0)
    })
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a))
  }, [filteredRes])

  const maxMonth = byMonth.length > 0 ? Math.max(...byMonth.map(([, v]) => v)) : 1

  // CSV Export
  function exportCSV() {
    const header = ['Date', 'Customer', 'Email', 'Phone', 'Total', 'Status']
    const rows = filteredRes.map((r) => [
      r.pickup_date ?? '',
      r.customer_name ?? '',
      r.customer_email ?? '',
      r.customer_phone ?? '',
      r.total_amount ?? 0,
      r.status ?? '',
    ])
    const csv = [header, ...rows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `revenue-report-${dateFrom}_to_${dateTo}.csv`
    a.click()
  }

  function exportExpensesCSV() {
    const header = ['Date', 'Category', 'Description', 'Amount']
    const rows = filteredExp.map((e) => [
      e.transaction_date ?? '',
      e.category ?? '',
      e.description ?? '',
      e.amount ?? 0,
    ])
    const csv = [header, ...rows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `expenses-report-${dateFrom}_to_${dateTo}.csv`
    a.click()
  }

  return (
    <div className="space-y-6">

      {/* Date Range Controls */}
      <div className="glass border border-white/10 rounded-2xl p-5">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-end justify-between flex-wrap">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-white/40 uppercase tracking-widest">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 [color-scheme:dark]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-white/40 uppercase tracking-widest">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 [color-scheme:dark]"
              />
            </div>
          </div>
          {/* Quick presets */}
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <button
                key={p.label}
                onClick={() => applyPreset(p.from, p.to)}
                className={`text-xs px-3 py-1.5 rounded-lg transition-all font-medium border ${
                  dateFrom === p.from && dateTo === p.to
                    ? 'bg-white text-black border-white'
                    : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Gross Revenue', value: fmt(totalRevenue), color: 'text-emerald-400' },
          { label: 'Total Expenses', value: fmt(totalExpenses), color: 'text-red-400' },
          { label: 'Net Profit', value: fmt(netProfit), color: netProfit >= 0 ? 'text-emerald-400' : 'text-red-400' },
          { label: 'Completed Bookings', value: completedCount, color: 'text-white' },
        ].map((s) => (
          <div key={s.label} className="glass border border-white/10 rounded-2xl p-5">
            <div className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-2">{s.label}</div>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Revenue by Month */}
      <div className="glass border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-bold text-white/60 uppercase tracking-widest">Revenue by Month</h2>
          <button
            onClick={exportCSV}
            disabled={filteredRes.length === 0}
            className="flex items-center gap-2 bg-white text-black hover:bg-white/90 disabled:opacity-30 px-4 py-2 rounded-xl text-xs font-bold transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Revenue CSV
          </button>
        </div>
        {byMonth.length === 0 ? (
          <p className="text-white/30 text-sm py-8 text-center">No completed bookings in this date range.</p>
        ) : (
          <div className="space-y-4">
            {byMonth.map(([month, amount]) => {
              const pct = maxMonth > 0 ? (amount / maxMonth) * 100 : 0
              return (
                <div key={month}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-white/70 font-medium">
                      {new Date(month + '-01').toLocaleDateString('en', { month: 'long', year: 'numeric' })}
                    </span>
                    <span className="text-white font-bold">{fmt(amount)}</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Expenses Breakdown */}
      <div className="glass border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-bold text-white/60 uppercase tracking-widest">Expenses Breakdown</h2>
          <button
            onClick={exportExpensesCSV}
            disabled={filteredExp.length === 0}
            className="flex items-center gap-2 bg-white/10 text-white hover:bg-white/20 disabled:opacity-30 px-4 py-2 rounded-xl text-xs font-bold transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Expenses CSV
          </button>
        </div>
        {filteredExp.length === 0 ? (
          <p className="text-white/30 text-sm py-8 text-center">No expenses in this date range.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-bold uppercase tracking-widest text-white/40 border-b border-white/10">
                  <th className="py-3 pr-4">Date</th>
                  <th className="py-3 pr-4">Category</th>
                  <th className="py-3 pr-4">Description</th>
                  <th className="py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredExp.map((e) => (
                  <tr key={e.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 pr-4 text-white/60">{e.transaction_date || '—'}</td>
                    <td className="py-3 pr-4">
                      <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded bg-white/5 text-white/60">
                        {e.category || 'General'}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-white/70">{e.description || '—'}</td>
                    <td className="py-3 text-right text-red-400 font-medium">{fmt(Number(e.amount) || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}
