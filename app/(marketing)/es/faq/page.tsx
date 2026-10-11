import type { Metadata } from 'next'
import JsonLd from '@/components/JsonLd'
import { buildFAQPageSchema, buildBreadcrumbSchema } from '@/lib/utils/jsonld'

const SEO_TITLE = 'Preguntas frecuentes | éPure Drive'

export const metadata: Metadata = {
  title: { absolute: SEO_TITLE },
  description: 'Respuestas sobre éPure Drive: cómo empezar, gestión de flota, reservas, pagos, planes y soporte para tu rent a car.',
  alternates: {
    canonical: 'https://epuredrive.com/es/faq',
    languages: {
      en: 'https://epuredrive.com/faq',
      es: 'https://epuredrive.com/es/faq',
      'x-default': 'https://epuredrive.com/faq',
    },
  },
  openGraph: {
    title: SEO_TITLE,
    description: 'Respuestas sobre éPure Drive: cómo empezar, gestión de flota, reservas, pagos, planes y soporte para tu rent a car.',
    url: 'https://epuredrive.com/es/faq',
    locale: 'es_US',
  },
  twitter: {
    title: SEO_TITLE,
    description: 'Respuestas sobre éPure Drive: cómo empezar, gestión de flota, reservas, pagos, planes y soporte para tu rent a car.',
  },
}

const faqs = [
  {
    category: 'Primeros pasos',
    items: [
      {
        q: '¿Qué es éPure Drive?',
        a: 'éPure Drive (también escrito Epure Drive) es un software de gestión de flota para empresas de rent a car independientes. Te da un sitio de reservas con tu marca, pagos online con Stripe o Square, un calendario de disponibilidad en vivo y la gestión completa de reservas desde un solo panel, sin desarrollador ni código.',
      },
      {
        q: '¿Cómo creo mi página de flota?',
        a: 'Crea una cuenta gratis, agrega tus vehículos y tu página de flota con tu marca queda en línea al instante en tu-marca.epuredrive.com. Tus clientes ven tus autos y envían solicitudes de reserva.',
      },
      {
        q: '¿Hay un plan gratis?',
        a: 'Sí. El plan Starter es gratis para siempre: hasta 5 vehículos, un sitio de reservas con tu marca en tu propio subdominio y gestión completa de reservas, sin tarjeta de crédito. Pasa a Pro, Max o Enterprise para tener más vehículos, más miembros de equipo y funciones avanzadas.',
      },
      {
        q: '¿Puedo usar mi propio dominio?',
        a: 'Sí, desde el plan Pro. Es autoservicio desde Settings > Custom Domain: ingresas tu dominio (por ejemplo, flota.tumarca.com), lo registramos automáticamente y tú apuntas un registro DNS desde tu proveedor.',
      },
    ],
  },
  {
    category: 'Vehículos y flota',
    items: [
      {
        q: '¿Cómo agrego un vehículo?',
        a: 'Ve a Fleet en tu panel y haz clic en "Add Vehicle". Ingresa el VIN para completar los datos del vehículo automáticamente, sube las fotos, define la tarifa diaria y guarda.',
      },
      {
        q: '¿Cuántas fotos puedo subir por vehículo?',
        a: 'Hasta 10 fotos por vehículo. La primera es la portada que se ve en tu página de flota. Formatos admitidos: JPEG, PNG y WebP (máximo 10 MB cada una).',
      },
      {
        q: '¿Qué significa estado activo o inactivo?',
        a: 'Los vehículos activos aparecen en tu página pública y pueden recibir reservas. Los inactivos, en mantenimiento o retirados no se muestran al público, pero siguen en tu panel.',
      },
    ],
  },
  {
    category: 'Reservas y pagos',
    items: [
      {
        q: '¿Cómo hace una reserva un cliente?',
        a: 'El cliente entra a tu página de flota, elige un vehículo, selecciona las fechas y envía la solicitud. Tú recibes un email y manejas la reserva desde tu panel.',
      },
      {
        q: '¿Puedo cobrar online?',
        a: 'Sí. Conecta tu cuenta de Stripe o Square en Settings > Payments & Invoices para aceptar tarjetas y recibir los pagos directamente en tu cuenta.',
      },
      {
        q: '¿Cómo funcionan las cancelaciones?',
        a: 'Puedes cancelar cualquier reserva desde el panel. Tú y el cliente (si tiene email cargado) reciben un aviso de cancelación.',
      },
    ],
  },
  {
    category: 'Cuenta y facturación',
    items: [
      {
        q: '¿Cómo cambio de plan?',
        a: 'Ve a Settings > Billing & Plans y haz clic en "Upgrade" en el plan que quieras. Se abre Stripe Checkout para completar el pago.',
      },
      {
        q: '¿Puedo agregar miembros a mi equipo?',
        a: 'El plan Pro admite hasta 5 miembros; Max y Enterprise, ilimitados. Ve a Settings > Team & Roles para invitarlos.',
      },
      {
        q: '¿Cómo restablezco mi contraseña?',
        a: 'Haz clic en "Forgot password?" en la página de inicio de sesión y te enviamos un enlace a tu email registrado.',
      },
    ],
  },
  {
    category: 'Soporte',
    items: [
      {
        q: '¿Cómo contacto a soporte?',
        a: 'Escríbenos a info@epuredrive.com o usa el formulario de contacto del sitio. Los clientes Pro, Max y Enterprise tienen soporte prioritario.',
      },
      {
        q: '¿Ofrecen ayuda para empezar?',
        a: 'Sí. Los clientes Max y Enterprise tienen un gerente de cuenta dedicado. Todos los clientes tienen acceso a la documentación y al soporte por email.',
      },
    ],
  },
]

const allFaqItems = faqs.flatMap((section) => section.items)

export default function FAQPageEs() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-20">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
          Preguntas frecuentes
        </h1>
        <p className="text-white/40 text-lg max-w-xl mx-auto">
          Todo lo que necesitas saber sobre éPure Drive. ¿No encuentras lo que buscas? Escríbenos a{' '}
          <a href="mailto:info@epuredrive.com" className="text-white/60 hover:text-white transition-colors">
            info@epuredrive.com
          </a>
        </p>
      </div>

      <div className="space-y-12">
        {faqs.map((section) => (
          <div key={section.category}>
            <h2 className="text-xs font-black text-white/30 uppercase tracking-[0.2em] mb-6 pl-1">
              {section.category}
            </h2>
            <div className="space-y-4">
              {section.items.map((faq) => (
                <details
                  key={faq.q}
                  className="group glass border border-white/[0.06] rounded-2xl overflow-hidden hover:border-white/10 transition-colors"
                >
                  <summary className="flex items-center justify-between px-6 py-5 cursor-pointer list-none">
                    <span className="text-white font-medium text-sm pr-4">{faq.q}</span>
                    <svg
                      className="w-4 h-4 text-white/30 group-open:rotate-180 transition-transform shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="px-6 pb-5 text-white/50 text-sm leading-relaxed border-t border-white/5 pt-4">
                    {faq.a}
                  </div>
                </details>
              ))}
            </div>
          </div>
        ))}
      </div>
      <JsonLd schema={buildFAQPageSchema(allFaqItems)} />
      <JsonLd
        schema={buildBreadcrumbSchema([
          { name: 'Inicio', url: 'https://epuredrive.com/es' },
          { name: 'Preguntas frecuentes', url: 'https://epuredrive.com/es/faq' },
        ])}
      />
    </div>
  )
}
