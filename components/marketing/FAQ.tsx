import JsonLd from '@/components/JsonLd'
import { buildFAQPageSchema } from '@/lib/utils/jsonld'

const FAQS: { q: string; a: string }[] = [
  {
    q: 'How much does éPure Drive cost?',
    a: 'The Starter plan is free forever — includes up to 5 vehicles, a branded fleet page on a {slug}.epuredrive.com subdomain, and full booking management. Paid plans start at $19/month for more vehicles, your own domain, and lower transaction fees.',
  },
  {
    q: 'Do I need a credit card to start?',
    a: 'No. You can create your account, add your fleet, and go live without entering any payment details. You only upgrade to a paid plan when you need more vehicles or advanced features.',
  },
  {
    q: 'How long does setup take?',
    a: 'Most operators are live within 5 minutes. You create an account, upload your vehicle photos and prices, and your booking site is instantly available on your subdomain. No developer, no code, no migrations.',
  },
  {
    q: 'Can I use my own domain?',
    a: 'Custom domains are available on the Enterprise plan. Every other plan runs on a branded subdomain — e.g. yourrental.epuredrive.com — with SSL included out of the box. If you need to connect your own domain (bookings.yourrental.com), contact us and we\'ll set it up.',
  },
  {
    q: 'What payment processors do you support?',
    a: 'éPure Drive integrates with Stripe and Square for online card payments. You connect your own account, so payouts go directly to your bank — we never hold your money. Pro plans pay a 1% platform fee; Max plans pay 0%.',
  },
  {
    q: 'Does éPure Drive integrate with Turo?',
    a: 'Yes. You can sync availability from Turo (and any iCal-compatible platform) so your calendar stays accurate across channels — preventing double bookings automatically.',
  },
  {
    q: 'Can I manage multiple locations or offices?',
    a: 'Yes. The Enterprise plan supports multi-location management, with separate inventory and staff per location but a single reporting dashboard. Contact us for pricing.',
  },
  {
    q: 'Is my customer data safe?',
    a: 'Yes. All data is encrypted at rest and in transit, hosted on enterprise-grade infrastructure (Supabase + Netlify). Card payments never touch our servers — they are processed directly by Stripe/Square, which are PCI-DSS certified.',
  },
  {
    q: 'What if I want to cancel?',
    a: 'Cancel anytime from your billing settings. No contracts, no cancellation fees. You keep read-only access to your historical data for export, and your free Starter plan stays active.',
  },
  {
    q: 'Do you offer support?',
    a: 'Yes. Email support is included on all plans (including free). Pro and Max get priority response times. Enterprise customers get a dedicated account manager.',
  },
]

export default function FAQ() {
  return (
    <>
      <section className="relative py-28 bg-black overflow-hidden" id="faq">
        <div className="section-divider absolute top-0 left-0 right-0" />

        <div className="max-w-3xl mx-auto px-6 relative z-10">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-white/[0.05] border border-white/[0.09] rounded-full px-4 py-1.5 mb-5">
              <span className="text-[11px] font-bold tracking-[0.25em] text-charcoal uppercase">FAQ</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-5 tracking-tight">
              Common questions
            </h2>
            <p className="text-lg text-charcoal font-light">
              Can&apos;t find what you&apos;re looking for? Email{' '}
              <a href="mailto:info@epuredrive.com" className="text-white/70 underline underline-offset-4 hover:text-white">
                info@epuredrive.com
              </a>
              .
            </p>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq) => (
              <details
                key={faq.q}
                className="group rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden hover:border-white/15 transition-colors"
              >
                <summary className="cursor-pointer list-none px-6 py-5 flex items-center justify-between gap-4 text-white font-medium text-base">
                  <span>{faq.q}</span>
                  <svg
                    className="w-5 h-5 text-white/40 flex-shrink-0 transition-transform group-open:rotate-45"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </summary>
                <div className="px-6 pb-6 pt-0 text-grey font-light leading-relaxed text-[15px]">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <JsonLd schema={buildFAQPageSchema(FAQS)} />
    </>
  )
}
