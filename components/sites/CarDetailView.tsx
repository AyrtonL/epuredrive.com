'use client'
import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import type { Car, PickupLocation, RentalExtra } from '@/lib/supabase/types'
import BookingWidget from './BookingWidget'

interface Props {
  car: Car
  tenantId?: string
  slug?: string
  paymentsEnabled?: boolean
  paymentProcessor?: string
  cardSurchargeRate?: number | null
  whatsappPhone?: string | null
  pickupLocations?: PickupLocation[]
  rentalExtras?: RentalExtra[]
}

function resolveImageUrl(url: string | null): string {
  if (!url) return '/assets/images/placeholder.jpg'
  if (url.startsWith('http')) return url
  return `/${url}`
}

const ICONS = {
  calendar: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  seats: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  gear: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z',
  bolt: 'M13 10V3L4 14h7v7l9-11h-7z',
  palette: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01',
}

export default function CarDetailView({ car, tenantId, slug, paymentsEnabled, paymentProcessor, cardSurchargeRate, whatsappPhone, pickupLocations = [], rentalExtras = [] }: Props) {
  const gallery: string[] = Array.isArray(car.gallery) && car.gallery.length > 0
    ? car.gallery
    : car.image_url
    ? [car.image_url]
    : []

  const [activeIndex, setActiveIndex] = useState(0)

  // Phone reserve bar: hide it while the booking widget itself is on screen.
  const bookRef = useRef<HTMLDivElement>(null)
  const [widgetVisible, setWidgetVisible] = useState(false)
  useEffect(() => {
    const el = bookRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([entry]) => setWidgetVisible(entry.isIntersecting), { threshold: 0.15 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const features: string[] = Array.isArray(car.features)
    ? car.features.filter((f): f is string => typeof f === 'string' && f.trim() !== '')
    : []

  const specs = [
    car.year && { label: 'Year', value: String(car.year), icon: ICONS.calendar },
    car.seats && { label: 'Seats', value: `${car.seats} passengers`, icon: ICONS.seats },
    car.transmission && { label: 'Transmission', value: car.transmission, icon: ICONS.gear },
    car.hp && { label: 'Power', value: /hp/i.test(car.hp) ? car.hp : `${car.hp} hp`, icon: ICONS.bolt },
    car.color && { label: 'Color', value: car.color, icon: ICONS.palette },
  ].filter(Boolean).slice(0, 4) as { label: string; value: string; icon: string }[]

  return (
    <div className="space-y-16">
      {/* Visual Showcase */}
      <div className="space-y-8 relative">
        <div className="relative aspect-[16/10] sm:aspect-[16/9] rounded-3xl sm:rounded-[3rem] overflow-hidden bg-white/5 border border-white/5 shadow-2xl group/car">
           {/* Overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/car:opacity-100 transition-opacity duration-1000 pointer-events-none" />
          
          <Image
            src={resolveImageUrl(gallery[activeIndex] ?? null)}
            alt={`${car.make} ${car.model}`}
            fill
            priority
            sizes="100vw"
            className="object-cover transition-transform duration-2000 group-hover/car:scale-110"
          />

          {/* Floating Specs Overlay (Mobile & Desktop) */}
          {(() => {
            const specs = [
              car.hp ? { l: 'Power', v: car.hp } : null,
              car.transmission ? { l: 'Transmission', v: car.transmission } : null,
              car.seats ? { l: 'Seats', v: String(car.seats) } : null,
            ].filter(Boolean) as { l: string; v: string }[]
            if (specs.length === 0) return null
            return (
              <div className="absolute bottom-8 left-8 right-8 flex gap-3 overflow-x-auto scrollbar-hide pointer-events-none translate-y-10 opacity-0 group-hover/car:translate-y-0 group-hover/car:opacity-100 transition-all duration-700">
                {specs.map(s => (
                  <div key={s.l} className="glass border border-white/10 px-6 py-3 rounded-2xl flex flex-col items-start min-w-[100px]">
                    <span className="text-[8px] font-black uppercase tracking-widest text-white/40">{s.l}</span>
                    <span className="text-xs font-outfit font-black italic">{s.v}</span>
                  </div>
                ))}
              </div>
            )
          })()}
          
          {/* Floating Luxury Badge */}
          <div className="absolute top-4 left-4 sm:top-8 sm:left-8 px-4 sm:px-6 py-2 bg-white text-black text-[9px] font-outfit font-black uppercase tracking-[0.3em] rounded-full shadow-2xl">
            {car.badge || car.category || 'Premium Selection'}
          </div>
        </div>

        {/* Cinematic Thumbnail Strip */}
        {gallery.length > 1 && (
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide px-4">
            {gallery.map((img, i) => (
              <button
                key={i}
                onClick={() => setActiveIndex(i)}
                className={`relative flex-shrink-0 w-28 aspect-[4/3] rounded-2xl overflow-hidden bg-white/5 border transition-all duration-500 hover:scale-105 active:scale-95 ${
                  activeIndex === i ? 'border-primary shadow-lg shadow-primary/20 scale-110' : 'border-white/5 opacity-30 hover:opacity-100'
                }`}
              >
                <Image src={resolveImageUrl(img)} alt="" fill sizes="112px" className="object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Narrative & Booking */}
      <div className={`grid ${tenantId ? 'md:grid-cols-5' : 'md:grid-cols-2'} gap-10 md:gap-16 items-start px-4`}>
        <div className={tenantId ? 'md:col-span-3 space-y-8' : 'space-y-8'}>
          <div className="space-y-2">
             <div className="text-[11px] uppercase font-black tracking-[0.4em] text-primary/60 mb-2 font-outfit animate-fade-in">{car.make}</div>
             <h1 className="text-4xl sm:text-5xl lg:text-7xl font-outfit font-black text-white tracking-tighter italic leading-[0.9]">
              {car.model_full || car.model}
            </h1>
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-2 items-center text-[10px] font-black uppercase tracking-[0.3em] text-white/20 font-outfit">
            {car.year && <span className="text-white/60">{car.year}</span>}
            {car.year && car.category && <div className="w-1.5 h-1.5 bg-primary/40 rounded-full" />}
            {car.category && <span>{car.category}</span>}
          </div>

          <p className="text-white/40 text-base sm:text-lg leading-relaxed font-bold font-inter max-w-xl">
            {car.description || `Reserve the ${car.make} ${car.model_full || car.model} online — pick your dates, choose pickup or delivery, and you're set.`}
          </p>

          {/* Features (only what the operator entered) */}
          {features.length > 0 && (
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {features.map((f) => (
                <div key={f} className="glass border border-white/5 px-4 sm:px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest text-white/50">{f}</div>
              ))}
            </div>
          )}

          {/* Spec Cards — real car data only; hidden when nothing is filled in.
              (Previously four hardcoded specs like "Carbon Pack" showed on every car.) */}
          {specs.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:gap-6">
            {specs.map((spec) => (
              <div key={spec.label} className="glass border border-white/5 rounded-3xl sm:rounded-[2.5rem] p-5 sm:p-8 group/spec transition-all duration-700 hover:bg-white/5 hover:border-white/10 md:hover:scale-[1.05]">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/30 group-hover/spec:text-primary transition-all duration-700 mb-4 sm:mb-6">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={spec.icon} />
                  </svg>
                </div>
                <div className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 mb-1 font-outfit">{spec.label}</div>
                <div className="text-xs font-black text-white italic font-outfit">{spec.value}</div>
              </div>
            ))}
          </div>
          )}
        </div>

        {/* Booking Sidebar (only on detail page) */}
        {tenantId && slug && (
          <div id="book" ref={bookRef} className="md:col-span-2 md:sticky md:top-28 scroll-mt-24">
            <BookingWidget
              car={car}
              tenantId={tenantId}
              pickupLocations={pickupLocations}
              whatsappPhone={whatsappPhone}
              paymentsEnabled={paymentsEnabled}
              paymentProcessor={paymentProcessor}
              cardSurchargeRate={cardSurchargeRate}
              rentalExtras={rentalExtras}
            />
          </div>
        )}
      </div>

      {/* Phone: the booking widget sits below the specs, so keep price + a
          shortcut to it pinned to the bottom of the screen. */}
      {tenantId && slug && (
        <div aria-hidden={widgetVisible} className={`md:hidden fixed bottom-0 inset-x-0 z-[60] transition-transform duration-300 ${widgetVisible ? 'translate-y-full' : 'translate-y-0'} px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-[#040404]/90 backdrop-blur-xl border-t border-white/10 flex items-center justify-between gap-4`}>
          <div className="min-w-0">
            <div className="text-xl font-black text-white tracking-tighter italic leading-none">
              ${Number(car.daily_rate) || 0}
              <span className="text-[10px] font-black uppercase tracking-widest text-white/40 not-italic ml-1">/ day</span>
            </div>
            <div className="text-[10px] text-white/40 mt-1 truncate">{car.make} {car.model_full || car.model}</div>
          </div>
          <a
            href="#book"
            className="shrink-0 bg-white text-black font-black uppercase tracking-[0.15em] text-[11px] px-6 py-3.5 rounded-2xl active:scale-[0.98] transition-transform"
          >
            Reserve
          </a>
        </div>
      )}
    </div>
  )
}
