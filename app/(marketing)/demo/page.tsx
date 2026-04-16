import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'

export const metadata: Metadata = {
  title: 'Live Demo — éPure Drive | See Your Fleet Page in Action',
  description:
    'See how éPure Drive works for real rental operators. Live demo fleet page, dashboard walkthrough, and everything you get on the free plan.',
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://epuredrive.com/demo' },
  openGraph: {
    title: 'Live Demo — éPure Drive',
    description: 'See how a real rental business runs on éPure Drive. Live fleet page, bookings, and payments — all in one platform.',
    url: 'https://epuredrive.com/demo',
  },
}

const WHAT_YOU_GET = [
  {
    icon: '🌐',
    title: 'Branded Fleet Page',
    detail: 'Your own site at your-brand.epuredrive.com — logo, colors, vehicles, and online booking. Live in minutes.',
  },
  {
    icon: '📋',
    title: 'Booking Management',
    detail: 'Every reservation in one place. Dates, amounts, customer info, and status tracking with email confirmations.',
  },
  {
    icon: '📄',
    title: 'Digital Agreements',
    detail: 'Send rental contracts for e-signature. Auto-generated PDF stored with the booking. No paper, no hassle.',
  },
  {
    icon: '💳',
    title: 'Online Payments',
    detail: 'Accept cards via Stripe or Square. Customers pay securely. You get paid directly to your bank account.',
  },
  {
    icon: '📊',
    title: 'Financial Reports',
    detail: 'Revenue per vehicle, expense tracking, ROI analysis, and tax reports. Know your numbers without a spreadsheet.',
  },
  {
    icon: '👥',
    title: 'Team & Roles',
    detail: 'Invite staff with role-based access. Admin, Manager, Staff, or Finance — each sees only what they need.',
  },
]

const COMPARISON = [
  { task: 'List vehicles online', before: 'Instagram posts + DMs', after: 'Professional fleet page with availability' },
  { task: 'Take a booking', before: 'WhatsApp back-and-forth', after: 'Customer books in 2 minutes online' },
  { task: 'Rental agreement', before: 'Print, sign, scan, email', after: 'Digital signature, auto-PDF, done' },
  { task: 'Collect payment', before: 'Zelle / cash / manual Stripe link', after: 'Integrated checkout at booking' },
  { task: 'Track revenue', before: 'Spreadsheet updated weekly (maybe)', after: 'Real-time dashboard per vehicle' },
  { task: 'Manage availability', before: 'Calendar + memory', after: 'Auto-blocked dates, zero double-bookings' },
]

const PLANS_OVERVIEW = [
  {
    name: 'Starter',
    price: '$0',
    period: 'forever',
    fee: '8% transaction fee',
    highlights: ['5 vehicles', '1 branded fleet page', 'Booking management', 'Digital agreements', 'Email confirmations'],
    cta: 'Start free',
    href: '/sign-up',
    accent: false,
  },
  {
    name: 'Pro',
    price: '$49',
    period: '/mo + taxes',
    fee: '5% transaction fee',
    highlights: ['25 vehicles', 'Online payments (Stripe + Square)', 'Tax management & reports', 'Turo sync', 'Unlimited team members'],
    cta: 'Get started',
    href: '/sign-up',
    accent: true,
  },
  {
    name: 'Max',
    price: '$99',
    period: '/mo + taxes',
    fee: '2% transaction fee',
    highlights: ['60 vehicles', 'QuickBooks sync', 'API access', 'White-label branding', 'Priority support'],
    cta: 'Get started',
    href: '/sign-up',
    accent: false,
  },
]

const ROI_NUMBERS = [
  { metric: '3 hrs/week', label: 'saved on admin', detail: 'No more WhatsApp scheduling, manual agreements, or spreadsheet updates.' },
  { metric: '2x', label: 'faster bookings', detail: 'Customers book online in minutes instead of days of back-and-forth.' },
  { metric: '$0', label: 'to start', detail: 'Free plan includes everything you need to go live today. Upgrade when you grow.' },
  { metric: '24 hrs', label: 'to go live', detail: 'Sign up, add vehicles, customize branding — your fleet page is live same day.' },
]

