// app/(marketing)/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import ProductShowcase from './ProductShowcase'
import ContactSection from '@/components/marketing/ContactSection'
import TrackedCTA from '@/components/marketing/TrackedCTA'
import TrustBar from '@/components/marketing/TrustBar'
import HowItWorks from '@/components/marketing/HowItWorks'
import FAQ from '@/components/marketing/FAQ'
import DemoVideo from '@/components/marketing/DemoVideo'
import JsonLd from '@/components/JsonLd'
import {
  buildOrganizationSchema,
  buildWebSiteSchema,
  buildSoftwareApplicationSchema,
  buildPricingPlanSchema,
  buildVideoObjectSchema,
} from '@/lib/utils/jsonld'

const PRICING_PLANS = [
  {
    name: 'Starter',
    price: 0,
    billingPeriod: 'month' as const,
    description:
      'Free forever plan — up to 5 vehicles, branded booking site on a {slug}.epuredrive.com subdomain, live availability calendar, and full booking management.',
    features: ['Up to 5 vehicles', 'Branded fleet page', 'Booking management'],
    url: 'https://epuredrive.com/sign-up',
  },
  {
    name: 'Pro',
    price: 19,
    billingPeriod: 'month' as const,
    description:
      'Up to 25 vehicles, full brand customization, online payments via Stripe and Square, tax management, and unlimited team members.',
    features: ['Up to 25 vehicles', 'Online payments', 'Tax reports'],
    url: 'https://epuredrive.com/sign-up?plan=pro',
  },
  {
    name: 'Max',
    price: 39,
    billingPeriod: 'month' as const,
    description:
      'Up to 60 vehicles, 0% platform fee on online payments, QuickBooks sync, API access, and priority support.',
    features: ['Up to 60 vehicles', 'QuickBooks sync', 'API access'],
    url: 'https://epuredrive.com/sign-up?plan=max',
  },
]

const SEO_TITLE = 'Rental Car Software — Launch Your Booking Site in Minutes | éPure Drive'
const SEO_DESCRIPTION =
  'Fleet management software for independent car rental operators. Launch a branded booking site, accept online payments, and manage every vehicle from one dashboard. Free forever plan — no credit card required.'
const OG_IMAGE = 'https://epuredrive.com/og-image.jpg'

