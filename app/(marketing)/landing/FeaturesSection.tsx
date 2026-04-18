import Image from 'next/image'

const FEATURES = [
  {
    eyebrow: '01 · Your brand',
    title: 'Your branded fleet page, live the same afternoon.',
    desc: 'Launch a professional rental site showcasing your vehicles — with real-time availability, pricing, and your brand. No code, no developer, no waiting.',
    bullets: ['Custom subdomain included', 'Live availability calendar', 'Auto-syncs with your inventory'],
    screenshot: '/assets/screenshots/site-fleet.png',
    url: 'miami-rides.epuredrive.com',
    reverse: false,
  },
  {
    eyebrow: '02 · Bookings',
    title: 'Every booking, under one roof.',
    desc: 'Track all your rentals in one place — who booked, which vehicle, dates, amounts, and status. Automated confirmations keep customers informed without lifting a finger.',
    bullets: ['Turo & iCal sync', 'Automated confirmations', 'Customer records per booking'],
    screenshot: '/assets/screenshots/dash-bookings.png',
    url: 'app.epuredrive.com / bookings',
    reverse: true,
  },
  {
    eyebrow: '03 · Revenue',
    title: 'Own the money. All of it.',
    desc: 'Online payments through Stripe and Square, clean reporting, QuickBooks sync, and tax management. On the Max tier, there\'s no platform cut — every dollar collected is yours.',
    bullets: ['Stripe + Square out of the box', 'QuickBooks sync on Max', 'Tax reports in one click'],
    screenshot: '/assets/screenshots/dash-overview.png',
    url: 'app.epuredrive.com',
    reverse: false,
  },
]

function BrowserMockup({ src, url, alt }: { src: string; url: string; alt: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] overflow-hidden bg-[#0a0a0a] shadow-[0_24px_60px_rgba(0,0,0,0.5)]">
      <div className="h-9 bg-white/[0.02] border-b border-white/[0.08] flex items-center px-4 gap-2">
        <div className="w-2.5 h-2.5 rounded-full bg-white/[0.15]" />
        <div className="w-2.5 h-2.5 rounded-full bg-white/[0.15]" />
        <div className="w-2.5 h-2.5 rounded-full bg-white/[0.15]" />
        <span className="ml-3 text-[11px] text-white/35 font-mono">{url}</span>
      </div>
      <Image src={src} alt={alt} width={800} height={500} className="w-full" />
    </div>
  )
}

export default function FeaturesSection() {
  return (
    <section id="platform" className="py-24">
      <div className="max-w-[1280px] mx-auto px-8">
        <div className="max-w-[720px] mb-10">
          <div className="flex items-center gap-3 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
            <span className="text-[11px] font-bold tracking-[0.25em] text-white/50 uppercase">The platform</span>
          </div>
          <h2 className="text-[clamp(40px,5vw,64px)] font-extrabold text-white leading-[1.05] tracking-[-0.02em] mb-5">
            Fleet, bookings, and payments —
            <br /><span className="text-white/35 italic font-black">one dashboard.</span>
          </h2>
          <p className="text-lg text-white/50 font-light leading-relaxed max-w-[560px]">
            Stop juggling spreadsheets, text threads, and calendar apps. Run your rental business from a single place — and make it look effortless.
          </p>
        </div>

        <div className="space-y-0">
          {FEATURES.map((f) => (
            <div key={f.eyebrow} className={`grid grid-cols-1 lg:grid-cols-[1fr_1.3fr] gap-20 items-center py-20 border-b border-white/[0.06] ${f.reverse ? 'lg:grid-cols-[1.3fr_1fr]' : ''}`}>
              <div className={f.reverse ? 'lg:order-2' : ''}>
                <span className="text-[11px] font-bold tracking-[0.25em] text-white/50 uppercase">{f.eyebrow}</span>
                <h3 className="text-[clamp(32px,3.5vw,44px)] font-bold text-white leading-[1.05] tracking-[-0.025em] mt-4 mb-5">{f.title}</h3>
                <p className="text-[17px] leading-relaxed text-white/50 font-light mb-7 max-w-[440px]">{f.desc}</p>
                <ul className="space-y-3.5">
                  {f.bullets.map(b => (
                    <li key={b} className="flex items-center gap-3 text-sm text-white/60">
                      <span className="w-4 h-px bg-white/30 shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
              <div className={f.reverse ? 'lg:order-1' : ''}>
                <BrowserMockup src={f.screenshot} url={f.url} alt={f.title} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
