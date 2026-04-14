import type { Tenant } from '@/lib/supabase/types'
import { DEFAULT_HOW_IT_WORKS } from '@/lib/constants/how-it-works'

interface Props {
  tenant: Tenant
}

export default function HowItWorksSection({ tenant }: Props) {
  const steps =
    Array.isArray(tenant.how_it_works) && tenant.how_it_works.length > 0
      ? tenant.how_it_works
      : DEFAULT_HOW_IT_WORKS

  return (
    <section id="how-it-works" className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.015] to-transparent pointer-events-none" />
      <div className="absolute right-1/4 top-1/3 w-[500px] h-[500px] bg-primary/4 rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 py-32 relative z-10">

        {/* Header */}
        <div className="mb-20 max-w-xl">
          <p className="text-[10px] font-black uppercase tracking-[.4em] text-primary/60 mb-4">How It Works</p>
          <h2 className="font-outfit font-black text-5xl sm:text-6xl text-white leading-none tracking-tight mb-6">
            From browse<br />
            <span className="italic text-white/30">to keys in hand.</span>
          </h2>
          <p className="text-white/40 text-base leading-relaxed max-w-md">
            Renting with {tenant.brand_name || tenant.name} is designed to be effortless — here&apos;s what to expect.
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-6 relative">
          {/* Connector line (desktop only) */}
          <div className="hidden md:block absolute top-14 left-[calc(16.67%+1.5rem)] right-[calc(16.67%+1.5rem)] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />

          {steps.map((step, i) => (
            <div
              key={i}
              className="group glass border border-white/5 rounded-[2rem] p-10 hover:border-white/10 transition-all duration-500 flex flex-col"
            >
              {/* Step number bubble */}
              <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-8 group-hover:bg-primary/20 transition-colors">
                <span className="font-outfit font-black text-sm text-primary tracking-widest">
                  {step.icon || String(i + 1).padStart(2, '0')}
                </span>
              </div>

              <h3 className="font-outfit font-black text-xl text-white mb-3 tracking-tight">{step.title}</h3>
              <p className="text-white/35 text-sm leading-relaxed flex-1">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
