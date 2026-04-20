import type { Car, Tenant } from '@/lib/supabase/types'
import { DEFAULT_EXPERIENCE_PILLARS } from '@/lib/constants/experience-pillars'

interface Props {
  cars: Car[]
  tenant: Tenant
}

const PILLAR_ICONS = [
  // Checkmark circle
  <svg key="check" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>,
  // Clock
  <svg key="clock" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>,
  // Banknotes
  <svg key="cash" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
  </svg>,
]

export default function ExperienceSection({ cars, tenant }: Props) {
  const displayName = tenant.brand_name || tenant.name
  const isLight = tenant.site_theme === 'light'

  const pillars =
    tenant.experience_pillars?.length === 3
      ? tenant.experience_pillars
      : DEFAULT_EXPERIENCE_PILLARS

  const validRates = cars.map(c => Number(c.daily_rate) || 0).filter(r => r > 0)
  const lowestRate = validRates.length > 0 ? Math.min(...validRates) : 0
  const turoRate = lowestRate > 0 ? Math.round(lowestRate * 1.28) : 0
  const savings = turoRate - lowestRate

  const stats = [
    { value: String(cars.length), label: 'Vehicles Available' },
    { value: lowestRate > 0 ? `$${lowestRate}` : '—', label: 'Starting / Day' },
    { value: '24/7', label: 'Concierge Support' },
    { value: '100%', label: 'Verified Fleet' },
  ]

  return (
    <section id="experience" className="relative overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.02] to-transparent pointer-events-none" />
      <div className="absolute left-1/3 top-1/4 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[180px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 py-40 relative z-10">

        {/* ── Header ── */}
        <div className="mb-24 max-w-2xl">
          <p className="text-[10px] font-black uppercase tracking-[.4em] text-primary/60 mb-4">The Experience</p>
          <h2 className={`font-outfit font-black text-5xl sm:text-6xl leading-none tracking-tight mb-6 ${isLight ? 'text-gray-900' : 'text-white'}`}>
            Beyond the<br />
            <span className={`italic ${isLight ? 'text-gray-400' : 'text-charcoal'}`}>ordinary rental.</span>
          </h2>
          <p className={`text-base leading-relaxed max-w-lg ${isLight ? 'text-gray-600' : 'text-charcoal'}`}>
            {displayName} redefines what it means to rent. Every interaction is curated — from the first message to the final mile.
          </p>
        </div>

        {/* ── Stats row ── */}
        <div className={`grid grid-cols-2 md:grid-cols-4 gap-px rounded-3xl overflow-hidden mb-24 ${isLight ? 'bg-gray-200' : 'bg-white/5'}`}>
          {stats.map((s) => (
            <div key={s.label} className={`px-8 py-10 flex flex-col gap-2 ${isLight ? 'bg-white' : 'bg-[#040404]'}`}>
              <span className={`font-outfit font-black text-4xl tracking-tighter italic ${isLight ? 'text-gray-900' : 'text-white'}`}>{s.value}</span>
              <span className={`text-[9px] font-black uppercase tracking-[.3em] ${isLight ? 'text-gray-400' : 'text-white/25'}`}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* ── 3 pillars ── */}
        <div className="grid md:grid-cols-3 gap-6 mb-32">
          {pillars.map((p, i) => (
            <div key={p.title} className={`group rounded-[2rem] p-10 transition-all duration-500 ${
              isLight
                ? 'bg-white border border-gray-200 hover:border-gray-300 shadow-sm'
                : 'glass border border-white/[0.09] hover:border-white/[0.16]'
            }`}>
              <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-8 group-hover:bg-primary/20 transition-colors">
                {PILLAR_ICONS[i]}
              </div>
              <h3 className={`font-outfit font-black text-lg mb-3 tracking-tight ${isLight ? 'text-gray-900' : 'text-white'}`}>{p.title}</h3>
              <p className={`text-sm leading-relaxed ${isLight ? 'text-gray-600' : 'text-charcoal'}`}>{p.body}</p>
            </div>
          ))}
        </div>

        {/* ── Rate comparison vs Turo ── */}
        {lowestRate > 0 && (
          <div className="mb-32">
            <p className="text-[10px] font-black uppercase tracking-[.4em] text-primary/60 mb-4">Rate Comparison</p>
            <h3 className={`font-outfit font-black text-3xl mb-12 tracking-tight ${isLight ? 'text-gray-900' : 'text-white'}`}>
              Direct beats platform — every time.
            </h3>

            <div className="grid md:grid-cols-3 gap-4 max-w-3xl">
              {/* Direct rate */}
              <div className={`rounded-[2rem] p-8 relative overflow-hidden ${
                isLight
                  ? 'bg-white border border-gray-200 shadow-sm'
                  : 'glass border border-white/10'
              }`}>
                <div className="absolute top-4 right-4">
                  <span className="text-[8px] font-black uppercase tracking-widest bg-primary/20 text-primary border border-primary/30 rounded-full px-3 py-1">Best Value</span>
                </div>
                <p className={`text-[9px] font-black uppercase tracking-widest mb-4 ${isLight ? 'text-gray-500' : 'text-charcoal'}`}>Direct Booking</p>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className={`font-outfit font-black text-4xl italic tracking-tighter ${isLight ? 'text-gray-900' : 'text-white'}`}>${lowestRate}</span>
                  <span className={`text-[10px] font-black uppercase ${isLight ? 'text-gray-500' : 'text-charcoal'}`}>/day</span>
                </div>
                <p className={`text-[10px] font-black uppercase tracking-widest ${isLight ? 'text-gray-500' : 'text-charcoal'}`}>No platform fees</p>
              </div>

              {/* Turo equivalent */}
              <div className={`rounded-[2rem] p-8 opacity-60 ${
                isLight
                  ? 'bg-gray-50 border border-gray-200'
                  : 'glass border border-white/5'
              }`}>
                <p className={`text-[9px] font-black uppercase tracking-widest mb-4 ${isLight ? 'text-gray-500' : 'text-charcoal'}`}>Turo Platform</p>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className={`font-outfit font-black text-4xl italic tracking-tighter line-through ${isLight ? 'text-gray-400' : 'text-grey'}`}>${turoRate}</span>
                  <span className={`text-[10px] font-black uppercase ${isLight ? 'text-gray-400' : 'text-white/20'}`}>/day</span>
                </div>
                <p className={`text-[10px] font-black uppercase tracking-widest ${isLight ? 'text-gray-500' : 'text-charcoal'}`}>~28% guest service fee</p>
              </div>

              {/* Savings */}
              <div className={`rounded-[2rem] p-8 bg-primary/5 border border-primary/20 ${
                isLight ? '' : 'glass'
              }`}>
                <p className="text-[9px] font-black uppercase tracking-widest text-primary/60 mb-4">You Save</p>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="font-outfit font-black text-4xl text-primary italic tracking-tighter">${savings}</span>
                  <span className="text-[10px] text-primary/60 font-black uppercase">/day</span>
                </div>
                <p className={`text-[10px] font-black uppercase tracking-widest ${isLight ? 'text-gray-500' : 'text-charcoal'}`}>Direct advantage</p>
              </div>
            </div>

            <p className={`text-[10px] mt-6 max-w-md ${isLight ? 'text-gray-400' : 'text-white/20'}`}>
              * Turo guest service fee varies 10–28% depending on trip value. Comparison based on starting daily rate.
            </p>
          </div>
        )}

        {/* ── Pickup locations ── */}
        {tenant.pickup_locations && tenant.pickup_locations.length > 0 && (
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.4em] text-primary/60 mb-4">Pickup &amp; Delivery</p>
            <h3 className={`font-outfit font-black text-3xl mb-12 tracking-tight ${isLight ? 'text-gray-900' : 'text-white'}`}>
              We come to you.
            </h3>

            <div className="grid md:grid-cols-3 gap-4">
              {tenant.pickup_locations.map((loc) => (
                <a
                  key={loc.label}
                  href={`https://www.google.com/maps/search/?api=1&query=${loc.maps_query}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`group rounded-[2rem] p-8 transition-all duration-500 block ${
                    isLight
                      ? 'bg-white border border-gray-200 hover:border-gray-300 shadow-sm'
                      : 'glass border border-white/[0.09] hover:border-white/[0.18]'
                  }`}
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center group-hover:bg-primary/10 group-hover:border-primary/20 transition-all ${
                      isLight
                        ? 'bg-gray-100 border-gray-200'
                        : 'bg-white/5 border-white/10'
                    }`}>
                      <svg className={`w-5 h-5 group-hover:text-primary transition-colors ${isLight ? 'text-gray-400' : 'text-charcoal'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                      </svg>
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${
                      loc.fee === 0
                        ? 'text-primary border-primary/20 bg-primary/10'
                        : isLight
                          ? 'text-gray-400 border-gray-200 bg-gray-50'
                          : 'text-white/30 border-white/10 bg-white/5'
                    }`}>
                      {loc.fee === 0 ? 'Free' : `$${loc.fee}`}
                    </span>
                  </div>
                  <h4 className={`font-outfit font-black text-lg mb-1 tracking-tight ${isLight ? 'text-gray-900' : 'text-white'}`}>{loc.label}</h4>
                  <p className={`text-[11px] font-bold mb-2 ${isLight ? 'text-gray-600' : 'text-charcoal'}`}>{loc.address}</p>
                  <p className={`text-[10px] font-black uppercase tracking-widest ${isLight ? 'text-gray-400' : 'text-white/20'}`}>{loc.note}</p>

                  <div className={`mt-6 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest group-hover:text-primary/60 transition-colors ${isLight ? 'text-gray-400' : 'text-white/20'}`}>
                    <span>View on Google Maps</span>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

      </div>
    </section>
  )
}
