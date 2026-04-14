'use client'
import { useState, useMemo } from 'react'
import { usePathname } from 'next/navigation'
import type { Car, PickupLocation } from '@/lib/supabase/types'

interface Props {
  cars: Car[]
  slug: string
  tenantId: string
  pickupLocations?: PickupLocation[]
  whatsappPhone?: string | null
}

function resolveImageUrl(url: string | null): string {
  if (!url) return '/assets/images/placeholder.jpg'
  if (url.startsWith('http')) return url
  return `/${url}`
}

export default function FleetGrid({ cars, slug }: Props) {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const pathname = usePathname()
  const base = pathname.startsWith('/sites/') ? `/sites/${slug}` : ''

  const categories = useMemo(() => {
    const seen = new Set<string>()
    for (const car of cars) {
      if (car.category) seen.add(car.category)
    }
    return Array.from(seen).sort()
  }, [cars])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return cars.filter((car) => {
      const matchesSearch =
        !q ||
        car.make.toLowerCase().includes(q) ||
        car.model.toLowerCase().includes(q) ||
        (car.model_full?.toLowerCase().includes(q) ?? false)
      const matchesCategory = !activeCategory || car.category === activeCategory
      return matchesSearch && matchesCategory
    })
  }, [cars, search, activeCategory])

  return (
    <section id="cars" className="max-w-7xl mx-auto px-6 pb-32">
      {/* Search + category filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-10 items-center justify-between sticky top-24 z-[90] py-4 px-6 bg-[#040404]/80 backdrop-blur-xl rounded-[2rem] border border-white/5 shadow-2xl">
        <div className="relative flex-1 w-full">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="search"
            placeholder="Search our collection..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/5 rounded-2xl pl-11 pr-4 py-3.5 text-xs font-black uppercase tracking-widest text-white placeholder-white/10 focus:outline-none focus:ring-1 focus:ring-white/10 transition-all font-outfit"
          />
        </div>

        {categories.length > 0 && (
          <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-[.2em] transition-all whitespace-nowrap border ${
                activeCategory === null
                  ? 'bg-white text-black border-white shadow-lg'
                  : 'bg-white/5 text-white/30 border-white/5 hover:bg-white/10 hover:text-white'
              }`}
            >
              All Models
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
                className={`px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-[.2em] whitespace-nowrap transition-all border ${
                  activeCategory === cat
                    ? 'bg-white text-black border-white shadow-lg'
                    : 'bg-white/5 text-white/30 border-white/5 hover:bg-white/10 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results count */}
      {filtered.length > 0 && (
        <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-6">
          {filtered.length} vehicle{filtered.length === 1 ? '' : 's'}
        </p>
      )}

      {/* Card Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-40 space-y-6">
          <div className="w-20 h-20 bg-white/5 rounded-[2.5rem] flex items-center justify-center border border-white/5">
            <svg className="w-8 h-8 text-white/10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-white/20 text-lg font-outfit font-black uppercase tracking-widest italic">No match found.</p>
            <button
              onClick={() => { setSearch(''); setActiveCategory(null) }}
              className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-white mt-4 border-b border-primary/20 pb-0.5 transition-all"
            >
              Reset Filters
            </button>
          </div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((car, i) => (
            <a
              key={car.id}
              href={`${base}/${car.id}`}
              className="group relative rounded-[2rem] overflow-hidden border border-white/5 hover:border-white/15 transition-all duration-500 bg-white/[0.02] hover:bg-white/[0.04]"
              style={{ animation: `fadeInCard 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards ${i * 0.05}s`, opacity: 0 }}
            >
              {/* Image */}
              <div className="aspect-[16/10] overflow-hidden">
                <img
                  src={resolveImageUrl(car.image_url)}
                  alt={`${car.make} ${car.model}`}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#040404] via-[#040404]/20 to-transparent opacity-90" />
              </div>

              {/* Badge */}
              {(car.badge || car.category) && (
                <div className="absolute top-4 left-4 px-3 py-1 bg-white/90 text-black text-[8px] font-black uppercase tracking-[.2em] rounded-full">
                  {car.badge || car.category}
                </div>
              )}

              {/* Info */}
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <div className="text-[9px] font-black uppercase tracking-[.3em] text-primary/60 mb-0.5">{car.make}</div>
                <h3 className="font-outfit font-black text-lg text-white tracking-tight leading-tight mb-3">
                  {car.model_full || car.model}
                </h3>
                <div className="flex items-center justify-between">
                  {car.daily_rate ? (
                    <div className="flex items-baseline gap-1">
                      <span className="font-outfit font-black text-xl text-white italic tracking-tighter">${Number(car.daily_rate)}</span>
                      <span className="text-[9px] font-black uppercase text-white/30">/day</span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-white/30 font-bold uppercase">Contact for pricing</span>
                  )}
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-black text-white/40 transition-all duration-300">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}

      <style jsx global>{`
        @keyframes fadeInCard {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </section>
  )
}