export const metadata: Metadata = {
  title: { absolute: SEO_TITLE },
  description: SEO_DESCRIPTION,
  alternates: {
    canonical: 'https://epuredrive.com',
    languages: {
      en: 'https://epuredrive.com',
      es: 'https://epuredrive.com/es',
      'x-default': 'https://epuredrive.com',
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://epuredrive.com',
    siteName: 'éPure Drive',
    title: SEO_TITLE,
    description: SEO_DESCRIPTION,
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'éPure Drive — Rental Car Software',
        type: 'image/jpeg',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: SEO_TITLE,
    description: SEO_DESCRIPTION,
    images: [OG_IMAGE],
  },
}

const DEMO_VIDEO_URL = process.env.NEXT_PUBLIC_DEMO_VIDEO_URL

const SPLIT_FEATURES = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3" />
      </svg>
    ),
    title: 'Your branded booking site,\nlive in minutes.',
    description:
      'Launch a professional rental site showcasing your vehicles — with real-time availability, pricing, and your brand. No code, no developer, no waiting.',
    bullets: ['Custom subdomain included', 'Live availability calendar', 'Auto-syncs with your inventory'],
    screenshot: '/assets/screenshots/site-fleet.webp',
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
    screenshot: '/assets/screenshots/dash-bookings.webp',
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
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/80 via-black/60 to-black" />
        <div className="absolute inset-0 -z-10 bg-warm-glow" />
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black to-transparent -z-10" />

        <div className="max-w-5xl mx-auto px-6 py-32 text-center z-10">
          <div className="inline-flex items-center gap-2.5 bg-white/[0.06] border border-white/[0.12] rounded-full px-4 py-2 mb-8 animate-fade-in">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
            <span className="text-[11px] font-bold tracking-[0.25em] text-grey uppercase">
              Built with rental operators, for rental operators
            </span>
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold text-white leading-[1.05] mb-6 tracking-tight animate-fade-in-up">
            Fleet management software
            <br />
            <span className="text-gradient">for car rental operators.</span>
          </h1>

          <p className="text-lg md:text-xl text-grey max-w-2xl mx-auto mb-12 animate-fade-in-up animation-delay-100 font-light leading-relaxed">
            Launch a branded booking site, accept online payments, and manage
            every vehicle from one dashboard. Free to start — no credit card,
            no developer, no setup calls.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-5 justify-center animate-fade-in-up animation-delay-200">
            <TrackedCTA
              href="/sign-up"
              location="hero"
              className="bg-white text-black font-semibold px-10 py-4 rounded-xl text-base hover:bg-white/90 active:scale-[0.97] transition-all cta-glow"
            >
              Get started free
            </TrackedCTA>
            {DEMO_VIDEO_URL ? (
              <a
                href="#demo"
                className="inline-flex items-center gap-2 text-white/80 text-sm font-medium hover:text-white transition-colors bg-white/[0.06] border border-white/[0.12] px-6 py-3.5 rounded-xl hover:bg-white/[0.10]"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Watch 2-min demo
              </a>
            ) : (
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 text-white/80 text-sm font-medium hover:text-white transition-colors bg-white/[0.06] border border-white/[0.12] px-6 py-3.5 rounded-xl hover:bg-white/[0.10]"
              >
                See how it works →
              </a>
            )}
          </div>

          {/* Trust signals */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-8 animate-fade-in-up animation-delay-300">
            {['No credit card required', 'Free forever to start', 'Setup in 5 minutes'].map((t) => (
              <span key={t} className="flex items-center gap-1.5 text-[12px] text-charcoal">
                <svg className="w-3 h-3 text-white/25 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────── Integrations strip ─────────────────── */}
      <section className="relative bg-black py-12">
        <div className="section-divider absolute top-0 left-0 right-0" />
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-center text-[11px] font-bold tracking-[0.3em] text-white/20 uppercase mb-6">
            Works with the tools you already use
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {['Turo', 'Stripe', 'Square', 'QuickBooks', 'iCal', 'Google Calendar', 'WhatsApp'].map((name) => (
              <span
                key={name}
                className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-full px-4 py-1.5 text-sm font-medium text-charcoal hover:text-silver hover:border-white/[0.14] hover:bg-white/[0.07] transition-all cursor-default select-none"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
        <div className="section-divider absolute bottom-0 left-0 right-0" />
      </section>

      {/* ─────────────────── Trust bar ─────────────────── */}
      <TrustBar />

      {/* ─────────────────── How it works ─────────────────── */}
      <HowItWorks />

      {/* ─────────────────── Features (split) ─────────────────── */}
      <section className="relative py-24 overflow-hidden bg-black" id="features">
        <div className="absolute inset-0 bg-grid-lines opacity-100 pointer-events-none" />
        <div className="absolute inset-0 bg-warm-glow pointer-events-none" />

        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <div className="text-center mb-24">
            <div className="inline-flex items-center gap-2 bg-white/[0.05] border border-white/[0.09] rounded-full px-4 py-1.5 mb-5">
              <span className="text-[11px] font-bold tracking-[0.25em] text-charcoal uppercase">Platform</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-5 tracking-tight">
              Fleet management, bookings,<br />and payments — one dashboard.
            </h2>
            <p className="text-lg text-charcoal font-light max-w-xl mx-auto">
              Stop juggling spreadsheets, texts, and calendar apps. Run your rental business from one place.
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
                  <div className="w-11 h-11 rounded-xl bg-white/[0.06] border border-white/[0.10] flex items-center justify-center text-grey mb-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                    {feature.icon}
                  </div>
                  <h3 className="text-3xl md:text-4xl font-bold text-white mb-5 tracking-tight leading-tight whitespace-pre-line">
                    {feature.title}
                  </h3>
                  <p className="text-grey leading-relaxed mb-8 font-light text-lg">
                    {feature.description}
                  </p>
                  <ul className="space-y-3">
                    {feature.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-center gap-3 text-silver text-sm">
                        <span className="w-5 h-5 rounded-full bg-white/[0.07] border border-white/[0.12] flex items-center justify-center flex-shrink-0">
                          <svg className="w-3 h-3 text-grey" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
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

      {/* ─────────────────── Demo video (only if configured) ─────────────────── */}
      {DEMO_VIDEO_URL && <DemoVideo videoUrl={DEMO_VIDEO_URL} />}

      {/* ─────────────────── Pricing ─────────────────── */}
      <section className="relative py-32 bg-black" id="pricing">
        <div className="section-divider absolute top-0 left-0 right-0" />
        <div className="absolute inset-0 bg-dot-pattern opacity-15 pointer-events-none" />

        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <div className="text-center mb-20 animate-fade-in">
            <div className="inline-flex items-center gap-2 bg-white/[0.05] border border-white/[0.09] rounded-full px-4 py-1.5 mb-5">
              <span className="text-[11px] font-bold tracking-[0.25em] text-charcoal uppercase">Pricing</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-5 tracking-tight">
              Simple pricing
            </h2>
            <p className="text-lg text-charcoal font-light">
              Start free. Upgrade when you demand more.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch max-w-5xl mx-auto">
            {/* ── Starter ── */}
            <div className="glass rounded-2xl p-8 text-left relative overflow-hidden group hover:border-white/15 transition-all duration-500 flex flex-col">
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-white/10 to-transparent" />
              <div className="text-[11px] font-bold text-charcoal uppercase tracking-widest mb-6">
                Starter
              </div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-5xl font-extrabold text-white tracking-tight">$0</span>
              </div>
              <div className="text-charcoal text-sm mb-1">forever</div>
              <div className="text-charcoal/60 text-[11px] mb-8">2% transaction fee on online payments</div>

              <ul className="space-y-3 text-sm text-grey mb-10 font-light flex-1">
                <li className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full bg-white/[0.07] border border-white/[0.12] flex items-center justify-center flex-shrink-0">
                    <svg className="w-2.5 h-2.5 text-silver" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </span> 1 branded fleet page
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full bg-white/[0.07] border border-white/[0.12] flex items-center justify-center flex-shrink-0">
                    <svg className="w-2.5 h-2.5 text-silver" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </span> Up to 5 vehicles
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full bg-white/[0.07] border border-white/[0.12] flex items-center justify-center flex-shrink-0">
                    <svg className="w-2.5 h-2.5 text-silver" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </span> {'{slug}'}.epuredrive.com
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full bg-white/[0.07] border border-white/[0.12] flex items-center justify-center flex-shrink-0">
                    <svg className="w-2.5 h-2.5 text-silver" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </span> Live availability calendar
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full bg-white/[0.07] border border-white/[0.12] flex items-center justify-center flex-shrink-0">
                    <svg className="w-2.5 h-2.5 text-silver" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </span> Booking management
                </li>
              </ul>

              <TrackedCTA
                href="/sign-up"
                location="pricing-starter"
                className="block text-center bg-white text-black font-semibold px-6 py-3.5 rounded-xl text-sm hover:bg-white/90 transition-colors mt-auto"
              >
                Launch your business
              </TrackedCTA>
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
                <span className="text-5xl font-extrabold text-white tracking-tight">$19</span>
              </div>
              <div className="text-charcoal text-sm mb-1">/ month</div>
              <div className="text-charcoal/60 text-[11px] mb-8">1% transaction fee on online payments</div>

              <ul className="space-y-3 text-sm text-grey mb-10 font-light flex-1">
                <li className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full bg-white/[0.07] border border-white/[0.12] flex items-center justify-center flex-shrink-0">
                    <svg className="w-2.5 h-2.5 text-silver" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </span> Everything in Starter
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full bg-white/[0.07] border border-white/[0.12] flex items-center justify-center flex-shrink-0">
                    <svg className="w-2.5 h-2.5 text-silver" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </span> Up to 25 vehicles
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full bg-white/[0.07] border border-white/[0.12] flex items-center justify-center flex-shrink-0">
                    <svg className="w-2.5 h-2.5 text-silver" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </span> Full brand customization
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full bg-white/[0.07] border border-white/[0.12] flex items-center justify-center flex-shrink-0">
                    <svg className="w-2.5 h-2.5 text-silver" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </span> Online payments (Stripe + Square)
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full bg-white/[0.07] border border-white/[0.12] flex items-center justify-center flex-shrink-0">
                    <svg className="w-2.5 h-2.5 text-silver" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </span> Tax management & reports
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full bg-white/[0.07] border border-white/[0.12] flex items-center justify-center flex-shrink-0">
                    <svg className="w-2.5 h-2.5 text-silver" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </span> Unlimited team members
                </li>
              </ul>

              <TrackedCTA
                href="/sign-up"
                location="pricing-pro"
                className="block text-center bg-white text-black font-semibold px-6 py-3.5 rounded-xl text-sm hover:bg-white/90 transition-colors mt-auto"
              >
                Get started
              </TrackedCTA>
            </div>

            {/* ── Max ── */}
            <div className="glass rounded-2xl p-8 text-left relative overflow-hidden group transition-all duration-500 flex flex-col border border-amber-500/20 hover:border-amber-500/35">
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-amber-500/40 to-transparent" />

              <div className="text-[11px] font-bold text-amber-400/80 uppercase tracking-widest mb-6">
                Max
              </div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-5xl font-extrabold text-white tracking-tight">$39</span>
              </div>
              <div className="text-charcoal text-sm mb-1">/ month + taxes</div>
              <div className="text-amber-400/40 text-[11px] mb-8">0% transaction fee on online payments</div>

              <ul className="space-y-3 text-sm text-grey mb-10 font-light flex-1">
                <li className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full bg-amber-500/[0.10] border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-2.5 h-2.5 text-amber-400/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </span> Everything in Pro
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full bg-amber-500/[0.10] border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-2.5 h-2.5 text-amber-400/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </span> Up to 60 vehicles
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full bg-amber-500/[0.10] border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-2.5 h-2.5 text-amber-400/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </span> Unlimited team members
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full bg-amber-500/[0.10] border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-2.5 h-2.5 text-amber-400/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </span> QuickBooks sync
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full bg-amber-500/[0.10] border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-2.5 h-2.5 text-amber-400/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </span> API access & priority support
                </li>
              </ul>

              <TrackedCTA
                href="/sign-up"
                location="pricing-max"
                className="block text-center bg-amber-500/10 text-amber-300 font-semibold px-6 py-3.5 rounded-xl text-sm hover:bg-amber-500/20 hover:text-amber-200 transition-colors border border-amber-500/20 mt-auto"
              >
                Get started
              </TrackedCTA>
            </div>
          </div>

          {/* Enterprise / multi-location line */}
          <p className="text-center text-sm text-charcoal mt-12 font-light">
            Running multiple locations or need unlimited vehicles?{' '}
            <a
              href="mailto:info@epuredrive.com?subject=Enterprise%20Inquiry"
              className="text-white font-medium underline underline-offset-4 hover:text-white/80"
            >
              Talk to us →
            </a>
          </p>
        </div>
      </section>

      {/* ─────────────────── FAQ ─────────────────── */}
      <FAQ />

      {/* ─────────────────── Final CTA ─────────────────── */}
      <section className="relative py-32 bg-black overflow-hidden">
        <div className="section-divider absolute top-0 left-0 right-0" />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[700px] h-[400px] rounded-full bg-white/[0.03] blur-[80px]" />
        </div>

        <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
          <div className="relative rounded-3xl p-px bg-gradient-to-b from-white/[0.14] via-white/[0.06] to-white/[0.02]">
            <div className="rounded-3xl bg-gradient-to-b from-white/[0.05] to-transparent px-8 py-16 md:px-16">
              <span className="inline-flex items-center gap-2 bg-white/[0.06] border border-white/[0.10] rounded-full px-4 py-1.5 mb-8">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] font-bold tracking-[0.25em] text-grey uppercase">Ready to launch</span>
              </span>
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 tracking-tight">
                Launch your rental business<br />online today.
              </h2>
              <p className="text-charcoal mb-10 font-light text-lg max-w-lg mx-auto">
                Join the rental operators who run their fleet, bookings, and
                customers on éPure Drive. Set up in 5 minutes — no credit card
                required.
              </p>
              <TrackedCTA
                href="/sign-up"
                location="bottom-cta"
                className="inline-block bg-white text-black font-semibold px-12 py-4 rounded-xl text-base hover:bg-white/90 active:scale-[0.97] transition-all cta-glow"
              >
                Start for free
              </TrackedCTA>
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-7">
                {['No credit card required', 'Cancel anytime', 'Free forever to start'].map((t) => (
                  <span key={t} className="flex items-center gap-1.5 text-[12px] text-white/25">
                    <svg className="w-3 h-3 text-white/20 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────── Contact ─────────────────── */}
      <ContactSection />

      <JsonLd schema={buildOrganizationSchema()} />
      <JsonLd schema={buildWebSiteSchema()} />
      <JsonLd schema={buildSoftwareApplicationSchema()} />
      {PRICING_PLANS.map((plan) => (
        <JsonLd key={plan.name} schema={buildPricingPlanSchema(plan)} />
      ))}
      {DEMO_VIDEO_URL && (
        <JsonLd
          schema={buildVideoObjectSchema({
            name: 'éPure Drive — 2-minute product demo',
            description:
              'See how to launch a branded rental car booking site, accept online payments, and manage your fleet from one dashboard in 2 minutes.',
            thumbnailUrl: 'https://epuredrive.com/og-image.jpg',
            uploadDate: '2026-04-20',
            embedUrl: DEMO_VIDEO_URL,
            duration: 'PT2M',
          })}
        />
      )}
    </>
  )
}
