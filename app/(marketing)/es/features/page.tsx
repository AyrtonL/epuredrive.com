import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import JsonLd from '@/components/JsonLd'
import { buildBreadcrumbSchema } from '@/lib/utils/jsonld'

const SEO_TITLE = 'Funciones — Software para Rent a Car | éPure Drive'

export const metadata: Metadata = {
  title: { absolute: SEO_TITLE },
  description:
    'Software para rent a car: flota, reservas, sitio con tu marca, contratos digitales, pagos con Stripe y Square, QuickBooks e impuestos.',
  alternates: {
    canonical: 'https://epuredrive.com/es/features',
    languages: {
      en: 'https://epuredrive.com/features',
      es: 'https://epuredrive.com/es/features',
      'x-default': 'https://epuredrive.com/features',
    },
  },
  openGraph: {
    title: SEO_TITLE,
    description:
      'Todo lo que necesita una empresa de rent a car para manejar su flota, recibir reservas, controlar sus finanzas y crecer.',
    url: 'https://epuredrive.com/es/features',
    locale: 'es_US',
  },
  twitter: {
    title: SEO_TITLE,
    description:
      'Todo lo que necesita una empresa de rent a car para manejar su flota, recibir reservas, controlar sus finanzas y crecer.',
  },
}

const HERO_FEATURES = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0H21M3.375 14.25h-.375a3 3 0 013-3h6.75a3 3 0 013 3v.375m-12 0h12m-12 0V6.375a1.125 1.125 0 011.125-1.125h3.75a1.125 1.125 0 011.125 1.125v7.875" />
      </svg>
    ),
    title: 'Gestión de flota',
    description: 'Agrega vehículos con decodificación de VIN, maneja su estado, sube fotos y mide el rendimiento de cada auto.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
    title: 'Gestión de reservas',
    description: 'Sigue cada reserva con fechas, estado, licencia de conducir, seguro y confirmaciones automáticas por email.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
      </svg>
    ),
    title: 'Sitio con tu marca',
    description: 'Una página pública premium con tu logo, tus colores y tus vehículos, en vivo en tu-marca.epuredrive.com. Sin código.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
      </svg>
    ),
    title: 'Pagos online',
    description: 'Cobra con Stripe o Square. Eliges el procesador, tus clientes pagan de forma segura y el dinero va directo a ti.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    title: 'Contratos digitales',
    description: 'Envía contratos de alquiler para firma digital. El PDF se genera y se guarda solo, y ambas partes reciben confirmación.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
    title: 'Equipo y roles',
    description: 'Invita a tu equipo con acceso por rol: Admin, Manager, Staff o Finanzas. Cada rol ve solo lo que necesita.',
  },
]

