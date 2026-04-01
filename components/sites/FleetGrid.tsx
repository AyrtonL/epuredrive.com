'use client'
import { useState, useMemo } from 'react'
import type { Car } from '@/lib/supabase/types'
import CarCard from '@/components/CarCard'
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
    <section id="cars" className="max-w-6xl mx-auto px-6 py-12">
      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <input
          type="search"
          placeholder="Search vehicles…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-white/30"
        />
        {categories.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                activeCategory === null
                  ? 'bg-white text-black'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
                className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-colors ${
                  activeCategory === cat
                    ? 'bg-white text-black'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="text-white/40 text-center py-16">No vehicles match your search.</p>
      ) : (
        <div className="flex flex-col gap-24">
          {filtered.map((car) => (
            <div key={car.id} className="grid lg:grid-cols-3 gap-10 lg:gap-16 pt-16 border-t border-white/10 first:border-0 first:pt-0">
              <div className="lg:col-span-2">
                <CarDetailView car={car} />
              </div>
              <div className="lg:col-span-1">
                <BookingWidget car={car} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
