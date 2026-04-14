// app/(marketing)/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import ProductShowcase from './ProductShowcase'
import JsonLd from '@/components/JsonLd'
import {
  buildOrganizationSchema,
  buildWebSiteSchema,
  buildSoftwareApplicationSchema,
} from '@/lib/utils/jsonld'

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
    screenshot: '/assets/screenshots/site-fleet.png',
    alt: 'Tenant branded fleet site',
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

      {/* ─────────────────── Integrations strip ─────────────────── */}
      <section className="relative bg-black py-12">
        <div className="section-divider absolute top-0 left-0 right-0" />
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-center text-[11px] font-bold tracking-[0.3em] text-white/20 uppercase mb-8">
            Works with the tools you already use
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-5">
            {/* Turo */}
            <span className="text-white/25 text-lg font-bold tracking-tight hover:text-white/50 transition-colors cursor-default select-none">
              Turo
            </span>
            <span className="text-white/10 text-xs">·</span>
            {/* Stripe */}
            <span className="text-white/25 text-lg font-bold tracking-tight hover:text-white/50 transition-colors cursor-default select-none" style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '-0.02em' }}>
              Stripe
            </span>
            <span className="text-white/10 text-xs">·</span>
            {/* iCal */}
            <span className="text-white/25 text-lg font-semibold tracking-tight hover:text-white/50 transition-colors cursor-default select-none">
              iCal
            </span>
            <span className="text-white/10 text-xs">·</span>
            {/* Google Calendar */}
            <span className="text-white/25 text-lg font-semibold tracking-tight hover:text-white/50 transition-colors cursor-default select-none">
              Google Calendar
            </span>
            <span className="text-white/10 text-xs">·</span>
            {/* WhatsApp */}
            <span className="text-white/25 text-lg font-semibold tracking-tight hover:text-white/50 transition-colors cursor-default select-none">
              WhatsApp
            </span>
          </div>
        </div>
        <div className="section-divider absolute bottom-0 left-0 right-0" />
      </section>

      {/* ─────────────────── Features (split) ─────────────────── */}
      <section className="relative py-24 overflow-hidden bg-black" id="features">
        <div className="absolute inset-0 bg-grid-lines opacity-100 pointer-events-none" />
        <div className="absolute inset-0 bg-warm-glow pointer-events-none" />

        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <div className="text-center mb-24">
            <span className="text-[11px] font-bold tracking-[0.3em] text-white/25 uppercase block mb-4">
              Platform
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-5 tracking-tight">
              Your fleet. Your brand. Your numbers.
            </h2>
            <p className="text-lg text-white/35 font-light max-w-xl mx-auto">
              One platform built end-to-end for rental operators.
            </p>
          </div>

          {/* Split features */}
          <div className="space-y-24">
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

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
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
                  <span className="text-white/50 text-xs">&#10003;</span> 1 branded fleet page
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-white/50 text-xs">&#10003;</span> Up to 5 vehicles
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-white/50 text-xs">&#10003;</span> {'{slug}'}.epuredrive.com
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-white/50 text-xs">&#10003;</span> Live availability calendar
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-white/50 text-xs">&#10003;</span> Booking management
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
              <div className="absolute top-5 right-5 bg-white text-black text-[10px] font-bold px-3 py-1.5 rounded-full tracking-widest uppercase">
                Most Popular
              </div>

              <div className="text-[11px] font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                Pro <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              </div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-5xl font-extrabold text-white tracking-tight">$49</span>
              </div>
              <div className="text-white/30 text-sm mb-8">/ month + taxes</div>

              <ul className="space-y-3 text-sm text-white/50 mb-10 font-light flex-1">
                <li className="flex items-center gap-3">
                  <span className="text-white/50 text-xs">&#10003;</span> Everything in Starter
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-white/50 text-xs">&#10003;</span> Up to 25 vehicles
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-white/50 text-xs">&#10003;</span> Full brand customization
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-white/50 text-xs">&#10003;</span> Stripe payments
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-white/50 text-xs">&#10003;</span> Unlimited team members
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
            <div className="glass rounded-2xl p-8 text-left relative overflow-hidden group transition-all duration-500 flex flex-col border border-amber-500/20 hover:border-amber-500/35">
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-amber-500/40 to-transparent" />

              <div className="text-[11px] font-bold text-amber-400/80 uppercase tracking-widest mb-6">
                Max
              </div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-5xl font-extrabold text-white tracking-tight">$99</span>
              </div>
              <div className="text-white/30 text-sm mb-8">/ month + taxes</div>

              <ul className="space-y-3 text-sm text-white/50 mb-10 font-light flex-1">
                <li className="flex items-center gap-3">
                  <span className="text-amber-400/60 text-xs">&#10003;</span> Everything in Pro
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-amber-400/60 text-xs">&#10003;</span> Up to 60 vehicles
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-amber-400/60 text-xs">&#10003;</span> Custom domain
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-amber-400/60 text-xs">&#10003;</span> API access
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-amber-400/60 text-xs">&#10003;</span> Priority help & assistance
                </li>
              </ul>

              <Link
                href="/sign-up"
                className="block text-center bg-amber-500/10 text-amber-300 font-semibold px-6 py-3.5 rounded-xl text-sm hover:bg-amber-500/20 hover:text-amber-200 transition-colors border border-amber-500/20 mt-auto"
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
              <div className="text-white/30 text-sm mb-8">tailored pricing + taxes</div>

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
                  <span className="text-white/50 text-xs">&#10003;</span> White-label branding
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

      <JsonLd schema={buildOrganizationSchema()} />
      <JsonLd schema={buildWebSiteSchema()} />
      <JsonLd schema={buildSoftwareApplicationSchema()} />
    </>
  )
}
