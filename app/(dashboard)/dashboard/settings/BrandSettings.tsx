'use client'

import { useState, useTransition, useRef } from 'react'
import { updateTenantBranding, uploadLogo, uploadHeroImage } from './actions'
import type { PickupLocation, ExperiencePillar, HowItWorksStep } from '@/lib/supabase/types'
import { DEFAULT_EXPERIENCE_PILLARS } from '@/lib/constants/experience-pillars'
import { DEFAULT_HOW_IT_WORKS, HOW_IT_WORKS_TEMPLATES } from '@/lib/constants/how-it-works'

interface Props {
  tenant: {
    name?: string | null
    plan?: string | null
    slug?: string | null
    brand_name?: string | null
    primary_color?: string | null
    accent_color?: string | null
    logo_url?: string | null
    tagline?: string | null
    description?: string | null
    hero_image_url?: string | null
    whatsapp_phone?: string | null
    business_hours?: string | null
    pickup_locations?: PickupLocation[]
    experience_pillars?: ExperiencePillar[] | null
    how_it_works?: HowItWorksStep[] | null
  } | null
}

const EMPTY_LOCATION: PickupLocation = { label: '', address: '', note: '', fee: 0, maps_query: '' }

export default function BrandSettings({ tenant }: Props) {
  const [isPending, startTransition] = useTransition()
  const [msg, setMsg] = useState('')

  // Brand identity
  const [brandName, setBrandName] = useState(tenant?.brand_name || tenant?.name || '')
  const [slug, setSlug] = useState(tenant?.slug || '')
  const [logoUrl, setLogoUrl] = useState(tenant?.logo_url || '')
  const [primary, setPrimary] = useState(tenant?.primary_color || '#000000')
  const [accent, setAccent] = useState(tenant?.accent_color || '#3B82F6')
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  // Site content
  const [tagline, setTagline] = useState(tenant?.tagline || '')
  const [description, setDescription] = useState(tenant?.description || '')
  const [heroImageUrl, setHeroImageUrl] = useState(tenant?.hero_image_url || '')
  const [uploadingHero, setUploadingHero] = useState(false)
  const heroInputRef = useRef<HTMLInputElement>(null)

  // Contact
  const [whatsappPhone, setWhatsappPhone] = useState(tenant?.whatsapp_phone || '')
  const [businessHours, setBusinessHours] = useState(tenant?.business_hours || '')

  // Pickup locations
  const [locations, setLocations] = useState<PickupLocation[]>(
    tenant?.pickup_locations?.length ? tenant.pickup_locations : []
  )

  // Experience pillars
  const [pillars, setPillars] = useState<ExperiencePillar[]>(
    tenant?.experience_pillars?.length === 3
      ? tenant.experience_pillars
      : DEFAULT_EXPERIENCE_PILLARS
  )

  // How It Works steps
  const [howItWorks, setHowItWorks] = useState<HowItWorksStep[]>(
    Array.isArray(tenant?.how_it_works) && tenant.how_it_works.length === 3
      ? tenant.how_it_works
      : DEFAULT_HOW_IT_WORKS
  )

  const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  const publicUrl = slug ? `https://${slug}.epuredrive.com` : null
  const previewGradient = `linear-gradient(135deg, ${primary}, ${accent})`

  function addLocation() {
    setLocations(prev => [...prev, { ...EMPTY_LOCATION }])
  }

  function updateLocation(index: number, field: keyof PickupLocation, value: string | number) {
    setLocations(prev => prev.map((loc, i) => i === index ? { ...loc, [field]: value } : loc))
  }

  function removeLocation(index: number) {
    setLocations(prev => prev.filter((_, i) => i !== index))
  }

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
        tagline: tagline.trim() || null,
        description: description.trim() || null,
        hero_image_url: heroImageUrl.trim() || null,
        whatsapp_phone: whatsappPhone.replace(/\D/g, '') || null,
        business_hours: businessHours.trim() || null,
        pickup_locations: locations.filter(l => l.label.trim()),
        experience_pillars: pillars,
        how_it_works: howItWorks,
      })
      if (result.error) setMsg('Error: ' + result.error)
      else setMsg('Settings saved successfully.')
    })
  }

  const inputCls = 'w-full bg-white/5 border border-white/5 rounded-2xl py-3 px-4 text-sm focus:ring-1 focus:ring-white/20 text-white outline-none transition-all'
  const labelCls = 'text-[11px] font-bold text-white/50 uppercase tracking-widest pl-1'

  const checklist = [
    { key: 'logo', label: 'Logo', done: !!logoUrl },
    { key: 'tagline', label: 'Hero Tagline', done: !!tagline.trim() },
    { key: 'description', label: 'Description', done: !!description.trim() },
    { key: 'hero', label: 'Hero Image', done: !!heroImageUrl },
    { key: 'whatsapp', label: 'WhatsApp Phone', done: !!whatsappPhone.trim() },
    { key: 'locations', label: 'Pickup Locations', done: locations.some(l => l.label.trim()) },
  ]
  const completedCount = checklist.filter(i => i.done).length
  const completionPct = Math.round((completedCount / checklist.length) * 100)
  const isComplete = completedCount === checklist.length

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {msg && (
        <div className={`p-3 rounded-xl text-sm border ${msg.startsWith('Error') ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'}`}>
          {msg}
        </div>
      )}

      {/* ── Setup Checklist ── */}
      {!isComplete && (
        <div className="glass border border-amber-500/20 bg-amber-500/5 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-bold text-sm uppercase tracking-widest">Landing Page Setup</h3>
              <p className="text-white/40 text-xs mt-1">
                Complete these steps to make your public site shine — {completedCount} of {checklist.length} done.
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-amber-300">{completionPct}%</div>
            </div>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-500"
              style={{ width: `${completionPct}%` }}
            />
          </div>
          <ul className="grid sm:grid-cols-2 gap-2 pt-2">
            {checklist.map(item => (
              <li key={item.key} className="flex items-center gap-2 text-xs">
                <span
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 ${
                    item.done ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/5 text-white/20 border border-white/10'
                  }`}
                >
                  {item.done ? '✓' : ''}
                </span>
                <span className={item.done ? 'text-white/60 line-through' : 'text-white/70'}>{item.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Live Preview ── */}
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
                {publicUrl}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ── Brand Identity ── */}
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
                <img src={logoUrl} alt="Logo" className="w-16 h-16 object-contain rounded-xl border border-white/10 bg-white/5 p-1" />
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

      {/* ── Site Content ── */}
      <div className="glass border border-white/10 rounded-3xl p-6 space-y-5">
        <h3 className="text-white font-bold text-sm uppercase tracking-widest opacity-50">Landing Page Content</h3>

        <div className="space-y-1">
          <label className={labelCls}>Hero Tagline</label>
          <input type="text" value={tagline} onChange={e => setTagline(e.target.value)}
            placeholder="e.g. Luxury Rentals, Redefined." className={inputCls} maxLength={120} />
          <p className="text-[10px] text-white/20 pl-1">Main headline on your landing page hero section</p>
        </div>

        <div className="space-y-1">
          <label className={labelCls}>Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Tell visitors what makes your fleet special..."
            rows={3} className={`${inputCls} resize-none`} maxLength={500} />
          <p className="text-[10px] text-white/20 pl-1">Short paragraph shown below the tagline</p>
        </div>

        {/* Hero Image */}
        <div className="space-y-2">
          <label className={labelCls}>Hero Background Image</label>
          {heroImageUrl && (
            <div className="relative group rounded-2xl overflow-hidden border border-white/10 mb-2">
              <img src={heroImageUrl} alt="Hero" className="w-full h-40 object-cover" />
              <button type="button" onClick={() => setHeroImageUrl('')}
                className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                x
              </button>
            </div>
          )}
          <div className="flex items-center gap-3">
            <input ref={heroInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                setUploadingHero(true)
                const fd = new FormData()
                fd.append('file', file)
                const result = await uploadHeroImage(fd)
                if (result.url) setHeroImageUrl(result.url)
                else if (result.error) setMsg('Error: ' + result.error)
                setUploadingHero(false)
                if (heroInputRef.current) heroInputRef.current.value = ''
              }} />
            <button type="button" onClick={() => heroInputRef.current?.click()} disabled={uploadingHero}
              className="bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 text-xs font-bold px-4 py-2 rounded-xl transition-all disabled:opacity-50">
              {uploadingHero ? 'Uploading...' : 'Upload Hero Image'}
            </button>
            <p className="text-[10px] text-white/20">JPEG, PNG, WebP — Max 10MB. Recommended: 1920x800</p>
          </div>
        </div>
      </div>

      {/* ── Contact Info ── */}
      <div className="glass border border-white/10 rounded-3xl p-6 space-y-5">
        <h3 className="text-white font-bold text-sm uppercase tracking-widest opacity-50">Contact &amp; Hours</h3>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className={labelCls}>WhatsApp / SMS Phone</label>
            <input type="tel" value={whatsappPhone} onChange={e => setWhatsappPhone(e.target.value)}
              placeholder="e.g. +1 (786) 209-6770" className={inputCls} />
            <p className="text-[10px] text-white/20 pl-1">Shown on your public site for customer inquiries</p>
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Business Hours</label>
            <input type="text" value={businessHours} onChange={e => setBusinessHours(e.target.value)}
              placeholder="e.g. Mon-Sun 8AM - 8PM" className={inputCls} />
          </div>
        </div>
      </div>

      {/* ── Pickup Locations ── */}
      <div className="glass border border-white/10 rounded-3xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-bold text-sm uppercase tracking-widest opacity-50">Pickup &amp; Delivery Locations</h3>
          <button type="button" onClick={addLocation}
            className="bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 text-xs font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-2">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Location
          </button>
        </div>

        {locations.length === 0 && (
          <p className="text-white/20 text-sm text-center py-8">
            No pickup locations configured. Add locations that will appear on your public fleet page.
          </p>
        )}

        <div className="space-y-4">
          {locations.map((loc, i) => (
            <div key={i} className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-4 relative group">
              <button type="button" onClick={() => removeLocation(i)}
                className="absolute top-3 right-3 w-6 h-6 bg-red-500/20 text-red-400 rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/40">
                x
              </button>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className={labelCls}>Label</label>
                  <input type="text" value={loc.label} onChange={e => updateLocation(i, 'label', e.target.value)}
                    placeholder="e.g. Showroom" className={inputCls} />
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>Address</label>
                  <input type="text" value={loc.address} onChange={e => updateLocation(i, 'address', e.target.value)}
                    placeholder="e.g. Aventura, FL" className={inputCls} />
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>Delivery Fee ($)</label>
                  <input type="number" value={loc.fee} onChange={e => updateLocation(i, 'fee', Number(e.target.value))}
                    min={0} step={1} className={inputCls} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className={labelCls}>Note</label>
                  <input type="text" value={loc.note} onChange={e => updateLocation(i, 'note', e.target.value)}
                    placeholder="e.g. Free pickup & drop-off" className={inputCls} />
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>Google Maps Query</label>
                  <input type="text" value={loc.maps_query} onChange={e => updateLocation(i, 'maps_query', e.target.value)}
                    placeholder="e.g. Aventura+Mall,+FL" className={inputCls} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Experience Section Pillars ── */}
      <div className="glass border border-white/10 rounded-3xl p-6 space-y-5">
        <h3 className="text-white font-bold text-sm uppercase tracking-widest opacity-50">Experience Section</h3>
        <p className="text-white/30 text-xs -mt-3">The 3 pillars shown on your public site under &ldquo;The Experience&rdquo;. Keep them short and relevant to your brand.</p>
        {pillars.map((pillar, i) => (
          <div key={i} className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-3">
            <div className="text-[10px] font-black text-white/25 uppercase tracking-widest">Pillar {i + 1}</div>
            <input
              type="text"
              value={pillar.title}
              onChange={e => setPillars(prev => prev.map((p, idx) => idx === i ? { ...p, title: e.target.value } : p))}
              placeholder="Title"
              maxLength={40}
              className={inputCls}
            />
            <textarea
              value={pillar.body}
              onChange={e => setPillars(prev => prev.map((p, idx) => idx === i ? { ...p, body: e.target.value } : p))}
              placeholder="Description"
              rows={2}
              maxLength={160}
              className={`${inputCls} resize-none`}
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() => setPillars(DEFAULT_EXPERIENCE_PILLARS)}
          className="text-[10px] font-bold text-white/25 hover:text-white/50 uppercase tracking-widest transition-colors"
        >
          Reset to defaults
        </button>
      </div>

      {/* ── How It Works ── */}
      <div className="glass border border-white/10 rounded-3xl p-6 space-y-5">
        <div>
          <h3 className="text-white font-bold text-sm uppercase tracking-widest opacity-50">How It Works</h3>
          <p className="text-white/30 text-xs mt-1">The 3 steps shown on your public site. Pick a template or customize each step.</p>
        </div>

        {/* Template picker */}
        <div className="flex flex-wrap gap-2">
          {HOW_IT_WORKS_TEMPLATES.map(tpl => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => setHowItWorks(tpl.steps)}
              className="text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-xl border transition-all bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white/80"
            >
              {tpl.label}
            </button>
          ))}
        </div>

        {/* Step editors */}
        {howItWorks.map((step, i) => (
          <div key={i} className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-3">
            <div className="text-[10px] font-black text-white/25 uppercase tracking-widest">Step {i + 1}</div>
            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className={labelCls}>Icon / Label</label>
                <input
                  type="text"
                  value={step.icon}
                  onChange={e => setHowItWorks(prev => prev.map((s, idx) => idx === i ? { ...s, icon: e.target.value } : s))}
                  placeholder="01"
                  maxLength={4}
                  className={inputCls}
                />
              </div>
              <div className="col-span-3 space-y-1">
                <label className={labelCls}>Title</label>
                <input
                  type="text"
                  value={step.title}
                  onChange={e => setHowItWorks(prev => prev.map((s, idx) => idx === i ? { ...s, title: e.target.value } : s))}
                  placeholder="Step title"
                  maxLength={60}
                  className={inputCls}
                />
              </div>
            </div>
            <textarea
              value={step.body}
              onChange={e => setHowItWorks(prev => prev.map((s, idx) => idx === i ? { ...s, body: e.target.value } : s))}
              placeholder="Brief description of this step"
              rows={2}
              maxLength={200}
              className={`${inputCls} resize-none`}
            />
          </div>
        ))}

        <button
          type="button"
          onClick={() => setHowItWorks(DEFAULT_HOW_IT_WORKS)}
          className="text-[10px] font-bold text-white/25 hover:text-white/50 uppercase tracking-widest transition-colors"
        >
          Reset to defaults
        </button>
      </div>

      {/* ── Submit ── */}
      <div className="flex justify-end">
        <button type="submit" disabled={isPending}
          className="bg-white text-black hover:bg-white/90 px-10 py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-white/5 transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]">
          {isPending ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </form>
  )
}
