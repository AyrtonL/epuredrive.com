import Link from 'next/link'

export default function HeroSection() {
  return (
    <section className="relative min-h-[calc(100vh-64px)] flex items-center overflow-hidden">
      <div className="max-w-[1280px] mx-auto px-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          {/* Left - Content */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
              <span className="text-[11px] font-bold tracking-[0.25em] text-white/50 uppercase">
                Premium Fleet Platform · Miami
              </span>
            </div>
            <h1 className="text-[clamp(56px,9vw,140px)] font-extrabold text-white leading-[0.92] tracking-[-0.035em] mb-8">
              The <em className="italic font-black text-white/35">premium</em>
              <br />fleet platform.
            </h1>
            <p className="text-[clamp(17px,1.4vw,20px)] leading-relaxed text-white/50 font-light max-w-[540px] mb-10">
              One platform to manage your fleet, your bookings, your site, and your payments — with a zero-fee tier when you&apos;re ready to scale.
            </p>
            <div className="flex gap-3.5 flex-wrap mb-8">
              <Link href="/sign-up" className="inline-flex items-center gap-2 px-7 py-4 rounded-full bg-white text-black text-[15px] font-semibold hover:shadow-[0_0_50px_rgba(255,255,255,0.3)] hover:-translate-y-0.5 transition-all">
                Launch your business →
              </Link>
              <Link href="/demo" className="inline-flex items-center gap-2 px-7 py-4 rounded-full bg-transparent text-white text-[15px] font-semibold border border-white/20 hover:bg-white/[0.06] hover:border-white/35 transition-all">
                See a demo
              </Link>
            </div>
            <div className="flex gap-6 flex-wrap text-[12px] text-white/35">
              {['No credit card', 'Free forever to start', 'Setup in 12 minutes'].map((t, i) => (
                <span key={t} className="flex items-center gap-2">
                  {i > 0 && <span className="w-1 h-1 rounded-full bg-white/20" />}
                  {t}
                </span>
              ))}
            </div>
          </div>
          {/* Right - Geometric */}
          <div className="flex justify-center">
            <div className="relative aspect-square w-full max-w-[560px]">
              {/* Concentric circles */}
              <div className="absolute inset-0 rounded-full border border-white/[0.08]" />
              <div className="absolute inset-[12%] rounded-full border border-white/[0.12]" />
              <div className="absolute inset-[28%] rounded-full border border-white/[0.16]" />
              <div className="absolute inset-[44%] rounded-full border border-white/20" />
              <div className="absolute inset-[56%] rounded-full bg-white" />
              {/* Dots */}
              <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white" />
              <div className="absolute top-1/2 right-[4%] -translate-y-1/2 w-2 h-2 rounded-full bg-white" />
              <div className="absolute bottom-[12%] left-[28%] w-1.5 h-1.5 rounded-full bg-white/60" />
              {/* Tick marks */}
              <svg viewBox="0 0 560 560" className="absolute inset-0 w-full h-full">
                {Array.from({length: 12}).map((_, i) => {
                  const a = (i / 12) * Math.PI * 2
                  const r1 = 278, r2 = 272
                  const x1 = 280 + Math.cos(a) * r1, y1 = 280 + Math.sin(a) * r1
                  const x2 = 280 + Math.cos(a) * r2, y2 = 280 + Math.sin(a) * r2
                  return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
                })}
              </svg>
              {/* Labels */}
              <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 text-[10px] tracking-[0.3em] text-white/35 font-bold uppercase">éPure Drive</div>
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-[9px] tracking-[0.2em] text-white/35">EST. 2026 · MIAMI</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
