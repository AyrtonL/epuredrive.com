'use client'

import { useState } from 'react'
import type { Tenant, Car } from '@/lib/supabase/types'

interface Props {
  tenant: Tenant
  cars: Car[]
}

const SERVICE_OPTIONS = [
  { value: '', label: 'Select a service...' },
  { value: 'Daily Rental', label: 'Daily Rental' },
  { value: 'Weekend Getaway', label: 'Weekend Getaway' },
  { value: 'Corporate / Event', label: 'Corporate / Event' },
  { value: 'Photoshoot / Film', label: 'Photoshoot / Film' },
  { value: 'Long-Term Rental', label: 'Long-Term Rental' },
  { value: 'Consignment', label: 'Consign My Vehicle' },
  { value: 'Other', label: 'Other Inquiry' },
]

type FormState = 'idle' | 'loading' | 'success' | 'error'

export default function ConciergeSection({ tenant, cars }: Props) {
  const displayName = tenant.brand_name || tenant.name

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [service, setService] = useState('')
  const [vehicle, setVehicle] = useState('')
  const [message, setMessage] = useState('')
  const [formState, setFormState] = useState<FormState>('idle')

  const vehicleOptions = cars.map(c => `${c.year ?? ''} ${c.make} ${c.model_full ?? c.model}`.trim())

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormState('loading')

    try {
      const res = await fetch('/api/concierge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenant.id,
          name, email, phone, service, vehicle, message,
        }),
      })

      if (!res.ok) throw new Error('Request failed')

      setFormState('success')

      // Also open WhatsApp with the inquiry summary (only if tenant has configured a phone)
      if (tenant.whatsapp_phone) {
        const vehicleLabel = vehicle ? `\nVehicle of interest: ${vehicle}` : ''
        const serviceLabel = service ? `\nService: ${service}` : ''
        const msgLabel = message ? `\nMessage: ${message}` : ''
        const waMsg = `Hello ${displayName}! I'd like to make a concierge inquiry.\n\nName: ${name}\nEmail: ${email}${phone ? `\nPhone: ${phone}` : ''}${serviceLabel}${vehicleLabel}${msgLabel}`
        window.open(`https://wa.me/${tenant.whatsapp_phone}?text=${encodeURIComponent(waMsg)}`, '_blank')
      }
    } catch {
      setFormState('error')
    }
  }

  const reset = () => {
    setName(''); setEmail(''); setPhone(''); setService('')
    setVehicle(''); setMessage(''); setFormState('idle')
  }

  return (
    <section id="concierge" className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.015] to-transparent pointer-events-none" />
      <div className="absolute right-1/4 bottom-1/3 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 py-40 relative z-10">
        <div className="grid lg:grid-cols-2 gap-20 items-start">

          {/* ── Left: copy ── */}
          <div className="lg:sticky lg:top-32">
            <p className="text-[10px] font-black uppercase tracking-[.4em] text-primary/60 mb-4">Concierge</p>
            <h2 className="font-outfit font-black text-5xl sm:text-6xl text-white leading-none tracking-tight mb-6">
              Let us craft<br />
              <span className="italic text-charcoal">your experience.</span>
            </h2>
            <p className="text-charcoal text-base leading-relaxed mb-12 max-w-md">
              Whether you&apos;re planning a special occasion, need a corporate fleet, or want to consign your vehicle — our team responds within the hour.
            </p>

            <div className="space-y-5">
              {[
                {
                  label: 'Response within 1 hour',
                  icon: (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                    </svg>
                  ),
                },
                {
                  label: 'Your details stay private',
                  icon: (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  ),
                },
                {
                  label: 'Tailored to your needs',
                  icon: (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                  ),
                },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-2xl bg-white/[0.06] border border-white/[0.10] flex items-center justify-center text-grey flex-shrink-0">
                    {item.icon}
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-widest text-silver">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: form ── */}
          <div className="glass border border-white/[0.13] rounded-[2rem] p-10 shadow-2xl relative overflow-hidden" style={{boxShadow: '0 24px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.07)'}}>
            <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl -mr-24 -mt-24 pointer-events-none" />

            {formState === 'success' ? (
              <div className="relative z-10 flex flex-col items-center justify-center py-16 text-center space-y-6">
                <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-outfit font-black text-2xl text-white mb-2 tracking-tight">Inquiry Received</h3>
                  <p className="text-charcoal text-sm leading-relaxed max-w-xs">
                    We&apos;ve logged your request and opened WhatsApp for immediate contact. We&apos;ll follow up within the hour.
                  </p>
                </div>
                <button
                  onClick={reset}
                  className="text-[10px] font-black uppercase tracking-widest text-charcoal hover:text-white transition-colors border-b border-white/10 pb-0.5"
                >
                  Submit another inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="relative z-10 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-[9px] font-black uppercase tracking-widest text-silver ml-1">Full Name *</label>
                    <input
                      required
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Your name"
                      className="w-full bg-white/[0.06] border border-white/[0.12] rounded-2xl px-4 py-3.5 text-xs text-white placeholder-white/25 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/30 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[9px] font-black uppercase tracking-widest text-silver ml-1">Phone</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="+1 (305) 000-0000"
                      className="w-full bg-white/[0.06] border border-white/[0.12] rounded-2xl px-4 py-3.5 text-xs text-white placeholder-white/25 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/30 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[9px] font-black uppercase tracking-widest text-silver ml-1">Email *</label>
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-white/[0.06] border border-white/[0.12] rounded-2xl px-4 py-3.5 text-xs text-white placeholder-white/25 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/30 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[9px] font-black uppercase tracking-widest text-silver ml-1">Service Type</label>
                  <select
                    value={service}
                    onChange={e => setService(e.target.value)}
                    className="w-full bg-white/[0.06] border border-white/[0.12] rounded-2xl px-4 py-3.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/30 transition-all appearance-none"
                  >
                    {SERVICE_OPTIONS.map(o => (
                      <option key={o.value} value={o.value} className="text-black bg-white">
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                {vehicleOptions.length > 0 && (
                  <div className="space-y-2">
                    <label className="block text-[9px] font-black uppercase tracking-widest text-silver ml-1">Vehicle of Interest</label>
                    <select
                      value={vehicle}
                      onChange={e => setVehicle(e.target.value)}
                      className="w-full bg-white/[0.06] border border-white/[0.12] rounded-2xl px-4 py-3.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/30 transition-all appearance-none"
                    >
                      <option value="" className="text-black bg-white">Any / Not sure yet</option>
                      {vehicleOptions.map(v => (
                        <option key={v} value={v} className="text-black bg-white">{v}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="block text-[9px] font-black uppercase tracking-widest text-silver ml-1">Message</label>
                  <textarea
                    rows={4}
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Tell us about the occasion, dates, or anything else we should know..."
                    className="w-full bg-white/[0.06] border border-white/[0.12] rounded-2xl px-4 py-3.5 text-xs text-white placeholder-white/25 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/30 transition-all resize-none"
                  />
                </div>

                {formState === 'error' && (
                  <p className="text-red-400 text-[10px] font-black uppercase tracking-widest text-center">
                    Something went wrong. Please try again.
                  </p>
                )}

                <button
                  type="submit"
                  disabled={formState === 'loading'}
                  className="w-full bg-white text-black font-black uppercase tracking-[.2em] text-[11px] py-5 rounded-2xl hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-white/5 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 mt-2"
                >
                  {formState === 'loading' ? 'Sending...' : 'Send Inquiry'}
                </button>

                <div className="flex items-center gap-3 pt-1">
                  <div className="h-px flex-1 bg-white/5" />
                  <span className="text-[8px] font-black uppercase tracking-widest text-white/15">or reach us directly</span>
                  <div className="h-px flex-1 bg-white/5" />
                </div>

                {tenant.whatsapp_phone && (
                  <a
                    href={`https://wa.me/${tenant.whatsapp_phone}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl border border-[#25D366]/20 bg-[#25D366]/5 text-[#25D366] text-[10px] font-black uppercase tracking-widest hover:bg-[#25D366]/10 transition-all"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                    </svg>
                    WhatsApp / SMS
                  </a>
                )}
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
