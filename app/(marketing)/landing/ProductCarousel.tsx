import Image from 'next/image'

const PRODUCTS = [
  { url: 'app.epuredrive.com / bookings', label: '01', src: '/assets/screenshots/dash-bookings.png' },
  { url: 'app.epuredrive.com', label: '02', src: '/assets/screenshots/dash-overview.png' },
  { url: 'miami-rides.epuredrive.com', label: '03', src: '/assets/screenshots/site-fleet.png' },
]

export default function ProductCarousel() {
  return (
    <section className="py-28 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.03),transparent_60%)]">
      <div className="max-w-[1280px] mx-auto px-8 mb-10">
        <div className="flex items-center gap-3 mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
          <span className="text-[11px] font-bold tracking-[0.25em] text-white/50 uppercase">Product · Live</span>
        </div>
        <h2 className="text-[clamp(40px,5vw,64px)] font-extrabold text-white leading-[1.05] tracking-[-0.02em] max-w-[720px]">
          Built for operators who run lean and <span className="text-white/35 italic font-black">move fast.</span>
        </h2>
      </div>
      <div className="flex gap-6 overflow-x-auto px-8 pb-4 snap-x snap-mandatory scrollbar-hide">
        {PRODUCTS.map(p => (
          <div key={p.label} className="flex-none w-[520px] snap-center border border-white/[0.08] rounded-3xl overflow-hidden bg-white/[0.02]">
            <div className="px-5 py-3.5 border-b border-white/[0.08] flex items-center justify-between text-[11px] text-white/35 tracking-[0.1em]">
              <span>{p.url}</span>
              <span>{p.label}</span>
            </div>
            <div className="aspect-[16/10] bg-[#0a0a0a] relative">
              <Image src={p.src} alt={p.url} fill className="object-cover object-top" />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
