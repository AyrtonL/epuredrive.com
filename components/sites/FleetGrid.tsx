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
    <section id="cars" className="max-w-7xl mx-auto px-6 py-12 pb-32">
      {/* Search + filters - Modern Pill Style */}
      <div className="flex flex-col md:flex-row gap-6 mb-16 items-center justify-between sticky top-4 z-50 py-4 px-6 glass rounded-[2rem] border-white/5 mx-auto max-w-4xl shadow-2xl">
        <div className="relative flex-1 w-full">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="search"
            placeholder="Search our luxury fleet..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/5 rounded-2xl pl-11 pr-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-white/10 transition-all"
          />
        </div>
        
        {categories.length > 0 && (
          <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${
                activeCategory === null
                  ? 'bg-white text-black border-white shadow-lg shadow-white/10'
                  : 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10 hover:text-white'
              }`}
            >
              All Models
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
                className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${
                  activeCategory === cat
                    ? 'bg-white text-black border-white shadow-lg shadow-white/10'
                    : 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10 hover:text-white'
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
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <p className="text-white/30 text-lg font-medium italic">No vehicles available matching your preference.</p>
          <button onClick={() => {setSearch(''); setActiveCategory(null)}} className="text-sm text-white underline underline-offset-4 opacity-50 hover:opacity-100 transition-opacity">Clear all filters</button>
        </div>
      ) : (
        <div className="space-y-32">
          {filtered.map((car, i) => (
            <div 
              key={car.id} 
              className="relative group pt-16 border-t border-white/5 first:border-0 first:pt-0"
              style={{ animation: `fadeInUp 0.8s ease-out forwards ${i * 0.1}s`, opacity: 0 }}
            >
              <div className="grid lg:grid-cols-12 gap-16 items-start">
                <div className="lg:col-span-8">
                  <CarDetailView car={car} />
                </div>
                <div className="lg:col-span-4 sticky top-32">
                  <div className="relative">
                     {/* Floating background bloob */}
                    <div className="absolute -z-10 -right-20 -top-20 w-64 h-64 bg-primary/5 rounded-full blur-[100px] opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                    <BookingWidget car={car} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx global>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </section>
  )
}
