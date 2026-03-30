// components/CarCard.tsx
import type { Car } from '@/lib/supabase/types'

interface Props {
  car: Car
  slug: string
}

function resolveImageUrl(url: string | null): string {
  if (!url) return '/assets/images/placeholder.jpg'
  // DB stores relative paths like "assets/images/..." — prefix with /
  if (url.startsWith('http')) return url
  return `/${url}`
}

export default function CarCard({ car, slug }: Props) {
  return (
    <a
      href={`/_sites/${slug}/${car.id}`}
      className="group block bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all hover:-translate-y-1"
    >
      <div className="aspect-[16/9] overflow-hidden bg-white/5">
        <img
          src={resolveImageUrl(car.image_url)}
          alt={`${car.make} ${car.model}`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>
      <div className="p-5">
        {car.badge && (
          <span className="inline-block text-xs font-semibold text-black bg-white px-2 py-0.5 rounded-full mb-2">
            {car.badge}
          </span>
        )}
        <h3 className="font-bold text-white text-lg leading-tight">
          {car.make} {car.model_full || car.model}
        </h3>
        <div className="flex gap-3 text-xs text-white/50 mt-1 mb-3">
          {car.year && <span>{car.year}</span>}
          {car.seats && <span>{car.seats} seats</span>}
          {car.transmission && <span>{car.transmission}</span>}
        </div>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xl font-bold text-white">
              ${car.daily_rate ? Number(car.daily_rate).toFixed(0) : '—'}
            </span>
            <span className="text-white/40 text-sm"> / day</span>
          </div>
          <span className="text-xs font-semibold text-white bg-white/10 px-3 py-1.5 rounded-lg group-hover:bg-white/20 transition-colors">
            View →
          </span>
        </div>
      </div>
    </a>
  )
}
