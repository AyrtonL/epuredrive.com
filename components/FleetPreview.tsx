// components/FleetPreview.tsx
'use client'

const EPUREDRIVE_FLEET_URL = `https://${process.env.NEXT_PUBLIC_EPUREDRIVE_SLUG ?? 'ayrtonn-lg-1774229361678'}.epuredrive.com`

export default function FleetPreview() {
  return (
    <div className="rounded-2xl overflow-hidden border border-white/10 bg-white/5">
      <div className="flex items-center gap-2 px-4 py-3 bg-white/5 border-b border-white/10">
        <div className="flex gap-1.5">
          <span className="w-3 h-3 rounded-full bg-white/20" />
          <span className="w-3 h-3 rounded-full bg-white/20" />
          <span className="w-3 h-3 rounded-full bg-white/20" />
        </div>
        <span className="text-xs text-white/30 ml-2">{EPUREDRIVE_FLEET_URL}</span>
        <a
          href={EPUREDRIVE_FLEET_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-xs text-white/40 hover:text-white transition-colors"
        >
          Open ↗
        </a>
      </div>
      <iframe
        src={EPUREDRIVE_FLEET_URL}
        className="w-full"
        style={{ height: '480px', border: 'none' }}
        title="Example fleet page"
        loading="lazy"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  )
}
