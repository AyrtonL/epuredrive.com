import type { Metadata } from 'next'
import JsonLd from '@/components/JsonLd'
import { buildFAQPageSchema } from '@/lib/utils/jsonld'

export const metadata: Metadata = {
  title: 'FAQ — Frequently Asked Questions',
  description: 'Answers to common questions about éPure Drive, fleet management, pricing, and getting started.',
  alternates: { canonical: 'https://epuredrive.com/faq' },
  openGraph: {
    title: 'FAQ — Frequently Asked Questions | éPure Drive',
    description: 'Answers to common questions about éPure Drive, fleet management, pricing, and getting started.',
    url: 'https://epuredrive.com/faq',
  },
}

const faqs = [
  {
    category: 'Getting Started',
    items: [
      {
        q: 'What is éPure Drive?',
        a: 'éPure Drive is a fleet management SaaS platform built for car rental operators. It gives you a branded fleet page, booking management, customer tracking, and business analytics — all in one dashboard.',
      },
      {
        q: 'How do I create my fleet page?',
        a: 'Sign up for a free account, add your vehicles, and your branded fleet page is live instantly at your-brand.epuredrive.com. Customers can browse your cars and request reservations.',
      },
      {
        q: 'Is there a free plan?',
        a: 'Yes. The Free plan supports up to 5 vehicles and 1 team member with basic reporting. Upgrade to Pro, Max, or Enterprise for more vehicles, team members, and advanced features.',
      },
      {
        q: 'Can I use my own domain?',
        a: 'Custom domain support (e.g., fleet.yourbrand.com) is available on the Enterprise plan.',
      },
    ],
  },
  {
    category: 'Vehicles & Fleet',
    items: [
      {
        q: 'How do I add a vehicle?',
        a: 'Go to Fleet in your dashboard and click "Add Vehicle." Enter the VIN to auto-fill vehicle details via our VIN decoder, upload photos, set your daily rate, and save.',
      },
      {
        q: 'How many photos can I upload per vehicle?',
        a: 'You can upload up to 10 photos per vehicle. The first photo becomes the cover image shown on your fleet page. Supported formats: JPEG, PNG, and WebP (max 10MB each).',
      },
      {
        q: 'What does Active vs. Inactive status mean?',
        a: 'Active vehicles appear on your public fleet page and can receive bookings. Inactive, Maintenance, or Retired vehicles are hidden from the public but remain in your dashboard.',
      },
    ],
  },
  {
    category: 'Bookings & Payments',
    items: [
      {
        q: 'How do customers make a reservation?',
        a: 'Customers visit your fleet page, select a vehicle, choose dates, and submit a booking request. You receive an email notification and can manage the booking from your dashboard.',
      },
      {
        q: 'Can I accept online payments?',
        a: 'Yes. Connect your Stripe account in Settings > Payments & Invoices to accept credit card payments and automate payouts.',
      },
      {
        q: 'How do cancellations work?',
        a: 'You can cancel any booking from the dashboard. Both you and the customer (if email is configured) receive a cancellation notification.',
      },
    ],
  },
  {
    category: 'Account & Billing',
    items: [
      {
        q: 'How do I upgrade my plan?',
        a: 'Go to Settings > Billing & Plans and click "Upgrade" on your desired plan. You\'ll be redirected to Stripe Checkout to complete the payment.',
      },
      {
        q: 'Can I add team members?',
        a: 'Pro plans support up to 5 team members, Max and Enterprise support unlimited. Go to Settings > Team & Roles to invite members.',
      },
      {
        q: 'How do I reset my password?',
        a: 'Click "Forgot password?" on the login page. We\'ll send you a reset link to your registered email address.',
      },
    ],
  },
  {
    category: 'Support',
    items: [
      {
        q: 'How do I contact support?',
        a: 'Email us at support@epuredrive.com or use the contact form on our website. Pro, Max, and Enterprise customers receive priority support.',
      },
      {
        q: 'Do you offer onboarding help?',
        a: 'Yes. Max and Enterprise plan customers get a dedicated account manager. All customers can access our documentation and email support.',
      },
    ],
  },
]

const allFaqItems = faqs.flatMap((section) => section.items)

export default function FAQPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-20">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
          Frequently Asked Questions
        </h1>
        <p className="text-white/40 text-lg max-w-xl mx-auto">
          Everything you need to know about éPure Drive. Can&apos;t find what you&apos;re looking for? Contact us at{' '}
          <a href="mailto:support@epuredrive.com" className="text-white/60 hover:text-white transition-colors">
            support@epuredrive.com
          </a>
        </p>
      </div>

      <div className="space-y-12">
        {faqs.map((section) => (
          <div key={section.category}>
            <h2 className="text-xs font-black text-white/30 uppercase tracking-[0.2em] mb-6 pl-1">
              {section.category}
            </h2>
            <div className="space-y-4">
              {section.items.map((faq) => (
                <details
                  key={faq.q}
                  className="group glass border border-white/[0.06] rounded-2xl overflow-hidden hover:border-white/10 transition-colors"
                >
                  <summary className="flex items-center justify-between px-6 py-5 cursor-pointer list-none">
                    <span className="text-white font-medium text-sm pr-4">{faq.q}</span>
                    <svg
                      className="w-4 h-4 text-white/30 group-open:rotate-180 transition-transform shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="px-6 pb-5 text-white/50 text-sm leading-relaxed border-t border-white/5 pt-4">
                    {faq.a}
                  </div>
                </details>
              ))}
            </div>
          </div>
        ))}
      </div>
      <JsonLd schema={buildFAQPageSchema(allFaqItems)} />
    </div>
  )
}
