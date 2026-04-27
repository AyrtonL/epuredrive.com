'use client'

import Image from 'next/image'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

type Lang = 'en' | 'es'

interface Step {
  src: string
  alt: string
  url: string
  number: string
  title: string
  description: string
  hotspot?: { top: string; left: string; label: string }
}

interface Copy {
  badge: string
  title: string
  subtitle: string
  next: string
  prev: string
  restart: string
  pauseLabel: string
  playLabel: string
  stepLabel: string
  steps: Step[]
}

const COPY: Record<Lang, Copy> = {
  en: {
    badge: 'Interactive tour',
    title: 'Five clicks. The whole product.',
    subtitle:
      'Click through the actual screens — no signup, no sales call. This is what your operation looks like on day one.',
    next: 'Next',
    prev: 'Back',
    restart: 'Restart tour',
    pauseLabel: 'Pause auto-advance',
    playLabel: 'Resume auto-advance',
    stepLabel: 'Step',
    steps: [
      {
        src: '/assets/screenshots/site-fleet.webp',
        alt: 'Branded fleet site for the tenant',
        url: 'yourbrand.epuredrive.com',
        number: '01',
        title: 'Your branded site goes live in 30 seconds',
        description:
          'Pick a subdomain, upload your fleet, set rates. Your customers book directly from a site that looks like yours — not ours.',
        hotspot: { top: '22%', left: '50%', label: 'Live availability' },
      },
      {
        src: '/assets/screenshots/dash-bookings.webp',
        alt: 'Bookings dashboard',
        url: 'app.epuredrive.com/bookings',
        number: '02',
        title: 'Every booking, one inbox',
        description:
          'See who booked, which vehicle, dates, amounts and status. Auto-confirmations and reminders fire without you lifting a finger.',
        hotspot: { top: '40%', left: '25%', label: 'All statuses in one view' },
      },
      {
        src: '/assets/screenshots/dash-calendar.webp',
        alt: 'Visual fleet calendar',
        url: 'app.epuredrive.com/calendar',
        number: '03',
        title: 'See the whole fleet at a glance',
        description:
          'Drag-friendly timeline shows every vehicle, every reservation, conflicts and free days. No more cross-checking spreadsheets.',
        hotspot: { top: '50%', left: '60%', label: 'Visual conflict detection' },
      },
      {
        src: '/assets/screenshots/dash-payments.webp',
        alt: 'Online payments and deposits',
        url: 'app.epuredrive.com/payments',
        number: '04',
        title: 'Get paid online — deposits and balance',
        description:
          'Stripe and Square plug in once. Deposits at booking, balance at pickup, refunds in a click. Payouts go straight to your bank.',
        hotspot: { top: '35%', left: '70%', label: 'Stripe + Square, native' },
      },
      {
        src: '/assets/screenshots/dash-roi.webp',
        alt: 'Revenue and ROI per vehicle',
        url: 'app.epuredrive.com/finance/roi',
        number: '05',
        title: 'Know your numbers, per vehicle',
        description:
          'Revenue, utilization, ROI and tax-ready reports — all auto-calculated from your bookings. Decide what to keep, what to sell, what to add.',
        hotspot: { top: '45%', left: '40%', label: 'ROI per car, automatic' },
      },
    ],
  },
  es: {
    badge: 'Tour interactivo',
    title: 'Cinco clics. Todo el producto.',
    subtitle:
      'Recorré las pantallas reales — sin registro, sin llamada de ventas. Así se ve tu operación desde el día uno.',
    next: 'Siguiente',
    prev: 'Atrás',
    restart: 'Reiniciar tour',
    pauseLabel: 'Pausar avance automático',
    playLabel: 'Reanudar avance automático',
    stepLabel: 'Paso',
    steps: [
      {
        src: '/assets/screenshots/site-fleet.webp',
        alt: 'Sitio público con la marca del tenant',
        url: 'tumarca.epuredrive.com',
        number: '01',
        title: 'Tu sitio con tu marca, online en 30 segundos',
        description:
          'Elegí subdominio, subí tu flota, definí precios. Tus clientes reservan desde un sitio que parece tuyo — no nuestro.',
        hotspot: { top: '22%', left: '50%', label: 'Disponibilidad en vivo' },
      },
      {
        src: '/assets/screenshots/dash-bookings.webp',
        alt: 'Panel de reservas',
        url: 'app.epuredrive.com/bookings',
        number: '02',
        title: 'Todas las reservas en un solo inbox',
        description:
          'Quién reservó, qué vehículo, fechas, montos y estado. Confirmaciones y recordatorios automáticos sin que muevas un dedo.',
        hotspot: { top: '40%', left: '25%', label: 'Todos los estados en una vista' },
      },
      {
        src: '/assets/screenshots/dash-calendar.webp',
        alt: 'Calendario visual de la flota',
        url: 'app.epuredrive.com/calendar',
        number: '03',
        title: 'Toda la flota de un vistazo',
        description:
          'Timeline visual con cada vehículo, reserva, conflicto y día libre. Se acabó el cruce de planillas.',
        hotspot: { top: '50%', left: '60%', label: 'Detección visual de conflictos' },
      },
      {
        src: '/assets/screenshots/dash-payments.webp',
        alt: 'Pagos online y depósitos',
        url: 'app.epuredrive.com/payments',
        number: '04',
        title: 'Cobrá online — seña y saldo',
        description:
          'Stripe y Square se conectan una sola vez. Seña al reservar, saldo al retirar, reembolsos en un clic. La plata va directo a tu cuenta.',
        hotspot: { top: '35%', left: '70%', label: 'Stripe + Square, nativos' },
      },
      {
        src: '/assets/screenshots/dash-roi.webp',
        alt: 'Ingresos y ROI por vehículo',
        url: 'app.epuredrive.com/finance/roi',
        number: '05',
        title: 'Tus números, vehículo por vehículo',
        description:
          'Ingresos, utilización, ROI y reportes listos para impuestos — calculados desde tus reservas. Decidí qué conservar, vender o sumar.',
        hotspot: { top: '45%', left: '40%', label: 'ROI por auto, automático' },
      },
    ],
  },
}

