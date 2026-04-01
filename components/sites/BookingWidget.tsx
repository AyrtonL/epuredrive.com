'use client'

import { useState, useMemo } from 'react'
import type { Car } from '@/lib/supabase/types'

interface Props {
  car: Car
}

const timeOptions = [
  '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM',
  '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM',
  '05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM', '08:00 PM'
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
    const diff = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / 86400000))
    return diff
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
    if (!pickDate || !retDate) {
      alert('Please select pickup and return dates.')
      return
    }
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

  const priceNum = Number(car.daily_rate) || 0

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 lg:p-8 sticky top-24">
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-4xl font-bold text-white">${priceNum}</span>
        <span className="text-white/40">/ day</span>
      </div>
      <div className="text-sm text-white/50 mb-6">${priceNum * 6} / week</div>

      <h3 className="text-lg font-semibold text-white mb-4">Reserve This Vehicle</h3>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-white/40 uppercase tracking-widest mb-1.5">Pickup Date</label>
            <input 
              type="date" 
              value={pickDate} 
              onChange={e => setPickDate(e.target.value)} 
              min={new Date().toISOString().split('T')[0]}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-white/30 outline-none" 
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/40 uppercase tracking-widest mb-1.5">Time</label>
            <select 
              value={pickTime} 
              onChange={e => setPickTime(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-white/30 outline-none appearance-none"
            >
              {timeOptions.map(t => <option key={t} value={t} className="text-black">{t}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-white/40 uppercase tracking-widest mb-1.5">Return Date</label>
            <input 
              type="date" 
              value={retDate} 
              onChange={e => setRetDate(e.target.value)}
              min={pickDate || new Date().toISOString().split('T')[0]}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-white/30 outline-none" 
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/40 uppercase tracking-widest mb-1.5">Time</label>
            <select 
              value={retTime} 
              onChange={e => setRetTime(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-white/30 outline-none appearance-none"
            >
              {timeOptions.map(t => <option key={t} value={t} className="text-black">{t}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-white/40 uppercase tracking-widest mb-1.5">Pickup Location</label>
          <select 
            value={location} 
            onChange={e => setLocation(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-white/30 outline-none appearance-none"
          >
            <option value="aventura" className="text-black">Pick-up in Aventura (Free)</option>
            <option value="mia" className="text-black">Delivery to MIA ($120)</option>
            <option value="fll" className="text-black">Delivery to FLL ($120)</option>
          </select>
        </div>

        {/* Addons */}
        <div className="pt-4 space-y-3">
          <label className="block text-xs font-semibold text-white/40 uppercase tracking-widest mb-2">Optional Add-ons</label>
          
          <label className="flex items-start gap-3 p-3 rounded-xl border border-white/10 bg-white/5 cursor-pointer hover:bg-white/10 transition">
            <input type="checkbox" className="mt-1" checked={hasProtection} onChange={e => setHasProtection(e.target.checked)} />
            <div className="flex-1">
              <div className="text-sm font-medium text-white">Standard Protection</div>
              <div className="text-xs text-white/50">Collision coverage, $1,000 deductible</div>
            </div>
            <div className="text-xs font-medium text-white/70">+$30/day</div>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-xl border border-white/10 bg-white/5 cursor-pointer hover:bg-white/10 transition">
            <input type="checkbox" className="mt-1" checked={hasToll} onChange={e => setHasToll(e.target.checked)} />
            <div className="flex-1">
              <div className="text-sm font-medium text-white">Toll Package</div>
              <div className="text-xs text-white/50">All Florida tolls covered, no invoices</div>
            </div>
            <div className="text-xs font-medium text-white/70">+$10/day</div>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-xl border border-white/10 bg-white/5 cursor-pointer hover:bg-white/10 transition">
            <input type="checkbox" className="mt-1" checked={hasFuel} onChange={e => setHasFuel(e.target.checked)} />
            <div className="flex-1">
              <div className="text-sm font-medium text-white">Prepaid Fuel</div>
              <div className="text-xs text-white/50">Return at any fuel level, no charge</div>
            </div>
            <div className="text-xs font-medium text-white/70">$80 flat</div>
          </label>
        </div>

        {/* Total */}
        <div className="flex items-center justify-between py-4 border-t border-white/10 mt-6">
          <span className="text-white/60 font-medium">Estimated Total</span>
          <span className="text-xl font-bold text-white">
            {days > 0 ? `$${total}` : 'Select dates'}
          </span>
        </div>

        {/* Buttons */}
        <div className="space-y-3">
          <button onClick={() => {
            if(!pickDate || !retDate) { alert('Select dates first'); return; }
            const params = new URLSearchParams({
              id: String(car.id), start: pickDate, end: retDate,
              start_time: pickTime, end_time: retTime, loc: location,
              protection: hasProtection ? '1' : '0', toll: hasToll ? '1' : '0', fuel: hasFuel ? '1' : '0'
            })
            window.location.href = `/reservation.html?${params.toString()}`
          }} className="w-full bg-white text-black font-semibold py-3.5 rounded-xl hover:bg-white/90 transition-colors flex items-center justify-center gap-2">
            Pay & Reserve Online
          </button>
          
          <button onClick={handleWhatsapp} className="w-full border-2 border-[#25D366] text-[#25D366] font-semibold py-3.5 rounded-xl hover:bg-[#25D366] hover:text-white transition-colors flex items-center justify-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
            Reserve via WhatsApp
          </button>
        </div>
        
        <p className="text-xs text-white/30 text-center mt-4">
          Instant confirmation · Free cancellation · Real-time availability
        </p>
      </div>
    </div>
  )
}
