type Lang = 'en' | 'es'

const COPY: Record<Lang, {
  label: string
  title: string
  subtitle: string
  stepLabel: string
  steps: { num: string; title: string; body: string }[]
}> = {
  en: {
    label: 'How it works',
    title: 'Live in 5 minutes. Really.',
    subtitle: 'No setup calls. No migrations. No developer required.',
    stepLabel: 'Step',
    steps: [
      {
        num: '01',
        title: 'Sign up in 30 seconds',
        body: 'Create your account — no credit card required. Pick your subdomain and upload your logo.',
      },
      {
        num: '02',
        title: 'Add your fleet',
        body: 'Upload photos, set daily rates, and configure availability. Your branded booking site goes live instantly.',
      },
      {
        num: '03',
        title: 'Get paid on autopilot',
        body: 'Customers book and pay online. You manage everything — bookings, payments, taxes — from one dashboard.',
      },
    ],
  },
  es: {
    label: 'Cómo funciona',
    title: 'En vivo en 5 minutos. En serio.',
    subtitle: 'Sin llamadas de onboarding. Sin migraciones. Sin desarrollador.',
    stepLabel: 'Paso',
    steps: [
      {
        num: '01',
        title: 'Registrate en 30 segundos',
        body: 'Creá tu cuenta sin tarjeta de crédito. Elegí tu subdominio y subí tu logo.',
      },
      {
        num: '02',
        title: 'Agregá tu flota',
        body: 'Subí fotos, definí precios diarios y configurá la disponibilidad. Tu sitio de reservas con tu marca queda online al instante.',
      },
      {
        num: '03',
        title: 'Cobrá en piloto automático',
        body: 'Tus clientes reservan y pagan online. Vos manejás todo — reservas, pagos, impuestos — desde un solo panel.',
      },
    ],
  },
}

export default function HowItWorks({ lang = 'en' }: { lang?: Lang }) {
  const t = COPY[lang]
  return (
    <section className="relative py-24 bg-black overflow-hidden" id="how-it-works">
      <div className="section-divider absolute top-0 left-0 right-0" />

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-white/[0.05] border border-white/[0.09] rounded-full px-4 py-1.5 mb-5">
            <span className="text-[11px] font-bold tracking-[0.25em] text-charcoal uppercase">{t.label}</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-5 tracking-tight">
            {t.title}
          </h2>
          <p className="text-lg text-charcoal font-light max-w-xl mx-auto">
            {t.subtitle}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {t.steps.map((step, i) => (
            <div
              key={step.num}
              className="relative glass rounded-2xl p-8 border border-white/10 hover:border-white/20 transition-all"
            >
              <div className="text-[11px] font-bold tracking-[0.25em] text-white/30 uppercase mb-4">
                {t.stepLabel} {step.num}
              </div>
              <h3 className="text-xl font-bold text-white mb-3 tracking-tight">
                {step.title}
              </h3>
              <p className="text-grey text-sm font-light leading-relaxed">
                {step.body}
              </p>
              {i < t.steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-px bg-white/10" aria-hidden="true" />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="section-divider absolute bottom-0 left-0 right-0" />
    </section>
  )
}
