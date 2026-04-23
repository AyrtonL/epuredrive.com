'use client'

import { useState } from 'react'

interface Props {
  videoUrl: string
}

export default function DemoVideo({ videoUrl }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <section className="relative py-24 bg-black overflow-hidden" id="demo">
      <div className="section-divider absolute top-0 left-0 right-0" />

      <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
        <div className="inline-flex items-center gap-2 bg-white/[0.05] border border-white/[0.09] rounded-full px-4 py-1.5 mb-5">
          <span className="text-[11px] font-bold tracking-[0.25em] text-charcoal uppercase">Watch</span>
        </div>
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-5 tracking-tight">
          See éPure Drive in 2 minutes
        </h2>
        <p className="text-lg text-charcoal font-light mb-10 max-w-xl mx-auto">
          A quick tour of the dashboard, your public booking page, and how a customer reservation flows end-to-end.
        </p>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group relative mx-auto block rounded-2xl overflow-hidden border border-white/10 hover:border-white/25 transition-all shadow-[0_24px_60px_rgba(0,0,0,0.55)]"
          aria-label="Play product demo video"
        >
          <div className="relative aspect-video w-full max-w-3xl bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] flex items-center justify-center">
            <div className="absolute inset-0 bg-grid-lines opacity-30 pointer-events-none" />
            <div className="relative w-20 h-20 rounded-full bg-white/95 flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-8 h-8 text-black ml-1" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Product demo video"
        >
          <div
            className="relative w-full max-w-5xl aspect-video rounded-2xl overflow-hidden border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <iframe
              src={videoUrl}
              title="éPure Drive product demo"
              className="w-full h-full"
              allow="autoplay; fullscreen"
              allowFullScreen
            />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/70 border border-white/10 flex items-center justify-center text-white hover:bg-black transition-colors"
              aria-label="Close demo"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="section-divider absolute bottom-0 left-0 right-0" />
    </section>
  )
}
