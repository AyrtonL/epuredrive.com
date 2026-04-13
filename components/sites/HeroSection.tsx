import type { Tenant } from '@/lib/supabase/types'

interface Props {
  tenant: Tenant
  carCount: number
}

export default function HeroSection({ tenant, carCount }: Props) {
  const displayName = tenant.brand_name || tenant.name
  const tagline = tenant.tagline || 'Premium Vehicles, Direct Booking.'
  const description = tenant.description || `Browse ${carCount} vehicle${carCount !== 1 ? 's' : ''} available from ${displayName}. No platform fees, no hidden costs — book directly.`

  return (
    <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
      {/* Background */}
      {tenant.hero_image_url ? (
        <>
          <img
            src={tenant.hero_image_url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#040404]/70 via-[#040404]/50 to-[#040404]" />
        </>
      ) : (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-[#040404] via-[#0a0a0a] to-[#040404]" />
          <div className="absolute left-1/2 top-1/3 -translate-x-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[200px] pointer-events-none" />
        </>
      )}

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center py-32">
        <p className="text-[10px] font-black uppercase tracking-[.5em] text-primary/60 mb-6 animate-fade-in">
          {displayName}
        </p>

        <h1 className="font-outfit font-black text-5xl sm:text-6xl lg:text-7xl text-white leading-[0.95] tracking-tight mb-6 animate-fade-in animation-delay-100">
          {tagline}
        </h1>

        <p className="text-white/40 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed mb-10 animate-fade-in animation-delay-200">
          {description}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in animation-delay-300">
          <a
            href="#search"
            className="bg-white text-black font-black uppercase tracking-[.2em] text-[11px] px-10 py-4 rounded-full hover:bg-primary hover:text-white hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/5"
          >
            Browse Fleet
          </a>
          <a
            href="#concierge"
            className="border border-white/10 text-white/60 font-black uppercase tracking-[.2em] text-[11px] px-10 py-4 rounded-full hover:border-white/30 hover:text-white transition-all"
          >
            Contact Us
          </a>
        </div>

        {/* Quick stats */}
        <div className="mt-16 flex justify-center gap-12 animate-fade-in animation-delay-400">
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
      </div>
    </section>
  )
}
