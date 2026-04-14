'use client'

import { useState } from 'react'
import type { PickupLocation } from '@/lib/supabase/types'

interface Props {
  slug: string
  locations: PickupLocation[]
  /** When true, renders without the outer section wrapper (for embedding inside HeroSection) */
  inline?: boolean
}

const TIME_OPTIONS = [
  '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM',
  '06:00 PM', '07:00 PM', '08:00 PM',
]

export default function QuickSearchBar({ slug, locations, inline = false }: Props) {
  const [pickDate, setPickDate] = useState('')
  const [retDate, setRetDate] = useState('')
  const [pickTime, setPickTime] = useState('10:00 AM')
  const [retTime, setRetTime] = useState('10:00 AM')
  const [location, setLocation] = useState(locations[0]?.label || '')

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

  const selectCls = 'w-full bg-white/5 border border-white/5 rounded-xl px-3 py-3 text-xs text-white focus:ring-1 focus:ring-primary/40 outline-none appearance-none [color-scheme:dark]'
  const labelCls = 'block text-[8px] font-black text-white/30 uppercase tracking-widest mb-1.5'

  const inner = (
    <div className="glass border border-white/10 rounded-[2rem] p-6 sm:p-8 shadow-2xl">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
          {/* Pickup Date */}
          <div>
            <label className={labelCls}>Pickup Date</label>
            <input type="date" value={pickDate} onChange={e => setPickDate(e.target.value)}
              className={selectCls} />
          </div>

          {/* Pickup Time */}
          <div>
            <label className={labelCls}>Pickup Time</label>
            <select value={pickTime} onChange={e => setPickTime(e.target.value)} className={selectCls}>
              {TIME_OPTIONS.map(t => <option key={t} value={t} className="text-black">{t}</option>)}
            </select>
          </div>

          {/* Return Date */}
          <div>
            <label className={labelCls}>Return Date</label>
            <input type="date" value={retDate} onChange={e => setRetDate(e.target.value)}
              min={pickDate} className={selectCls} />
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

          {/* Search Button */}
          <div>
            <button
              onClick={handleSearch}
              className="w-full bg-white text-black font-black uppercase tracking-[.15em] text-[10px] py-3.5 rounded-xl hover:bg-primary hover:text-white hover:scale-[1.02] active:scale-95 transition-all shadow-lg"
            >
              Search Fleet
            </button>
          </div>
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
