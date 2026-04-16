'use client'

import { useState, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Transaction, TaxSetting } from '@/lib/supabase/types'

interface Props {
  transactions: Transaction[]
  taxSettings: TaxSetting[]
  tenantId: string
}

function fmt(n: number) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function pct(n: number) {
  return `${(n * 100).toFixed(2)}%`
}

function localToday() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function localDaysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function TaxesClient({ transactions, taxSettings: initialSettings, tenantId }: Props) {
  const [dateFrom, setDateFrom] = useState(`${new Date().getFullYear()}-01-01`)
  const [dateTo, setDateTo] = useState(localToday())
  const [settings, setSettings] = useState<TaxSetting[]>(initialSettings)
  const [showSettings, setShowSettings] = useState(false)
  const [editingRate, setEditingRate] = useState<TaxSetting | null>(null)
  const [newName, setNewName] = useState('')
  const [newRate, setNewRate] = useState('')
  const [newAppliesTo, setNewAppliesTo] = useState('all')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const presets = useMemo(() => [
    { label: 'This Year', from: `${new Date().getFullYear()}-01-01`, to: localToday() },
    { label: 'Last Year', from: `${new Date().getFullYear() - 1}-01-01`, to: `${new Date().getFullYear() - 1}-12-31` },
    { label: 'Last 90 days', from: localDaysAgo(90), to: localToday() },
    { label: 'Last 30 days', from: localDaysAgo(30), to: localToday() },
  ], [])

  // Filter transactions by date range
  const filtered = useMemo(() => {
    return transactions.filter(t => {
      if (!t.transaction_date) return false
      return t.transaction_date >= dateFrom && t.transaction_date <= dateTo
    })
  }, [transactions, dateFrom, dateTo])

  const income = useMemo(() => filtered.filter(r => r.type === 'income'), [filtered])
  const expenses = useMemo(() => filtered.filter(r => r.type === 'expense'), [filtered])

  const activeRates = useMemo(() => settings.filter(s => s.is_active), [settings])

  // Calculate estimated tax liability based on configured rates
  const totalRevenue = income.reduce((s, r) => s + (Number(r.amount) || 0), 0)
  const totalExpenses = expenses.reduce((s, r) => s + (Number(r.amount) || 0), 0)
  const taxableIncome = totalRevenue - totalExpenses

  // Tax breakdown per configured rate
  const taxBreakdown = useMemo(() => {
    return activeRates.map(rate => ({
      ...rate,
      estimated: Math.max(0, taxableIncome) * Number(rate.rate),
    }))
  }, [activeRates, taxableIncome])

  const totalEstimatedTax = taxBreakdown.reduce((s, t) => s + t.estimated, 0)

  // Actual tax expenses recorded (transactions categorized as tax)
  const taxExpenses = useMemo(() => {
    return expenses.filter(r =>
      activeRates.some(rate => (r.category ?? '').toLowerCase() === rate.name.toLowerCase())
    )
  }, [expenses, activeRates])
  const totalTaxPaid = taxExpenses.reduce((s, r) => s + (Number(r.amount) || 0), 0)

  // Quarterly breakdown
  const quarters = useMemo(() => {
    const map = new Map<string, { revenue: number; expenses: number; taxPaid: number; estimated: number }>()
    for (const r of filtered) {
      if (!r.transaction_date) continue
      const date = new Date(r.transaction_date)
      const q = Math.ceil((date.getMonth() + 1) / 3)
      const key = `${date.getFullYear()}-Q${q}`
      const entry = map.get(key) ?? { revenue: 0, expenses: 0, taxPaid: 0, estimated: 0 }
      const amt = Number(r.amount) || 0
      if (r.type === 'income') {
        entry.revenue += amt
      } else {
        entry.expenses += amt
        if (activeRates.some(rate => (r.category ?? '').toLowerCase() === rate.name.toLowerCase())) {
          entry.taxPaid += amt
        }
      }
      map.set(key, entry)
    }
    // Calculate estimated tax per quarter
    Array.from(map.values()).forEach(entry => {
      const taxable = Math.max(0, entry.revenue - entry.expenses)
      entry.estimated = activeRates.reduce((s, rate) => s + taxable * Number(rate.rate), 0)
    })
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a))
  }, [filtered, activeRates])

  // Monthly breakdown
  const months = useMemo(() => {
    const map = new Map<string, { income: number; expenses: number; tax: number }>()
    for (const r of filtered) {
      if (!r.transaction_date) continue
      const month = r.transaction_date.slice(0, 7)
      const entry = map.get(month) ?? { income: 0, expenses: 0, tax: 0 }
      const amt = Number(r.amount) || 0
      if (r.type === 'income') {
        entry.income += amt
      } else {
        entry.expenses += amt
        if (activeRates.some(rate => (r.category ?? '').toLowerCase() === rate.name.toLowerCase())) {
          entry.tax += amt
        }
      }
      map.set(month, entry)
    }
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a))
  }, [filtered, activeRates])

  // ---- CRUD operations for tax settings ----
  const clearError = useCallback(() => setError(null), [])

  async function addRate() {
    if (!newName.trim() || !newRate.trim()) return
    const rateVal = parseFloat(newRate) / 100
    if (isNaN(rateVal) || rateVal <= 0 || rateVal > 1) return
    setSaving(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data, error: dbError } = await supabase
        .from('tax_settings')
        .insert({ tenant_id: tenantId, name: newName.trim(), rate: rateVal, applies_to: newAppliesTo })
        .select()
        .single()
      if (dbError) {
        setError(`Failed to add tax rate: ${dbError.message}`)
        return
      }
      setSettings(prev => [...prev, data as TaxSetting])
      setNewName('')
      setNewRate('')
      setNewAppliesTo('all')
    } catch {
      setError('An unexpected error occurred while saving.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleRate(id: string, isActive: boolean) {
    setError(null)
    try {
      const supabase = createClient()
      const { error: dbError } = await supabase
        .from('tax_settings')
        .update({ is_active: !isActive })
        .eq('id', id)
      if (dbError) {
        setError(`Failed to update tax rate: ${dbError.message}`)
        return
      }
      setSettings(prev => prev.map(s => s.id === id ? { ...s, is_active: !isActive } : s))
    } catch {
      setError('An unexpected error occurred.')
    }
  }

  async function deleteRate(id: string) {
    setError(null)
    try {
      const supabase = createClient()
      const { error: dbError } = await supabase
        .from('tax_settings')
        .delete()
        .eq('id', id)
      if (dbError) {
        setError(`Failed to delete tax rate: ${dbError.message}`)
        return
      }
      setSettings(prev => prev.filter(s => s.id !== id))
    } catch {
      setError('An unexpected error occurred.')
    }
  }

  async function updateRate(setting: TaxSetting) {
    const rate = Number(setting.rate)
    if (!setting.name.trim() || isNaN(rate) || rate <= 0 || rate > 1) {
      setError('Invalid rate: name is required and rate must be between 0% and 100%.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const supabase = createClient()
      const { error: dbError } = await supabase
        .from('tax_settings')
        .update({ name: setting.name.trim(), rate, applies_to: setting.applies_to })
        .eq('id', setting.id)
      if (dbError) {
        setError(`Failed to update tax rate: ${dbError.message}`)
        return
      }
      setSettings(prev => prev.map(s => s.id === setting.id ? { ...setting, name: setting.name.trim(), rate } : s))
      setEditingRate(null)
    } catch {
      setError('An unexpected error occurred while saving.')
    } finally {
      setSaving(false)
    }
  }

  // CSV Export
  function exportTaxCSV() {
    const header = ['Month', 'Revenue', 'Expenses', 'Tax Paid', 'Net']
    const rows = months.map(([month, data]) => [
      month,
      data.income.toFixed(2),
      data.expenses.toFixed(2),
      data.tax.toFixed(2),
      (data.income - data.expenses).toFixed(2),
    ])
    const csv = [header, ...rows]
      .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tax-report-${dateFrom}_to_${dateTo}.csv`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <div className="space-y-6 pb-12">

      {/* Error Banner */}
      {error && (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
          <p className="text-red-400 text-sm">{error}</p>
          <button onClick={clearError} className="text-red-400/60 hover:text-red-400 text-xs font-bold ml-4">Dismiss</button>
        </div>
      )}

      {/* Date Range Controls */}
      <div className="glass border border-white/10 rounded-3xl p-6">
        <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-end justify-between flex-wrap">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">From</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                className="bg-white/5 border border-white/10 text-white rounded-2xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 [color-scheme:dark]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">To</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                className="bg-white/5 border border-white/10 text-white rounded-2xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 [color-scheme:dark]" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <button key={p.label} onClick={() => { setDateFrom(p.from); setDateTo(p.to) }}
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { label: 'Gross Revenue', value: fmt(totalRevenue), color: 'text-emerald-400' },
          { label: 'Total Expenses', value: fmt(totalExpenses), color: 'text-red-400' },
          { label: 'Tax Paid', value: fmt(totalTaxPaid), color: 'text-amber-400' },
          { label: 'Estimated Tax Due', value: fmt(totalEstimatedTax), color: 'text-violet-400' },
        ].map((s) => (
          <div key={s.label} className="glass border border-white/10 rounded-3xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-3xl -mr-12 -mt-12 transition-all duration-500 group-hover:bg-primary/10" />
            <div className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-3 relative z-10">{s.label}</div>
            <div className={`text-2xl font-black tracking-tighter relative z-10 ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tax Rates Breakdown */}
      {taxBreakdown.length > 0 && (
        <div className="glass border border-white/10 rounded-3xl p-6 md:p-8">
          <h3 className="text-white font-bold mb-6">Tax Rate Breakdown</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {taxBreakdown.map((tax) => (
              <div key={tax.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white text-sm font-bold">{tax.name}</span>
                  <span className="text-[10px] font-black text-violet-400 uppercase tracking-widest">{pct(Number(tax.rate))}</span>
                </div>
                <div className="text-white/30 text-xs mb-1">
                  Applies to: <span className="text-white/50 capitalize">{tax.applies_to}</span>
                </div>
                <div className="text-lg font-black text-violet-400 mt-2">{fmt(tax.estimated)}</div>
                <div className="text-[10px] text-white/20 uppercase tracking-widest">Estimated liability</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quarterly Summary */}
      {quarters.length > 0 && (
        <div className="glass border border-white/10 rounded-3xl p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-white font-bold">Quarterly Summary</h3>
            <button onClick={exportTaxCSV} disabled={months.length === 0}
              className="flex items-center gap-2 bg-white text-black hover:bg-white/90 disabled:opacity-30 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] font-black uppercase tracking-widest text-white/30 border-b border-white/5">
                  <th className="text-left py-3 px-3">Quarter</th>
                  <th className="text-right py-3 px-3">Revenue</th>
                  <th className="text-right py-3 px-3">Expenses</th>
                  <th className="text-right py-3 px-3">Tax Paid</th>
                  <th className="text-right py-3 px-3">Estimated Due</th>
                  <th className="text-right py-3 px-3">Difference</th>
                </tr>
              </thead>
              <tbody>
                {quarters.map(([key, data]) => {
                  const diff = data.taxPaid - data.estimated
                  return (
                    <tr key={key} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-3 text-white/70 font-bold">{key.replaceAll('-', ' ')}</td>
                      <td className="py-3 px-3 text-right text-emerald-400">{fmt(data.revenue)}</td>
                      <td className="py-3 px-3 text-right text-red-400">{fmt(data.expenses)}</td>
                      <td className="py-3 px-3 text-right text-amber-400">{fmt(data.taxPaid)}</td>
                      <td className="py-3 px-3 text-right text-violet-400">{fmt(data.estimated)}</td>
                      <td className={`py-3 px-3 text-right font-bold ${diff >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {diff >= 0 ? '+' : ''}{fmt(diff)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Monthly Breakdown */}
      <div className="glass border border-white/10 rounded-3xl p-6 md:p-8">
        <h3 className="text-white font-bold mb-6">Monthly Breakdown</h3>
        {months.length === 0 ? (
          <p className="text-white/30 text-sm">No transaction data in this date range.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] font-black uppercase tracking-widest text-white/30 border-b border-white/5">
                  <th className="text-left py-3 px-2">Month</th>
                  <th className="text-right py-3 px-2">Revenue</th>
                  <th className="text-right py-3 px-2">Expenses</th>
                  <th className="text-right py-3 px-2">Tax Paid</th>
                  <th className="text-right py-3 px-2">Net</th>
                </tr>
              </thead>
              <tbody>
                {months.map(([month, data]) => {
                  const net = data.income - data.expenses
                  const label = new Date(month + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
                  return (
                    <tr key={month} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-2 text-white/70 font-medium">{label}</td>
                      <td className="py-3 px-2 text-right text-emerald-400">{fmt(data.income)}</td>
                      <td className="py-3 px-2 text-right text-red-400">{fmt(data.expenses)}</td>
                      <td className="py-3 px-2 text-right text-amber-400">{fmt(data.tax)}</td>
                      <td className={`py-3 px-2 text-right font-bold ${net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {fmt(net)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Tax Settings Panel */}
      <div className="glass border border-white/10 rounded-3xl p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-white font-bold">Tax Rate Settings</h3>
              <p className="text-white/30 text-xs">Configure applicable tax rates for your jurisdiction</p>
            </div>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              showSettings
                ? 'bg-white/10 text-white border border-white/20'
                : 'bg-white text-black hover:bg-white/90'
            }`}
          >
            {showSettings ? 'Hide Settings' : 'Configure Rates'}
          </button>
        </div>

        {/* Current rates summary (always visible) */}
        {settings.length > 0 && !showSettings && (
          <div className="flex flex-wrap gap-2">
            {settings.map(s => (
              <span key={s.id} className={`text-[10px] px-3 py-1.5 rounded-full border font-bold uppercase tracking-widest ${
                s.is_active
                  ? 'bg-violet-500/10 border-violet-500/20 text-violet-400'
                  : 'bg-white/5 border-white/5 text-white/20 line-through'
              }`}>
                {s.name} — {pct(Number(s.rate))}
              </span>
            ))}
          </div>
        )}

        {/* Expanded settings panel */}
        {showSettings && (
          <div className="space-y-4 mt-2">
            {/* Existing rates */}
            {settings.map(s => (
              <div key={s.id} className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                {editingRate?.id === s.id ? (
                  <>
                    <input
                      value={editingRate.name}
                      onChange={e => setEditingRate({ ...editingRate, name: e.target.value })}
                      className="flex-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none"
                    />
                    <input
                      value={(Number(editingRate.rate) * 100).toString()}
                      onChange={e => setEditingRate({ ...editingRate, rate: parseFloat(e.target.value) / 100 || 0 })}
                      className="w-20 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm text-right focus:outline-none"
                      placeholder="%"
                    />
                    <button onClick={() => updateRate(editingRate)} disabled={saving}
                      className="px-3 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-bold hover:bg-emerald-500/30 transition-colors">
                      Save
                    </button>
                    <button onClick={() => setEditingRate(null)}
                      className="px-3 py-2 rounded-lg bg-white/5 text-white/40 text-xs hover:text-white transition-colors">
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex-1">
                      <div className="text-white text-sm font-medium">{s.name}</div>
                      <div className="text-white/20 text-xs mt-0.5">Applies to: {s.applies_to}</div>
                    </div>
                    <span className={`text-sm font-bold ${s.is_active ? 'text-violet-400' : 'text-white/20'}`}>
                      {pct(Number(s.rate))}
                    </span>
                    <button onClick={() => setEditingRate(s)}
                      className="px-3 py-1.5 rounded-lg bg-white/5 text-white/40 text-xs hover:text-white hover:bg-white/10 transition-colors">
                      Edit
                    </button>
                    <button onClick={() => toggleRate(s.id, s.is_active)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        s.is_active
                          ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                      }`}>
                      {s.is_active ? 'Disable' : 'Enable'}
                    </button>
                    <button onClick={() => deleteRate(s.id)}
                      className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs hover:bg-red-500/20 transition-colors">
                      Delete
                    </button>
                  </>
                )}
              </div>
            ))}

            {/* Add new rate */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-dashed border-white/10">
              <div className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-3">Add Tax Rate</div>
              <div className="flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[160px] space-y-1">
                  <label className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Name</label>
                  <input
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="e.g. Sales Tax"
                    className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                  />
                </div>
                <div className="w-24 space-y-1">
                  <label className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Rate %</label>
                  <input
                    value={newRate}
                    onChange={e => setNewRate(e.target.value)}
                    placeholder="7.00"
                    className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                  />
                </div>
                <div className="w-36 space-y-1">
                  <label className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Applies To</label>
                  <select
                    value={newAppliesTo}
                    onChange={e => setNewAppliesTo(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none [color-scheme:dark]"
                  >
                    <option value="all">All Income</option>
                    <option value="rental">Rentals Only</option>
                    <option value="service">Services Only</option>
                    <option value="addon">Add-ons Only</option>
                  </select>
                </div>
                <button
                  onClick={addRate}
                  disabled={saving || !newName.trim() || !newRate.trim()}
                  className="bg-white text-black px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-white/90 disabled:opacity-30 transition-all"
                >
                  {saving ? 'Saving...' : 'Add Rate'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tax Tips */}
      <div className="glass border border-amber-500/10 rounded-3xl p-6 md:p-8">
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-white font-bold text-sm mb-1">How Tax Tracking Works</h3>
            <p className="text-white/40 text-sm leading-relaxed">
              Configure your tax rates above, then categorize expenses using matching names (e.g. &quot;Sales Tax&quot;, &quot;Tourism Tax&quot;) when logging transactions.
              The &quot;Tax Paid&quot; column shows actual payments recorded, while &quot;Estimated Due&quot; calculates liability based on your configured rates applied to taxable income (revenue minus expenses).
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
