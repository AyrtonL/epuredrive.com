'use client'

import { useState } from 'react'
import type { PickupLocation } from '@/lib/supabase/types'
import DateRangePicker from './DateRangePicker'

interface Props {
  /** Site path prefix from getSiteBase(): '' on a tenant host, '/sites/[slug]' otherwise */
  base: string
  locations: PickupLocation[]
  /** When true, renders without the outer section wrapper (for embedding inside HeroSection) */
  inline?: boolean
  initialPickDate?: string
  initialRetDate?: string
  initialPickTime?: string
  initialRetTime?: string
  initialLocation?: string
  theme?: 'dark' | 'light'
  /** Start collapsed to a one-line summary when a search is already applied (fleet page). */
  collapsible?: boolean
}

const TIME_OPTIONS = [
  '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM',
  '06:00 PM', '07:00 PM', '08:00 PM',
]

export default function QuickSearchBar({
  base, locations, inline = false,
  initialPickDate = '', initialRetDate = '',
  initialPickTime = '10:00 AM', initialRetTime = '10:00 AM',
  initialLocation, theme = 'dark', collapsible = false,
}: Props) {
  const isLight = theme === 'light'
  const [pickDate, setPickDate] = useState(initialPickDate)
  const [retDate, setRetDate] = useState(initialRetDate)
  const [pickTime, setPickTime] = useState(initialPickTime)
  const [retTime, setRetTime] = useState(initialRetTime)
  const [location, setLocation] = useState(initialLocation || locations[0]?.label || '')
  const [expanded, setExpanded] = useState(!(collapsible && initialPickDate && initialRetDate))

  const handleSearch = () => {
    const params = new URLSearchParams()
    if (pickDate) params.set('pickup', pickDate)
    if (retDate) params.set('return', retDate)
    if (pickTime) params.set('pickTime', pickTime)
    if (retTime) params.set('retTime', retTime)
    if (location) params.set('location', location)
    const fleetPath = `${base}/fleet`
    window.location.href = `${fleetPath}?${params.toString()}`
  }

  const selectCls = isLight
    ? 'w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-3.5 text-sm text-gray-900 focus:ring-1 focus:ring-primary/50 outline-none appearance-none'
    : 'w-full bg-white/10 border border-white/15 rounded-xl px-3 py-3.5 text-sm text-white focus:ring-1 focus:ring-primary/50 outline-none appearance-none [color-scheme:dark]'
  const labelCls = `block text-[9px] font-black uppercase tracking-widest mb-2 ${isLight ? 'text-gray-500' : 'text-white/40'}`

  const shortDate = (d: string) =>
    new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="w-full flex items-center justify-between gap-4 rounded-2xl bg-white/[0.06] border border-white/15 px-5 py-4 text-left hover:border-white/30 transition-colors"
      >
        <span className="min-w-0">
          <span className="block text-base font-bold text-white">
            {shortDate(initialPickDate)} – {shortDate(initialRetDate)}
          </span>
          <span className="block text-xs text-white/60 truncate mt-0.5">
            {pickTime} – {retTime}{location ? ` · ${location}` : ''}
          </span>
        </span>
        <span className="shrink-0 text-xs font-bold uppercase tracking-wider text-white bg-white/10 rounded-xl px-4 py-2.5">Edit</span>
      </button>
    )
  }

  const inner = (
    <div className={`backdrop-blur-xl rounded-[2rem] p-6 sm:p-8 shadow-2xl ${
      isLight
        ? 'bg-white/90 border border-gray-200'
        : 'bg-white/[0.08] border border-white/15'
    }`}>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 items-end">
          {/* Date Range Picker — spans 2 cols */}
          <div className="col-span-2 md:col-span-2">
            <label className={labelCls}>Dates</label>
            <DateRangePicker
              pickDate={pickDate}
              retDate={retDate}
              onPickDate={setPickDate}
              onRetDate={setRetDate}
              disabledRanges={[]}
              theme={theme}
            />
          </div>

          {/* Pickup Time */}
          <div>
            <label className={labelCls}>Pickup Time</label>
            <select value={pickTime} onChange={e => setPickTime(e.target.value)} className={selectCls}>
              {TIME_OPTIONS.map(t => <option key={t} value={t} className="text-black">{t}</option>)}
            </select>
          </div>

          {/* Return Time */}
          <div>
            <label className={labelCls}>Return Time</label>
            <select value={retTime} onChange={e => setRetTime(e.target.value)} className={selectCls}>
              {TIME_OPTIONS.map(t => <option key={t} value={t} className="text-black">{t}</option>)}
            </select>
          </div>

          {/* Location */}
          <div>
            <label className={labelCls}>Location</label>
            {locations.length > 0 ? (
              <select value={location} onChange={e => setLocation(e.target.value)} className={selectCls}>
                {locations.map(loc => (
                  <option key={loc.label} value={loc.label} className="text-black">
                    {loc.label} {loc.fee > 0 ? `($${loc.fee})` : '(Free)'}
                  </option>
                ))}
              </select>
            ) : (
              <input type="text" value={location} onChange={e => setLocation(e.target.value)}
                placeholder="Pickup location" className={selectCls} />
            )}
          </div>
        </div>

      {/* Search Button — full width below */}
      <div className="mt-4">
        <button
          onClick={handleSearch}
          className={`w-full font-black uppercase tracking-[.15em] text-[11px] py-4 rounded-xl hover:scale-[1.01] active:scale-95 transition-all shadow-lg border border-transparent ${
            isLight
              ? 'bg-gray-900 text-white hover:bg-gray-700 shadow-gray-900/10'
              : 'bg-white text-black hover:bg-black hover:text-white hover:border-white/20 shadow-white/5'
          }`}
        >
          Search Fleet
        </button>
      </div>
    </div>
  )

  if (inline) return inner

  return (
    <section id="search" className="max-w-5xl mx-auto px-6 -mt-12 relative z-20">
      {inner}
    </section>
  )
}
