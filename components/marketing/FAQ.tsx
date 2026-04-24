import JsonLd from '@/components/JsonLd'
import { buildFAQPageSchema } from '@/lib/utils/jsonld'

type Lang = 'en' | 'es'

const FAQS: Record<Lang, { q: string; a: string }[]> = {
  en: [
    {
      q: 'What is éPure Drive?',
      a: 'éPure Drive (also written Epure Drive) is rental car fleet management software for independent operators. It gives you a branded booking site, online payments via Stripe or Square, a live availability calendar, and full reservation management from a single dashboard — no developer or code required.',
    },
    {
      q: 'How much does éPure Drive cost?',
      a: 'The Starter plan is free forever — includes up to 5 vehicles, a branded fleet page on a {slug}.epuredrive.com subdomain, and full booking management. Paid plans start at $19/month for more vehicles, your own domain, and lower transaction fees.',
    },
    {
      q: 'Do I need a credit card to start?',
      a: 'No. You can create your account, add your fleet, and go live without entering any payment details. You only upgrade to a paid plan when you need more vehicles or advanced features.',
    },
    {
      q: 'How long does setup take?',
      a: 'Most operators are live within 5 minutes. You create an account, upload your vehicle photos and prices, and your booking site is instantly available on your subdomain. No developer, no code, no migrations.',
    },
    {
      q: 'Can I use my own domain?',
      a: 'Custom domains are available on the Enterprise plan. Every other plan runs on a branded subdomain — e.g. yourrental.epuredrive.com — with SSL included out of the box. If you need to connect your own domain (bookings.yourrental.com), contact us and we\'ll set it up.',
    },
    {
      q: 'What payment processors do you support?',
      a: 'éPure Drive integrates with Stripe and Square for online card payments. You connect your own account, so payouts go directly to your bank — we never hold your money. Pro plans pay a 1% platform fee; Max plans pay 0%.',
    },
    {
      q: 'Does éPure Drive integrate with Turo?',
      a: 'Yes. You can sync availability from Turo (and any iCal-compatible platform) so your calendar stays accurate across channels — preventing double bookings automatically.',
    },
    {
      q: 'Can I manage multiple locations or offices?',
      a: 'Yes. The Enterprise plan supports multi-location management, with separate inventory and staff per location but a single reporting dashboard. Contact us for pricing.',
    },
    {
      q: 'Is my customer data safe?',
      a: 'Yes. All data is encrypted at rest and in transit, hosted on enterprise-grade infrastructure (Supabase + Netlify). Card payments never touch our servers — they are processed directly by Stripe/Square, which are PCI-DSS certified.',
    },
    {
      q: 'What if I want to cancel?',
      a: 'Cancel anytime from your billing settings. No contracts, no cancellation fees. You keep read-only access to your historical data for export, and your free Starter plan stays active.',
    },
    {
      q: 'Do you offer support?',
      a: 'Yes. Email support is included on all plans (including free). Pro and Max get priority response times. Enterprise customers get a dedicated account manager.',
    },
  ],
  es: [
    {
      q: '¿Qué es éPure Drive?',
      a: 'éPure Drive (también escrita Epure Drive) es un software de gestión de flota para operadores de alquiler de autos independientes. Incluye un sitio de reservas con tu marca, pagos online vía Stripe o Square, calendario de disponibilidad en vivo y gestión completa de reservas desde un único panel — sin desarrollador ni código.',
    },
    {
      q: '¿Cuánto cuesta éPure Drive?',
      a: 'El plan Starter es gratis para siempre — incluye hasta 5 vehículos, una página de flota con tu marca en un subdominio {slug}.epuredrive.com y gestión completa de reservas. Los planes pagos arrancan en $19/mes e incluyen más vehículos, menor comisión y funciones avanzadas.',
    },
    {
      q: '¿Necesito tarjeta de crédito para empezar?',
      a: 'No. Podés crear tu cuenta, agregar tu flota y salir en vivo sin cargar ningún dato de pago. Solo pasás a un plan pago cuando necesitás más vehículos o funciones avanzadas.',
    },
    {
      q: '¿Cuánto tarda el setup?',
      a: 'La mayoría de operadores queda en vivo en 5 minutos. Creás la cuenta, subís las fotos y los precios de tus autos, y tu sitio de reservas queda disponible al instante en tu subdominio. Sin desarrollador, sin código, sin migraciones.',
    },
    {
      q: '¿Puedo usar mi propio dominio?',
      a: 'Los dominios personalizados están disponibles en el plan Enterprise. El resto de los planes corren en un subdominio con tu marca — ej. tualquiler.epuredrive.com — con SSL incluido. Si necesitás conectar tu dominio (reservas.tualquiler.com), escribinos y lo dejamos andando.',
    },
    {
      q: '¿Qué procesadores de pago soportan?',
      a: 'éPure Drive se integra con Stripe y Square para pagos con tarjeta online. Conectás tu propia cuenta, así los depósitos van directo a tu banco — nunca tocamos tu dinero. Los planes Pro pagan 1% de comisión de plataforma; los Max pagan 0%.',
    },
    {
      q: '¿Se integra con Turo?',
      a: 'Sí. Podés sincronizar la disponibilidad desde Turo (y cualquier plataforma compatible con iCal) para mantener tu calendario actualizado entre canales — evitando reservas duplicadas automáticamente.',
    },
    {
      q: '¿Puedo manejar varias sucursales u oficinas?',
      a: 'Sí. El plan Enterprise soporta gestión multi-sucursal, con inventario y personal separados por sede pero un único panel de reportes. Escribinos para ver precio.',
    },
    {
      q: '¿Mis datos y los de mis clientes están seguros?',
      a: 'Sí. Todos los datos viajan y se guardan cifrados, hosteados en infraestructura de grado empresarial (Supabase + Netlify). Los pagos con tarjeta nunca pasan por nuestros servidores — los procesa directamente Stripe/Square, que están certificados PCI-DSS.',
    },
    {
      q: '¿Qué pasa si quiero cancelar?',
      a: 'Cancelás cuando quieras desde la configuración de facturación. Sin contratos, sin costo de cancelación. Conservás acceso de lectura a tus datos históricos para exportarlos, y tu plan Starter gratis queda activo.',
    },
    {
      q: '¿Ofrecen soporte?',
      a: 'Sí. Soporte por email incluido en todos los planes (también el gratuito). Pro y Max tienen tiempo de respuesta prioritario. Los clientes Enterprise tienen un gerente de cuenta dedicado.',
    },
  ],
}