const DETAILED_SECTIONS = [
  {
    badge: 'Operaciones',
    title: 'Maneja tu flota\ndesde un solo panel.',
    description: 'Todo lo que necesitas para la operación diaria, sin hacer malabares con hojas de cálculo, mensajes y emails.',
    features: [
      { name: 'Calendario de operaciones', detail: 'Línea de tiempo visual con todas las reservas de tu flota. Filtra por vehículo o por fechas.' },
      { name: 'Fichas de clientes', detail: 'Perfil completo de cada cliente con historial de reservas, licencia de conducir y datos de contacto.' },
      { name: 'Decodificación de VIN', detail: 'Ingresa un VIN y se completan solos el año, la marca, el modelo, la potencia, la transmisión y más.' },
      { name: 'Motor de disponibilidad', detail: 'Disponibilidad en tiempo real: las reservas superpuestas se bloquean automáticamente.' },
      { name: 'Estado del vehículo', detail: 'Marca autos como activos o inactivos. Los inactivos no aparecen en tu página pública.' },
      { name: 'Galería de fotos', detail: 'Sube hasta 10 fotos por vehículo arrastrando y soltando. Tus clientes ven una galería cuidada.' },
    ],
    screenshot: '/assets/screenshots/dash-bookings.webp',
    alt: 'Panel de operaciones con reservas y calendario',
  },
  {
    badge: 'Finanzas',
    title: 'Conoce tus números.\nCada dólar, cada auto.',
    description: 'Ingresos, gastos y rendimiento por vehículo: la claridad financiera que necesitas para crecer.',
    features: [
      { name: 'Reportes de ingresos', detail: 'Sigue los ingresos por vehículo, por fechas o por cliente, con reportes exportables.' },
      { name: 'Control de gastos', detail: 'Registra combustible, mantenimiento, seguro y otros costos. Importa gastos desde CSV.' },
      { name: 'Rendimiento de la flota', detail: 'Tasa de uso, días sin alquilar, millas recorridas e ingresos por auto, con indicadores por color.' },
      { name: 'Control de combustible', detail: 'Registra el nivel de combustible al entregar y al devolver. Detecta diferencias y sugiere cargos.' },
      { name: 'Panel de ROI', detail: 'Mira qué vehículos ganan más y cuáles rinden menos, para decidir tu flota con datos.' },
      { name: 'Gestión de impuestos', detail: 'Configura tasas, filtra por fechas, mira reportes trimestrales y exporta a CSV.' },
      { name: 'Pagos (Stripe + Square)', detail: 'Elige tu procesador de pagos. Mira el historial de transacciones y maneja los depósitos de cualquiera de los dos.' },
      { name: 'Sincronización con QuickBooks', detail: 'Conecta QuickBooks Online para sincronizar transacciones y mantener tu contabilidad al día.' },
    ],
    screenshot: '/assets/screenshots/dash-taxes.webp',
    alt: 'Panel de reportes financieros, impuestos y rendimiento de la flota',
  },
  {
    badge: 'Experiencia del cliente',
    title: 'Una experiencia de reserva\nque a tus clientes les va a encantar.',
    description: 'Desde ver tu flota hasta firmar el contrato: una experiencia fluida y con tu marca en cada paso.',
    features: [
      { name: 'Sitio con tu marca', detail: 'Tu logo, tus colores, tus vehículos. Tus clientes ven un sitio premium que se siente tuyo.' },
      { name: 'Selector de fechas', detail: 'Tus clientes eligen las fechas de entrega y devolución en un calendario que muestra los días ocupados.' },
      { name: 'Confirmación de reserva', detail: 'Página de confirmación inmediata con los detalles, el número de referencia y seguimiento por WhatsApp.' },
      { name: 'Página Mi reserva', detail: 'Tus clientes consultan su reserva con su email y el número de referencia, sin crear cuenta.' },
      { name: 'Contrato digital', detail: 'Envía un enlace de firma por email. El cliente firma desde cualquier dispositivo y el PDF se guarda solo.' },
      { name: 'Notificaciones por email', detail: 'Emails automáticos de confirmación y aviso para el cliente y para ti en cada reserva.' },
    ],
    screenshot: '/assets/screenshots/site-fleet.webp',
    alt: 'Sitio público con tu marca y el formulario de reserva',
  },
]

