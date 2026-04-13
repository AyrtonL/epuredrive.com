'use client'

import { useState } from 'react'
import Image from 'next/image'

const TABS = [
  {
    id: 'overview',
    label: 'Overview',
    description: 'Todo tu negocio en un vistazo',
    src: '/assets/screenshots/dash-overview.png',
  },
  {
    id: 'bookings',
    label: 'Bookings',
    description: 'Reservas, clientes y pagos en tiempo real',
    src: '/assets/screenshots/dash-bookings.png',
  },
  {
    id: 'fleet',
    label: 'Fleet',
    description: 'Gestiona cada vehículo con detalle',
    src: '/assets/screenshots/dash-fleet.png',
  },
  {
    id: 'calendar',
    label: 'Calendar',
    description: 'Disponibilidad de toda tu flota',
    src: '/assets/screenshots/dash-calendar.png',
  },
  {
    id: 'finance',
    label: 'Finance',
    description: 'ROI por vehículo en tiempo real',
    src: '/assets/screenshots/dash-roi.png',
  },
]

export default function ProductShowcase() {
  const [active, setActive] = useState('overview')
  const current = TABS.find((t) => t.id === active)!

  return (
    <section className="relative py-32 bg-black overflow-hidden" id="product">
      <div className="section-divider absolute top-0 left-0 right-0" />

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <div className="text-center mb-14">
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

        {/* Tab bar */}
        <div className="flex flex-wrap gap-2 justify-center mb-8">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
                active === tab.id
                  ? 'bg-white text-black'
                  : 'text-white/40 hover:text-white/70 border border-white/10 hover:border-white/20'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Screenshot */}
        <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-[0_32px_80px_rgba(0,0,0,0.6)]">
          {/* Browser chrome bar */}
          <div className="bg-[#1a1a1a] px-4 py-3 flex items-center gap-2 border-b border-white/[0.06]">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-white/10" />
              <div className="w-3 h-3 rounded-full bg-white/10" />
              <div className="w-3 h-3 rounded-full bg-white/10" />
            </div>
            <div className="flex-1 mx-4">
              <div className="bg-white/[0.05] rounded-md px-3 py-1 text-xs text-white/25 font-mono text-center max-w-sm mx-auto">
                app.epuredrive.com
              </div>
            </div>
          </div>
          <Image
            key={current.id}
            src={current.src}
            alt={current.description}
            width={1440}
            height={900}
            className="w-full object-cover"
            priority={current.id === 'overview'}
          />
        </div>

        {/* Active tab description */}
        <p className="text-center text-white/30 text-sm mt-5 font-light">
          {current.description}
        </p>
      </div>
    </section>
  )
}
