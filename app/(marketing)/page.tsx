// app/(marketing)/page.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'éPure Drive Platform — Your Fleet Page, Live in Minutes',
}

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="min-h-[90vh] bg-[#0a0a0a] flex items-center">
        <div className="max-w-6xl mx-auto px-6 py-24 text-center">
          <span className="inline-block text-xs font-semibold tracking-widest text-white/50 uppercase mb-6">
            Fleet Pages for Car Rental Operators
          </span>
          <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight mb-6">
            Your fleet.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/40">
              Online in minutes.
            </span>
          </h1>
          <p className="text-lg text-white/60 max-w-2xl mx-auto mb-10">
            Get a branded public page for your rental fleet — with availability, pricing, and direct bookings.
            No coding required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/sign-up"
              className="bg-white text-black font-semibold px-8 py-4 rounded-xl text-base hover:bg-white/90 transition-colors"
            >
              Start for free →
            </a>
            <a
              href={`https://${process.env.EPUREDRIVE_TENANT_SLUG}.epuredrive.com`}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-white/20 text-white font-semibold px-8 py-4 rounded-xl text-base hover:border-white/40 transition-colors"
            >
              See a live example
            </a>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-[#111] py-24" id="pricing">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Simple pricing</h2>
          <p className="text-white/50 mb-16">Start free. Upgrade when you grow.</p>
          <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
            {/* Free plan */}
            <div className="border border-white/10 rounded-2xl p-8 text-left bg-[#0a0a0a]">
              <div className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-2">Free</div>
              <div className="text-4xl font-bold text-white mb-1">$0</div>
              <div className="text-white/40 text-sm mb-8">forever</div>
              <ul className="space-y-3 text-sm text-white/70 mb-8">
                <li>✓ 1 branded fleet page</li>
                <li>✓ Up to 5 cars</li>
                <li>✓ {'{slug}'}.epuredrive.com subdomain</li>
                <li>✓ Availability calendar</li>
              </ul>
              <a
                href="/sign-up"
                className="block text-center border border-white/20 text-white font-semibold px-6 py-3 rounded-xl text-sm hover:border-white/40 transition-colors"
              >
                Get started
              </a>
            </div>
            {/* Pro plan */}
            <div className="border border-white rounded-2xl p-8 text-left bg-[#0a0a0a] relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-black text-xs font-bold px-3 py-1 rounded-full">
                COMING SOON
              </div>
              <div className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-2">Pro</div>
              <div className="text-4xl font-bold text-white mb-1">$49</div>
              <div className="text-white/40 text-sm mb-8">/ month</div>
              <ul className="space-y-3 text-sm text-white/70 mb-8">
                <li>✓ Everything in Free</li>
                <li>✓ Unlimited cars</li>
                <li>✓ Custom domain</li>
                <li>✓ Brand colors & logo</li>
                <li>✓ Direct Stripe payments</li>
              </ul>
              <button
                disabled
                className="w-full text-center bg-white text-black font-semibold px-6 py-3 rounded-xl text-sm opacity-50 cursor-not-allowed"
              >
                Coming soon
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
