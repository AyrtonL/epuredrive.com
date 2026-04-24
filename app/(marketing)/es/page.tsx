// app/(marketing)/es/page.tsx
import type { Metadata } from 'next'
import Image from 'next/image'
import ProductShowcase from '../ProductShowcase'
import ContactSection from '@/components/marketing/ContactSection'
import TrackedCTA from '@/components/marketing/TrackedCTA'
import TrustBar from '@/components/marketing/TrustBar'
import HowItWorks from '@/components/marketing/HowItWorks'
import FAQ from '@/components/marketing/FAQ'
import DemoVideo from '@/components/marketing/DemoVideo'
import JsonLd from '@/components/JsonLd'
import {
  buildOrganizationSchema,
  buildWebSiteSchema,
  buildSoftwareApplicationSchema,
  buildPricingPlanSchema,
  buildVideoObjectSchema,
} from '@/lib/utils/jsonld'

const PRICING_PLANS_ES = [
  {
    name: 'Starter',
    price: 0,
    billingPeriod: 'month' as const,
    description:
      'Plan gratis para siempre — hasta 5 vehículos, sitio de reservas con tu marca en subdominio {slug}.epuredrive.com, calendario de disponibilidad en vivo y gestión completa de reservas.',
    features: ['Hasta 5 vehículos', 'Página de flota con tu marca', 'Gestión de reservas'],
    url: 'https://epuredrive.com/sign-up',
  },
  {
    name: 'Pro',
    price: 19,
    billingPeriod: 'month' as const,
    description:
      'Hasta 25 vehículos, personalización completa de marca, pagos online con Stripe y Square, gestión de impuestos y miembros de equipo ilimitados.',
    features: ['Hasta 25 vehículos', 'Pagos online', 'Reportes fiscales'],
    url: 'https://epuredrive.com/sign-up?plan=pro',
  },
  {
    name: 'Max',
    price: 39,
    billingPeriod: 'month' as const,
    description:
      'Hasta 60 vehículos, 0% de comisión en pagos online, sincronización con QuickBooks, acceso a API y soporte prioritario.',
    features: ['Hasta 60 vehículos', 'Sincronización con QuickBooks', 'Acceso a API'],
    url: 'https://epuredrive.com/sign-up?plan=max',
  },
]

const SEO_TITLE = 'Software para Rent a Car — Tu sitio de reservas en minutos | éPure Drive'
const SEO_DESCRIPTION =
  'Software de gestión de flota para empresas de alquiler de autos independientes. Lanzá tu sitio de reservas con tu marca, aceptá pagos online y manejá cada vehículo desde un solo panel. Plan gratis para siempre — sin tarjeta de crédito.'
const OG_IMAGE = 'https://epuredrive.com/og-image.jpg'

export const metadata: Metadata = {
  title: { absolute: SEO_TITLE },
  description: SEO_DESCRIPTION,
  alternates: {
    canonical: 'https://epuredrive.com/es',
    languages: {
      en: 'https://epuredrive.com',
      es: 'https://epuredrive.com/es',
      'x-default': 'https://epuredrive.com',
    },
  },
  openGraph: {
    type: 'website',
    locale: 'es_ES',
    url: 'https://epuredrive.com/es',
    siteName: 'éPure Drive',
    title: SEO_TITLE,
    description: SEO_DESCRIPTION,
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'éPure Drive — Software para Rent a Car',
        type: 'image/jpeg',
      },
    ],
    alternateLocale: ['en_US'],
  },
  twitter: {
    card: 'summary_large_image',
    title: SEO_TITLE,
    description: SEO_DESCRIPTION,
    images: [OG_IMAGE],
  },
}

const DEMO_VIDEO_URL = process.env.NEXT_PUBLIC_DEMO_VIDEO_URL

const SPLIT_FEATURES = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3" />
      </svg>
    ),
    title: 'Tu sitio de reservas con tu marca,\nen vivo en minutos.',
    description:
      'Lanzá un sitio profesional de alquiler que muestre tus vehículos — con disponibilidad en tiempo real, precios y tu marca. Sin código, sin desarrollador, sin esperas.',
    bullets: ['Subdominio personalizado incluido', 'Calendario de disponibilidad en vivo', 'Sincroniza con tu inventario'],
    screenshot: '/assets/screenshots/site-fleet.webp',
    alt: 'Sitio público del tenant',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
    title: 'Cada reserva,\nbajo control.',
    description:
      'Llevá todas tus rentas en un solo lugar — quién reservó, qué vehículo, fechas, montos y estado. Las confirmaciones automáticas mantienen informados a tus clientes sin que muevas un dedo.',
    bullets: ['Sincronización con Turo e iCal', 'Confirmaciones automáticas', 'Ficha de cliente por reserva'],
    screenshot: '/assets/screenshots/dash-bookings.webp',
    alt: 'Panel de reservas',
  },
]

