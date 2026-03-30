// app/sites/[slug]/[carId]/page.tsx
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Car, Tenant } from '@/lib/supabase/types'

interface Props {
  params: { slug: string; carId: string }
}

function resolveImageUrl(url: string | null): string {
  if (!url) return '/assets/images/placeholder.jpg'
  if (url.startsWith('http')) return url
  return `/${url}`
}

export default async function CarDetailPage({ params }: Props) {
  const supabase = createClient()

  // Verify tenant exists
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, brand_name')
    .eq('slug', params.slug)
    .single()

  if (!tenant) notFound()

  // Load car — must belong to this tenant
  const { data: car } = await supabase
    .from('cars')
    .select('*')
    .eq('id', Number(params.carId))
    .eq('tenant_id', (tenant as Tenant).id)
    .single()

  if (!car) notFound()

  const c = car as Car
  const gallery: string[] = Array.isArray(c.gallery) ? c.gallery : []

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <a href="javascript:history.back()" className="text-white/40 text-sm hover:text-white mb-8 inline-block transition-colors">
        ← Back to fleet
      </a>

      <div className="grid md:grid-cols-2 gap-10 mt-4">
        {/* Gallery */}
        <div className="space-y-3">
          <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-white/5">
            <img
              src={resolveImageUrl(c.image_url)}
              alt={`${c.make} ${c.model}`}
              className="w-full h-full object-cover"
            />
          </div>
          {gallery.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {gallery.slice(0, 4).map((img, i) => (
                <div key={i} className="aspect-square rounded-lg overflow-hidden bg-white/5">
                  <img src={resolveImageUrl(img)} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">
            {c.make} {c.model_full || c.model}
          </h1>
          <div className="flex gap-3 text-sm text-white/50 mb-6">
            {c.year && <span>{c.year}</span>}
            {c.category && <span className="capitalize">{c.category}</span>}
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            {c.seats && (
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-white">{c.seats}</div>
                <div className="text-xs text-white/40">Seats</div>
              </div>
            )}
            {c.transmission && (
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-white">{c.transmission}</div>
                <div className="text-xs text-white/40">Trans.</div>
              </div>
            )}
            {c.hp && (
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-white">{c.hp}</div>
                <div className="text-xs text-white/40">Power</div>
              </div>
            )}
          </div>

          {c.description && (
            <p className="text-white/60 text-sm leading-relaxed mb-6">{c.description}</p>
          )}

          <div className="flex items-baseline gap-2 mb-6">
            <span className="text-4xl font-bold text-white">
              ${c.daily_rate ? Number(c.daily_rate).toFixed(0) : '—'}
            </span>
            <span className="text-white/40">/ day</span>
          </div>

          {/* Booking CTA — links to existing reservation flow */}
          <a
            href={`/reservation.html?car=${c.id}`}
            className="block w-full text-center bg-white text-black font-semibold py-4 rounded-xl hover:bg-white/90 transition-colors"
          >
            Book this car →
          </a>
        </div>
      </div>
    </div>
  )
}
