'use client'

import Image from 'next/image'

const SCREENS = [
  {
    src: '/assets/screenshots/dash-bookings.png',
    alt: 'Bookings dashboard',
    label: 'Bookings',
  },
  {
    src: '/assets/screenshots/dash-overview.png',
    alt: 'Overview dashboard',
    label: 'Overview',
  },
  {
    src: '/assets/screenshots/dash-fleet.png',
    alt: 'Fleet dashboard',
    label: 'Fleet',
  },
]

export default function ProductShowcase() {
  return (
    <section className="relative py-24 bg-black overflow-hidden" id="product">
      <div className="section-divider absolute top-0 left-0 right-0" />

      {/* Ambient glow behind the screenshots */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[400px] rounded-full bg-white/[0.025] blur-[120px]" />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="text-[11px] font-bold tracking-[0.3em] text-white/25 uppercase block mb-4">
            Product
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            See it in action
          </h2>
          <p className="text-lg text-white/35 font-light">
            Built for operators who run lean and move fast.
          </p>
        </div>

        {/* Mosaic: 3 screenshots staggered with perspective */}
        <div
          className="relative flex items-center justify-center"
          style={{ perspective: '1200px' }}
        >
          {/* Left screenshot */}
          <div
            className="hidden lg:block relative w-[42%] flex-shrink-0"
            style={{
              transform: 'rotateY(18deg) translateX(60px) scale(0.88)',
              transformOrigin: 'right center',
              zIndex: 5,
              marginRight: '-80px',
            }}
          >
            <ScreenFrame src={SCREENS[0].src} alt={SCREENS[0].alt} label={SCREENS[0].label} />
          </div>

          {/* Center screenshot — hero */}
          <div
            className="relative w-full lg:w-[56%] flex-shrink-0"
            style={{ zIndex: 20 }}
          >
            <ScreenFrame src={SCREENS[1].src} alt={SCREENS[1].alt} label={SCREENS[1].label} isCenter />
          </div>

          {/* Right screenshot */}
          <div
            className="hidden lg:block relative w-[42%] flex-shrink-0"
            style={{
              transform: 'rotateY(-18deg) translateX(-60px) scale(0.88)',
              transformOrigin: 'left center',
              zIndex: 5,
              marginLeft: '-80px',
            }}
          >
            <ScreenFrame src={SCREENS[2].src} alt={SCREENS[2].alt} label={SCREENS[2].label} />
          </div>
        </div>

        {/* Mobile: stacked cards */}
        <div className="flex flex-col gap-6 lg:hidden mt-6">
          {SCREENS.map((s) => (
            <ScreenFrame key={s.src} src={s.src} alt={s.alt} label={s.label} />
          ))}
        </div>
      </div>
    </section>
  )
}

function ScreenFrame({
  src,
  alt,
  label,
  isCenter = false,
}: {
  src: string
  alt: string
  label: string
  isCenter?: boolean
}) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={`relative rounded-2xl overflow-hidden border transition-all ${
          isCenter
            ? 'border-white/20 shadow-[0_40px_100px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.06)]'
            : 'border-white/[0.07] shadow-[0_20px_60px_rgba(0,0,0,0.6)]'
        }`}
      >
        {/* Browser chrome */}
        <div className="bg-[#161616] px-4 py-2.5 flex items-center gap-2 border-b border-white/[0.06]">
          <div className="flex gap-1.5 flex-shrink-0">
            <div className="w-2.5 h-2.5 rounded-full bg-[#3a3a3a]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#3a3a3a]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#3a3a3a]" />
          </div>
          <div className="flex-1 mx-3">
            <div className="bg-white/[0.04] rounded-md px-3 py-1 text-[10px] text-white/20 font-mono text-center max-w-[220px] mx-auto">
              app.epuredrive.com
            </div>
          </div>
        </div>

        {/* Screenshot + privacy mask */}
        <div className="relative">
          <Image
            src={src}
            alt={alt}
            width={1440}
            height={900}
            className="w-full object-cover block"
          />

          {/*
            Privacy mask — covers the top-right region of the dashboard
            where user email / avatar appears in the nav bar.
            Uses a hard fill + a soft blur bleed so it looks intentional.
          */}
          <div
            className="absolute top-0 right-0 pointer-events-none"
            style={{ width: '22%', height: '7.5%', minHeight: 28 }}
          >
            {/* Hard fill matching the dashboard nav background */}
            <div className="absolute inset-0 bg-[#0f1117]" />
            {/* Soft left bleed so the mask doesn't have a sharp edge */}
            <div
              className="absolute inset-y-0 left-0 w-16"
              style={{
                background:
                  'linear-gradient(to right, transparent, #0f1117)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Screen label */}
      <span className="mt-3 text-[10px] uppercase tracking-[0.25em] text-white/25 font-medium">
        {label}
      </span>
    </div>
  )
}
