const BADGES = [
  {
    title: 'Stripe-secured payments',
    sub: 'PCI-compliant processing',
  },
  {
    title: 'SSL encrypted',
    sub: 'Bank-grade security on every booking',
  },
  {
    title: 'Built by rental operators',
    sub: 'Designed for indie fleets, not enterprise bloat',
  },
  {
    title: 'Cancel anytime',
    sub: 'No contracts, no hidden fees',
  },
]

export default function TrustBar() {
  return (
    <section className="relative bg-black py-16">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {BADGES.map((b) => (
            <div
              key={b.title}
              className="flex flex-col items-start gap-1 p-5 rounded-xl border border-white/[0.06] bg-white/[0.02]"
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-400/80 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-semibold text-white">{b.title}</span>
              </div>
              <span className="text-xs text-charcoal font-light">{b.sub}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