const LABELS: Record<Lang, { pill: string; title: string; help: string; email: string }> = {
  en: {
    pill: 'FAQ',
    title: 'Common questions',
    help: "Can't find what you're looking for? Email",
    email: 'info@epuredrive.com',
  },
  es: {
    pill: 'Preguntas frecuentes',
    title: 'Preguntas comunes',
    help: '¿No encontrás lo que buscás? Escribinos a',
    email: 'info@epuredrive.com',
  },
}

export default function FAQ({ lang = 'en' }: { lang?: Lang }) {
  const faqs = FAQS[lang]
  const labels = LABELS[lang]

  return (
    <>
      <section className="relative py-28 bg-black overflow-hidden" id="faq">
        <div className="section-divider absolute top-0 left-0 right-0" />

        <div className="max-w-3xl mx-auto px-6 relative z-10">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-white/[0.05] border border-white/[0.09] rounded-full px-4 py-1.5 mb-5">
              <span className="text-[11px] font-bold tracking-[0.25em] text-charcoal uppercase">{labels.pill}</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-5 tracking-tight">
              {labels.title}
            </h2>
            <p className="text-lg text-charcoal font-light">
              {labels.help}{' '}
              <a href={`mailto:${labels.email}`} className="text-white/70 underline underline-offset-4 hover:text-white">
                {labels.email}
              </a>
              .
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq) => (
              <details
                key={faq.q}
                className="group rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden hover:border-white/15 transition-colors"
              >
                <summary className="cursor-pointer list-none px-6 py-5 flex items-center justify-between gap-4 text-white font-medium text-base">
                  <span>{faq.q}</span>
                  <svg
                    className="w-5 h-5 text-white/40 flex-shrink-0 transition-transform group-open:rotate-45"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </summary>
                <div className="px-6 pb-6 pt-0 text-grey font-light leading-relaxed text-[15px]">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <JsonLd schema={buildFAQPageSchema(faqs)} />
    </>
  )
}
