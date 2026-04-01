'use client'
import { useState, useMemo } from 'react'
import type { Car } from '@/lib/supabase/types'
import CarDetailView from './CarDetailView'
import BookingWidget from './BookingWidget'

interface Props {
  cars: Car[]
  slug: string
}

export default function FleetGrid({ cars, slug }: Props) {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

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
    <section id="cars" className="max-w-7xl mx-auto px-6 py-12 pb-64">
      {/* Search + filters - Modern Pill Style */}
      <div className="flex flex-col md:flex-row gap-6 mb-24 items-center justify-between sticky top-24 z-[90] py-4 px-6 glass rounded-[2.5rem] border-white/5 mx-auto max-w-4xl shadow-2xl animate-fade-in animation-delay-200">
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
          <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-8 py-3 rounded-2xl text-[9px] font-black uppercase tracking-[.2em] transition-all whitespace-nowrap border ${
                activeCategory === null
                  ? 'bg-white text-black border-white shadow-lg shadow-white/10'
                  : 'bg-white/5 text-white/30 border-white/5 hover:bg-white/10 hover:text-white'
              }`}
            >
              All Models
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
                className={`px-8 py-3 rounded-2xl text-[9px] font-black uppercase tracking-[.2em] whitespace-nowrap transition-all border ${
                  activeCategory === cat
                    ? 'bg-white text-black border-white shadow-lg shadow-white/10'
                    : 'bg-white/5 text-white/30 border-white/5 hover:bg-white/10 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Vertical Detail-First Layout */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-48 space-y-6">
          <div className="w-20 h-20 bg-white/5 rounded-[2.5rem] flex items-center justify-center border border-white/5">
            <svg className="w-8 h-8 text-white/10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-white/20 text-lg font-outfit font-black uppercase tracking-widest italic">No match found.</p>
            <button onClick={() => {setSearch(''); setActiveCategory(null)}} className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-white mt-4 border-b border-primary/20 pb-0.5 transition-all">Reset Collection Filters</button>
          </div>
        </div>
      ) : (
        <div className="space-y-48">
          {filtered.map((car, i) => (
            <article 
              key={car.id} 
              className="relative group pt-24 border-t border-white/5 first:border-0 first:pt-0"
              style={{ animation: `fadeInScale 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards ${i * 0.15}s`, opacity: 0 }}
            >
              <div className="grid lg:grid-cols-12 gap-20 items-start">
                <div className="lg:col-span-8">
                  <CarDetailView car={car} />
                </div>
                <div className="lg:col-span-4 sticky top-48">
                  <div className="relative group/booking">
                     {/* Dynamic Background Flare */}
                    <div className="absolute -z-10 -right-20 -top-20 w-80 h-80 bg-primary/5 rounded-full blur-[120px] opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                    <BookingWidget car={car} />
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <style jsx global>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: translateY(30px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .text-glow { text-shadow: 0 0 15px rgba(255, 255, 255, 0.4); }
      `}</style>
    </section>
  )
}
