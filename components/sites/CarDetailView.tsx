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
    <div className="space-y-12">
      {/* Visual Showcase */}
      <div className="space-y-6">
        <div className="relative aspect-[16/10] sm:aspect-[16/9] rounded-[2.5rem] overflow-hidden bg-white/5 shadow-2xl group/car">
           {/* Gradient Overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover/car:opacity-100 transition-opacity duration-700 pointer-events-none" />
          
          <img
            src={resolveImageUrl(gallery[activeIndex] ?? null)}
            alt={`${car.make} ${car.model}`}
            className="w-full h-full object-cover transition-transform duration-1000 group-hover/car:scale-105"
          />
          
          {/* Floating Badge */}
          {car.badge && (
            <div className="absolute top-6 left-6 px-4 py-1.5 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg">
              {car.badge}
            </div>
          )}
        </div>

        {/* Thumbnail Strip */}
        {gallery.length > 1 && (
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide px-2">
            {gallery.map((img, i) => (
              <button
                key={i}
                onClick={() => setActiveIndex(i)}
                className={`flex-shrink-0 w-24 aspect-[4/3] rounded-2xl overflow-hidden bg-white/5 ring-1 transition-all duration-300 ${
                  activeIndex === i ? 'ring-primary scale-110 shadow-lg shadow-primary/20' : 'ring-white/10 opacity-40 hover:opacity-100 hover:ring-white/30'
                }`}
              >
                <img src={resolveImageUrl(img)} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Narrative & Specs */}
      <div className="grid md:grid-cols-2 gap-12 items-start px-4">
        <div className="space-y-6">
          <div className="space-y-1">
             <div className="text-[10px] uppercase font-black tracking-[0.3em] text-primary/60 mb-2">{car.make}</div>
             <h1 className="text-4xl lg:text-5xl font-black text-white tracking-tighter italic">
              {car.model_full || car.model}
            </h1>
          </div>
          
          <div className="flex gap-4 items-center text-xs font-black uppercase tracking-widest text-white/30">
            {car.year && <span>Model {car.year}</span>}
            <span className="w-1 h-1 bg-white/20 rounded-full" />
            <span className="text-white/60">{car.category || 'Luxury'}</span>
          </div>

          <p className="text-white/40 text-base leading-relaxed font-medium max-w-lg">
            {car.description || `Experience the ultimate drive with this meticulously maintained ${car.make} ${car.model}. Perfect for performance enthusiasts and luxury seekers alike.`}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Seats', value: car.seats || '4', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
            { label: 'Transmission', value: car.transmission || 'Auto', icon: 'M11 4a2 2 0 114 0v1a2 2 0 01-2 2 2 2 0 01-2-2V4zm-5 6a2 2 0 114 0v1a2 2 0 01-2 2 2 2 0 01-2-2v-1zm10 0a2 2 0 114 0v1a2 2 0 01-2 2 2 2 0 01-2-2v-1z' },
            { label: 'Power', value: car.hp ? `${car.hp} HP` : '350+', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
            { label: 'Engine', value: 'Performance', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' }
          ].map((spec) => (
            <div key={spec.label} className="glass border border-white/5 rounded-3xl p-5 group/spec transition-all hover:bg-white/5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover/spec:scale-110 transition-transform">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={spec.icon} />
                  </svg>
                </div>
                <div className="text-[9px] font-black uppercase tracking-widest text-white/30">{spec.label}</div>
              </div>
              <div className="text-sm font-black text-white italic">{spec.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Technical Features Tag Cloud */}
      {Array.isArray(car.features) && car.features.length > 0 && (
        <div className="px-4">
          <div className="flex flex-wrap gap-2">
            {car.features.map((f, i) => (
              <span key={i} className="text-[10px] font-black uppercase tracking-widest px-4 py-2 border border-white/5 bg-white/5 text-white/40 rounded-full hover:text-white hover:border-white/20 transition-all cursor-default">
                {f}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
