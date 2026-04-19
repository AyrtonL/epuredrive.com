'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { uploadLogo } from './actions'

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
  brandName: string
  setBrandName: (v: string) => void
  slug: string
  setSlug: (v: string) => void
  logoUrl: string
  setLogoUrl: (v: string) => void
  primary: string
  setPrimary: (v: string) => void
  accent: string
  setAccent: (v: string) => void
  setMsg: (v: string) => void
}

const inputCls = 'w-full bg-white/5 border border-white/5 rounded-2xl py-3 px-4 text-sm focus:ring-1 focus:ring-white/20 text-white outline-none transition-all'
const labelCls = 'text-[11px] font-bold text-white/50 uppercase tracking-widest pl-1'

export default function BrandTab({
  tenant, brandName, setBrandName, slug, setSlug,
  logoUrl, setLogoUrl, primary, setPrimary, accent, setAccent, setMsg,
}: Props) {
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  const publicUrl = slug ? `https://${slug}.epuredrive.com` : null
  const previewGradient = `linear-gradient(135deg, ${primary}, ${accent})`

  return (
    <div className="space-y-8">
      {/* Live Preview */}
      <div className="glass border border-white/10 rounded-3xl p-6">
        <h3 className="text-white font-bold text-sm mb-4 uppercase tracking-widest opacity-50">Live Preview</h3>
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl border border-white/10 flex-shrink-0 overflow-hidden" style={{ background: previewGradient }}>
            {logoUrl && (
              <Image src={logoUrl} alt="Logo" width={64} height={64} className="w-full h-full object-contain p-1" />
            )}
          </div>
          <div>
            <div className="text-white font-bold text-xl">{brandName || 'Your Brand'}</div>
            <div className="text-white/40 text-sm mt-1">
              Plan: <span className="capitalize font-semibold text-white/60">{tenant?.plan || 'free'}</span>
            </div>
            {publicUrl && (
              <a href={publicUrl} target="_blank" rel="noopener" className="text-white/30 text-xs hover:text-white transition-colors mt-1 block">
                {publicUrl}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Brand Identity */}
      <div className="glass border border-white/10 rounded-3xl p-6 space-y-5">
        <h3 className="text-white font-bold text-sm uppercase tracking-widest opacity-50">Brand Identity</h3>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className={labelCls}>Brand Name</label>
            <input type="text" value={brandName} onChange={e => setBrandName(e.target.value)}
              placeholder={tenant?.name || 'Your company name'} className={inputCls} />
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Custom Domain (Slug)</label>
            <div className="relative">
              <input type="text" value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                placeholder="your-brand" className={`${inputCls} pr-32`} />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-white/20 uppercase">.epuredrive.com</span>
            </div>
          </div>
        </div>

        {/* Logo */}
        <div className="space-y-2">
          <label className={labelCls}>Logo</label>
          <div className="flex items-center gap-4">
            {logoUrl ? (
              <div className="relative group">
                <Image src={logoUrl} alt="Logo" width={64} height={64} className="w-16 h-16 object-contain rounded-xl border border-white/10 bg-white/5 p-1" />
                <button type="button" onClick={() => setLogoUrl('')}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  x
                </button>
              </div>
            ) : (
              <div className="w-16 h-16 rounded-xl border-2 border-dashed border-white/10 flex items-center justify-center text-white/20">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
                </svg>
              </div>
            )}
            <div className="flex-1">
              <input ref={logoInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  setUploadingLogo(true)
                  const fd = new FormData()
                  fd.append('file', file)
                  const result = await uploadLogo(fd)
                  if (result.url) setLogoUrl(result.url)
                  else if (result.error) setMsg('Error: ' + result.error)
                  setUploadingLogo(false)
                  if (logoInputRef.current) logoInputRef.current.value = ''
                }} />
              <button type="button" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}
                className="bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 text-xs font-bold px-4 py-2 rounded-xl transition-all disabled:opacity-50">
                {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
              </button>
              <p className="text-[10px] text-white/20 mt-1">PNG, JPEG, SVG, WebP — Max 5MB</p>
            </div>
          </div>
        </div>

        {/* Colors */}
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className={labelCls}>Primary Color</label>
            <div className="flex items-center gap-4 bg-white/5 border border-white/5 p-2 rounded-2xl">
              <input type="color" value={primary} onChange={e => setPrimary(e.target.value)}
                className="w-10 h-10 bg-transparent border-none cursor-pointer rounded-xl" />
              <span className="text-white/30 text-[10px] font-black uppercase tracking-widest">{primary}</span>
            </div>
          </div>
          <div className="space-y-2">
            <label className={labelCls}>Accent Color</label>
            <div className="flex items-center gap-4 bg-white/5 border border-white/5 p-2 rounded-2xl">
              <input type="color" value={accent} onChange={e => setAccent(e.target.value)}
                className="w-10 h-10 bg-transparent border-none cursor-pointer rounded-xl" />
              <span className="text-white/30 text-[10px] font-black uppercase tracking-widest">{accent}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
