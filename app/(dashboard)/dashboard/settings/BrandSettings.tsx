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

      {/* Financial Configuration */}
      <div className="glass border border-white/10 rounded-3xl p-8 lg:p-10 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-blue-500/10 transition-all duration-700" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-white font-black italic tracking-tight uppercase">Financial Configuration</h3>
              <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Payments & Stripe Integration</p>
            </div>
          </div>

          <div className="bg-white/5 border border-white/5 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#635BFF]/10 flex items-center justify-center text-[#635BFF]">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M13.911 8.021l-3.327.702.433 2.039 3.327-.702-.433-2.039zm3.876-1.579l-3.328.702.433 2.039 3.327-.702-.432-2.039zm-7.753 3.158l-3.328.702.433 2.039 3.327-.702-.433-2.039zm12.966-2.737c0-2.039-1.652-3.691-3.691-3.691H4.691C2.652 3.174 1 4.826 1 6.865v10.27c0 2.039 1.652 3.691 3.691 3.691h14.618c2.039 0 3.691-1.652 3.691-3.691V6.865zm-2.039 10.27c0 .913-.739 1.652-1.652 1.652H4.691c-.913 0-1.652-.739-1.652-1.652V6.865c0-.913.739-1.652 1.652-1.652h14.618c.913 0 1.652.739 1.652 1.652v10.27z"/></svg>
              </div>
              <div>
                <div className="text-white font-bold text-sm">Stripe Connect</div>
                <div className="text-xs text-white/40">Accept online payments and automate payouts.</div>
              </div>
            </div>
            
            <button className="bg-[#635BFF] hover:bg-[#635BFF]/90 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-[#635BFF]/20 transition-all flex items-center gap-2">
              Connect Account
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
            </button>
          </div>

          <div className="mt-8 pt-8 border-t border-white/5 space-y-4">
             <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest px-2">
               <span className="text-white/30">Currency</span>
               <span className="text-white">USD (United States Dollar)</span>
             </div>
             <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest px-2">
               <span className="text-white/30">Payout Method</span>
               <span className="text-white/60 italic">Not configured</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  )
}