export default function HomePageEs() {
  return (
    <>
      {/* ─────────────────── Hero ─────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden" lang="es">
        <div className="absolute inset-0 -z-20">
          <Image
            src="/assets/images/Imagenes/grant-porter-O7qK1vQY3p0-unsplash.jpg"
            alt="Ruta de montaña cinematográfica al atardecer"
            fill
            priority
            className="object-cover object-center"
            sizes="100vw"
          />
        </div>
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/80 via-black/60 to-black" />
        <div className="absolute inset-0 -z-10 bg-warm-glow" />
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black to-transparent -z-10" />

        <div className="max-w-5xl mx-auto px-6 py-32 text-center z-10">
          <div className="inline-flex items-center gap-2.5 bg-white/[0.06] border border-white/[0.12] rounded-full px-4 py-2 mb-8 animate-fade-in">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
            <span className="text-[11px] font-bold tracking-[0.25em] text-grey uppercase">
              Hecho por operadores de rent a car, para operadores de rent a car
            </span>
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold text-white leading-[1.05] mb-6 tracking-tight animate-fade-in-up">
            Software de flota
            <br />
            <span className="text-gradient">para empresas de rent a car.</span>
          </h1>

          <p className="text-lg md:text-xl text-grey max-w-2xl mx-auto mb-12 animate-fade-in-up animation-delay-100 font-light leading-relaxed">
            Lanzá un sitio de reservas con tu marca, aceptá pagos online y
            manejá cada vehículo desde un solo panel. Gratis para empezar —
            sin tarjeta, sin desarrollador, sin llamadas de onboarding.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-5 justify-center animate-fade-in-up animation-delay-200">
            <TrackedCTA
              href="/sign-up"
              location="hero-es"
              className="bg-white text-black font-semibold px-10 py-4 rounded-xl text-base hover:bg-white/90 active:scale-[0.97] transition-all cta-glow"
            >
              Empezar gratis
            </TrackedCTA>
            {DEMO_VIDEO_URL ? (
              <a
                href="#demo"
                className="inline-flex items-center gap-2 text-white/80 text-sm font-medium hover:text-white transition-colors bg-white/[0.06] border border-white/[0.12] px-6 py-3.5 rounded-xl hover:bg-white/[0.10]"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Ver demo de 2 min
              </a>
            ) : (
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 text-white/80 text-sm font-medium hover:text-white transition-colors bg-white/[0.06] border border-white/[0.12] px-6 py-3.5 rounded-xl hover:bg-white/[0.10]"
              >
                Ver cómo funciona →
              </a>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-8 animate-fade-in-up animation-delay-300">
            {['Sin tarjeta de crédito', 'Gratis para siempre', 'Listo en 5 minutos'].map((t) => (
              <span key={t} className="flex items-center gap-1.5 text-[12px] text-charcoal">
                <svg className="w-3 h-3 text-white/25 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────── Integrations strip ─────────────────── */}
      <section className="relative bg-black py-12" lang="es">
        <div className="section-divider absolute top-0 left-0 right-0" />
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-center text-[11px] font-bold tracking-[0.3em] text-white/20 uppercase mb-6">
            Funciona con las herramientas que ya usás
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {['Turo', 'Stripe', 'Square', 'QuickBooks', 'iCal', 'Google Calendar', 'WhatsApp'].map((name) => (
              <span
                key={name}
                className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-full px-4 py-1.5 text-sm font-medium text-charcoal hover:text-silver hover:border-white/[0.14] hover:bg-white/[0.07] transition-all cursor-default select-none"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
        <div className="section-divider absolute bottom-0 left-0 right-0" />
      </section>

      {/* ─────────────────── Trust bar ─────────────────── */}
      <TrustBar lang="es" />

      {/* ─────────────────── How it works ─────────────────── */}
      <HowItWorks lang="es" />

      {/* ─────────────────── Features (split) ─────────────────── */}
      <section className="relative py-24 overflow-hidden bg-black" id="features" lang="es">
        <div className="absolute inset-0 bg-grid-lines opacity-100 pointer-events-none" />
        <div className="absolute inset-0 bg-warm-glow pointer-events-none" />

        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <div className="text-center mb-24">
            <div className="inline-flex items-center gap-2 bg-white/[0.05] border border-white/[0.09] rounded-full px-4 py-1.5 mb-5">
              <span className="text-[11px] font-bold tracking-[0.25em] text-charcoal uppercase">Plataforma</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-5 tracking-tight">
              Gestión de flota, reservas<br />y pagos — un solo panel.
            </h2>
            <p className="text-lg text-charcoal font-light max-w-xl mx-auto">
              Basta de hacer malabares con planillas, mensajes y calendarios. Manejá tu negocio de rent a car desde un solo lugar.
            </p>
          </div>

          <div className="space-y-24">
            {SPLIT_FEATURES.map((feature, i) => (
              <div
                key={feature.title}
                className={`flex flex-col lg:flex-row items-center gap-12 lg:gap-20 ${
                  i % 2 === 1 ? 'lg:flex-row-reverse' : ''
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-white/[0.06] border border-white/[0.10] flex items-center justify-center text-grey mb-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                    {feature.icon}
                  </div>
                  <h3 className="text-3xl md:text-4xl font-bold text-white mb-5 tracking-tight leading-tight whitespace-pre-line">
                    {feature.title}
                  </h3>
                  <p className="text-grey leading-relaxed mb-8 font-light text-lg">
                    {feature.description}
                  </p>
                  <ul className="space-y-3">
                    {feature.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-center gap-3 text-silver text-sm">
                        <span className="w-5 h-5 rounded-full bg-white/[0.07] border border-white/[0.12] flex items-center justify-center flex-shrink-0">
                          <svg className="w-3 h-3 text-grey" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                        {bullet}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex-1 min-w-0 w-full">
                  <div className="relative rounded-xl overflow-hidden border border-white/10 shadow-[0_24px_60px_rgba(0,0,0,0.5)]">
                    <div className="bg-[#1a1a1a] px-3 py-2.5 flex items-center gap-1.5 border-b border-white/[0.06]">
                      <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                      <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                      <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                    </div>
                    <Image
                      src={feature.screenshot}
                      alt={feature.alt}
                      width={800}
                      height={500}
                      className="w-full object-cover"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────── Product Showcase ─────────────────── */}
      <ProductShowcase lang="es" />

      {/* ─────────────────── Demo video (only if configured) ─────────────────── */}
      {DEMO_VIDEO_URL && <DemoVideo videoUrl={DEMO_VIDEO_URL} lang="es" />}

      {/* ─────────────────── Pricing ─────────────────── */}
      <section className="relative py-32 bg-black" id="pricing" lang="es">
        <div className="section-divider absolute top-0 left-0 right-0" />
        <div className="absolute inset-0 bg-dot-pattern opacity-15 pointer-events-none" />

        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <div className="text-center mb-20 animate-fade-in">
            <div className="inline-flex items-center gap-2 bg-white/[0.05] border border-white/[0.09] rounded-full px-4 py-1.5 mb-5">
              <span className="text-[11px] font-bold tracking-[0.25em] text-charcoal uppercase">Precios</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-5 tracking-tight">
              Precios simples
            </h2>
            <p className="text-lg text-charcoal font-light">
              Empezá gratis. Actualizá cuando necesites más.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch max-w-5xl mx-auto">
            {/* ── Starter ── */}
            <div className="glass rounded-2xl p-8 text-left relative overflow-hidden group hover:border-white/15 transition-all duration-500 flex flex-col">
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-white/10 to-transparent" />
              <div className="text-[11px] font-bold text-charcoal uppercase tracking-widest mb-6">
                Starter
              </div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-5xl font-extrabold text-white tracking-tight">$0</span>
              </div>
              <div className="text-charcoal text-sm mb-1">para siempre</div>
              <div className="text-charcoal/60 text-[11px] mb-8">2% de comisión sobre pagos online</div>

              <ul className="space-y-3 text-sm text-grey mb-10 font-light flex-1">
                <li className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full bg-white/[0.07] border border-white/[0.12] flex items-center justify-center flex-shrink-0">
                    <svg className="w-2.5 h-2.5 text-silver" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </span> 1 página de flota con tu marca
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full bg-white/[0.07] border border-white/[0.12] flex items-center justify-center flex-shrink-0">
                    <svg className="w-2.5 h-2.5 text-silver" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </span> Hasta 5 vehículos
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full bg-white/[0.07] border border-white/[0.12] flex items-center justify-center flex-shrink-0">
                    <svg className="w-2.5 h-2.5 text-silver" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </span> {'{slug}'}.epuredrive.com
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full bg-white/[0.07] border border-white/[0.12] flex items-center justify-center flex-shrink-0">
                    <svg className="w-2.5 h-2.5 text-silver" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </span> Calendario de disponibilidad en vivo
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full bg-white/[0.07] border border-white/[0.12] flex items-center justify-center flex-shrink-0">
                    <svg className="w-2.5 h-2.5 text-silver" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </span> Gestión de reservas
                </li>
              </ul>

              <TrackedCTA
                href="/sign-up"
                location="pricing-starter-es"
                className="block text-center bg-white text-black font-semibold px-6 py-3.5 rounded-xl text-sm hover:bg-white/90 transition-colors mt-auto"
              >
                Lanzá tu negocio
              </TrackedCTA>
            </div>

            {/* ── Pro ── */}
            <div className="rounded-2xl p-8 text-left relative overflow-hidden group transition-all duration-500 flex flex-col bg-glass-gradient backdrop-blur-xl border-2 border-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.36),0_0_60px_rgba(255,255,255,0.03)]">
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-white/40 to-white/5" />
              <div className="absolute top-5 right-5 bg-white text-black text-[10px] font-bold px-3 py-1.5 rounded-full tracking-widest uppercase">
                Más elegido
              </div>

              <div className="text-[11px] font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                Pro <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              </div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-5xl font-extrabold text-white tracking-tight">$19</span>
              </div>
              <div className="text-charcoal text-sm mb-1">/ mes</div>
              <div className="text-charcoal/60 text-[11px] mb-8">1% de comisión sobre pagos online</div>

              <ul className="space-y-3 text-sm text-grey mb-10 font-light flex-1">
                <li className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full bg-white/[0.07] border border-white/[0.12] flex items-center justify-center flex-shrink-0">
                    <svg className="w-2.5 h-2.5 text-silver" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </span> Todo lo de Starter
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full bg-white/[0.07] border border-white/[0.12] flex items-center justify-center flex-shrink-0">
                    <svg className="w-2.5 h-2.5 text-silver" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </span> Hasta 25 vehículos
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full bg-white/[0.07] border border-white/[0.12] flex items-center justify-center flex-shrink-0">
                    <svg className="w-2.5 h-2.5 text-silver" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </span> Personalización total de marca
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full bg-white/[0.07] border border-white/[0.12] flex items-center justify-center flex-shrink-0">
                    <svg className="w-2.5 h-2.5 text-silver" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </span> Pagos online (Stripe + Square)
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full bg-white/[0.07] border border-white/[0.12] flex items-center justify-center flex-shrink-0">
                    <svg className="w-2.5 h-2.5 text-silver" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </span> Reportes e impuestos
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full bg-white/[0.07] border border-white/[0.12] flex items-center justify-center flex-shrink-0">
                    <svg className="w-2.5 h-2.5 text-silver" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </span> Miembros de equipo ilimitados
                </li>
              </ul>

              <TrackedCTA
                href="/sign-up"
                location="pricing-pro-es"
                className="block text-center bg-white text-black font-semibold px-6 py-3.5 rounded-xl text-sm hover:bg-white/90 transition-colors mt-auto"
              >
                Empezar
              </TrackedCTA>
            </div>

            {/* ── Max ── */}
            <div className="glass rounded-2xl p-8 text-left relative overflow-hidden group transition-all duration-500 flex flex-col border border-amber-500/20 hover:border-amber-500/35">
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-amber-500/40 to-transparent" />

              <div className="text-[11px] font-bold text-amber-400/80 uppercase tracking-widest mb-6">
                Max
              </div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-5xl font-extrabold text-white tracking-tight">$39</span>
              </div>
              <div className="text-charcoal text-sm mb-1">/ mes</div>
              <div className="text-amber-400/40 text-[11px] mb-8">0% de comisión sobre pagos online</div>

              <ul className="space-y-3 text-sm text-grey mb-10 font-light flex-1">
                <li className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full bg-amber-500/[0.10] border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-2.5 h-2.5 text-amber-400/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </span> Todo lo de Pro
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full bg-amber-500/[0.10] border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-2.5 h-2.5 text-amber-400/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </span> Hasta 60 vehículos
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full bg-amber-500/[0.10] border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-2.5 h-2.5 text-amber-400/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </span> Miembros de equipo ilimitados
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full bg-amber-500/[0.10] border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-2.5 h-2.5 text-amber-400/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </span> Sincronización con QuickBooks
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full bg-amber-500/[0.10] border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-2.5 h-2.5 text-amber-400/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </span> Acceso a API y soporte prioritario
                </li>
              </ul>

              <TrackedCTA
                href="/sign-up"
                location="pricing-max-es"
                className="block text-center bg-amber-500/10 text-amber-300 font-semibold px-6 py-3.5 rounded-xl text-sm hover:bg-amber-500/20 hover:text-amber-200 transition-colors border border-amber-500/20 mt-auto"
              >
                Empezar
              </TrackedCTA>
            </div>
          </div>

          <p className="text-center text-sm text-charcoal mt-12 font-light">
            ¿Manejás varias sucursales o necesitás vehículos ilimitados?{' '}
            <a
              href="mailto:info@epuredrive.com?subject=Consulta%20Enterprise"
              className="text-white font-medium underline underline-offset-4 hover:text-white/80"
            >
              Hablemos →
            </a>
          </p>
        </div>
      </section>

      {/* ─────────────────── FAQ ─────────────────── */}
      <FAQ lang="es" />

      {/* ─────────────────── Final CTA ─────────────────── */}
      <section className="relative py-32 bg-black overflow-hidden" lang="es">
        <div className="section-divider absolute top-0 left-0 right-0" />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[700px] h-[400px] rounded-full bg-white/[0.03] blur-[80px]" />
        </div>

        <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
          <div className="relative rounded-3xl p-px bg-gradient-to-b from-white/[0.14] via-white/[0.06] to-white/[0.02]">
            <div className="rounded-3xl bg-gradient-to-b from-white/[0.05] to-transparent px-8 py-16 md:px-16">
              <span className="inline-flex items-center gap-2 bg-white/[0.06] border border-white/[0.10] rounded-full px-4 py-1.5 mb-8">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] font-bold tracking-[0.25em] text-grey uppercase">Listo para arrancar</span>
              </span>
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 tracking-tight">
                Lanzá tu negocio de rent a car<br />online hoy.
              </h2>
              <p className="text-charcoal mb-10 font-light text-lg max-w-lg mx-auto">
                Sumate a los operadores que manejan su flota, reservas y clientes
                en éPure Drive. Listo en 5 minutos — sin tarjeta de crédito.
              </p>
              <TrackedCTA
                href="/sign-up"
                location="bottom-cta-es"
                className="inline-block bg-white text-black font-semibold px-12 py-4 rounded-xl text-base hover:bg-white/90 active:scale-[0.97] transition-all cta-glow"
              >
                Empezar gratis
              </TrackedCTA>
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-7">
                {['Sin tarjeta de crédito', 'Cancelás cuando quieras', 'Gratis para siempre'].map((t) => (
                  <span key={t} className="flex items-center gap-1.5 text-[12px] text-white/25">
                    <svg className="w-3 h-3 text-white/20 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────── Contact ─────────────────── */}
      <ContactSection lang="es" />

      <JsonLd schema={buildOrganizationSchema()} />
      <JsonLd schema={buildWebSiteSchema()} />
      <JsonLd schema={buildSoftwareApplicationSchema()} />
      {PRICING_PLANS_ES.map((plan) => (
        <JsonLd key={plan.name} schema={buildPricingPlanSchema(plan)} />
      ))}
      {DEMO_VIDEO_URL && (
        <JsonLd
          schema={buildVideoObjectSchema({
            name: 'éPure Drive — demo del producto en 2 minutos',
            description:
              'Mirá cómo lanzar tu sitio de reservas de alquiler con tu marca, aceptar pagos online y manejar tu flota desde un panel en 2 minutos.',
            thumbnailUrl: 'https://epuredrive.com/og-image.jpg',
            uploadDate: '2026-04-20',
            embedUrl: DEMO_VIDEO_URL,
            duration: 'PT2M',
          })}
        />
      )}
    </>
  )
}
