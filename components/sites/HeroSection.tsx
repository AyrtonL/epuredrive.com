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

  return (
    <section className="relative min-h-screen flex items-center justify-center">
      {/* Background image + overlays — clipped independently so the calendar popup can escape */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <img
          src={bgImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#040404]/75 via-[#040404]/55 to-[#040404]" />
        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#040404] to-transparent" />
      </div>

      <div className="relative z-10 w-full max-w-5xl mx-auto px-6 text-center pt-16 pb-24">
        <div className="inline-flex items-center gap-2.5 bg-white/[0.07] border border-white/[0.12] rounded-full px-4 py-2 mb-8 animate-fade-in">
          <span className="w-1.5 h-1.5 rounded-full bg-primary/70 flex-shrink-0" />
          <span className="text-[10px] font-black uppercase tracking-[.3em] text-white/60">{displayName}</span>
        </div>

        <h1 className="font-outfit font-black text-5xl sm:text-6xl lg:text-7xl text-white leading-[0.95] tracking-tight mb-6 animate-fade-in animation-delay-100">
          {tagline}
        </h1>

        <p className="text-white/50 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed mb-10 animate-fade-in animation-delay-200">
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
              <div className="font-outfit font-black text-2xl text-white italic tracking-tighter">{s.value}</div>
              <div className="text-[8px] font-black uppercase tracking-[.3em] text-white/20 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Search bar — primary CTA; relative z-10 ensures this stacking context beats the animated buttons sibling below */}
        <div className="animate-fade-in animation-delay-400 mb-8 relative z-10">
          <QuickSearchBar slug={slug} locations={locations} inline />
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in animation-delay-500">
          <a
            href="#fleet"
            className="bg-white text-black font-black uppercase tracking-[.2em] text-[11px] px-10 py-4 rounded-full hover:bg-black hover:text-white hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/5 border border-transparent hover:border-white/20"
          >
            Browse Fleet
          </a>
          <a
            href="#concierge"
            className="border border-white/30 text-white font-black uppercase tracking-[.2em] text-[11px] px-10 py-4 rounded-full hover:border-white hover:bg-white/10 transition-all"
          >
            Contact Us
          </a>
        </div>
      </div>
    </section>
  )
}
