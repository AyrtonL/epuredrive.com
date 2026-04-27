import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import JsonLd from '@/components/JsonLd'
import { buildBreadcrumbSchema } from '@/lib/utils/jsonld'
import { isFreeLaunchMode } from '@/lib/plan/effective-plan'

const SEO_TITLE = 'Features — Car Rental Management Software | éPure Drive'

export const metadata: Metadata = {
  title: { absolute: SEO_TITLE },
  description:
    'Fleet management, online bookings, branded fleet pages, digital agreements, Stripe & Square payments, QuickBooks sync, tax management, team roles, and financial reporting — all in one platform for car rental businesses.',
  alternates: { canonical: 'https://epuredrive.com/features' },
  openGraph: {
    title: SEO_TITLE,
    description:
      'Everything car rental operators need to manage their fleet, accept bookings, track finances, and grow their business.',
    url: 'https://epuredrive.com/features',
  },
}

const HERO_FEATURES = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0H21M3.375 14.25h-.375a3 3 0 013-3h6.75a3 3 0 013 3v.375m-12 0h12m-12 0V6.375a1.125 1.125 0 011.125-1.125h3.75a1.125 1.125 0 011.125 1.125v7.875" />
      </svg>
    ),
    title: 'Fleet Management',
    description: 'Add vehicles with VIN decode, manage status, upload photos, and track performance metrics per car.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
    title: 'Booking Management',
    description: 'Track every reservation with dates, status, driver license, insurance info, and automated email confirmations.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
      </svg>
    ),
    title: 'Branded Fleet Page',
    description: 'A premium public page with your logo, colors, and vehicles — live at your-brand.epuredrive.com. No code needed.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
      </svg>
    ),
    title: 'Online Payments',
    description: 'Accept payments via Stripe or Square. Choose your processor, customers pay securely — you get paid directly.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    title: 'Digital Agreements',
    description: 'Send rental agreements for digital signature. PDF auto-generated and stored. Confirmation emails sent to both parties.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
    title: 'Team & Roles',
    description: 'Invite team members with role-based access — Admin, Manager, Staff, or Finance. Each role sees only what they need.',
  },
]

const DETAILED_SECTIONS = [
  {
    badge: 'Operations',
    title: 'Run your fleet\nfrom one dashboard.',
    description: 'Everything you need to manage day-to-day operations without juggling spreadsheets, texts, and email threads.',
    features: [
      { name: 'Operations Calendar', detail: 'Visual timeline of all reservations across your fleet. Filter by vehicle or date range.' },
      { name: 'Customer Records', detail: 'Full customer profiles with booking history, driver license, and contact information.' },
      { name: 'VIN Decode', detail: 'Enter a VIN and auto-fill year, make, model, horsepower, transmission, and more.' },
      { name: 'Availability Engine', detail: 'Real-time availability checks — overlapping bookings are automatically blocked.' },
      { name: 'Vehicle Status', detail: 'Mark cars active or inactive. Inactive vehicles are hidden from your public fleet page.' },
      { name: 'Photo Gallery', detail: 'Upload up to 10 photos per vehicle with drag-and-drop. Customers see a polished gallery.' },
    ],
    screenshot: '/assets/screenshots/dash-bookings.webp',
    alt: 'Operations dashboard showing bookings and calendar',
  },
  {
    badge: 'Finance',
    title: 'Know your numbers.\nEvery dollar, every car.',
    description: 'Revenue, expenses, and per-vehicle performance — the financial clarity rental operators need to grow.',
    features: [
      { name: 'Revenue Reports', detail: 'Track income by vehicle, date range, or customer with exportable reports.' },
      { name: 'Expense Tracking', detail: 'Log fuel, maintenance, insurance, and other costs. Import expenses via CSV.' },
      { name: 'Fleet Performance', detail: 'Per-car utilization rate, idle days, miles driven, and revenue with color-coded indicators.' },
      { name: 'Fuel Tracking', detail: 'Record fuel levels at pickup and return. Auto-detect discrepancies and suggest charges.' },
      { name: 'ROI Dashboard', detail: 'See which vehicles earn the most and which are underperforming — data-driven fleet decisions.' },
      { name: 'Tax Management', detail: 'Configure tax rates, filter by date range, view quarterly tax reports, and export to CSV.' },
      { name: 'Payments (Stripe + Square)', detail: 'Choose your payment processor. View transaction history and manage payouts from either platform.' },
      { name: 'QuickBooks Sync', detail: 'Connect QuickBooks Online to automatically sync transactions and keep your books up to date.' },
    ],
    screenshot: '/assets/screenshots/dash-taxes.webp',
    alt: 'Financial reports, tax management, and fleet performance dashboard',
  },
  {
    badge: 'Customer Experience',
    title: 'A booking experience\nyour customers will love.',
    description: 'From browsing your fleet to signing the rental agreement — a seamless, branded experience at every step.',
    features: [
      { name: 'Branded Fleet Page', detail: 'Your logo, your colors, your vehicles. Customers see a premium site that feels like yours.' },
      { name: 'Date Range Picker', detail: 'Customers select pickup and return dates with a visual calendar showing blocked dates.' },
      { name: 'Booking Confirmation', detail: 'Instant confirmation page with reservation details, reference number, and WhatsApp follow-up.' },
      { name: 'My Booking Page', detail: 'Customers can look up their reservation by email and reference number — no login needed.' },
      { name: 'Digital Agreement', detail: 'Send a signing link via email. Customer signs on any device. PDF stored automatically.' },
      { name: 'Email Notifications', detail: 'Automated confirmation and notification emails to both customer and operator on every booking.' },
    ],
    screenshot: '/assets/screenshots/site-fleet.webp',
    alt: 'Customer-facing branded fleet page with booking widget',
  },
]

