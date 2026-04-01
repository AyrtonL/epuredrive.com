'use client'
import { useState } from 'react'
import type { Car } from '@/lib/supabase/types'

interface Props {
  car: Car
}

function resolveImageUrl(url: string | null): string {
  if (!url) return '/assets/images/placeholder.jpg'
  if (url.startsWith('http')) return url
  return `/${url}`
}

export default function CarDetailView({ car }: Props) {
  const gallery: string[] = Array.isArray(car.gallery) && car.gallery.length > 0
    ? car.gallery
    : car.image_url
    ? [car.image_url]
    : []

  const [activeIndex, setActiveIndex] = useState(0)

  return (
    <div className="space-y-16">
      {/* Visual Showcase */}
      <div className="space-y-8 relative">
        <div className="relative aspect-[16/10] sm:aspect-[16/9] rounded-[3rem] overflow-hidden bg-white/5 border border-white/5 shadow-2xl group/car">
           {/* Overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/car:opacity-100 transition-opacity duration-1000 pointer-events-none" />
          
          <img
            src={resolveImageUrl(gallery[activeIndex] ?? null)}
            alt={`${car.make} ${car.model}`}
            className="w-full h-full object-cover transition-transform duration-2000 group-hover/car:scale-110"
          />

          {/* Floating Specs Overlay (Mobile & Desktop) */}
          <div className="absolute bottom-8 left-8 right-8 flex gap-3 overflow-x-auto scrollbar-hide pointer-events-none translate-y-10 opacity-0 group-hover/car:translate-y-0 group-hover/car:opacity-100 transition-all duration-700">
            {[
              { l: '0-60', v: '3.8s' },
              { l: 'Top Speed', v: '185 mph' },
              { l: 'Engine', v: 'V8 Biturbo' }
            ].map(s => (
              <div key={s.l} className="glass border border-white/10 px-6 py-3 rounded-2xl flex flex-col items-start min-w-[120px]">
                <span className="text-[8px] font-black uppercase tracking-widest text-white/40">{s.l}</span>
                <span className="text-xs font-outfit font-black italic">{s.v}</span>
              </div>
            ))}
          </div>
          
          {/* Floating Luxury Badge */}
          <div className="absolute top-8 left-8 px-6 py-2 bg-white text-black text-[9px] font-outfit font-black uppercase tracking-[0.3em] rounded-full shadow-2xl">
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
                className={`flex-shrink-0 w-28 aspect-[4/3] rounded-2xl overflow-hidden bg-white/5 border transition-all duration-500 hover:scale-105 active:scale-95 ${
                  activeIndex === i ? 'border-primary shadow-lg shadow-primary/20 scale-110' : 'border-white/5 opacity-30 hover:opacity-100'
                }`}
              >
                <img src={resolveImageUrl(img)} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Narrative & Engineering Specs */}
      <div className="grid md:grid-cols-2 gap-16 items-start px-4">
        <div className="space-y-8">
          <div className="space-y-2">
             <div className="text-[11px] uppercase font-black tracking-[0.4em] text-primary/60 mb-2 font-outfit animate-fade-in">{car.make}</div>
             <h1 className="text-5xl lg:text-7xl font-outfit font-black text-white tracking-tighter italic leading-[0.9]">
              {car.model_full || car.model}
            </h1>
          </div>
          
          <div className="flex gap-5 items-center text-[10px] font-black uppercase tracking-[0.3em] text-white/20 font-outfit">
            {car.year && <span className="text-white/60">Année {car.year}</span>}
            <div className="w-1.5 h-1.5 bg-primary/40 rounded-full" />
            <span>Chassis {car.category || 'GT'}</span>
          </div>

          <p className="text-white/40 text-lg leading-relaxed font-bold font-inter max-w-xl">
            {car.description || `An icon of engineering and design. This ${car.make} ${car.model} combines raw performance with unparalleled luxury, offering an experience reserved for those who demand the finest drive.`}
          </p>

          {/* Transmission/Seats Pills */}
          <div className="flex gap-4">
             <div className="glass border border-white/5 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest text-white/50">{car.transmission || 'Automatic'}</div>
             <div className="glass border border-white/5 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest text-white/50">{car.seats || '4'} Passengers</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {[
            { label: 'Dynamics', value: 'Active Aero', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
            { label: 'Exhaust', value: 'Sport Mode', icon: 'M11 4a2 2 0 114 0v1a2 2 0 01-2 2 2 2 0 01-2-2V4zm-5 6a2 2 0 114 0v1a2 2 0 01-2 2 2 2 0 01-2-2v-1zm10 0a2 2 0 114 0v1a2 2 0 01-2 2 2 2 0 01-2-2v-1z' },
            { label: 'Intelligence', value: 'Driver Assist', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
            { label: 'Finish', value: 'Carbon Pack', icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-3.086A2.25 2.25 0 0112 12.086V10M7 21v-4a2 2 0 012-2h4a2 2 0 012 2v4' }
          ].map((spec) => (
            <div key={spec.label} className="glass border border-white/5 rounded-[2.5rem] p-8 group/spec transition-all duration-700 hover:bg-white/5 hover:border-white/10 hover:scale-[1.05]">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/30 group-hover/spec:text-primary transition-all duration-700 mb-6">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={spec.icon} />
                </svg>
              </div>
              <div className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 mb-1 font-outfit">{spec.label}</div>
              <div className="text-xs font-black text-white italic font-outfit">{spec.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
