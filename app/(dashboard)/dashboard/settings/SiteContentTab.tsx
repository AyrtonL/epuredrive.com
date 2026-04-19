'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { uploadHeroImage } from './actions'
import type { ExperiencePillar, HowItWorksStep } from '@/lib/supabase/types'
import { DEFAULT_EXPERIENCE_PILLARS } from '@/lib/constants/experience-pillars'
import { DEFAULT_HOW_IT_WORKS, HOW_IT_WORKS_TEMPLATES } from '@/lib/constants/how-it-works'

interface Props {
  tagline: string
  setTagline: (v: string) => void
  description: string
  setDescription: (v: string) => void
  heroImageUrl: string
  setHeroImageUrl: (v: string) => void
  pillars: ExperiencePillar[]
  setPillars: (v: ExperiencePillar[] | ((prev: ExperiencePillar[]) => ExperiencePillar[])) => void
  howItWorks: HowItWorksStep[]
  setHowItWorks: (v: HowItWorksStep[] | ((prev: HowItWorksStep[]) => HowItWorksStep[])) => void
  setMsg: (v: string) => void
}

const inputCls = 'w-full bg-white/5 border border-white/5 rounded-2xl py-3 px-4 text-sm focus:ring-1 focus:ring-white/20 text-white outline-none transition-all'
const labelCls = 'text-[11px] font-bold text-white/50 uppercase tracking-widest pl-1'

export default function SiteContentTab({
  tagline, setTagline, description, setDescription,
  heroImageUrl, setHeroImageUrl, pillars, setPillars,
  howItWorks, setHowItWorks, setMsg,
}: Props) {
  const [uploadingHero, setUploadingHero] = useState(false)
  const heroInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-8">
      {/* Hero Content */}
      <div className="glass border border-white/10 rounded-3xl p-6 space-y-5">
        <h3 className="text-white font-bold text-sm uppercase tracking-widest opacity-50">Hero Section</h3>

        <div className="space-y-1">
          <label className={labelCls}>Tagline</label>
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
          <label className={labelCls}>Background Image</label>
          {heroImageUrl && (
            <div className="relative group rounded-2xl overflow-hidden border border-white/10 mb-2">
              <Image src={heroImageUrl} alt="Hero" width={600} height={160} className="w-full h-40 object-cover" />
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

      {/* Experience Pillars */}
      <div className="glass border border-white/10 rounded-3xl p-6 space-y-5">
        <div>
          <h3 className="text-white font-bold text-sm uppercase tracking-widest opacity-50">Experience Section</h3>
          <p className="text-white/30 text-xs mt-1">The 3 pillars shown on your public site under &ldquo;The Experience&rdquo;. Keep them short and relevant to your brand.</p>
        </div>
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

      {/* How It Works */}
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
    </div>
  )
}