export default function FeaturesPage() {
  const showPricing = !isFreeLaunchMode()
  return (
    <>
      {/* ─── Hero ─── */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-black" />
        <div className="absolute inset-0 -z-10 bg-grid-lines opacity-100 pointer-events-none" />
        <div className="absolute inset-0 -z-10 bg-warm-glow pointer-events-none" />

        <div className="max-w-5xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-white/[0.05] border border-white/[0.09] rounded-full px-4 py-1.5 mb-6">
            <span className="text-[11px] font-bold tracking-[0.25em] text-white/40 uppercase">Platform Features</span>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold text-white leading-[1.05] mb-6 tracking-tight">
            Everything you need to run<br />
            <span className="text-gradient">a modern rental business.</span>
          </h1>
          <p className="text-lg md:text-xl text-white/45 max-w-2xl mx-auto mb-12 font-light leading-relaxed">
            Fleet management, online bookings, digital agreements, financial reporting,
            and a branded customer experience — built for operators who want to grow.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
            <Link
              href="/sign-up"
              className="bg-white text-black font-semibold px-10 py-4 rounded-xl text-base hover:bg-white/90 active:scale-[0.97] transition-all cta-glow"
            >
              Start for free
            </Link>
            {showPricing && (
              <Link
                href="/#pricing"
                className="text-white/50 text-sm font-medium hover:text-white transition-colors"
              >
                View pricing →
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ─── Feature Grid ─── */}
      <section className="relative py-24 bg-black">
        <div className="section-divider absolute top-0 left-0 right-0" />
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {HERO_FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="glass border border-white/[0.06] rounded-2xl p-7 hover:border-white/[0.12] transition-all duration-300 group"
              >
                <div className="w-11 h-11 rounded-xl bg-white/[0.06] border border-white/[0.10] flex items-center justify-center text-white/55 mb-5 group-hover:bg-white/[0.10] transition-colors shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  {feature.icon}
                </div>
                <h3 className="text-white font-bold text-lg mb-2 tracking-tight">{feature.title}</h3>
                <p className="text-white/40 text-sm leading-relaxed font-light">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Detailed Sections ─── */}
      {DETAILED_SECTIONS.map((section, i) => (
        <section key={section.badge} className="relative py-24 bg-black overflow-hidden">
          <div className="section-divider absolute top-0 left-0 right-0" />
          <div className="absolute inset-0 bg-dot-pattern opacity-10 pointer-events-none" />

          <div className="max-w-6xl mx-auto px-6 relative z-10">
            <div className={`flex flex-col lg:flex-row items-start gap-16 ${i % 2 === 1 ? 'lg:flex-row-reverse' : ''}`}>
              {/* Text */}
              <div className="flex-1 min-w-0">
                <div className="inline-flex items-center gap-2 bg-white/[0.05] border border-white/[0.09] rounded-full px-4 py-1.5 mb-5">
                  <span className="text-[11px] font-bold tracking-[0.25em] text-white/40 uppercase">{section.badge}</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-5 tracking-tight leading-tight whitespace-pre-line">
                  {section.title}
                </h2>
                <p className="text-white/45 text-lg leading-relaxed font-light mb-10">
                  {section.description}
                </p>

                <div className="space-y-5">
                  {section.features.map((f) => (
                    <div key={f.name} className="flex gap-4">
                      <span className="mt-1 w-5 h-5 rounded-full bg-white/[0.07] border border-white/[0.12] flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-white/55" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                      <div>
                        <div className="text-white text-sm font-semibold">{f.name}</div>
                        <div className="text-white/35 text-sm font-light leading-relaxed">{f.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Screenshot */}
              <div className="flex-1 min-w-0 w-full">
                <div className="relative rounded-xl overflow-hidden border border-white/10 shadow-[0_24px_60px_rgba(0,0,0,0.5)]">
                  <div className="bg-[#1a1a1a] px-3 py-2.5 flex items-center gap-1.5 border-b border-white/[0.06]">
                    <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                    <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                    <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                  </div>
                  <Image
                    src={section.screenshot}
                    alt={section.alt}
                    width={800}
                    height={500}
                    className="w-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* ─── Integration Strip ─── */}
      <section className="relative py-20 bg-black">
        <div className="section-divider absolute top-0 left-0 right-0" />
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
            Integrations that work for you.
          </h2>
          <p className="text-white/40 text-lg font-light mb-10 max-w-xl mx-auto">
            Connect the tools you already use. No custom code required.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {[
              { name: 'Stripe', desc: 'Payments & payouts' },
              { name: 'Square', desc: 'Payments & POS' },
              { name: 'QuickBooks', desc: 'Accounting sync' },
              { name: 'WhatsApp', desc: 'Customer messaging' },
              { name: 'Turo', desc: 'Booking sync' },
              { name: 'iCal', desc: 'Calendar sync' },
              { name: 'Google Calendar', desc: 'Schedule sync' },
              { name: 'Resend', desc: 'Transactional email' },
            ].map((integration) => (
              <div
                key={integration.name}
                className="glass border border-white/[0.08] rounded-2xl px-6 py-4 text-center hover:border-white/[0.15] transition-all min-w-[140px]"
              >
                <div className="text-white font-semibold text-sm">{integration.name}</div>
                <div className="text-white/30 text-xs mt-1">{integration.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="relative py-24 bg-black">
        <div className="section-divider absolute top-0 left-0 right-0" />
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="relative rounded-3xl p-px bg-gradient-to-b from-white/[0.14] via-white/[0.06] to-white/[0.02]">
            <div className="rounded-3xl bg-gradient-to-b from-white/[0.05] to-transparent px-8 py-16 md:px-16">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-5 tracking-tight">
                Ready to modernize your rental business?
              </h2>
              <p className="text-white/40 mb-10 font-light text-lg max-w-lg mx-auto">
                Start free. Add your vehicles. Go live today.
              </p>
              <Link
                href="/sign-up"
                className="inline-block bg-white text-black font-semibold px-12 py-4 rounded-xl text-base hover:bg-white/90 active:scale-[0.97] transition-all cta-glow"
              >
                Get started free
              </Link>
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-7">
                {['No credit card required', '5 vehicles free forever', 'Setup in 5 minutes'].map((t) => (
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

      <JsonLd
        schema={buildBreadcrumbSchema([
          { name: 'Home', url: 'https://epuredrive.com' },
          { name: 'Features', url: 'https://epuredrive.com/features' },
        ])}
      />
    </>
  )
}
