'use client'

import Image from 'next/image'

type Lang = 'en' | 'es'

const COPY: Record<Lang, { pill: string; title: string; subtitle: string; more: string }> = {
  en: {
    pill: 'Product',
    title: 'See it in action',
    subtitle: 'Built for operators who run lean and move fast.',
    more: 'More from the dashboard',
  },
  es: {
    pill: 'Producto',
    title: 'Vélo en acción',
    subtitle: 'Hecho para operadores que van al grano y se mueven rápido.',
    more: 'Más vistas del panel',
  },
}

const SCREEN_LABELS: Record<Lang, { bookings: string; dashboard: string; fleet: string; calendar: string; roi: string; taxes: string; payments: string; quickbooks: string }> = {
  en: {
    bookings: 'Bookings',
    dashboard: 'Dashboard',
    fleet: 'Fleet',
    calendar: 'Calendar',
    roi: 'ROI Analysis',
    taxes: 'Tax Reports',
    payments: 'Payments',
    quickbooks: 'QuickBooks',
  },
  es: {
    bookings: 'Reservas',
    dashboard: 'Panel',
    fleet: 'Flota',
    calendar: 'Calendario',
    roi: 'Análisis de ROI',
    taxes: 'Reportes de impuestos',
    payments: 'Pagos',
    quickbooks: 'QuickBooks',
  },
}

function getScreens(lang: Lang) {
  const l = SCREEN_LABELS[lang]
  return [
    { src: '/assets/screenshots/dash-bookings.png', alt: 'Bookings dashboard', label: l.bookings, url: 'app.epuredrive.com' },
    { src: '/assets/screenshots/dash-main.png', alt: 'Main dashboard', label: l.dashboard, url: 'app.epuredrive.com' },
    { src: '/assets/screenshots/dash-fleet.png', alt: 'Fleet dashboard', label: l.fleet, url: 'app.epuredrive.com' },
  ]
}

function getMoreScreens(lang: Lang) {
  const l = SCREEN_LABELS[lang]
  return [
    { src: '/assets/screenshots/dash-calendar.png', alt: 'Visual calendar with all reservations', label: l.calendar },
    { src: '/assets/screenshots/dash-roi.png', alt: 'Revenue and ROI analysis per vehicle', label: l.roi },
    { src: '/assets/screenshots/dash-taxes.png', alt: 'Tax management and reporting', label: l.taxes },
    { src: '/assets/screenshots/dash-payments.png', alt: 'Payment processing and transactions', label: l.payments },
    { src: '/assets/screenshots/dash-quickbooks.png', alt: 'QuickBooks integration for accounting', label: l.quickbooks },
  ]
}

export default function ProductShowcase({ lang = 'en' }: { lang?: Lang }) {
  const t = COPY[lang]
  const SCREENS = getScreens(lang)
  const MORE_SCREENS = getMoreScreens(lang)
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
          <div className="inline-flex items-center gap-2 bg-white/[0.05] border border-white/[0.09] rounded-full px-4 py-1.5 mb-5">
            <span className="text-[11px] font-bold tracking-[0.25em] text-white/40 uppercase">{t.pill}</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            {t.title}
          </h2>
          <p className="text-lg text-white/40 font-light">
            {t.subtitle}
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
            <ScreenFrame src={SCREENS[0].src} alt={SCREENS[0].alt} label={SCREENS[0].label} url={SCREENS[0].url} />
          </div>

          {/* Center screenshot — hero */}
          <div
            className="relative w-full lg:w-[56%] flex-shrink-0"
            style={{ zIndex: 20 }}
          >
            <ScreenFrame src={SCREENS[1].src} alt={SCREENS[1].alt} label={SCREENS[1].label} url={SCREENS[1].url} isCenter />
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
            <ScreenFrame src={SCREENS[2].src} alt={SCREENS[2].alt} label={SCREENS[2].label} url={SCREENS[2].url} />
          </div>
        </div>

        {/* Mobile: stacked cards */}
        <div className="flex flex-col gap-6 lg:hidden mt-6">
          {SCREENS.map((s) => (
            <ScreenFrame key={s.src} src={s.src} alt={s.alt} label={s.label} url={s.url} />
          ))}
        </div>

        {/* More dashboard views */}
        <div className="mt-20">
          <p className="text-center text-[11px] font-bold tracking-[0.3em] text-white/20 uppercase mb-8">
            {t.more}
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {MORE_SCREENS.map((s) => (
              <ScreenFrame key={s.src} src={s.src} alt={s.alt} label={s.label} url="app.epuredrive.com" />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function ScreenFrame({
  src,
  alt,
  label,
  url = 'app.epuredrive.com',
  isCenter = false,
}: {
  src: string
  alt: string
  label: string
  url?: string
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
              {url}
            </div>
          </div>
        </div>

        {/* Screenshot + privacy masks */}
        <div className="relative">
          <Image
            src={src}
            alt={alt}
            width={1440}
            height={900}
            className="w-full object-cover block"
          />

          {/*
            Privacy mask A — covers the top-right region of the dashboard
            where user email / avatar appears in the nav bar.
          */}
          <div
            className="absolute top-0 right-0 pointer-events-none"
            style={{ width: '22%', height: '7.5%', minHeight: 28 }}
          >
            <div className="absolute inset-0 bg-[#0f1117]" />
            <div
              className="absolute inset-y-0 left-0 w-16"
              style={{ background: 'linear-gradient(to right, transparent, #0f1117)' }}
            />
          </div>

          {/*
            Privacy mask B — covers the sidebar footer (bottom-left) where
            the user email and role badge appear.
          */}
          <div
            className="absolute bottom-0 left-0 pointer-events-none"
            style={{ width: '18%', height: '14%', minHeight: 40 }}
          >
            <div className="absolute inset-0 bg-[#0d0d0d]" />
            {/* Soft top bleed */}
            <div
              className="absolute top-0 left-0 right-0 h-8"
              style={{ background: 'linear-gradient(to bottom, transparent, #0d0d0d)' }}
            />
            {/* Soft right bleed */}
            <div
              className="absolute inset-y-0 right-0 w-6"
              style={{ background: 'linear-gradient(to left, transparent, #0d0d0d)' }}
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
