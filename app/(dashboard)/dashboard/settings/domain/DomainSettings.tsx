'use client'

import { useState, useTransition } from 'react'
import { updateTenantBranding, saveCustomDomain } from '../actions'

interface Props {
  tenant: {
    name?: string | null
    slug?: string | null
    brand_name?: string | null
    plan?: string | null
    custom_domain?: string | null
  } | null
  customDomainsEnabled?: boolean
}

export default function DomainSettings({ tenant, customDomainsEnabled = false }: Props) {
  const [isPending, startTransition] = useTransition()
  const [msg, setMsg] = useState('')
  const [slug, setSlug] = useState(tenant?.slug || '')
  const [customDomain, setCustomDomain] = useState(tenant?.custom_domain || '')
  const [isCustomPending, startCustomTransition] = useTransition()
  const [customMsg, setCustomMsg] = useState('')

  const publicUrl = slug ? `https://${slug}.epuredrive.com` : null
  const canUseCustomDomain = customDomainsEnabled

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMsg('')
    startTransition(async () => {
      const result = await updateTenantBranding({
        slug: slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-') || null,
      })
      if (result.error) setMsg('Error: ' + result.error)
      else setMsg('Domain updated successfully.')
    })
  }

  async function handleCustomDomainSubmit(e: React.FormEvent) {
    e.preventDefault()
    setCustomMsg('')
    startCustomTransition(async () => {
      const trimmed = customDomain.trim().toLowerCase()
      const result = await saveCustomDomain({ domain: trimmed || null })
      if (result.error) setCustomMsg('Error: ' + result.error)
      else setCustomMsg('Custom domain saved.')
    })
  }

  return (
    <div className="space-y-8">
      {/* Current Domain */}
      <div className="glass border border-white/10 rounded-3xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
            </svg>
          </div>
          <div>
            <h3 className="text-white font-bold">Subdomain</h3>
            <p className="text-white/30 text-xs">Your free éPure Drive subdomain</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {msg && (
            <div className={`p-3 rounded-xl text-sm border ${msg.startsWith('Error') ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'}`}>
              {msg}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest pl-1">Subdomain Slug</label>
            <div className="relative">
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                placeholder="your-brand"
                className="w-full bg-white/5 border border-white/5 rounded-2xl py-3 pl-4 pr-36 text-sm focus:ring-1 focus:ring-white/20 text-white outline-none transition-all"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-white/20 uppercase">.epuredrive.com</span>
            </div>
          </div>

          {publicUrl && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/[0.04]">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="text-white/50 text-sm hover:text-white transition-colors">
                {publicUrl}
              </a>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="bg-white text-black hover:bg-white/90 px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-[0.15em] transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
            >
              {isPending ? 'Saving...' : 'Update Domain'}
            </button>
          </div>
        </form>
      </div>

      {/* Custom Domain (Pro Feature) */}
      <div className={`glass border rounded-3xl p-8 relative overflow-hidden ${canUseCustomDomain ? 'border-white/10' : 'border-white/[0.04]'}`}>
        {!canUseCustomDomain && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-10 flex items-center justify-center">
            <div className="text-center">
              <div className="px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-widest inline-block mb-3">
                Enterprise Only
              </div>
              <p className="text-white/40 text-sm">Custom domains are not enabled for your organization. Contact your administrator.</p>
            </div>
          </div>
        )}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
            </svg>
          </div>
          <div>
            <h3 className="text-white font-bold">Custom Domain</h3>
            <p className="text-white/30 text-xs">Point your own domain to your fleet page</p>
          </div>
        </div>
        <form onSubmit={handleCustomDomainSubmit} className="space-y-5">
          {customMsg && (
            <div className={`p-3 rounded-xl text-sm border ${customMsg.startsWith('Error') ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'}`}>
              {customMsg}
            </div>
          )}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest pl-1">Domain</label>
            <input
              type="text"
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
              disabled={!canUseCustomDomain}
              placeholder="fleet.yourbrand.com"
              className="w-full bg-white/5 border border-white/5 rounded-2xl py-3 px-4 text-sm text-white outline-none transition-all disabled:opacity-30"
            />
          </div>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">DNS Configuration</div>
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div><span className="text-white/30">Type:</span> <span className="text-white/60">CNAME</span></div>
              <div><span className="text-white/30">Host:</span> <span className="text-white/60">fleet</span></div>
              <div><span className="text-white/30">Value:</span> <span className="text-white/60">cname.epuredrive.com</span></div>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isCustomPending || !canUseCustomDomain}
              className="bg-white text-black hover:bg-white/90 px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-[0.15em] transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
            >
              {isCustomPending ? 'Saving...' : 'Save Domain'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
