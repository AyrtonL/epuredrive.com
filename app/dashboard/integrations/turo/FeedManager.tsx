'use client'

import { useState, useTransition } from 'react'
import type { Car } from '@/lib/supabase/types'
import { createFeed, deleteFeed, syncAllFeeds } from './actions'
import { parseIcal } from '@/lib/ical-parser'
import { createClient } from '@supabase/supabase-js'

interface Feed {
  id: number
  car_id: number
  ical_url: string
  source_name: string
  last_synced: string | null
}

interface Props {
  feeds: Feed[]
  cars: Car[]
}

export default function FeedManager({ feeds, cars }: Props) {
  const [isPending, startTransition] = useTransition()
  const [syncMsg, setSyncMsg] = useState('')
  const [csvMsg, setCsvMsg] = useState('')
  const [csvFile, setCsvFile] = useState<File | null>(null)

  // Add form state
  const [newSource, setNewSource] = useState('')
  const [newCarId, setNewCarId] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const [addMode, setAddMode] = useState<'url' | 'file'>('url')
  const [icsFile, setIcsFile] = useState<File | null>(null)

  const carMap = Object.fromEntries(cars.map(c => [c.id, `${c.make} ${c.model_full || c.model}`]))

  function handleDelete(id: number) {
    if (!confirm('Remove this calendar feed?')) return
    startTransition(async () => { await deleteFeed(id) })
  }

  function handleSync() {
    setSyncMsg('Syncing...')
    startTransition(async () => {
      const result = await syncAllFeeds()
      setSyncMsg(result.message)
    })
  }

  async function handleAddFeed(e: React.FormEvent) {
    e.preventDefault()
    if (!newSource || !newCarId) return

    if (addMode === 'file' && icsFile) {
      // Import .ics file directly
      const text = await icsFile.text()
      const events = parseIcal(text, Number(newCarId), newSource)
      if (!events.length) {
        setSyncMsg('No future events found in the .ics file.')
        return
      }
      startTransition(async () => {
        // They get inserted when we call a thin server action — for now notify user
        setSyncMsg(`Found ${events.length} events. (Import via URL feed for automatic sync.)`)
      })
    } else if (addMode === 'url' && newUrl) {
      startTransition(async () => {
        const result = await createFeed({ car_id: Number(newCarId), ical_url: newUrl, source_name: newSource })
        if (result.error) setSyncMsg('Error: ' + result.error)
        else { setNewSource(''); setNewCarId(''); setNewUrl(''); }
      })
    }
  }

  async function handleCsvImport(e: React.FormEvent) {
    e.preventDefault()
    if (!csvFile) { setCsvMsg('Select a CSV file first.'); return }

    const text = await csvFile.text()
    const rows = text.split(/\r?\n/).map(line => {
      const fields: string[] = []; let cur = '', inQ = false
      for (let i = 0; i < line.length; i++) {
        const c = line[i]
        if (c === '"') { inQ = !inQ }
        else if (c === ',' && !inQ) { fields.push(cur); cur = '' }
        else cur += c
      }
      fields.push(cur)
      return fields
    })

    const turoVehicleMap: Record<string, number> = {}
    cars.forEach(c => { if ((c as any).turo_vehicle_id) turoVehicleMap[(c as any).turo_vehicle_id] = c.id })

    const reservations: Record<string, { guest: string; vid: string; total: number; car_id: number | null }> = {}
    for (const r of rows) {
      if (!r[0] || !r[0].includes('Viaje')) continue
      const tipo = r[0].replace(/^"+|"+$/g, '')
      const url = (r[1] || '').replace(/^"+|"+$/g, '')
      const vid = (r[3] || '').trim()
      const earnings = (r[5] || '').replace(/[$,"]/g, '').trim()
      const guestM = tipo.match(/Viaje de (.+?)(?:\n|Con )/)
      const resM = url.match(/\/reservation\/(\d+)/)
      if (!guestM || !resM) continue
      const resId = resM[1]
      const amount = parseFloat(earnings) || 0
      if (!reservations[resId]) reservations[resId] = { guest: guestM[1].trim(), vid, total: 0, car_id: turoVehicleMap[vid] || null }
      reservations[resId].total += amount
    }

    const resIds = Object.keys(reservations)
    if (!resIds.length) { setCsvMsg('No trip rows found. Make sure this is a Turo earnings CSV.'); return }

    setCsvMsg(`Found ${resIds.length} trip(s). To update amounts, match them to reservations with Turo # in notes. (Full API update coming soon.)`)
    setCsvFile(null)
  }

  return (
    <div className="space-y-6">
      {/* Add Feed */}
      <div className="glass border border-white/10 rounded-3xl p-6">
        <h3 className="text-white font-bold mb-4">Add Calendar Feed</h3>
        <form onSubmit={handleAddFeed} className="space-y-4">
          <div className="flex gap-2 mb-2">
            {['url', 'file'].map(mode => (
              <button key={mode} type="button" onClick={() => setAddMode(mode as 'url' | 'file')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${addMode === mode ? 'bg-white text-black' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}>
                {mode === 'url' ? '🔗 URL' : '📁 .ics File'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Platform Name</label>
              <input type="text" required placeholder="e.g. Turo, Airbnb" value={newSource} onChange={e => setNewSource(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20" />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Vehicle</label>
              <select required value={newCarId} onChange={e => setNewCarId(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20">
                <option value="" disabled className="bg-[#0d0d0d]">Select vehicle...</option>
                {cars.map(c => <option key={c.id} value={c.id} className="bg-[#0d0d0d]">{carMap[c.id]}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              {addMode === 'url' ? (
                <>
                  <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">iCal URL</label>
                  <input type="url" placeholder="https://..." value={newUrl} onChange={e => setNewUrl(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20" />
                </>
              ) : (
                <>
                  <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">.ics File</label>
                  <input type="file" accept=".ics" onChange={e => setIcsFile(e.target.files?.[0] ?? null)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-4 text-sm text-white/70 file:mr-3 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-xs file:bg-white/10 file:text-white" />
                </>
              )}
            </div>
          </div>
          <button type="submit" disabled={isPending}
            className="bg-white text-black hover:bg-white/90 px-6 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50">
            {isPending ? 'Adding...' : 'Add Feed'}
          </button>
        </form>
      </div>

      {/* Feeds List */}
      <div className="glass border border-white/10 rounded-3xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-bold">Active Feeds ({feeds.length})</h3>
          {feeds.length > 0 && (
            <button onClick={handleSync} disabled={isPending}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-5 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50">
              🔄 Sync All
            </button>
          )}
        </div>
        {syncMsg && <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl text-sm">{syncMsg}</div>}

        {feeds.length === 0 ? (
          <p className="text-white/30 text-sm py-8 text-center">No calendar feeds added yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-bold uppercase tracking-widest text-white/40 border-b border-white/10">
                  <th className="pb-3 pr-4">Platform</th>
                  <th className="pb-3 pr-4">Vehicle</th>
                  <th className="pb-3 pr-4">Last Synced</th>
                  <th className="pb-3 pr-4">URL</th>
                  <th className="pb-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {feeds.map(f => (
                  <tr key={f.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 pr-4">
                      <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded bg-white/10 text-white/60">{f.source_name}</span>
                    </td>
                    <td className="py-3 pr-4 text-white/80 font-medium">{carMap[f.car_id] ?? `Car #${f.car_id}`}</td>
                    <td className="py-3 pr-4 text-white/40 text-xs">
                      {f.last_synced ? new Date(f.last_synced).toLocaleString() : 'Never'}
                    </td>
                    <td className="py-3 pr-4 text-white/30 text-xs max-w-[200px] truncate" title={f.ical_url}>{f.ical_url}</td>
                    <td className="py-3">
                      <button onClick={() => handleDelete(f.id)} disabled={isPending}
                        className="text-red-400/60 hover:text-red-400 transition-colors text-xs font-semibold disabled:opacity-30">Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Turo CSV Import */}
      <div className="glass border border-white/10 rounded-3xl p-6">
        <h3 className="text-white font-bold mb-2">Turo CSV Import</h3>
        <p className="text-white/40 text-xs mb-4">Import a Turo earnings CSV to update total amounts on matched reservations.</p>
        <form onSubmit={handleCsvImport} className="flex flex-col md:flex-row gap-4 items-start md:items-end">
          <div className="space-y-1 flex-1">
            <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Earnings CSV</label>
            <input type="file" accept=".csv" onChange={e => setCsvFile(e.target.files?.[0] ?? null)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white/70 file:mr-3 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-xs file:bg-white/10 file:text-white" />
          </div>
          <button type="submit" disabled={isPending}
            className="bg-white/10 hover:bg-white/20 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 flex-shrink-0">
            Import CSV
          </button>
        </form>
        {csvMsg && <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/20 text-blue-300 rounded-xl text-sm">{csvMsg}</div>}
      </div>
    </div>
  )
}
