'use client'

import { useMemo, useState } from 'react'

type Lang = 'en' | 'es'

interface Copy {
  badge: string
  title: string
  subtitle: string
  inputLabel: string
  inputHint: string
  resultLabel: string
  yearLabel: string
  ePureLabel: string
  ePureValue: string
  competitorsLabel: string
  savingsLabel: string
  pocketLabel: string
  disclaimer: string
  monthlyLabel: string
  yearlyLabel: string
  vehiclesLabel: string
  vehiclesUnit: string
}

const COPY: Record<Lang, Copy> = {
  en: {
    badge: 'Savings calculator',
    title: 'See how much you save during our free launch.',
    subtitle:
      'Most rental software charges a flat monthly fee — even when you have no bookings. We don’t. Drag the slider to see your savings.',
    inputLabel: 'What you currently pay (or would pay) on competitor software',
    inputHint: 'Industry average: $99/mo',
    resultLabel: 'Your first-year savings on éPure Drive',
    yearLabel: 'per year',
    ePureLabel: 'éPure Drive',
    ePureValue: '$0',
    competitorsLabel: 'Typical competitor',
    savingsLabel: 'Total saved',
    pocketLabel: 'In your pocket — reinvest in your fleet, marketing, or yourself.',
    disclaimer:
      'Reference monthly pricing observed on public pricing pages of HQ Rental, RentSyst, Bookinglayer and similar SaaS as of 2026. Free during our launch period.',
    monthlyLabel: '/ month',
    yearlyLabel: '/ year',
    vehiclesLabel: 'Or estimate by fleet size',
    vehiclesUnit: 'vehicles',
  },
  es: {
    badge: 'Calculadora de ahorro',
    title: 'Veé cuánto te ahorrás durante nuestro free launch.',
    subtitle:
      'La mayoría de los softwares de rent a car cobran una mensualidad fija — aunque no tengas reservas. Nosotros no. Mové el slider y veé tu ahorro.',
    inputLabel: 'Lo que pagás (o pagarías) en otro software',
    inputHint: 'Promedio del mercado: $99/mes',
    resultLabel: 'Tu ahorro del primer año en éPure Drive',
    yearLabel: 'al año',
    ePureLabel: 'éPure Drive',
    ePureValue: '$0',
    competitorsLabel: 'Competidor típico',
    savingsLabel: 'Total ahorrado',
    pocketLabel: 'En tu bolsillo — reinvertí en tu flota, marketing o en vos.',
    disclaimer:
      'Referencia: precios mensuales públicos de HQ Rental, RentSyst, Bookinglayer y SaaS similares (2026). Gratis durante nuestro período de lanzamiento.',
    monthlyLabel: '/ mes',
    yearlyLabel: '/ año',
    vehiclesLabel: 'O estimá por tamaño de flota',
    vehiclesUnit: 'vehículos',
  },
}

const MIN_MONTHLY = 49
const MAX_MONTHLY = 299
const DEFAULT_MONTHLY = 99

function formatUsd(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount)
}

function vehiclesToMonthly(vehicles: number): number {
  if (vehicles <= 5) return 79
  if (vehicles <= 15) return 129
  if (vehicles <= 30) return 199
  return 249
}

interface Props {
  lang?: Lang
}

