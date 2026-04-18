export default function IntegrationsStrip() {
  const logos = ['Turo', 'Stripe', 'Square', 'QuickBooks', 'Google Calendar', 'iCal', 'WhatsApp']
  return (
    <section className="border-y border-white/[0.06] py-8">
      <div className="max-w-[1280px] mx-auto px-8 flex items-center justify-between flex-wrap gap-y-4">
        <span className="text-[11px] tracking-[0.2em] uppercase text-white/35 font-semibold">Works with</span>
        <div className="flex gap-10 flex-wrap items-center">
          {logos.map(l => (
            <span key={l} className="text-lg font-bold text-white/40 tracking-[-0.02em] hover:text-white/70 transition-colors cursor-default">{l}</span>
          ))}
        </div>
      </div>
    </section>
  )
}
