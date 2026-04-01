'use client'

import { useState, useMemo } from 'react'
import type { Reservation, Transaction } from '@/lib/supabase/types'

interface Props {
  reservations: Reservation[]
  expenses: Transaction[]
  cars: any[]
}

function fmt(n: number) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

function today() {
  return new Date().toISOString().split('T')[0]
}

export default function ReportsClient({ reservations, expenses, cars }: Props) {
  const [dateFrom, setDateFrom] = useState(daysAgo(30))
  const [dateTo, setDateTo] = useState(today())

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

  // Filter reservations by date range
  const filteredAllRes = useMemo(() => {
    return reservations.filter((r) => {
      if (!r.pickup_date) return false
      return r.pickup_date >= dateFrom && (r.return_date || r.pickup_date) <= dateTo
    })
  }, [reservations, dateFrom, dateTo])

  const filteredRes = useMemo(() => {
    return filteredAllRes.filter(r => r.status === 'completed' || r.status === 'confirmed' || r.status === 'active')
  }, [filteredAllRes])

  // Filter expenses by date range
  const filteredExp = useMemo(() => {
    return expenses.filter((e) => {
      if (!e.transaction_date) return false
      return e.transaction_date >= dateFrom && e.transaction_date <= dateTo
    })
  }, [expenses, dateFrom, dateTo])

  const totalRevenue = filteredRes.reduce((s, r) => s + (Number(r.total_amount) || 0), 0)
  const accountsReceivable = filteredRes.filter(r => r.status === 'confirmed').reduce((s, r) => s + (Number(r.total_amount) || 0), 0)
  const totalExpenses = filteredExp.reduce((s, e) => s + (Number(e.amount) || 0), 0)
  const netProfit = totalRevenue - totalExpenses
  
  // Utilization Logic
  const utilization = useMemo(() => {
    if (cars.length === 0) return 0
    const start = new Date(dateFrom)
    const end = new Date(dateTo)
    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1)
    
    let reservedDays = 0
    filteredAllRes.forEach(r => {
      if (r.status === 'cancelled') return
      const p = new Date(r.pickup_date!)
      const rt = new Date(r.return_date || r.pickup_date!)
      const overlapStart = Math.max(start.getTime(), p.getTime())
      const overlapEnd = Math.min(end.getTime(), rt.getTime())
      if (overlapEnd > overlapStart) {
        reservedDays += Math.ceil((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24))
      }
    })
    
    return Math.min(100, Math.round((reservedDays / (cars.length * days)) * 100))
  }, [cars, dateFrom, dateTo, filteredAllRes])

  // Source Distribution
  const sources = useMemo(() => {
    const map: Record<string, number> = { turo: 0, admin: 0, direct: 0 }
    filteredRes.forEach(r => {
      const src = (r as any).source?.toLowerCase() || 'admin'
      const key = src === 'turo' ? 'turo' : src === 'direct' ? 'direct' : 'admin'
      map[key] = (map[key] || 0) + 1
    })
    return map
  }, [filteredRes])

  // Revenue grouped by car
  const byCar = useMemo(() => {
    const map: Record<string, number> = {}
    filteredRes.forEach(r => {
      const carName = cars.find(c => c.id === r.car_id)?.model || `Car #${r.car_id}`
      map[carName] = (map[carName] ?? 0) + (Number(r.total_amount) || 0)
    })
    return Object.entries(map).sort(([, a], [, b]) => b - a)
  }, [filteredRes, cars])

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

  // Growth Assessment Logic
  const growthAssessment = useMemo(() => {
    if (byMonth.length < 2) return { status: 'Analyzing...', color: 'text-white/40', advice: 'Collect more data for trend analysis.' }
    const current = byMonth[0][1]
    const previous = byMonth[1][1]
    const change = previous > 0 ? ((current - previous) / previous) * 100 : 0
    
    if (change > 15) return { status: 'Surging Growth', color: 'text-emerald-400', advice: 'Revenue up significantly. Consider expanding your fleet to meet rising demand.' }
    if (change > 5) return { status: 'Steady Growth', color: 'text-primary', advice: 'Consistent performance. Focus on maintaining high-quality service for repeat bookings.' }
    if (change < -15) return { status: 'Action Required', color: 'text-red-400', advice: 'Revenue down sharply. Audit vehicle pricing and utilization mix immediately.' }
    if (change < -5) return { status: 'Cooling Off', color: 'text-orange-400', advice: 'Slight dip detected. Increase marketing or refresh vehicle galleries to boost interest.' }
    return { status: 'Stable', color: 'text-white/60', advice: 'Performance is sideways. Optimize operations to improve net margins.' }
  }, [byMonth])

  // Parity Ledger: Combine recent reservations and expenses into a single audit trail
  const recentLedger = useMemo(() => {
    const combined = [
      ...filteredAllRes.map(r => ({
        type: 'BOOKING',
        date: r.pickup_date,
        label: `${r.customer_name} — ${cars.find(c => c.id === r.car_id)?.model || 'Car'}`,
        amount: Number(r.total_amount) || 0,
        status: r.status,
        color: 'text-emerald-400'
      })),
      ...filteredExp.map(e => ({
        type: 'EXPENSE',
        date: e.transaction_date,
        label: e.description || e.category || 'General Expense',
        amount: -(Number(e.amount) || 0),
        status: 'PAID',
        color: 'text-red-400'
      }))
    ]
    return combined.sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 15)
  }, [filteredAllRes, filteredExp, cars])

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
    <div className="space-y-8 pb-12">

      {/* Date Range Controls */}
      <div className="glass border border-white/10 rounded-3xl p-6">
        <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-end justify-between flex-wrap">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Date Range Start</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                className="bg-white/5 border border-white/10 text-white rounded-2xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 [color-scheme:dark]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Date Range End</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                className="bg-white/5 border border-white/10 text-white rounded-2xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 [color-scheme:dark]" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <button key={p.label} onClick={() => applyPreset(p.from, p.to)}
                className={`text-[10px] uppercase tracking-widest font-black px-4 py-2.5 rounded-xl transition-all border ${
                  dateFrom === p.from && dateTo === p.to
                    ? 'bg-white text-black border-white shadow-lg shadow-white/10'
                    : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10 hover:text-white'
                }`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
        {[
          { label: 'Gross Revenue', value: fmt(totalRevenue), color: 'text-emerald-400' },
          { label: 'Accounts Receivable', value: fmt(accountsReceivable), color: 'text-orange-400' },
          { label: 'Net Profit', value: fmt(netProfit), color: netProfit >= 0 ? 'text-primary' : 'text-red-400' },
          { label: 'Fleet Utilization', value: `${utilization}%`, color: 'text-white' },
        ].map((s) => (
          <div key={s.label} className="glass border border-white/10 rounded-3xl p-6 relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-3xl -mr-12 -mt-12 transition-all duration-500 group-hover:bg-primary/10`} />
            <div className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-3 relative z-10">{s.label}</div>
            <div className={`text-2xl font-black tracking-tighter relative z-10 ${s.color}`}>{s.value}</div>
          </div>
        ))}
        {/* Growth Assessment Card */}
        <div className="glass border border-white/10 rounded-3xl p-6 md:col-span-1 relative overflow-hidden group">
          <div className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-3">Growth Outlook</div>
          <div className={`text-xl font-black tracking-tighter mb-2 ${growthAssessment.color}`}>{growthAssessment.status}</div>
          <p className="text-[9px] text-white/40 leading-relaxed font-bold uppercase tracking-tight">{growthAssessment.advice}</p>
        </div>
      </div>

      {/* Parity Ledger: Audit Trail */}
      <div className="glass border border-white/10 rounded-[2.5rem] p-10 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] -mr-32 -mt-32" />
        <div className="flex items-center justify-between mb-10 relative z-10">
          <div>
            <h3 className="text-white font-black italic tracking-tight text-xl uppercase">Daily Ledger Audit</h3>
            <p className="text-[10px] text-white/20 uppercase tracking-[.3em] font-black mt-1">100% Legacy Parity Mode</p>
          </div>
          <div className="flex gap-4">
             <div className="px-5 py-2.5 rounded-xl border border-white/5 bg-white/5 flex flex-col items-end">
               <span className="text-[8px] font-black uppercase tracking-widest text-white/20">Operational Margin</span>
               <span className="text-xs font-black text-white italic">{((netProfit / (totalRevenue || 1)) * 100).toFixed(1)}%</span>
             </div>
          </div>
        </div>

        <div className="overflow-x-auto relative z-10">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black uppercase tracking-widest text-white/20 border-b border-white/5">
                <th className="pb-4 px-4">Registry Date</th>
                <th className="pb-4 px-4">Entity / Transaction</th>
                <th className="pb-4 px-4">Status / Event</th>
                <th className="pb-4 px-4 text-right">Credit / Debit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-outfit">
              {recentLedger.map((item, idx) => (
                <tr key={idx} className="group hover:bg-white/5 transition-all duration-300">
                  <td className="py-5 px-4">
                    <span className="text-[11px] font-black text-white/40 group-hover:text-white/60 transition-colors">{item.date}</span>
                  </td>
                  <td className="py-5 px-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase tracking-widest text-primary/50 mb-0.5">{item.type}</span>
                      <span className="text-xs font-black text-white/80 group-hover:text-white transition-colors uppercase tracking-tight">{item.label}</span>
                    </div>
                  </td>
                  <td className="py-5 px-4">
                     <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/5 text-[9px] font-black uppercase tracking-widest text-white/40">
                       {item.status}
                     </span>
                  </td>
                  <td className={`py-5 px-4 text-right font-black italic text-sm ${item.color}`}>
                     {item.amount >= 0 ? '+' : ''}{fmt(item.amount)}
                  </td>
                </tr>
              ))}
              {recentLedger.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-20 text-center italic text-white/20 text-sm font-black uppercase tracking-widest">Zero activity detected in current temporal window</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Source Mix */}
        <div className="glass border border-white/10 rounded-[2.5rem] p-10 lg:col-span-1">
          <h3 className="text-white font-black italic tracking-tight text-lg mb-8 uppercase">Booking Sources</h3>
          <div className="space-y-8">
            {Object.entries(sources).map(([src, count]) => {
              const total = Object.values(sources).reduce((a, b) => a + b, 0)
              const pct = total > 0 ? (count / total) * 100 : 0
              const color = src === 'turo' ? 'bg-[#EA4335]' : src === 'direct' ? 'bg-primary' : 'bg-white/20'
              return (
                <div key={src} className="space-y-3">
                  <div className="flex justify-between items-end text-[10px] font-black uppercase tracking-widest">
                    <span className="text-white/40">{src}</span>
                    <span className="text-white">{count} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full transition-all duration-1000`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Revenue by Car */}
        <div className="glass border border-white/10 rounded-[2.5rem] p-10 lg:col-span-2">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-white font-black italic tracking-tight text-lg uppercase">Revenue per Vehicle</h3>
            <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Performance Ranking</span>
          </div>
          <div className="space-y-8">
            {byCar.slice(0, 5).map(([model, amount], i) => {
              const max = byCar[0]?.[1] || 1
              const pct = (amount / max) * 100
              return (
                <div key={model} className="flex items-center gap-6">
                  <div className="w-32 text-[10px] font-black uppercase text-white/40 truncate tracking-tight">{model}</div>
                  <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary to-primary/40 rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]" style={{ width: `${pct}%`, transitionDelay: `${i * 100}ms` }} />
                  </div>
                  <div className="w-24 text-right text-sm font-black text-white italic">{fmt(amount)}</div>
                </div>
              )
            })}
            {byCar.length === 0 && <p className="text-white/20 text-center py-12 italic text-sm">No revenue data for this selection.</p>}
          </div>
        </div>
      </div>

      {/* Revenue by Month */}
      <div className="glass border border-white/10 rounded-[2.5rem] p-10">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-white font-black italic tracking-tight text-lg uppercase text-white/60">Revenue History</h3>
          <button onClick={exportCSV} disabled={filteredRes.length === 0}
            className="flex items-center gap-2 bg-white text-black hover:bg-white/90 disabled:opacity-30 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
            Download Revenue CSV
          </button>
        </div>
        {byMonth.length === 0 ? (
          <p className="text-white/30 text-sm py-12 text-center italic">Aggregate data unavailable for this range.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            {byMonth.map(([month, amount]) => {
              const pct = maxMonth > 0 ? (amount / maxMonth) * 100 : 0
              return (
                <div key={month} className="space-y-2">
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-[11px] font-black text-white/50 uppercase tracking-tight">
                      {new Date(month + '-01').toLocaleDateString('en', { month: 'short', year: 'numeric' })}
                    </span>
                    <span className="text-white font-black italic">{fmt(amount)}</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-white/20 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Expenses Breakdown */}
      <div className="glass border border-white/10 rounded-[2.5rem] p-10">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-white font-black italic tracking-tight text-lg uppercase text-white/60">Expense Audit Log</h3>
          <button onClick={exportExpensesCSV} disabled={filteredExp.length === 0}
            className="flex items-center gap-2 bg-white/10 text-white hover:bg-white/20 disabled:opacity-30 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/10">
            Download Expenses CSV
          </button>
        </div>
        {filteredExp.length === 0 ? (
          <p className="text-white/30 text-sm py-12 text-center italic">No outgoing transactions found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] font-black uppercase tracking-widest text-white/30 border-b border-white/5 bg-black/10">
                  <th className="py-4 px-4">Date</th>
                  <th className="py-4 px-4">Category</th>
                  <th className="py-4 px-4">Description</th>
                  <th className="py-4 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredExp.map((e) => (
                  <tr key={e.id} className="hover:bg-white/5 transition-colors group">
                    <td className="py-4 px-4 text-white/40 font-bold uppercase tracking-tighter text-[11px]">{e.transaction_date || '—'}</td>
                    <td className="py-4 px-4">
                      <span className="text-[9px] uppercase tracking-widest font-black px-3 py-1 rounded-lg bg-white/5 text-white/50 border border-white/5">
                        {e.category || 'General'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-white/60 font-medium">{e.description || '—'}</td>
                    <td className="py-4 px-4 text-right text-red-500 font-bold italic">{fmt(Number(e.amount) || 0)}</td>
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
