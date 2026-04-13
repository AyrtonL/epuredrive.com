// app/(marketing)/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import ProductShowcase from './ProductShowcase'

export const metadata: Metadata = {
  title: 'éPure Drive — Premium Fleet Software for Car Rental Businesses',
  description:
    'A Miami-based SaaS platform built for the modern car rental industry. Streamline operations, elevate the customer journey.',
}

const SPLIT_FEATURES = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3" />
      </svg>
    ),
    title: 'Your branded fleet page,\nlive in minutes.',
    description:
      'A premium public page showcasing your vehicles — with real-time availability, pricing, and your brand. No code, no developer, no waiting.',
    bullets: ['Custom domain support', 'Live availability calendar', 'Auto-syncs with your inventory'],
    screenshot: '/assets/screenshots/dash-fleet.png',
    alt: 'Fleet management dashboard',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
    title: 'Every booking,\nunder control.',
    description:
      'Track all your rentals in one place — who booked, which vehicle, dates, amounts, and status. Automated confirmations keep customers informed without lifting a finger.',
    bullets: ['Turo & iCal sync', 'Automated confirmations', 'Customer records per booking'],
    screenshot: '/assets/screenshots/dash-bookings.png',
    alt: 'Bookings dashboard',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    title: 'Know exactly what\neach car earns.',
    description:
      'Real-time ROI per vehicle — revenue, expenses, and net profit broken down so you always know which cars are working for you and which aren\'t.',
    bullets: ['Revenue vs. expense breakdown', 'Net profit per vehicle', 'Consignment split tracking'],
    screenshot: '/assets/screenshots/dash-roi.png',
    alt: 'Finance and ROI dashboard',
  },
]