const AUTO_ADVANCE_MS = 6000

interface Props {
  lang?: Lang
}

export default function InteractiveTour({ lang = 'en' }: Props) {
  const t = COPY[lang]
  const stepCount = t.steps.length
  const [active, setActive] = useState<number>(0)
  const [paused, setPaused] = useState<boolean>(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const current = useMemo(() => t.steps[active], [t.steps, active])

  const goTo = useCallback(
    (next: number) => {
      const wrapped = ((next % stepCount) + stepCount) % stepCount
      setActive(wrapped)
    },
    [stepCount],
  )

  // Auto-advance unless paused
  useEffect(() => {
    if (paused) return
    const id = window.setTimeout(() => {
      goTo(active + 1)
    }, AUTO_ADVANCE_MS)
    return () => window.clearTimeout(id)
  }, [active, paused, goTo])

  // Pause when user is scrolled away
  useEffect(() => {
    const node = containerRef.current
    if (!node) return
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry) return
        if (!entry.isIntersecting) {
          setPaused(true)
        }
      },
      { threshold: 0.25 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  // Keyboard nav
  useEffect(() => {
    const node = containerRef.current
    if (!node) return
    const handler = (event: KeyboardEvent) => {
      if (!node.contains(document.activeElement)) return
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        goTo(active + 1)
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        goTo(active - 1)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [active, goTo])

  return (
    <section
      ref={containerRef}
      className="relative py-24 bg-black overflow-hidden"
      id="tour"
      aria-roledescription="carousel"
      aria-label={t.title}
    >
      <div className="section-divider absolute top-0 left-0 right-0" />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-1/2 top-1/3 -translate-x-1/2 w-[900px] h-[400px] rounded-full bg-white/[0.025] blur-[120px]" />
      </div>

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-white/[0.05] border border-white/[0.09] rounded-full px-4 py-1.5 mb-5">
            <span className="text-[11px] font-bold tracking-[0.25em] text-charcoal uppercase">{t.badge}</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">{t.title}</h2>
          <p className="text-lg text-charcoal font-light max-w-2xl mx-auto">{t.subtitle}</p>
        </div>

        {/* Stepper */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8" role="tablist">
          {t.steps.map((step, i) => {
            const isActive = i === active
            const isDone = i < active
            return (
              <button
                key={step.number}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`tour-panel-${i}`}
                id={`tour-tab-${i}`}
                onClick={() => {
                  setPaused(true)
                  goTo(i)
                }}
                className={`group flex items-center gap-2 rounded-full px-4 py-1.5 border transition-all text-[11px] font-bold tracking-[0.2em] uppercase ${
                  isActive
                    ? 'bg-white text-black border-white'
                    : isDone
                      ? 'bg-white/[0.06] border-white/15 text-silver'
                      : 'bg-white/[0.02] border-white/[0.08] text-charcoal hover:border-white/15 hover:text-silver'
                }`}
              >
                <span className="font-mono">{step.number}</span>
                <span className="hidden sm:inline">{t.stepLabel}</span>
              </button>
            )
          })}
        </div>

        {/* Stage */}
        <div
          role="tabpanel"
          id={`tour-panel-${active}`}
          aria-labelledby={`tour-tab-${active}`}
          className="grid lg:grid-cols-[1fr_360px] gap-8 items-start"
        >
          {/* Browser frame with screenshot */}
          <div
            className="relative rounded-2xl overflow-hidden border border-white/[0.08] shadow-[0_40px_100px_rgba(0,0,0,0.7)]"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
          >
            <div className="bg-[#161616] px-4 py-2.5 flex items-center gap-2 border-b border-white/[0.06]">
              <div className="flex gap-1.5 flex-shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-[#3a3a3a]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#3a3a3a]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#3a3a3a]" />
              </div>
              <div className="flex-1 mx-3">
                <div className="bg-white/[0.04] rounded-md px-3 py-1 text-[10px] text-white/40 font-mono text-center max-w-[280px] mx-auto truncate">
                  {current.url}
                </div>
              </div>
            </div>

            <div className="relative bg-[#0a0a0a]">
              <Image
                src={current.src}
                alt={current.alt}
                width={1440}
                height={900}
                className="w-full h-auto block transition-opacity duration-300"
                priority={active === 0}
              />

              {/* Hotspot annotation */}
              {current.hotspot && (
                <div
                  className="absolute pointer-events-none"
                  style={{ top: current.hotspot.top, left: current.hotspot.left }}
                >
                  <div className="relative -translate-x-1/2 -translate-y-1/2">
                    <span className="absolute -inset-3 rounded-full bg-emerald-400/20 animate-ping" />
                    <span className="relative block w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(16,185,129,0.25)]" />
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 whitespace-nowrap text-[11px] font-medium bg-black/85 text-white px-2.5 py-1 rounded-md border border-white/15">
                      {current.hotspot.label}
                    </span>
                  </div>
                </div>
              )}

              {/* Privacy masks (top-right + bottom-left) */}
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
              <div
                className="absolute bottom-0 left-0 pointer-events-none"
                style={{ width: '18%', height: '14%', minHeight: 40 }}
              >
                <div className="absolute inset-0 bg-[#0d0d0d]" />
                <div
                  className="absolute top-0 left-0 right-0 h-8"
                  style={{ background: 'linear-gradient(to bottom, transparent, #0d0d0d)' }}
                />
              </div>
            </div>

            {/* Auto-advance progress bar */}
            <div className="h-0.5 bg-white/[0.04]">
              <div
                key={`${active}-${paused}`}
                className={`h-full bg-emerald-400/70 ${paused ? '' : 'tour-progress-bar'}`}
                style={{ width: paused ? '0%' : '100%' }}
              />
            </div>
          </div>

          {/* Side panel: title + description + controls */}
          <div className="flex flex-col gap-6">
            <div>
              <div className="text-[11px] font-bold tracking-[0.25em] text-charcoal/70 uppercase mb-3 font-mono">
                {t.stepLabel} {current.number} / {String(stepCount).padStart(2, '0')}
              </div>
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-4 tracking-tight leading-tight">
                {current.title}
              </h3>
              <p className="text-grey font-light leading-relaxed">{current.description}</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setPaused(true)
                  goTo(active - 1)
                }}
                className="flex items-center gap-2 bg-white/[0.05] hover:bg-white/[0.10] text-silver text-sm font-medium px-4 py-2.5 rounded-lg border border-white/[0.10] transition-colors"
                aria-label={t.prev}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                <span className="hidden sm:inline">{t.prev}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaused(true)
                  goTo(active + 1)
                }}
                className="flex-1 flex items-center justify-center gap-2 bg-white text-black text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-white/90 transition-colors"
                aria-label={t.next}
              >
                <span>{active === stepCount - 1 ? t.restart : t.next}</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>

              <button
                type="button"
                onClick={() => setPaused((p) => !p)}
                className="bg-white/[0.05] hover:bg-white/[0.10] text-silver px-3 py-2.5 rounded-lg border border-white/[0.10] transition-colors"
                aria-label={paused ? t.playLabel : t.pauseLabel}
              >
                {paused ? (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="section-divider absolute bottom-0 left-0 right-0" />

      <style jsx>{`
        @keyframes tour-progress {
          from { width: 0% }
          to { width: 100% }
        }
        :global(.tour-progress-bar) {
          animation: tour-progress ${AUTO_ADVANCE_MS}ms linear forwards;
        }
      `}</style>
    </section>
  )
}