export default function FeaturesPageEs() {
  return (
    <>
      {/* ─── Hero ─── */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-black" />
        <div className="absolute inset-0 -z-10 bg-grid-lines opacity-100 pointer-events-none" />
        <div className="absolute inset-0 -z-10 bg-warm-glow pointer-events-none" />

        <div className="max-w-5xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-white/[0.05] border border-white/[0.09] rounded-full px-4 py-1.5 mb-6">
            <span className="text-[11px] font-bold tracking-[0.25em] text-white/40 uppercase">Funciones de la plataforma</span>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold text-white leading-[1.05] mb-6 tracking-tight">
            Todo lo que necesitas para manejar<br />
            <span className="text-gradient">un rent a car moderno.</span>
          </h1>
          <p className="text-lg md:text-xl text-white/45 max-w-2xl mx-auto mb-12 font-light leading-relaxed">
            Gestión de flota, reservas online, contratos digitales, reportes financieros
            y una experiencia con tu marca, pensada para operadores que quieren crecer.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
            <Link
              href="/sign-up"
              className="bg-white text-black font-semibold px-10 py-4 rounded-xl text-base hover:bg-white/90 active:scale-[0.97] transition-all cta-glow"
            >
              Empezar gratis
            </Link>
            <Link
              href="/pricing"
              className="text-white/50 text-sm font-medium hover:text-white transition-colors"
            >
              Ver precios →
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Feature Grid ─── */}
      <section className="relative py-24 bg-black">
        <div className="section-divider absolute top-0 left-0 right-0" />
        <div className="max-w-6xl mx-auto px-6">
          {/* Section heading for the card titles below (h1 → h2 → h3); visually hidden */}
          <h2 className="sr-only">Funciones principales</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {HERO_FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="glass border border-white/[0.06] rounded-2xl p-7 hover:border-white/[0.12] transition-all duration-300 group"
              >
                <div className="w-11 h-11 rounded-xl bg-white/[0.06] border border-white/[0.10] flex items-center justify-center text-white/55 mb-5 group-hover:bg-white/[0.10] transition-colors shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  {feature.icon}
                </div>
                <h3 className="text-white font-bold text-lg mb-2 tracking-tight">{feature.title}</h3>
                <p className="text-white/40 text-sm leading-relaxed font-light">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Detailed Sections ─── */}
      {DETAILED_SECTIONS.map((section, i) => (
        <section key={section.badge} className="relative py-24 bg-black overflow-hidden">
          <div className="section-divider absolute top-0 left-0 right-0" />
          <div className="absolute inset-0 bg-dot-pattern opacity-10 pointer-events-none" />

          <div className="max-w-6xl mx-auto px-6 relative z-10">
            <div className={`flex flex-col lg:flex-row items-start gap-16 ${i % 2 === 1 ? 'lg:flex-row-reverse' : ''}`}>
              {/* Text */}
              <div className="flex-1 min-w-0">
                <div className="inline-flex items-center gap-2 bg-white/[0.05] border border-white/[0.09] rounded-full px-4 py-1.5 mb-5">
                  <span className="text-[11px] font-bold tracking-[0.25em] text-white/40 uppercase">{section.badge}</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-5 tracking-tight leading-tight whitespace-pre-line">
                  {section.title}
                </h2>
                <p className="text-white/45 text-lg leading-relaxed font-light mb-10">
                  {section.description}
                </p>

                <div className="space-y-5">
                  {section.features.map((f) => (
                    <div key={f.name} className="flex gap-4">
                      <span className="mt-1 w-5 h-5 rounded-full bg-white/[0.07] border border-white/[0.12] flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-white/55" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                      <div>
                        <div className="text-white text-sm font-semibold">{f.name}</div>
                        <div className="text-white/35 text-sm font-light leading-relaxed">{f.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Screenshot */}
              <div className="flex-1 min-w-0 w-full">
                <div className="relative rounded-xl overflow-hidden border border-white/10 shadow-[0_24px_60px_rgba(0,0,0,0.5)]">
                  <div className="bg-[#1a1a1a] px-3 py-2.5 flex items-center gap-1.5 border-b border-white/[0.06]">
                    <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                    <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                    <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                  </div>
                  <Image
                    src={section.screenshot}
                    alt={section.alt}
                    width={800}
                    height={500}
                    className="w-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* ─── Integration Strip ─── */}
      <section className="relative py-20 bg-black">
        <div className="section-divider absolute top-0 left-0 right-0" />
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
            Integraciones que trabajan para ti.
          </h2>
          <p className="text-white/40 text-lg font-light mb-10 max-w-xl mx-auto">
            Conecta las herramientas que ya usas. Sin código a medida.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {[
              { name: 'Stripe', desc: 'Pagos y depósitos' },
              { name: 'Square', desc: 'Pagos y POS' },
              { name: 'QuickBooks', desc: 'Contabilidad' },
              { name: 'WhatsApp', desc: 'Mensajes a clientes' },
              { name: 'Turo', desc: 'Sincroniza reservas' },
              { name: 'iCal', desc: 'Sincroniza calendarios' },
              { name: 'Google Calendar', desc: 'Sincroniza la agenda' },
              { name: 'Resend', desc: 'Emails automáticos' },
            ].map((integration) => (
              <div
                key={integration.name}
                className="glass border border-white/[0.08] rounded-2xl px-6 py-4 text-center hover:border-white/[0.15] transition-all min-w-[140px]"
              >
                <div className="text-white font-semibold text-sm">{integration.name}</div>
                <div className="text-white/30 text-xs mt-1">{integration.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="relative py-24 bg-black">
        <div className="section-divider absolute top-0 left-0 right-0" />
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="relative rounded-3xl p-px bg-gradient-to-b from-white/[0.14] via-white/[0.06] to-white/[0.02]">
            <div className="rounded-3xl bg-gradient-to-b from-white/[0.05] to-transparent px-8 py-16 md:px-16">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-5 tracking-tight">
                ¿Listo para modernizar tu rent a car?
              </h2>
              <p className="text-white/40 mb-10 font-light text-lg max-w-lg mx-auto">
                Empieza gratis. Agrega tus vehículos. Sal en vivo hoy.
              </p>
              <Link
                href="/sign-up"
                className="inline-block bg-white text-black font-semibold px-12 py-4 rounded-xl text-base hover:bg-white/90 active:scale-[0.97] transition-all cta-glow"
              >
                Empezar gratis
              </Link>
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-7">
                {['Sin tarjeta de crédito', '5 vehículos gratis para siempre', 'Listo en 5 minutos'].map((t) => (
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

      <JsonLd
        schema={buildBreadcrumbSchema([
          { name: 'Inicio', url: 'https://epuredrive.com/es' },
          { name: 'Funciones', url: 'https://epuredrive.com/es/features' },
        ])}
      />
    </>
  )
}
