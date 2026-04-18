import Link from 'next/link'

export default function FinalCTA() {
  return (
    <section className="relative py-40 text-center overflow-hidden border-t border-white/[0.06]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.05),transparent_60%)] pointer-events-none" />
      <div className="max-w-[1280px] mx-auto px-8 relative z-10">
        <div className="flex items-center gap-3 justify-center mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
          <span className="text-[11px] font-bold tracking-[0.25em] text-white/50 uppercase">Ready to launch</span>
        </div>
        <h2 className="text-[clamp(56px,8vw,120px)] font-extrabold text-white leading-[0.95] tracking-[-0.035em] mb-8 max-w-[900px] mx-auto">
          Your fleet.<br /><em className="italic text-white/35 font-black">Online today.</em>
        </h2>
        <p className="text-lg text-white/50 font-light max-w-[520px] mx-auto mb-10">
          Join the rental operators running their business on éPure Drive. Set up in 12 minutes. No credit card required.
        </p>
        <div className="flex gap-3.5 flex-wrap justify-center mb-10">
          <Link href="/sign-up" className="inline-flex items-center gap-2 px-7 py-4 rounded-full bg-white text-black text-[15px] font-semibold hover:shadow-[0_0_50px_rgba(255,255,255,0.3)] hover:-translate-y-0.5 transition-all">
            Launch your business →
          </Link>
          <Link href="/demo" className="inline-flex items-center gap-2 px-7 py-4 rounded-full bg-transparent text-white text-[15px] font-semibold border border-white/20 hover:bg-white/[0.06] hover:border-white/35 transition-all">
            See a demo
          </Link>
        </div>
        <div className="flex gap-6 flex-wrap justify-center text-[12px] text-white/35">
          {['No credit card', 'Cancel anytime', 'Free forever to start'].map((t, i) => (
            <span key={t} className="flex items-center gap-2">
              {i > 0 && <span className="w-1 h-1 rounded-full bg-white/20" />}
              {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
