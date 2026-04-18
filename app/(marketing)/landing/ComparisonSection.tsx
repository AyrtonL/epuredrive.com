export default function ComparisonSection() {
  return (
    <section id="compare" className="relative py-36 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-[#080808] to-black" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[600px] bg-[radial-gradient(50%_50%_at_50%_50%,rgba(255,255,255,0.09),transparent)] pointer-events-none opacity-50" />

      <div className="max-w-[1280px] mx-auto px-8 relative z-10">
        <div className="text-center max-w-[720px] mx-auto mb-16">
          <div className="flex items-center gap-3 justify-center mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
            <span className="text-[11px] font-bold tracking-[0.25em] text-white/50 uppercase">The difference</span>
          </div>
          <h2 className="text-[clamp(40px,5vw,64px)] font-extrabold text-white leading-[1.05] tracking-[-0.02em] mb-4">
            Keep more of what you earn.
          </h2>
          <p className="text-lg text-white/50 font-light max-w-[560px] mx-auto">
            Most rental platforms take up to a quarter of every booking. On Max, we take nothing. The math is simple.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 border border-white/[0.08] rounded-3xl overflow-hidden">
          {/* Them */}
          <div className="p-16 md:p-20 bg-white/[0.02]">
            <div className="text-[11px] tracking-[0.25em] uppercase font-bold text-white/35 mb-6">Platform fees, typical</div>
            <div className="text-[clamp(100px,13vw,180px)] font-black leading-[0.9] tracking-[-0.05em] text-white/35 italic mb-4">
              −25<span className="text-[0.5em]">%</span>
            </div>
            <p className="text-sm text-white/40 max-w-[280px] leading-relaxed">
              A quarter of every rental gone before it hits your account. Every week. Every month.
            </p>
          </div>
          {/* You */}
          <div className="p-16 md:p-20 bg-black border-t md:border-t-0 md:border-l border-white/[0.08]">
            <div className="text-[11px] tracking-[0.25em] uppercase font-bold text-white mb-6">éPure Drive · Max tier</div>
            <div className="text-[clamp(100px,13vw,180px)] font-black leading-[0.9] tracking-[-0.05em] text-white mb-4">
              0<span className="text-[0.5em]">%</span>
            </div>
            <p className="text-sm text-white/40 max-w-[280px] leading-relaxed">
              Flat $99/mo. No transaction cut. Your revenue stays your revenue — predictably, forever.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