const MINI_FEATURES = [
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
      {/* ─────────────────── Hero ─────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Cinematic road background */}
        <div className="absolute inset-0 -z-20">
          <Image
            src="/assets/images/Imagenes/grant-porter-O7qK1vQY3p0-unsplash.jpg"
            alt="Cinematic mountain road at golden hour"
            fill
            priority
            className="object-cover object-center"
            sizes="100vw"
          />
        </div>
        {/* Dark overlay with warm undertone */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/80 via-black/60 to-black" />
        {/* Subtle warm ambient light at center */}
        <div className="absolute inset-0 -z-10 bg-warm-glow" />
        {/* Bottom fade to black */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black to-transparent -z-10" />

        <div className="max-w-5xl mx-auto px-6 py-32 text-center z-10">
          <span className="inline-block text-[11px] font-bold tracking-[0.3em] text-white/40 uppercase mb-8 animate-fade-in">
            Miami-based · Premium Fleet Platform
          </span>

          <h1 className="text-5xl sm:text-6xl md:text-8xl font-extrabold text-white leading-[1.0] mb-8 tracking-tight animate-fade-in-up">
            Smart technology.
            <br />
            <span className="text-gradient">Premium experience.</span>
          </h1>

          <p className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto mb-14 animate-fade-in-up animation-delay-100 font-light leading-relaxed">
            éPure Drive streamlines operations, elevates the customer journey,
            and sets a new standard for how rental businesses are run.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-5 justify-center animate-fade-in-up animation-delay-200">
            <Link
              href="/sign-up"
              className="bg-white text-black font-semibold px-10 py-4 rounded-xl text-base hover:bg-white/90 active:scale-[0.97] transition-all cta-glow"
            >
              Get started free
            </Link>
            <Link
              href="/login"
              className="text-white/50 text-sm font-medium hover:text-white transition-colors underline-offset-4 hover:underline"
            >
              Sign in to dashboard →
            </Link>
          </div>
        </div>
      </section>

      {/* ─────────────────── Stats bar ─────────────────── */}
      <section className="relative bg-black py-10">
        <div className="section-divider absolute top-0 left-0 right-0" />
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {STATS.map((stat) => (
              <div key={stat.label}>
                <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-[11px] text-white/30 uppercase tracking-[0.2em] font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="section-divider absolute bottom-0 left-0 right-0" />
      </section>

      {/* ─────────────────── Showcase / Fleet visual ─────────────────── */}
      <section className="relative py-0 overflow-hidden">
        {/* Full-bleed fleet image */}
        <div className="relative h-[50vh] md:h-[60vh]">
          <Image
            src="/assets/images/Imagenes/obi-XT95JA80yzM-unsplash.jpg"
            alt="Premium fleet lineup"
            fill
            className="object-cover object-center"
            sizes="100vw"
          />
          {/* Gradient overlays: black fade top + bottom + center darken for text */}
          <div className="absolute inset-0 bg-gradient-to-b from-black via-black/60 to-black" />

          {/* Centered overlay content */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center px-6">
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 tracking-tight">
                Built for premium fleets
              </h2>
              <p className="text-white/70 text-lg font-light max-w-xl mx-auto">
                From a single vehicle to a multi-location operation — one
                platform that scales with your ambition.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────── Testimonial ─────────────────── */}
      <section className="relative py-24 bg-black overflow-hidden">
        <div className="section-divider absolute top-0 left-0 right-0" />
        <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
          {/* Stars */}
          <div className="flex justify-center gap-1 mb-8">
            {[...Array(5)].map((_, i) => (
              <svg key={i} className="w-4 h-4 text-white/60" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>

          {/* Quote */}
          <blockquote className="text-2xl md:text-3xl font-light text-white/80 leading-relaxed mb-10 tracking-tight">
            &ldquo;Antes manejaba todo en hojas de Excel y WhatsApp. Ahora tengo mis carros, las
            reservas y las finanzas en un solo lugar. En menos de una semana ya estaba
            operando.&rdquo;
          </blockquote>

          {/* Author */}
          <div className="flex items-center justify-center gap-4">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/60 font-semibold text-sm">
              CM
            </div>
            <div className="text-left">
              <div className="text-white font-medium text-sm">Carlos Medina</div>
              <div className="text-white/35 text-xs">CML Premium Rentals · Brickell, Miami FL</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────── Features (split) ─────────────────── */}
      <section className="relative py-32 overflow-hidden bg-black" id="features">
        <div className="absolute inset-0 bg-grid-lines opacity-100 pointer-events-none" />
        <div className="absolute inset-0 bg-warm-glow pointer-events-none" />

        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <div className="text-center mb-24">
            <span className="text-[11px] font-bold tracking-[0.3em] text-white/25 uppercase block mb-4">
              Platform
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-5 tracking-tight">
              Everything you need to run your fleet
            </h2>
            <p className="text-lg text-white/35 font-light max-w-xl mx-auto">
              One platform. Zero compromise.
            </p>
          </div>

          {/* Split features */}
          <div className="space-y-32">
            {SPLIT_FEATURES.map((feature, i) => (
              <div
                key={feature.title}
                className={`flex flex-col lg:flex-row items-center gap-12 lg:gap-20 ${
                  i % 2 === 1 ? 'lg:flex-row-reverse' : ''
                }`}
              >
                {/* Text side */}
                <div className="flex-1 min-w-0">
                  <div className="text-white/30 mb-5">{feature.icon}</div>
                  <h3 className="text-3xl md:text-4xl font-bold text-white mb-5 tracking-tight leading-tight whitespace-pre-line">
                    {feature.title}
                  </h3>
                  <p className="text-white/45 leading-relaxed mb-8 font-light text-lg">
                    {feature.description}
                  </p>
                  <ul className="space-y-3">
                    {feature.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-center gap-3 text-white/55 text-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-white/40 flex-shrink-0" />
                        {bullet}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Screenshot side */}
                <div className="flex-1 min-w-0 w-full">
                  <div className="relative rounded-xl overflow-hidden border border-white/10 shadow-[0_24px_60px_rgba(0,0,0,0.5)]">
                    <div className="bg-[#1a1a1a] px-3 py-2.5 flex items-center gap-1.5 border-b border-white/[0.06]">
                      <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                      <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                      <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                    </div>
                    <Image
                      src={feature.screenshot}
                      alt={feature.alt}
                      width={800}
                      height={500}
                      className="w-full object-cover"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Mini features grid */}
          <div className="mt-32 grid md:grid-cols-3 gap-px bg-white/[0.06] rounded-2xl overflow-hidden">
            {MINI_FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="bg-black/90 p-10 hover:bg-white/[0.03] transition-all duration-500 group"
              >
                <div className="text-white/30 group-hover:text-white/60 transition-colors duration-500 mb-5">
                  {feature.icon}
                </div>
                <h3 className="text-white font-semibold mb-3 text-lg">
                  {feature.title}
                </h3>
                <p className="text-white/40 text-sm leading-relaxed font-light">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────── Product Showcase ─────────────────── */}
      <ProductShowcase />

      {/* ─────────────────── Pricing ─────────────────── */}
      <section className="relative py-32 bg-black" id="pricing">
        <div className="section-divider absolute top-0 left-0 right-0" />
        <div className="absolute inset-0 bg-dot-pattern opacity-15 pointer-events-none" />

        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <div className="text-center mb-20 animate-fade-in">
            <span className="text-[11px] font-bold tracking-[0.3em] text-white/25 uppercase block mb-4">
              Pricing
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-5 tracking-tight">
              Simple pricing
            </h2>
            <p className="text-lg text-white/35 font-light">
              Start free. Upgrade when you demand more.
            </p>
          </div>

          {/* 3-column grid — all cards aligned at top and stretched to equal height */}
          <div className="grid md:grid-cols-3 gap-6 items-stretch">
            {/* ── Starter ── */}
            <div className="glass rounded-2xl p-8 text-left relative overflow-hidden group hover:border-white/15 transition-all duration-500 flex flex-col">
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-white/10 to-transparent" />
              <div className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-6">
                Starter
              </div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-5xl font-extrabold text-white tracking-tight">$0</span>
              </div>
              <div className="text-white/30 text-sm mb-8">forever</div>

              <ul className="space-y-3 text-sm text-white/50 mb-10 font-light flex-1">
                <li className="flex items-center gap-3">
                  <span className="text-white/50 text-xs">&#10003;</span> 1 Premium branded page
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-white/50 text-xs">&#10003;</span> Up to 5 vehicles
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-white/50 text-xs">&#10003;</span>{' '}
                  {'{slug}'}.epuredrive.com
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-white/50 text-xs">&#10003;</span> Live availability
                  calendar
                </li>
              </ul>

              <Link
                href="/sign-up"
                className="block text-center bg-white text-black font-semibold px-6 py-3.5 rounded-xl text-sm hover:bg-white/90 transition-colors mt-auto"
              >
                Launch your business
              </Link>
            </div>

            {/* ── Pro ── */}
            <div className="rounded-2xl p-8 text-left relative overflow-hidden group transition-all duration-500 flex flex-col bg-glass-gradient backdrop-blur-xl border-2 border-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.36),0_0_60px_rgba(255,255,255,0.03)]">
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-white/40 to-white/5" />

              {/* Most Popular badge */}
              <div className="absolute top-5 right-5 bg-white text-black text-[10px] font-bold px-3 py-1.5 rounded-full tracking-widest uppercase">
                Most Popular
              </div>

              <div className="text-[11px] font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                Pro{' '}
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              </div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-5xl font-extrabold text-white tracking-tight">$49</span>
              </div>
              <div className="text-white/30 text-sm mb-8">/ month</div>

              <ul className="space-y-3 text-sm text-white/50 mb-10 font-light flex-1">
                <li className="flex items-center gap-3">
                  <span className="text-white/50 text-xs">&#10003;</span> Everything in Starter
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-white/50 text-xs">&#10003;</span> Up to 20 vehicles
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-white/50 text-xs">&#10003;</span> Connect custom domain
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-white/50 text-xs">&#10003;</span> Deep brand customization
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-white/50 text-xs">&#10003;</span> Stripe payments
                </li>
              </ul>

              <Link
                href="/sign-up"
                className="block text-center bg-white text-black font-semibold px-6 py-3.5 rounded-xl text-sm hover:bg-white/90 transition-colors mt-auto"
              >
                Get started
              </Link>
            </div>

            {/* ── Max ── */}
            <div className="glass rounded-2xl p-8 text-left relative overflow-hidden group hover:border-white/15 transition-all duration-500 flex flex-col">
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-white/10 to-transparent" />

              <div className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-6">
                Max
              </div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-5xl font-extrabold text-white tracking-tight">$99</span>
              </div>
              <div className="text-white/30 text-sm mb-8">/ month</div>

              <ul className="space-y-3 text-sm text-white/50 mb-10 font-light flex-1">
                <li className="flex items-center gap-3">
                  <span className="text-white/50 text-xs">&#10003;</span> Everything in Pro
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-white/50 text-xs">&#10003;</span> Up to 50 vehicles
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-white/50 text-xs">&#10003;</span> Unlimited team members
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-white/50 text-xs">&#10003;</span> White-label branding
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-white/50 text-xs">&#10003;</span> SLA &amp; priority support
                </li>
              </ul>

              <Link
                href="/sign-up"
                className="block text-center bg-white/[0.06] text-white/60 font-semibold px-6 py-3.5 rounded-xl text-sm hover:bg-white/10 hover:text-white transition-colors border border-white/10 mt-auto"
              >
                Get started
              </Link>
            </div>

            {/* ── Enterprise ── */}
            <div className="glass rounded-2xl p-8 text-left relative overflow-hidden group hover:border-white/15 transition-all duration-500 flex flex-col">
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-white/10 to-transparent" />
              <div className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-6">
                Enterprise
              </div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-5xl font-extrabold text-white tracking-tight">Custom</span>
              </div>
              <div className="text-white/30 text-sm mb-8">tailored pricing</div>

              <ul className="space-y-3 text-sm text-white/50 mb-10 font-light flex-1">
                <li className="flex items-center gap-3">
                  <span className="text-white/50 text-xs">&#10003;</span> Everything in Max
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-white/50 text-xs">&#10003;</span> Unlimited vehicles
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-white/50 text-xs">&#10003;</span> Multi-location management
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-white/50 text-xs">&#10003;</span> Dedicated account manager
                </li>
              </ul>

              <a
                href="mailto:info@epuredrive.com?subject=Enterprise%20Inquiry"
                className="block text-center bg-white/[0.06] text-white/60 font-semibold px-6 py-3.5 rounded-xl text-sm hover:bg-white/10 hover:text-white transition-colors border border-white/10 mt-auto"
              >
                Contact us
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────── Final CTA ─────────────────── */}
      <section className="relative py-32 bg-black overflow-hidden">
        <div className="section-divider absolute top-0 left-0 right-0" />
        {/* Subtle radial glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[600px] rounded-full bg-white/[0.02] blur-3xl" />
        </div>

        <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 tracking-tight">
            Ready to elevate your rental business?
          </h2>
          <p className="text-white/35 mb-12 font-light text-lg max-w-lg mx-auto">
            Join operators running their fleet on éPure Drive. Get started in 5
            minutes — no credit card required.
          </p>
          <Link
            href="/sign-up"
            className="inline-block bg-white text-black font-semibold px-12 py-4 rounded-xl text-base hover:bg-white/90 active:scale-[0.97] transition-all cta-glow"
          >
            Start for free
          </Link>
        </div>
      </section>

    </>
  )
}
