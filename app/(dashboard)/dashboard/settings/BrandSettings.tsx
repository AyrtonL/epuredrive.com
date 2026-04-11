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
    logo_url?: string | null
  } | null
}

export default function BrandSettings({ tenant }: Props) {
  const [isPending, startTransition] = useTransition()
  const [msg, setMsg] = useState('')
  const [brandName, setBrandName] = useState(tenant?.brand_name || tenant?.name || '')
  const [slug, setSlug] = useState(tenant?.slug || '')
  const [logoUrl, setLogoUrl] = useState(tenant?.logo_url || '')
  const [primary, setPrimary] = useState(tenant?.primary_color || '#000000')
  const [accent, setAccent] = useState(tenant?.accent_color || '#3B82F6')

  const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  const publicUrl = slug ? `https://${slug}.epuredrive.com` : null

  const previewGradient = `linear-gradient(135deg, ${primary}, ${accent})`

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMsg('')
    startTransition(async () => {
      const result = await updateTenantBranding({
        brand_name: brandName.trim() || null,
        slug: slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-') || null,
        logo_url: logoUrl.trim() || null,
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

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest pl-1">Brand Name</label>
              <input type="text" value={brandName} onChange={e => setBrandName(e.target.value)}
                placeholder={tenant?.name || 'Your company name'}
                className="w-full bg-white/5 border border-white/5 rounded-2xl py-3 px-4 text-sm focus:ring-1 focus:ring-white/20 text-white outline-none transition-all" />
            </div>
            
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest pl-1">Custom Domain (Slug)</label>
              <div className="relative">
                <input type="text" value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                  placeholder="your-brand"
                  className="w-full bg-white/5 border border-white/5 rounded-2xl py-3 pl-4 pr-32 text-sm focus:ring-1 focus:ring-white/20 text-white outline-none transition-all" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-white/20 uppercase">.epuredrive.com</span>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest pl-1">Logo URL</label>
            <input type="text" value={logoUrl} onChange={e => setLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
              className="w-full bg-white/5 border border-white/5 rounded-2xl py-3 px-4 text-sm focus:ring-1 focus:ring-white/20 text-white outline-none transition-all" />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest pl-1">Primary Color</label>
              <div className="flex items-center gap-4 bg-white/5 border border-white/5 p-2 rounded-2xl">
                <input type="color" value={primary} onChange={e => setPrimary(e.target.value)}
                  className="w-10 h-10 bg-transparent border-none cursor-pointer rounded-xl" />
                <span className="text-white/30 text-[10px] font-black uppercase tracking-widest">{primary}</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest pl-1">Accent Color</label>
              <div className="flex items-center gap-4 bg-white/5 border border-white/5 p-2 rounded-2xl">
                <input type="color" value={accent} onChange={e => setAccent(e.target.value)}
                  className="w-10 h-10 bg-transparent border-none cursor-pointer rounded-xl" />
                <span className="text-white/30 text-[10px] font-black uppercase tracking-widest">{accent}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button type="submit" disabled={isPending}
              className="bg-white text-black hover:bg-white/90 px-10 py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-white/5 transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]">
              {isPending ? 'Propagating Changes...' : 'Synchronize Identity'}
            </button>
          </div>
        </form>
      </div>

    </div>
  )
}