export default function DemoPage() {
  return (
    <>
      {/* ─── Hero ─── */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-black" />
        <div className="absolute inset-0 -z-10 bg-grid-lines opacity-100 pointer-events-none" />
        <div className="absolute inset-0 -z-10 bg-warm-glow pointer-events-none" />

        <div className="max-w-5xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-white/[0.05] border border-white/[0.09] rounded-full px-4 py-1.5 mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-bold tracking-[0.25em] text-white/40 uppercase">Live Demo</span>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold text-white leading-[1.05] mb-6 tracking-tight">
            See what your<br />
            <span className="text-gradient">rental business could look like.</span>
          </h1>
          <p className="text-lg md:text-xl text-white/45 max-w-2xl mx-auto mb-10 font-light leading-relaxed">
            A real fleet page, real bookings, real dashboard — built on éPure Drive.
            This is what your customers and your team experience from day one.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
            <a
              href="https://sunshine-luxury.epuredrive.com"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white text-black font-semibold px-10 py-4 rounded-xl text-base hover:bg-white/90 active:scale-[0.97] transition-all cta-glow"
            >
              View live fleet page
            </a>
            <Link
              href="/sign-up"
              className="text-white/50 text-sm font-medium hover:text-white transition-colors border border-white/10 px-8 py-4 rounded-xl hover:border-white/20"
            >
              Create yours free
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Live Fleet Page Preview ─── */}
      <section className="relative py-24 bg-black">
        <div className="section-divider absolute top-0 left-0 right-0" />
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-white/[0.05] border border-white/[0.09] rounded-full px-4 py-1.5 mb-5">
              <span className="text-[11px] font-bold tracking-[0.25em] text-white/40 uppercase">Your Fleet Page</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
              This is what your customers see.
            </h2>
            <p className="text-white/40 text-lg font-light max-w-xl mx-auto">
              A professional, branded rental site — not a social media page. Live availability, online booking, and your brand front and center.
            </p>
          </div>

          {/* Browser mockup */}
          <div className="relative rounded-xl overflow-hidden border border-white/10 shadow-[0_24px_60px_rgba(0,0,0,0.5)] max-w-4xl mx-auto">
            <div className="bg-[#1a1a1a] px-4 py-3 flex items-center gap-3 border-b border-white/[0.06]">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-white/10" />
                <div className="w-3 h-3 rounded-full bg-white/10" />
                <div className="w-3 h-3 rounded-full bg-white/10" />
              </div>
              <div className="flex-1 bg-white/[0.06] rounded-md px-3 py-1.5 text-xs text-white/30 text-center">
                sunshine-luxury.epuredrive.com
              </div>
            </div>
            <div className="bg-[#0d0d0d] p-8 md:p-12">
              <div className="space-y-6">
                {/* Simulated fleet page header */}
                <div className="text-center space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400/20 to-amber-600/10 border border-amber-500/20 mx-auto flex items-center justify-center">
                    <span className="text-2xl font-bold text-amber-400">S</span>
                  </div>
                  <h3 className="text-xl font-bold text-white">Sunshine Luxury Rentals</h3>
                  <p className="text-white/30 text-sm">Premium Cars. Miami Style.</p>
                </div>

                {/* Simulated car cards */}
                <div className="grid sm:grid-cols-3 gap-4 mt-8">
                  {[
                    { name: 'Tesla Model 3', price: '$119/day', cat: 'Electric' },
                    { name: 'Mercedes C300', price: '$149/day', cat: 'Sedan' },
                    { name: 'BMW X5', price: '$189/day', cat: 'SUV' },
                  ].map((car) => (
                    <div key={car.name} className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-5 text-center">
                      <div className="w-full h-24 rounded-lg bg-white/[0.03] mb-4 flex items-center justify-center">
                        <svg className="w-10 h-10 text-white/10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0H21M3.375 14.25h-.375a3 3 0 013-3h6.75a3 3 0 013 3v.375m-12 0h12m-12 0V6.375a1.125 1.125 0 011.125-1.125h3.75a1.125 1.125 0 011.125 1.125v7.875" />
                        </svg>
                      </div>
                      <div className="text-white text-sm font-semibold">{car.name}</div>
                      <div className="text-white/30 text-xs mt-1">{car.cat}</div>
                      <div className="text-amber-400 font-bold text-sm mt-2">{car.price}</div>
                    </div>
                  ))}
                </div>

                <div className="text-center pt-2">
                  <span className="text-white/20 text-xs">+ Porsche Cayenne ($299/day) · Jeep Wrangler ($159/day)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-8">
            <a
              href="https://sunshine-luxury.epuredrive.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-white/40 text-sm hover:text-white transition-colors"
            >
              Open the live page
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* ─── Before / After Comparison ─── */}
      <section className="relative py-24 bg-black">
        <div className="section-divider absolute top-0 left-0 right-0" />
        <div className="absolute inset-0 bg-dot-pattern opacity-10 pointer-events-none" />

        <div className="max-w-5xl mx-auto px-6 relative z-10">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-white/[0.05] border border-white/[0.09] rounded-full px-4 py-1.5 mb-5">
              <span className="text-[11px] font-bold tracking-[0.25em] text-white/40 uppercase">Before & After</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
              How operators run today vs. with éPure Drive.
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-4 px-4 text-white/30 font-medium text-xs uppercase tracking-wider">Task</th>
                  <th className="text-left py-4 px-4 text-red-400/60 font-medium text-xs uppercase tracking-wider">Without éPure</th>
                  <th className="text-left py-4 px-4 text-emerald-400/60 font-medium text-xs uppercase tracking-wider">With éPure</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row) => (
                  <tr key={row.task} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 px-4 text-white font-medium">{row.task}</td>
                    <td className="py-4 px-4 text-white/30">{row.before}</td>
                    <td className="py-4 px-4 text-emerald-300/80">{row.after}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ─── What You Get ─── */}
      <section className="relative py-24 bg-black">
        <div className="section-divider absolute top-0 left-0 right-0" />
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-white/[0.05] border border-white/[0.09] rounded-full px-4 py-1.5 mb-5">
              <span className="text-[11px] font-bold tracking-[0.25em] text-white/40 uppercase">All Included</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
              Everything a rental business needs.
            </h2>
            <p className="text-white/40 text-lg font-light max-w-xl mx-auto">
              One platform. No juggling apps, spreadsheets, or threads.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {WHAT_YOU_GET.map((item) => (
              <div
                key={item.title}
                className="glass border border-white/[0.06] rounded-2xl p-7 hover:border-white/[0.12] transition-all duration-300 group"
              >
                <div className="text-3xl mb-5">{item.icon}</div>
                <h3 className="text-white font-bold text-lg mb-2 tracking-tight">{item.title}</h3>
                <p className="text-white/40 text-sm leading-relaxed font-light">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── ROI Numbers ─── */}
      <section className="relative py-24 bg-black">
        <div className="section-divider absolute top-0 left-0 right-0" />
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-white/[0.05] border border-white/[0.09] rounded-full px-4 py-1.5 mb-5">
              <span className="text-[11px] font-bold tracking-[0.25em] text-white/40 uppercase">Why Switch</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
              The numbers speak for themselves.
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {ROI_NUMBERS.map((item) => (
              <div key={item.label} className="glass border border-white/[0.06] rounded-2xl p-7 text-center">
                <div className="text-4xl font-black text-white mb-1 tracking-tight">{item.metric}</div>
                <div className="text-white/60 text-sm font-semibold mb-3">{item.label}</div>
                <p className="text-white/30 text-xs leading-relaxed">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Plans ─── */}
      <section className="relative py-24 bg-black">
        <div className="section-divider absolute top-0 left-0 right-0" />
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
              Simple, transparent pricing.
            </h2>
            <p className="text-white/40 text-lg font-light">
              Start free. Upgrade as you grow. No contracts.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {PLANS_OVERVIEW.map((plan) => (
              <div
                key={plan.name}
                className={`glass rounded-2xl p-8 flex flex-col transition-all duration-300 ${
                  plan.accent
                    ? 'border-2 border-white/20 shadow-[0_0_40px_rgba(255,255,255,0.05)]'
                    : 'border border-white/[0.06] hover:border-white/10'
                }`}
              >
                {plan.accent && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-white/0 via-white/40 to-white/0 rounded-t-2xl" />
                )}
                <div className="mb-6">
                  <div className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-3">{plan.name}</div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-white">{plan.price}</span>
                    <span className="text-white/30 text-sm">{plan.period}</span>
                  </div>
                  <div className="text-white/20 text-xs mt-1">{plan.fee}</div>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.highlights.map((h) => (
                    <li key={h} className="flex items-start gap-2.5 text-sm text-white/60">
                      <svg className="w-4 h-4 text-emerald-400/70 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      {h}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className={`block text-center font-semibold px-6 py-3.5 rounded-xl text-sm transition-colors mt-auto ${
                    plan.accent
                      ? 'bg-white text-black hover:bg-white/90'
                      : 'bg-white/[0.06] text-white hover:bg-white/[0.10] border border-white/10'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How Onboarding Works ─── */}
      <section className="relative py-24 bg-black">
        <div className="section-divider absolute top-0 left-0 right-0" />
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-white/[0.05] border border-white/[0.09] rounded-full px-4 py-1.5 mb-5">
              <span className="text-[11px] font-bold tracking-[0.25em] text-white/40 uppercase">Getting Started</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
              Live in 24 hours. Not kidding.
            </h2>
            <p className="text-white/40 text-lg font-light max-w-xl mx-auto">
              Free onboarding call included. We help you set up everything.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {[
              { step: '1', title: 'Sign up (2 min)', body: 'Create your account. No credit card. Your dashboard is ready instantly.' },
              { step: '2', title: 'Add your vehicles (15 min)', body: 'Enter VIN for auto-fill, upload photos, set daily rates. We can do this on a call together.' },
              { step: '3', title: 'Customize branding (10 min)', body: 'Logo, colors, tagline, pickup locations, How It Works — your fleet page looks like yours.' },
              { step: '4', title: 'Go live & share (instant)', body: 'Your page is live at your-brand.epuredrive.com. Share the link and start taking bookings.' },
            ].map((s) => (
              <div key={s.step} className="glass border border-white/[0.06] rounded-2xl p-7 flex gap-5">
                <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {s.step}
                </div>
                <div>
                  <h3 className="text-white font-bold mb-1">{s.title}</h3>
                  <p className="text-white/40 text-sm leading-relaxed font-light">{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="relative py-24 bg-black">
        <div className="section-divider absolute top-0 left-0 right-0" />
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="relative rounded-3xl p-px bg-gradient-to-b from-white/[0.14] via-white/[0.06] to-white/[0.02]">
            <div className="rounded-3xl bg-gradient-to-b from-white/[0.05] to-transparent px-8 py-16 md:px-16">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-5 tracking-tight">
                Ready to upgrade how you rent cars?
              </h2>
              <p className="text-white/40 mb-6 font-light text-lg max-w-lg mx-auto">
                Join rental operators in Miami who are growing with éPure Drive.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
                <Link
                  href="/sign-up"
                  className="inline-block bg-white text-black font-semibold px-12 py-4 rounded-xl text-base hover:bg-white/90 active:scale-[0.97] transition-all cta-glow"
                >
                  Start free today
                </Link>
                <a
                  href="https://wa.me/13055551234?text=Hi%2C%20I%20saw%20the%20éPure%20Drive%20demo%20and%20want%20to%20learn%20more."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-white/50 text-sm font-medium hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  Talk to us on WhatsApp
                </a>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-7">
                {['No credit card required', 'Free onboarding call', 'Live in 24 hours'].map((t) => (
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
    </>
  )
}
