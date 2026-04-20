import Image from 'next/image'
import type { Tenant, PickupLocation } from '@/lib/supabase/types'
import QuickSearchBar from './QuickSearchBar'

interface Props {
  tenant: Tenant
  carCount: number
  slug: string
  locations: PickupLocation[]
}

export default function HeroSection({ tenant, carCount, slug, locations }: Props) {
  const displayName = tenant.brand_name || tenant.name
  const tagline = tenant.tagline || 'Premium Vehicles, Direct Booking.'
  const description = tenant.description || `Browse ${carCount} vehicle${carCount !== 1 ? 's' : ''} available from ${displayName}. No platform fees, no hidden costs — book directly.`

  const bgImage = tenant.hero_image_url || '/assets/images/Imagenes/kenny-sabugo-wErZFb01-5o-unsplash.jpg'
  const isLight = tenant.site_theme === 'light'

  return (
    <section className="relative min-h-screen flex items-center justify-center">
      {/* Background image + overlays — clipped independently so the calendar popup can escape */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <Image
          src={bgImage}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        {/* Overlay */}
        <div className={`absolute inset-0 ${
          isLight
            ? 'bg-gradient-to-b from-white/40 via-white/60 to-[#FAFAFA]'
            : 'bg-gradient-to-b from-[#040404]/75 via-[#040404]/55 to-[#040404]'
        }`} />
        {/* Bottom fade */}
        <div className={`absolute bottom-0 left-0 right-0 h-32 ${
          isLight
            ? 'bg-gradient-to-t from-[#FAFAFA] to-transparent'
            : 'bg-gradient-to-t from-[#040404] to-transparent'
        }`} />
      </div>

      <div className="relative z-10 w-full max-w-5xl mx-auto px-6 text-center pt-16 pb-24">
        <div className={`inline-flex items-center gap-2.5 rounded-full px-4 py-2 mb-8 animate-fade-in ${
          isLight
            ? 'bg-gray-900/[0.06] border border-gray-900/[0.10]'
            : 'bg-white/[0.07] border border-white/[0.12]'
        }`}>
          <span className="w-1.5 h-1.5 rounded-full bg-primary/70 flex-shrink-0" />
          <span className={`text-[10px] font-black uppercase tracking-[.3em] ${isLight ? 'text-gray-600' : 'text-silver'}`}>{displayName}</span>
        </div>

        <h1 className={`font-outfit font-black text-5xl sm:text-6xl lg:text-7xl leading-[0.95] tracking-tight mb-6 animate-fade-in animation-delay-100 ${
          isLight ? 'text-gray-900' : 'text-white'
        }`}>
          {tagline}
        </h1>

        <p className={`text-base sm:text-lg max-w-2xl mx-auto leading-relaxed mb-10 animate-fade-in animation-delay-200 ${
          isLight ? 'text-gray-600' : 'text-grey'
        }`}>
          {description}
        </p>

        {/* Quick stats */}
        <div className="mb-12 flex justify-center gap-12 animate-fade-in animation-delay-300">
          {[
            { value: String(carCount), label: 'Vehicles' },
            { value: '24/7', label: 'Support' },
            { value: '0%', label: 'Platform Fees' },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className={`font-outfit font-black text-2xl italic tracking-tighter ${isLight ? 'text-gray-900' : 'text-white'}`}>{s.value}</div>
              <div className={`text-[8px] font-black uppercase tracking-[.3em] mt-1 ${isLight ? 'text-gray-400' : 'text-white/20'}`}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Search bar — primary CTA; relative z-10 ensures this stacking context beats the animated buttons sibling below */}
        <div className="animate-fade-in animation-delay-400 mb-8 relative z-10">
          <QuickSearchBar slug={slug} locations={locations} inline theme={isLight ? 'light' : 'dark'} />
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in animation-delay-500">
          <a
            href="#fleet"
            className={`font-black uppercase tracking-[.2em] text-[11px] px-10 py-4 rounded-full hover:scale-105 active:scale-95 transition-all shadow-xl border ${
              isLight
                ? 'bg-gray-900 text-white hover:bg-gray-700 shadow-gray-900/10 border-transparent'
                : 'bg-white text-black hover:bg-black hover:text-white shadow-white/5 border-transparent hover:border-white/20'
            }`}
          >
            Browse Fleet
          </a>
          <a
            href="#concierge"
            className={`font-black uppercase tracking-[.2em] text-[11px] px-10 py-4 rounded-full transition-all border ${
              isLight
                ? 'border-gray-300 text-gray-700 hover:border-gray-900 hover:bg-gray-100'
                : 'border-white/30 text-white hover:border-white hover:bg-white/10'
            }`}
          >
            Contact Us
          </a>
        </div>
      </div>
    </section>
  )
}
