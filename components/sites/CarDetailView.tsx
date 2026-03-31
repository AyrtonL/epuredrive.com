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
    <div className="grid md:grid-cols-2 gap-10 mt-4">
      {/* Gallery */}
      <div className="space-y-3">
        <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-white/5">
          <img
            src={resolveImageUrl(gallery[activeIndex] ?? null)}
            alt={`${car.make} ${car.model}`}
            className="w-full h-full object-cover transition-opacity duration-300"
          />
        </div>
        {gallery.length > 1 && (
          <div className="grid grid-cols-4 gap-2">
            {gallery.slice(0, 8).map((img, i) => (
              <button
                key={i}
                onClick={() => setActiveIndex(i)}
                className={`aspect-square rounded-lg overflow-hidden bg-white/5 ring-2 transition-all ${
                  activeIndex === i ? 'ring-white' : 'ring-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <img src={resolveImageUrl(img)} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-1">
          {car.make} {car.model_full || car.model}
        </h1>
        <div className="flex gap-3 text-sm text-white/50 mb-6">
          {car.year && <span>{car.year}</span>}
          {car.category && <span className="capitalize">{car.category}</span>}
          {car.badge && (
            <span className="text-xs font-semibold text-black bg-white px-2 py-0.5 rounded-full">
              {car.badge}
            </span>
          )}
        </div>

        {/* Specs grid */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {car.seats && (
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <div className="text-lg font-bold text-white">{car.seats}</div>
              <div className="text-xs text-white/40">Seats</div>
            </div>
          )}
          {car.transmission && (
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <div className="text-lg font-bold text-white">{car.transmission}</div>
              <div className="text-xs text-white/40">Trans.</div>
            </div>
          )}
          {car.hp && (
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <div className="text-lg font-bold text-white">{car.hp}</div>
              <div className="text-xs text-white/40">Power</div>
            </div>
          )}
        </div>

        {/* Features */}
        {Array.isArray(car.features) && car.features.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-3">Features</h2>
            <ul className="flex flex-wrap gap-2">
              {car.features.map((f, i) => (
                <li key={i} className="text-xs bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white/70">
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}

        {car.description && (
          <p className="text-white/60 text-sm leading-relaxed mb-6">{car.description}</p>
        )}

        <div className="flex items-baseline gap-2 mb-6">
          <span className="text-4xl font-bold text-white">
            ${car.daily_rate ? Number(car.daily_rate).toFixed(0) : '—'}
          </span>
          <span className="text-white/40">/ day</span>
        </div>

        <a
          href={`/reservation.html?car=${car.id}`}
          className="block w-full text-center bg-white text-black font-semibold py-4 rounded-xl hover:bg-white/90 transition-colors"
        >
          Book this car →
        </a>
      </div>
    </div>
  )
}
