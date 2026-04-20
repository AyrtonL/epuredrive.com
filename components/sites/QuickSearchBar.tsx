'use client'

import { useState } from 'react'
import type { PickupLocation } from '@/lib/supabase/types'
import DateRangePicker from './DateRangePicker'

interface Props {
  slug: string
  locations: PickupLocation[]
  /** When true, renders without the outer section wrapper (for embedding inside HeroSection) */
  inline?: boolean
  initialPickDate?: string
  initialRetDate?: string
  initialPickTime?: string
  initialRetTime?: string
  initialLocation?: string
  theme?: 'dark' | 'light'
}

const TIME_OPTIONS = [
  '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM',
  '06:00 PM', '07:00 PM', '08:00 PM',
]

export default function QuickSearchBar({
  slug, locations, inline = false,
  initialPickDate = '', initialRetDate = '',
  initialPickTime = '10:00 AM', initialRetTime = '10:00 AM',
  initialLocation, theme = 'dark',
}: Props) {
  const isLight = theme === 'light'
  const [pickDate, setPickDate] = useState(initialPickDate)
  const [retDate, setRetDate] = useState(initialRetDate)
  const [pickTime, setPickTime] = useState(initialPickTime)
  const [retTime, setRetTime] = useState(initialRetTime)
  const [location, setLocation] = useState(initialLocation || locations[0]?.label || '')

  const handleSearch = () => {
    const params = new URLSearchParams()
    if (pickDate) params.set('pickup', pickDate)
    if (retDate) params.set('return', retDate)
    if (pickTime) params.set('pickTime', pickTime)
    if (retTime) params.set('retTime', retTime)
    if (location) params.set('location', location)
    // When on a subdomain, the browser path starts at "/" — middleware handles the /sites/slug rewrite internally.
    // Navigating to /sites/slug/fleet from a subdomain would double the prefix → 404.
    const onSubdomain = !window.location.pathname.startsWith('/sites/')
    const fleetPath = onSubdomain ? '/fleet' : `/sites/${slug}/fleet`
    window.location.href = `${fleetPath}?${params.toString()}`
  }

  const selectCls = isLight
    ? 'w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-3.5 text-sm text-gray-900 focus:ring-1 focus:ring-primary/50 outline-none appearance-none'
    : 'w-full bg-white/10 border border-white/15 rounded-xl px-3 py-3.5 text-sm text-white focus:ring-1 focus:ring-primary/50 outline-none appearance-none [color-scheme:dark]'
  const labelCls = `block text-[9px] font-black uppercase tracking-widest mb-2 ${isLight ? 'text-gray-500' : 'text-white/40'}`

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
