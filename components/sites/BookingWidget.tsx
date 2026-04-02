'use client'

import { useState, useMemo } from 'react'
import type { Car } from '@/lib/supabase/types'

interface Props {
  car: Car
}

const timeOptions = [
  '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', 
  '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM', '08:00 PM'
];

export default function BookingWidget({ car }: Props) {
  const [pickDate, setPickDate] = useState('')
  const [retDate, setRetDate] = useState('')
  const [pickTime, setPickTime] = useState('10:00 AM')
  const [retTime, setRetTime] = useState('10:00 AM')
  const [location, setLocation] = useState('aventura')

  const [hasProtection, setHasProtection] = useState(false)
  const [hasToll, setHasToll] = useState(false)
  const [hasFuel, setHasFuel] = useState(false)

  const days = useMemo(() => {
    if (!pickDate || !retDate) return 0
    const d1 = new Date(pickDate)
    const d2 = new Date(retDate)
    return Math.max(1, Math.round((d2.getTime() - d1.getTime()) / 86400000))
  }, [pickDate, retDate])

  const { total, locFee, protFee, tollFee, fuelFee, baseCost } = useMemo(() => {
    const baserate = Number(car.daily_rate) || 0
    let base = days * baserate
    let lFee = (location === 'mia' || location === 'fll') ? 120 : 0
    let pFee = hasProtection ? days * 30 : 0
    let tFee = hasToll ? days * 10 : 0
    let fFee = hasFuel ? 80 : 0
    return {
      baseCost: base, locFee: lFee, protFee: pFee, tollFee: tFee, fuelFee: fFee,
      total: base + lFee + pFee + tFee + fFee
    }
  }, [days, car.daily_rate, location, hasProtection, hasToll, hasFuel])

  const handleWhatsapp = () => {
    if (!pickDate || !retDate) { alert('Please select dates first.'); return; }
    const phone = '17862096770'
    const locLabels: Record<string, string> = { aventura: 'Aventura (Free)', mia: 'MIA Airport ($120)', fll: 'FLL Airport ($120)' }
    const addons = []
    if (hasProtection) addons.push('Standard Protection')
    if (hasToll) addons.push('Toll Package')
    if (hasFuel) addons.push('Prepaid Fuel')
    
    const msg = `Hello! I'd like to reserve the *${car.make} ${car.model_full || car.model}*.\n\n`
      + `Pickup: ${pickDate} at ${pickTime}\n`
      + `Return: ${retDate} at ${retTime}\n`
      + `Location: ${locLabels[location] || location}\n`
      + (addons.length ? `Add-ons: ${addons.join(', ')}\n` : '')
      + `Estimated Total: $${total}`

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const handleOnlineBooking = () => {
    if (!pickDate || !retDate) { alert('Select dates first'); return; }
    const params = new URLSearchParams({
      id: String(car.id), start: pickDate, end: retDate,
      start_time: pickTime, end_time: retTime, loc: location,
      protection: hasProtection ? '1' : '0', toll: hasToll ? '1' : '0', fuel: hasFuel ? '1' : '0'
    })
    window.location.href = `/reservation.html?${params.toString()}`
  }

  const priceNum = Number(car.daily_rate) || 0

  return (
    <div className="glass border border-white/10 rounded-[2rem] p-8 lg:p-10 shadow-2xl relative overflow-hidden group/widget">
      {/* Background Accent */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 transition-all duration-700 group-hover/widget:bg-primary/10" />

      {/* Header / Pricing */}
      <div className="relative z-10 mb-8 pb-8 border-b border-white/5">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-5xl font-black text-white tracking-tighter italic">${priceNum}</span>
          <span className="text-[10px] font-black uppercase tracking-widest text-white/30">/ day</span>
        </div>
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">Professional Grade Fleet</div>
      </div>

      <div className="relative z-10 space-y-6">
        {/* Date Selection Grid */}
        <div className="grid grid-cols-1 gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="block text-[9px] font-black text-white/30 uppercase tracking-widest ml-1">Pickup</label>
              <input type="date" value={pickDate} onChange={e => setPickDate(e.target.value)}
                className="w-full bg-white/5 border border-white/5 rounded-2xl px-4 py-3 text-xs text-white focus:ring-1 focus:ring-primary/40 outline-none [color-scheme:dark]" />
            </div>
            <div className="space-y-2">
              <label className="block text-[9px] font-black text-white/30 uppercase tracking-widest ml-1">Time</label>
              <select value={pickTime} onChange={e => setPickTime(e.target.value)}
                className="w-full bg-white/5 border border-white/5 rounded-2xl px-4 py-3 text-xs text-white focus:ring-1 focus:ring-primary/40 outline-none appearance-none">
                {timeOptions.map(t => <option key={t} value={t} className="text-black">{t}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="block text-[9px] font-black text-white/30 uppercase tracking-widest ml-1">Return</label>
              <input type="date" value={retDate} onChange={e => setRetDate(e.target.value)}
                className="w-full bg-white/5 border border-white/5 rounded-2xl px-4 py-3 text-xs text-white focus:ring-1 focus:ring-primary/40 outline-none [color-scheme:dark]" />
            </div>
            <div className="space-y-2">
              <label className="block text-[9px] font-black text-white/30 uppercase tracking-widest ml-1">Time</label>
              <select value={retTime} onChange={e => setRetTime(e.target.value)}
                className="w-full bg-white/5 border border-white/5 rounded-2xl px-4 py-3 text-xs text-white focus:ring-1 focus:ring-primary/40 outline-none appearance-none">
                {timeOptions.map(t => <option key={t} value={t} className="text-black">{t}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Location Select */}
        <div className="space-y-2">
          <label className="block text-[9px] font-black text-white/30 uppercase tracking-widest ml-1">Delivery / Pickup</label>
          <select value={location} onChange={e => setLocation(e.target.value)}
            className="w-full bg-white/5 border border-white/5 rounded-2xl px-4 py-4 text-xs text-white font-bold focus:ring-1 focus:ring-primary/40 outline-none appearance-none">
            <option value="aventura" className="text-black">Miami: Aventura Showroom (Free)</option>
            <option value="mia" className="text-black">Miami Int&apos;l Airport ($120 Fee)</option>
            <option value="fll" className="text-black">Ft. Lauderdale Airport ($120 Fee)</option>
          </select>
        </div>

        {/* Add-ons - Minimalist Toggle Style */}
        <div className="space-y-3 pt-4">
          <div className="text-[9px] font-black text-white/30 uppercase tracking-widest ml-1 mb-2">Enhancements</div>
          
          {[
            { id: 'prot', label: 'Shield Protection', fee: '+$30/day', checked: hasProtection, setter: setHasProtection },
            { id: 'toll', label: 'Unlimited Tolls', fee: '+$10/day', checked: hasToll, setter: setHasToll },
            { id: 'fuel', label: 'Prepaid Fuel', fee: '$80 Flat', checked: hasFuel, setter: setHasFuel }
          ].map(addon => (
            <button key={addon.id} onClick={() => addon.setter(!addon.checked)}
              className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 ${addon.checked ? 'bg-primary/10 border-primary/30 text-white' : 'bg-white/5 border-white/5 text-white/40 hover:border-white/10'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${addon.checked ? 'bg-primary shadow-[0_0_8px_#3B82F6]' : 'bg-white/10'}`} />
                <span className="text-[11px] font-black uppercase tracking-tight">{addon.label}</span>
              </div>
              <span className="text-[10px] font-bold opacity-60 italic">{addon.fee}</span>
            </button>
          ))}
        </div>

        {/* Summary / Total */}
        <div className="pt-8 space-y-4">
          <div className="flex items-center justify-between px-2">
            <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Est. Investment</span>
            <div className="text-right">
              <div className="text-2xl font-black text-white italic tracking-tighter">
                {days > 0 ? `$${total.toLocaleString()}` : 'Select Configuration'}
              </div>
              {days > 0 && <div className="text-[9px] font-bold text-white/20 uppercase">All-inclusive total</div>}
            </div>
          </div>
          
          {/* Main CTA */}
          <button 
            onClick={handleOnlineBooking}
            className="w-full bg-white text-black font-black uppercase tracking-[0.2em] text-[11px] py-5 rounded-2xl hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-white/5"
          >
            Pay & Secure This Vehicle
          </button>
          
          <button 
            onClick={handleWhatsapp}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl border border-[#25D366]/20 bg-[#25D366]/5 text-[#25D366] text-[10px] font-black uppercase tracking-widest hover:bg-[#25D366]/10 transition-all"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
            Inquire via SMS / WhatsApp
          </button>
        </div>
        
        <div className="text-center pt-2">
          <span className="text-[8px] font-bold uppercase tracking-[0.3em] text-white/20">Secured via éPure Drive Cloud</span>
        </div>
      </div>
    </div>
  )
}
