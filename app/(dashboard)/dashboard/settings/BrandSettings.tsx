'use client'

import { useState, useTransition } from 'react'
import { updateTenantBranding } from './actions'

interface Props {
  tenant: {
    name?: string | null
    plan?: string | null
    slug?: string | null
    brand_name?: string | null
    primary_color?: string | null
    accent_color?: string | null
  } | null
}

export default function BrandSettings({ tenant }: Props) {
  const [isPending, startTransition] = useTransition()
  const [msg, setMsg] = useState('')
  const [brandName, setBrandName] = useState(tenant?.brand_name || tenant?.name || '')
  const [primary, setPrimary] = useState(tenant?.primary_color || '#000000')
  const [accent, setAccent] = useState(tenant?.accent_color || '#3B82F6')

  const publicUrl = tenant?.slug ? `https://${tenant.slug}.epuredrive.com` : null

  const previewGradient = `linear-gradient(135deg, ${primary}, ${accent})`

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMsg('')
    startTransition(async () => {
      const result = await updateTenantBranding({
        brand_name: brandName.trim() || null,
        primary_color: primary,
        accent_color: accent,
      })
      if (result.error) setMsg('Error: ' + result.error)
      else setMsg('✓ Brand settings saved!')
    })
  }

  return (
    <div className="space-y-6">
      {/* Live Preview */}
      <div className="glass border border-white/10 rounded-3xl p-6">
        <h3 className="text-white font-bold text-sm mb-4 uppercase tracking-widest opacity-50">Live Preview</h3>
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl border border-white/10 flex-shrink-0" style={{ background: previewGradient }} />
          <div>
            <div className="text-white font-bold text-xl">{brandName || 'Your Brand'}</div>
            <div className="text-white/40 text-sm mt-1">
              Plan: <span className="capitalize font-semibold text-white/60">{tenant?.plan || 'free'}</span>
            </div>
            {publicUrl && (
              <a href={publicUrl} target="_blank" rel="noopener" className="text-white/30 text-xs hover:text-white transition-colors mt-1 block">
                🔗 {publicUrl}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="glass border border-white/10 rounded-3xl p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {msg && (
            <div className={`p-3 rounded-xl text-sm border ${msg.startsWith('Error') ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'}`}>
              {msg}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Brand Name</label>
            <input type="text" value={brandName} onChange={e => setBrandName(e.target.value)}
              placeholder={tenant?.name || 'Your company name'}
              className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white" />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Primary Color</label>
              <div className="flex items-center gap-3">
                <input type="color" value={primary} onChange={e => setPrimary(e.target.value)}
                  className="w-12 h-10 bg-transparent border border-white/10 rounded-xl cursor-pointer" />
                <span className="text-white/50 text-sm font-mono">{primary}</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Accent Color</label>
              <div className="flex items-center gap-3">
                <input type="color" value={accent} onChange={e => setAccent(e.target.value)}
                  className="w-12 h-10 bg-transparent border border-white/10 rounded-xl cursor-pointer" />
                <span className="text-white/50 text-sm font-mono">{accent}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button type="submit" disabled={isPending}
              className="bg-white text-black hover:bg-white/90 px-8 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50">
              {isPending ? 'Saving...' : 'Save Brand Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
