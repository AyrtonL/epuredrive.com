// app/(marketing)/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'

export const metadata: Metadata = {
  title: 'éPure Drive — Premium Fleet Software for Car Rental Businesses',
}

const FEATURES = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3" />
      </svg>
    ),
    title: 'Branded Fleet Page',
    description: 'Your own premium page showcasing your vehicles — live in minutes, no code needed.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
    title: 'Smart Booking System',
    description: 'Automated availability, confirmations, and calendar sync with Turo and iCal.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    title: 'Finance & ROI',
    description: 'Track revenue, expenses, and profitability per vehicle in real time.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
      </svg>
    ),
    title: 'Fleet Management',
    description: 'Maintenance schedules, service history, and vehicle status at a glance.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
    title: 'Client Management',
    description: 'Full customer records, rental history, and consignment tracking.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
      </svg>
    ),
    title: 'Team Access',
    description: 'Role-based access for staff, finance teams, and managers.',
  },
]

const STATS = [
  { value: 'Miami', label: 'Headquarters' },
  { value: '100%', label: 'SaaS — no installs' },
  { value: '$0', label: 'to get started' },
  { value: '5 min', label: 'to go live' },
]

export default function HomePage() {
  return (
    <>
      {/* ── Hero ── */}
      <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden">
        {/* Car photo background */}
        <div className="absolute inset-0 -z-20">
          <Image
            src="/assets/images/Porsche Cayenne/car_9.jpg"
            alt="Premium fleet vehicle"
            fill
            priority
            className="object-cover object-center"
            sizes="100vw"
          />
        </div>
        {/* Dark gradient overlay — heavy at top/bottom, lighter in center */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/90 via-black/65 to-black/90" />
        {/* Subtle dot pattern on top */}
        <div className="absolute inset-0 -z-10 bg-dot-pattern opacity-30" />
        {/* Bottom divider line */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

        <div className="max-w-5xl mx-auto px-6 py-28 text-center z-10">
          <span className="inline-block text-[11px] font-bold tracking-[0.25em] text-white/50 uppercase mb-10 animate-fade-in">
            Miami-based · Car Rental Platform
          </span>
          <h1 className="text-5xl md:text-7xl font-extrabold text-white leading-[1.05] mb-8 tracking-tight animate-fade-in-up">
            Smart technology.<br />
            <span className="text-white/50">Premium fleet experience.</span>
          </h1>
          <p className="text-lg md:text-xl text-white/55 max-w-2xl mx-auto mb-14 animate-fade-in-up animation-delay-100 font-light leading-relaxed">
            éPure Drive streamlines operations, elevates the customer journey, and sets a new standard for how rental businesses are run.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up animation-delay-200">
            <Link
              href="/sign-up"
              className="bg-white text-black font-semibold px-10 py-4 rounded-xl text-base hover:bg-white/90 active:scale-95 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_40px_rgba(255,255,255,0.35)]"
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

      {/* ── Stats bar ── */}
      <section className="bg-surface/30 border-y border-white/[0.07] py-8">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {STATS.map((stat) => (
              <div key={stat.label}>
                <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-xs text-white/35 uppercase tracking-widest font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="relative py-32 overflow-hidden" id="features">
        {/* Subtle grid lines background */}
        <div className="absolute inset-0 bg-grid-lines opacity-100 pointer-events-none" />
        <div className="max-w-6xl mx-auto px-6 relative z-10">
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
                className="bg-black p-8 hover:bg-surface/40 transition-colors duration-300 group"
              >
                <div className="text-white/40 group-hover:text-white/70 transition-colors mb-4">
                  {feature.icon}
                </div>
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

      {/* ── Pricing ── */}
      <section className="relative py-32 bg-black" id="pricing">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="absolute inset-0 bg-dot-pattern opacity-20 pointer-events-none" />

        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <div className="text-center mb-20 animate-fade-in">
            <span className="text-[11px] font-bold tracking-[0.25em] text-white/30 uppercase block mb-4">Pricing</span>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-5 tracking-tight">Simple pricing</h2>
            <p className="text-lg text-white/40 font-light">Start free. Upgrade when you demand more.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 items-start">

            {/* ── Starter ── */}
            <div className="glass rounded-2xl p-8 text-left relative overflow-hidden group hover:border-white/15 transition-all duration-500">
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-white/10 to-transparent" />
              <div className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-6">Starter</div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-5xl font-extrabold text-white tracking-tight">$0</span>
              </div>
              <div className="text-white/30 text-sm mb-8">forever</div>

              <ul className="space-y-3 text-sm text-white/55 mb-8 font-light">
                <li className="flex items-center gap-3"><span className="text-white/60 text-xs">✓</span> 1 Premium branded page</li>
                <li className="flex items-center gap-3"><span className="text-white/60 text-xs">✓</span> Up to 5 vehicles</li>
                <li className="flex items-center gap-3"><span className="text-white/60 text-xs">✓</span> {'{slug}'}.epuredrive.com</li>
                <li className="flex items-center gap-3"><span className="text-white/60 text-xs">✓</span> Live availability calendar</li>
              </ul>

              <Link
                href="/sign-up"
                className="block text-center bg-white text-black font-semibold px-6 py-3.5 rounded-xl text-sm hover:bg-white/90 transition-colors"
              >
                Launch your business
              </Link>
            </div>

            {/* ── Pro (Coming Soon) ── */}
            <div className="glass rounded-2xl p-8 text-left relative overflow-hidden group border-white/15 hover:border-white/25 transition-all duration-500 md:-mt-4 md:mb-0">
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-white/30 to-white/5" />
              {/* Coming Soon badge — inside the card, top-right */}
              <div className="absolute top-4 right-4 bg-white/10 text-white/60 text-[9px] font-bold px-2.5 py-1 rounded-full tracking-widest uppercase border border-white/10">
                Coming Soon
              </div>

              <div className="text-[11px] font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-2 pr-20">
                Pro <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              </div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-4xl font-extrabold text-white tracking-tight">$49</span>
              </div>
              <div className="text-white/30 text-sm mb-8">/ month</div>

              <ul className="space-y-3 text-sm text-white/55 mb-8 font-light">
                <li className="flex items-center gap-3"><span className="text-white/60 text-xs">✓</span> Everything in Starter</li>
                <li className="flex items-center gap-3"><span className="text-white/60 text-xs">✓</span> Unlimited vehicles</li>
                <li className="flex items-center gap-3"><span className="text-white/60 text-xs">✓</span> Connect custom domain</li>
                <li className="flex items-center gap-3"><span className="text-white/60 text-xs">✓</span> Deep brand customization</li>
                <li className="flex items-center gap-3"><span className="text-white/60 text-xs">✓</span> Zero-fee Stripe payments</li>
              </ul>

              <a
                href="mailto:info@epuredrive.com?subject=Pro Plan Waitlist"
                className="block text-center bg-white/10 text-white/70 font-semibold px-6 py-3.5 rounded-xl text-sm hover:bg-white/15 hover:text-white transition-colors border border-white/10"
              >
                Join waitlist
              </a>
            </div>

            {/* ── Enterprise ── */}
            <div className="glass rounded-2xl p-8 text-left relative overflow-hidden group hover:border-white/15 transition-all duration-500">
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-white/10 to-transparent" />
              <div className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-6">Enterprise</div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-5xl font-extrabold text-white tracking-tight">Custom</span>
              </div>
              <div className="text-white/30 text-sm mb-8">tailored pricing</div>

              <ul className="space-y-3 text-sm text-white/55 mb-8 font-light">
                <li className="flex items-center gap-3"><span className="text-white/60 text-xs">✓</span> Everything in Pro</li>
                <li className="flex items-center gap-3"><span className="text-white/60 text-xs">✓</span> Multi-location management</li>
                <li className="flex items-center gap-3"><span className="text-white/60 text-xs">✓</span> Dedicated onboarding</li>
                <li className="flex items-center gap-3"><span className="text-white/60 text-xs">✓</span> SLA & priority support</li>
              </ul>

              <a
                href="mailto:info@epuredrive.com?subject=Enterprise Inquiry"
                className="block text-center bg-white/5 text-white/60 font-semibold px-6 py-3.5 rounded-xl text-sm hover:bg-white/10 hover:text-white transition-colors border border-white/10"
              >
                Contact us
              </a>
            </div>

          </div>
        </div>
      </section>

      {/* ── Footer CTA ── */}
      <section className="py-24 bg-black border-t border-white/[0.06]">
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
          <p className="mt-8 text-white/25 text-sm">
            info@epuredrive.com · 19707 Turnberry Way, Aventura, Florida
          </p>
        </div>
      </section>
    </>
  )
}
