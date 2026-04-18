import Link from 'next/link'

const TIERS = [
  {
    name: 'Starter', price: '$0', unit: 'forever', fee: '2% transaction fee', popular: false,
    features: ['1 branded fleet page', 'Up to 5 vehicles', '{slug}.epuredrive.com', 'Live availability calendar', 'Booking management'],
    cta: 'Launch your business', ctaStyle: 'border border-white/20 text-white hover:bg-white/[0.06]',
  },
  {
    name: 'Pro', price: '$49', unit: '/ month', fee: '1% transaction fee', popular: true,
    features: ['Everything in Starter', 'Up to 25 vehicles', 'Full brand customization', 'Online payments', 'Tax management & reports', 'Unlimited team members'],
    cta: 'Get started', ctaStyle: 'bg-white text-black hover:opacity-90',
  },
  {
    name: 'Max', price: '$99', unit: '/ month', fee: '0% transaction fee', popular: false,
    features: ['Everything in Pro', 'Up to 60 vehicles', 'QuickBooks sync', 'API access', 'Priority support'],
    cta: 'Go fee-free', ctaStyle: 'border border-white/20 text-white hover:bg-white/[0.06]',
  },
  {
    name: 'Enterprise', price: 'Custom', unit: 'tailored pricing', fee: null, popular: false,
    features: ['Everything in Max', 'Unlimited vehicles', 'Multi-location management', 'White-label branding', 'Dedicated account manager'],
    cta: 'Contact us', ctaStyle: 'border border-white/20 text-white hover:bg-white/[0.06]',
  },
]

export default function PricingSection() {
  return (
    <section id="pricing" className="py-28 border-t border-white/[0.06]">
      <div className="max-w-[1280px] mx-auto px-8">
        <div className="text-center max-w-[680px] mx-auto mb-16">
          <div className="flex items-center gap-3 justify-center mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
            <span className="text-[11px] font-bold tracking-[0.25em] text-white/50 uppercase">Pricing</span>
          </div>
          <h2 className="text-[clamp(40px,5vw,64px)] font-extrabold text-white leading-[1.05] tracking-[-0.02em] mb-4">
            Start free. <span className="text-white/35 italic font-black">Pay zero when you scale.</span>
          </h2>
          <p className="text-lg text-white/50 font-light max-w-[520px] mx-auto">
            Four tiers. Transparent transaction fees. Upgrade when you&apos;re ready to keep every dollar.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 border border-white/[0.08] rounded-2xl overflow-hidden">
          {TIERS.map(t => (
            <div key={t.name} className={`p-8 lg:p-10 border-r border-b border-white/[0.08] last:border-r-0 flex flex-col relative ${t.popular ? 'bg-white/[0.04]' : 'bg-black'}`}>
              {t.popular && (
                <span className="absolute top-4 right-4 text-[9px] font-bold tracking-[0.2em] uppercase text-white bg-white/[0.10] border border-white/[0.15] px-2.5 py-1 rounded-full">
                  Most Popular
                </span>
              )}
              <div className="text-[13px] font-bold tracking-[0.15em] uppercase text-white/60 mb-5">{t.name}</div>
              <div className="text-[56px] font-extrabold text-white leading-none tracking-[-0.03em]">{t.price}</div>
              <div className="text-[13px] text-white/30 mt-1.5">{t.unit}</div>
              {t.fee && (
                <div className="text-[13px] text-white/60 mt-6 mb-7 px-3.5 py-3 bg-white/[0.04] border border-white/[0.06] rounded-lg">
                  {t.name === 'Max' ? <strong className="text-white font-bold">{t.fee}</strong> : t.fee}
                </div>
              )}
              {!t.fee && <div className="mt-6 mb-7" />}
              <ul className="space-y-3 mb-8 flex-1">
                {t.features.map(f => (
                  <li key={f} className="flex gap-2.5 text-[13px] text-white/40">
                    <span className="text-white/20 text-sm">+</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href={t.name === 'Enterprise' ? 'mailto:info@epuredrive.com?subject=Enterprise%20Inquiry' : '/sign-up'}
                className={`block text-center py-3.5 rounded-full text-sm font-semibold transition-all ${t.ctaStyle}`}>
                {t.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
