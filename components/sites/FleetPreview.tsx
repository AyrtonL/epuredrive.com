'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import type { Car } from '@/lib/supabase/types'

interface Props {
  cars: Car[]
  slug: string
  theme?: 'dark' | 'light'
}

function resolveImageUrl(url: string | null): string {
  if (!url) return '/assets/images/placeholder.jpg'
  if (url.startsWith('http')) return url
  return `/${url}`
}

export default function FleetPreview({ cars, slug, theme = 'dark' }: Props) {
  const [base, setBase] = useState('')
  const isLight = theme === 'light'

  useEffect(() => {
    if (window.location.pathname.startsWith('/sites/')) {
      setBase(`/sites/${slug}`)
    }
  }, [slug])
  const featured = cars.slice(0, 6)

  if (featured.length === 0) return null

  return (
    <section id="fleet" className="max-w-7xl mx-auto px-6 py-24">
      <div className="flex items-end justify-between mb-12">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.4em] text-primary/60 mb-3">Our Collection</p>
          <h2 className={`font-outfit font-black text-4xl sm:text-5xl tracking-tight leading-none ${isLight ? 'text-gray-900' : 'text-white'}`}>
            Featured Vehicles
          </h2>
        </div>
        {cars.length > 6 && (
          <a
            href={`${base}/fleet`}
            className={`hidden sm:flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] transition-colors px-6 py-3 rounded-full border ${
              isLight
                ? 'text-gray-500 hover:text-gray-900 border-gray-300 hover:border-gray-500'
                : 'text-white/70 hover:text-white border-white/25 hover:border-white/50'
            }`}
          >
            See More
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </a>
        )}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {featured.map((car, i) => (
          <a
            key={car.id}
            href={`${base}/${car.id}`}
            className={`group relative rounded-[2rem] overflow-hidden border transition-all duration-700 ${
              isLight
                ? 'border-gray-200 hover:border-gray-300 bg-white shadow-lg shadow-gray-900/5'
                : 'border-white/[0.09] hover:border-white/20 bg-white/[0.03]'
            }`}
            style={{ animation: `fadeInScale 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards ${i * 0.1}s`, opacity: 0 }}
          >
            {/* Image */}
            <div className="aspect-[16/10] overflow-hidden relative">
              <Image
                src={resolveImageUrl(car.image_url)}
                alt={`${car.make} ${car.model}`}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover transition-transform duration-1000 group-hover:scale-110"
              />
              {!isLight && (
                <div className="absolute inset-0 bg-gradient-to-t from-[#040404] via-[#040404]/40 to-transparent" />
              )}
            </div>

            {/* Badge */}
            {(car.badge || car.category) && (
              <div className={`absolute top-4 left-4 px-4 py-1.5 text-[8px] font-black uppercase tracking-[.2em] rounded-full ${
                isLight
                  ? 'bg-gray-900/90 text-white'
                  : 'bg-white/90 text-black'
              }`}>
                {car.badge || car.category}
              </div>
            )}

            {/* Info — light: below image; dark: overlay on image */}
            {isLight ? (
              <div className="p-5">
                <div className="text-[9px] font-black uppercase tracking-[.3em] text-primary/60 mb-1">{car.make}</div>
                <h3 className="font-outfit font-black text-lg text-gray-900 tracking-tight leading-tight mb-2">
                  {car.model_full || car.model}
                </h3>
                <div className="flex items-center justify-between">
                  {car.daily_rate ? (
                    <div className="flex items-baseline gap-1">
                      <span className="font-outfit font-black text-xl text-gray-900 italic tracking-tighter">${Number(car.daily_rate)}</span>
                      <span className="text-[9px] font-black uppercase text-gray-400">/day</span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-gray-400 font-bold uppercase">Contact for pricing</span>
                  )}
                  <div className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 bg-gray-100 text-gray-400 group-hover:bg-gray-900 group-hover:text-white">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </div>
                </div>
              </div>
            ) : (
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <div className="text-[9px] font-black uppercase tracking-[.3em] text-primary/60 mb-1">{car.make}</div>
                <h3 className="font-outfit font-black text-xl text-white tracking-tight leading-tight mb-3">
                  {car.model_full || car.model}
                </h3>
                <div className="flex items-center justify-between">
                  {car.daily_rate ? (
                    <div className="flex items-baseline gap-1">
                      <span className="font-outfit font-black text-2xl text-white italic tracking-tighter">${Number(car.daily_rate)}</span>
                      <span className="text-[9px] font-black uppercase text-white/30">/day</span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-white/30 font-bold uppercase">Contact for pricing</span>
                  )}
                  <div className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 bg-white/10 text-white/40 group-hover:bg-white group-hover:text-black">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </div>
                </div>
              </div>
            )}
          </a>
        ))}
      </div>

      {/* Mobile CTA */}
      {cars.length > 6 && (
        <div className="mt-8 sm:hidden text-center">
          <a
            href={`${base}/fleet`}
            className={`inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] transition-colors px-8 py-3.5 rounded-full border ${
              isLight
                ? 'text-gray-500 hover:text-gray-900 border-gray-300 hover:border-gray-500'
                : 'text-white/70 hover:text-white border-white/25 hover:border-white/50'
            }`}
          >
            See More
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </a>
        </div>
      )}

      <style>{`@keyframes fadeInScale { from { opacity: 0; transform: translateY(20px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }`}</style>
    </section>
  )
}
