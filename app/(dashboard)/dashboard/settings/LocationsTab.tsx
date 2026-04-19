'use client'

import type { PickupLocation } from '@/lib/supabase/types'

interface Props {
  whatsappPhone: string
  setWhatsappPhone: (v: string) => void
  businessHours: string
  setBusinessHours: (v: string) => void
  locations: PickupLocation[]
  setLocations: (v: PickupLocation[] | ((prev: PickupLocation[]) => PickupLocation[])) => void
}

const EMPTY_LOCATION: PickupLocation = { label: '', address: '', note: '', fee: 0, maps_query: '' }

const inputCls = 'w-full bg-white/5 border border-white/5 rounded-2xl py-3 px-4 text-sm focus:ring-1 focus:ring-white/20 text-white outline-none transition-all'
const labelCls = 'text-[11px] font-bold text-white/50 uppercase tracking-widest pl-1'

export default function LocationsTab({
  whatsappPhone, setWhatsappPhone, businessHours, setBusinessHours,
  locations, setLocations,
}: Props) {

  function addLocation() {
    setLocations(prev => [...prev, { ...EMPTY_LOCATION }])
  }

  function updateLocation(index: number, field: keyof PickupLocation, value: string | number) {
    setLocations(prev => prev.map((loc, i) => i === index ? { ...loc, [field]: value } : loc))
  }

  function removeLocation(index: number) {
    setLocations(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-8">
      {/* Contact Info */}
      <div className="glass border border-white/10 rounded-3xl p-6 space-y-5">
        <h3 className="text-white font-bold text-sm uppercase tracking-widest opacity-50">Contact &amp; Hours</h3>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className={labelCls}>WhatsApp / SMS Phone</label>
            <input type="tel" value={whatsappPhone} onChange={e => setWhatsappPhone(e.target.value)}
              placeholder="e.g. +1 (786) 209-6770" className={inputCls} />
            <p className="text-[10px] text-white/20 pl-1">Shown on your public site for customer inquiries</p>
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Business Hours</label>
            <input type="text" value={businessHours} onChange={e => setBusinessHours(e.target.value)}
              placeholder="e.g. Mon-Sun 8AM - 8PM" className={inputCls} />
          </div>
        </div>
      </div>

      {/* Pickup Locations */}
      <div className="glass border border-white/10 rounded-3xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-bold text-sm uppercase tracking-widest opacity-50">Pickup &amp; Delivery Locations</h3>
          <button type="button" onClick={addLocation}
            className="bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 text-xs font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-2">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Location
          </button>
        </div>

        {locations.length === 0 && (
          <p className="text-white/20 text-sm text-center py-8">
            No pickup locations configured. Add locations that will appear on your public fleet page.
          </p>
        )}

        <div className="space-y-4">
          {locations.map((loc, i) => (
            <div key={i} className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-4 relative group">
              <button type="button" onClick={() => removeLocation(i)}
                className="absolute top-3 right-3 w-6 h-6 bg-red-500/20 text-red-400 rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/40">
                x
              </button>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className={labelCls}>Label</label>
                  <input type="text" value={loc.label} onChange={e => updateLocation(i, 'label', e.target.value)}
                    placeholder="e.g. Showroom" className={inputCls} />
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>Address</label>
                  <input type="text" value={loc.address} onChange={e => updateLocation(i, 'address', e.target.value)}
                    placeholder="e.g. Miami, FL" className={inputCls} />
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>Delivery Fee ($)</label>
                  <input type="number" value={loc.fee} onChange={e => updateLocation(i, 'fee', Number(e.target.value))}
                    min={0} step={1} className={inputCls} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className={labelCls}>Note</label>
                  <input type="text" value={loc.note} onChange={e => updateLocation(i, 'note', e.target.value)}
                    placeholder="e.g. Free pickup & drop-off" className={inputCls} />
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>Google Maps Query</label>
                  <input type="text" value={loc.maps_query} onChange={e => updateLocation(i, 'maps_query', e.target.value)}
                    placeholder="e.g. Miami+Beach,+FL" className={inputCls} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
