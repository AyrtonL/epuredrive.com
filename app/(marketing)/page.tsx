// app/(marketing)/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'éPure Drive — Premium Fleet Software for Car Rental Businesses',
}

const FEATURES = [
  {
    title: 'Branded Fleet Page',
    description: 'Your own premium page showcasing your vehicles — live in minutes, no code needed.',
  },
  {
    title: 'Smart Booking System',
    description: 'Automated availability, confirmations, and calendar sync with Turo and iCal.',
  },
  {
    title: 'Finance & ROI',
    description: 'Track revenue, expenses, and profitability per vehicle in real time.',
  },
  {
    title: 'Fleet Management',
    description: 'Maintenance schedules, service history, and vehicle status at a glance.',
  },
  {
    title: 'Client Management',
    description: 'Full customer records, rental history, and consignment tracking.',
  },
  {
    title: 'Team Access',
    description: 'Role-based access for staff, finance teams, and managers.',
  },
]

export default function HomePage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-background -z-20" />
        <div className="absolute inset-0 bg-hero-glow opacity-50 -z-10" />
        {/* Subtle horizontal line */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <div className="max-w-5xl mx-auto px-6 py-28 text-center z-10">
          <span className="inline-block text-[11px] font-bold tracking-[0.25em] text-white/40 uppercase mb-10 animate-fade-in">
            Miami-based · Car Rental Platform
          </span>
          <h1 className="text-5xl md:text-7xl font-extrabold text-white leading-[1.05] mb-8 tracking-tight animate-fade-in-up">
            Smart technology.<br />
            <span className="text-white/50">Premium fleet experience.</span>
          </h1>
          <p className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto mb-14 animate-fade-in-up animation-delay-100 font-light leading-relaxed">
            éPure Drive streamlines operations, elevates the customer journey, and sets a new standard for how rental businesses are run.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up animation-delay-200">
            <Link
              href="/sign-up"
              className="bg-white text-black font-semibold px-10 py-4 rounded-xl text-base hover:bg-white/90 active:scale-95 transition-all shadow-[0_0_30px_rgba(255,255,255,0.15)] hover:shadow-[0_0_40px_rgba(255,255,255,0.25)]"
            >
              Get started free
            </Link>
            <a
              href={`https://${process.env.EPUREDRIVE_TENANT_SLUG || 'demo'}.epuredrive.com`}
              target="_blank"
              rel="noopener noreferrer"
              className="glass text-white/80 font-semibold px-10 py-4 rounded-xl text-base hover:text-white hover:bg-white/5 transition-all"
            >
              See live demo →
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-32 bg-surface/20" id="features">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-20 animate-fade-in">
            <span className="text-[11px] font-bold tracking-[0.25em] text-white/30 uppercase block mb-4">Platform</span>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-5 tracking-tight">
              Everything you need to run your fleet
            </h2>
            <p className="text-lg text-white/40 font-light max-w-xl mx-auto">
              One platform. Zero compromise.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-white/[0.06] rounded-2xl overflow-hidden">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="bg-background p-8 hover:bg-surface/30 transition-colors duration-300 group"
              >
                <h3 className="text-white font-semibold mb-3 text-lg group-hover:text-white transition-colors">
                  {feature.title}
                </h3>
                <p className="text-white/45 text-sm leading-relaxed font-light">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="relative py-32 bg-background" id="pricing">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-20 animate-fade-in">
            <span className="text-[11px] font-bold tracking-[0.25em] text-white/30 uppercase block mb-4">Pricing</span>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-5 tracking-tight">Simple pricing</h2>
            <p className="text-lg text-white/40 font-light">Start free. Upgrade when you demand more.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 lg:gap-10 max-w-3xl mx-auto">
            {/* Free plan */}
            <div className="glass rounded-2xl p-10 text-left relative overflow-hidden group hover:border-white/15 transition-all duration-500">
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-white/10 to-transparent" />
              <div className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-6">Starter</div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-5xl font-extrabold text-white tracking-tight">$0</span>
              </div>
              <div className="text-white/30 text-sm mb-10">forever</div>

              <ul className="space-y-3.5 text-sm text-white/55 mb-10 font-light">
                <li className="flex items-center gap-3"><span className="text-white/70 text-xs">✓</span> 1 Premium branded page</li>
                <li className="flex items-center gap-3"><span className="text-white/70 text-xs">✓</span> Up to 5 vehicles</li>
                <li className="flex items-center gap-3"><span className="text-white/70 text-xs">✓</span> {'{slug}'}.epuredrive.com</li>
                <li className="flex items-center gap-3"><span className="text-white/70 text-xs">✓</span> Live availability calendar</li>
              </ul>

              <Link
                href="/sign-up"
                className="block text-center bg-white text-black font-semibold px-6 py-3.5 rounded-xl text-sm hover:bg-white/90 transition-colors"
              >
                Launch your business
              </Link>
            </div>

            {/* Pro plan */}
            <div className="glass rounded-2xl p-10 text-left relative overflow-hidden group border-white/15 hover:border-white/25 transition-all duration-500">
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-white/30 to-white/5" />
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-black text-[10px] font-bold px-3 py-1 rounded-full tracking-widest uppercase">
                Coming Soon
              </div>
              <div className="text-[11px] font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                Pro <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              </div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-5xl font-extrabold text-white tracking-tight">$49</span>
              </div>
              <div className="text-white/30 text-sm mb-10">/ month</div>

              <ul className="space-y-3.5 text-sm text-white/55 mb-10 font-light">
                <li className="flex items-center gap-3"><span className="text-white/70 text-xs">✓</span> Everything in Starter</li>
                <li className="flex items-center gap-3"><span className="text-white/70 text-xs">✓</span> Unlimited vehicles</li>
                <li className="flex items-center gap-3"><span className="text-white/70 text-xs">✓</span> Connect custom domain</li>
                <li className="flex items-center gap-3"><span className="text-white/70 text-xs">✓</span> Deep brand customization</li>
                <li className="flex items-center gap-3"><span className="text-white/70 text-xs">✓</span> Zero-fee Stripe payments</li>
              </ul>

              <button
                disabled
                className="w-full text-center bg-white/5 text-white/25 font-semibold px-6 py-3.5 rounded-xl text-sm cursor-not-allowed border border-white/5"
              >
                Join waitlist
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-24 bg-background border-t border-white/[0.06]">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-5 tracking-tight">
            Ready to elevate your rental business?
          </h2>
          <p className="text-white/40 mb-10 font-light text-lg">
            Join operators running their fleet on éPure Drive.
          </p>
          <Link
            href="/sign-up"
            className="inline-block bg-white text-black font-semibold px-10 py-4 rounded-xl text-base hover:bg-white/90 active:scale-95 transition-all shadow-[0_0_30px_rgba(255,255,255,0.1)]"
          >
            Start for free
          </Link>
          <p className="mt-6 text-white/25 text-sm">
            info@epuredrive.com · Aventura, Florida
          </p>
        </div>
      </section>
    </>
  )
}
