// app/(marketing)/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'éPure Drive Platform — Premium Fleet Software',
}

export default function HomePage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute inset-0 bg-background -z-20" />
        <div className="absolute inset-0 bg-hero-glow opacity-60 -z-10" />
        
        <div className="max-w-6xl mx-auto px-6 py-24 text-center z-10">
          <span className="inline-block text-xs font-bold tracking-[0.2em] text-white/50 uppercase mb-8 animate-fade-in">
            Next-Generation Fleet Management
          </span>
          <h1 className="text-5xl md:text-8xl font-extrabold text-white leading-[1.1] mb-8 tracking-tight animate-fade-in-up">
            Your fleet.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-white to-white/40">
              Online in minutes.
            </span>
          </h1>
          <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-12 animate-fade-in-up animation-delay-100 font-light">
            Elegantly showcase your vehicles, automate bookings, and scale your rental business with an impossibly sleek platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center animate-fade-in-up animation-delay-200">
            <Link
              href="/sign-up"
              className="bg-white text-black font-semibold px-10 py-4 rounded-xl text-lg hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)]"
            >
              Start for free
            </Link>
            <a
               href={`https://${process.env.EPUREDRIVE_TENANT_SLUG || 'demo'}.epuredrive.com`}
              target="_blank"
              rel="noopener noreferrer"
              className="glass text-white font-semibold px-10 py-4 rounded-xl text-lg hover:bg-white/5 transition-colors"
            >
              See a live example
            </a>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="relative py-32 bg-surface" id="pricing">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-20 animate-fade-in">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">Simple pricing</h2>
            <p className="text-xl text-white/50 font-light">Start free. Upgrade when you demand more.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 lg:gap-12 max-w-4xl mx-auto">
            {/* Free plan */}
            <div className="glass rounded-3xl p-10 text-left relative overflow-hidden group hover:border-white/20 transition-all duration-500">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-white/10 to-transparent" />
              <div className="text-sm font-bold text-white/50 uppercase tracking-widest mb-4">Starter</div>
              <div className="flex items-baseline mb-2">
                <span className="text-5xl font-extrabold text-white tracking-tight">$0</span>
              </div>
              <div className="text-white/40 text-sm mb-10">forever</div>
              
              <ul className="space-y-4 text-sm text-white/70 mb-10 font-light">
                <li className="flex items-center"><span className="text-white mr-3">✓</span> 1 Premium branded page</li>
                <li className="flex items-center"><span className="text-white mr-3">✓</span> Up to 5 vehicles</li>
                <li className="flex items-center"><span className="text-white mr-3">✓</span> {'{slug}'}.epuredrive.com</li>
                <li className="flex items-center"><span className="text-white mr-3">✓</span> Live availability calendar</li>
              </ul>
              
              <Link
                href="/sign-up"
                className="block text-center glass text-white font-semibold px-6 py-4 rounded-xl text-sm hover:bg-white/10 transition-colors"
              >
                Launch your business
              </Link>
            </div>

            {/* Pro plan */}
            <div className="glass rounded-3xl p-10 text-left relative overflow-hidden group border-white/20 shadow-[0_0_40px_rgba(255,255,255,0.05)] hover:border-white/40 hover:shadow-[0_0_50px_rgba(255,255,255,0.1)] transition-all duration-500">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-white/40 to-white/10" />
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-black text-[10px] font-bold px-3 py-1 rounded-full tracking-widest uppercase shadow-lg">
                Coming Soon
              </div>
              <div className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center">
                Pro <span className="ml-2 w-2 h-2 rounded-full bg-white animate-pulse" />
              </div>
              <div className="flex items-baseline mb-2">
                <span className="text-5xl font-extrabold text-white tracking-tight">$49</span>
              </div>
              <div className="text-white/40 text-sm mb-10">/ month</div>
              
              <ul className="space-y-4 text-sm text-white/70 mb-10 font-light">
                <li className="flex items-center"><span className="text-white mr-3">✓</span> Everything in Starter</li>
                <li className="flex items-center"><span className="text-white mr-3">✓</span> Unlimited vehicles</li>
                <li className="flex items-center"><span className="text-white mr-3">✓</span> Connect custom domain</li>
                <li className="flex items-center"><span className="text-white mr-3">✓</span> Deep brand customization</li>
                <li className="flex items-center"><span className="text-white mr-3">✓</span> Zero-fee Stripe payments</li>
              </ul>
              
              <button
                disabled
                className="w-full text-center bg-white/5 text-white/30 font-semibold px-6 py-4 rounded-xl text-sm cursor-not-allowed border border-white/5"
              >
                Join waitlist
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