export default function SavingsCalculator({ lang = 'en' }: Props) {
  const t = COPY[lang]
  const locale = lang === 'es' ? 'es-AR' : 'en-US'
  const [monthly, setMonthly] = useState<number>(DEFAULT_MONTHLY)
  const [vehicles, setVehicles] = useState<number>(10)

  const yearly = useMemo(() => monthly * 12, [monthly])
  const savings = yearly

  return (
    <section className="relative py-24 bg-black overflow-hidden" id="savings-calculator">
      <div className="section-divider absolute top-0 left-0 right-0" />
      <div className="absolute inset-0 bg-grid-lines opacity-50 pointer-events-none" />

      <div className="max-w-5xl mx-auto px-6 relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-white/[0.05] border border-white/[0.09] rounded-full px-4 py-1.5 mb-5">
            <span className="text-[11px] font-bold tracking-[0.25em] text-charcoal uppercase">
              {t.badge}
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-5 tracking-tight">
            {t.title}
          </h2>
          <p className="text-lg text-charcoal font-light max-w-2xl mx-auto">
            {t.subtitle}
          </p>
        </div>

        {/* Calculator card */}
        <div className="relative rounded-3xl p-px bg-gradient-to-b from-white/[0.14] via-white/[0.06] to-white/[0.02]">
          <div className="rounded-3xl bg-gradient-to-b from-white/[0.04] to-transparent p-8 md:p-12">
            {/* Input — competitor monthly cost */}
            <div className="mb-8">
              <label htmlFor="competitor-monthly" className="block text-sm font-medium text-silver mb-2">
                {t.inputLabel}
              </label>
              <div className="flex items-center gap-4">
                <input
                  id="competitor-monthly"
                  type="range"
                  min={MIN_MONTHLY}
                  max={MAX_MONTHLY}
                  step={1}
                  value={monthly}
                  onChange={(event) => setMonthly(Number(event.target.value))}
                  className="flex-1 accent-white h-1 bg-white/10 rounded-full appearance-none cursor-pointer"
                  aria-label={t.inputLabel}
                />
                <div className="text-right min-w-[110px]">
                  <span className="text-2xl font-bold text-white tabular-nums">
                    {formatUsd(monthly, locale)}
                  </span>
                  <span className="block text-[11px] text-charcoal">{t.monthlyLabel}</span>
                </div>
              </div>
              <p className="text-[11px] text-charcoal/70 mt-2">{t.inputHint}</p>
            </div>

            {/* Fleet-size shortcut */}
            <div className="mb-10 pb-10 border-b border-white/[0.06]">
              <p className="text-[11px] font-bold tracking-[0.25em] text-charcoal/70 uppercase mb-3">
                {t.vehiclesLabel}
              </p>
              <div className="flex flex-wrap gap-2">
                {[5, 10, 20, 35, 50].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => {
                      setVehicles(count)
                      setMonthly(vehiclesToMonthly(count))
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      vehicles === count
                        ? 'bg-white text-black border-white'
                        : 'bg-white/[0.04] border-white/[0.10] text-silver hover:border-white/25 hover:text-white'
                    }`}
                  >
                    {count} {t.vehiclesUnit}
                  </button>
                ))}
              </div>
            </div>

            {/* Comparison row */}
            <div className="grid sm:grid-cols-2 gap-4 mb-10">
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
                <div className="text-[11px] font-bold text-charcoal uppercase tracking-widest mb-3">
                  {t.competitorsLabel}
                </div>
                <div className="text-3xl font-bold text-white/70 tabular-nums">
                  {formatUsd(yearly, locale)}
                </div>
                <div className="text-[11px] text-charcoal mt-1">{t.yearlyLabel}</div>
              </div>

              <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/[0.04] p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-emerald-400/40 to-transparent" />
                <div className="text-[11px] font-bold text-emerald-300/80 uppercase tracking-widest mb-3 flex items-center gap-2">
                  {t.ePureLabel}
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <div className="text-3xl font-bold text-white tabular-nums">
                  {t.ePureValue}
                </div>
                <div className="text-[11px] text-charcoal mt-1">{t.yearlyLabel}</div>
              </div>
            </div>

            {/* Savings highlight */}
            <div className="text-center">
              <div className="text-[11px] font-bold text-charcoal uppercase tracking-[0.25em] mb-2">
                {t.savingsLabel}
              </div>
              <div className="text-6xl md:text-7xl font-extrabold text-gradient tracking-tight tabular-nums leading-none">
                {formatUsd(savings, locale)}
              </div>
              <div className="text-sm text-grey mt-3 font-light">{t.pocketLabel}</div>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-charcoal/60 text-center mt-6 font-light max-w-2xl mx-auto">
          {t.disclaimer}
        </p>
      </div>

      <div className="section-divider absolute bottom-0 left-0 right-0" />
    </section>
  )
}
