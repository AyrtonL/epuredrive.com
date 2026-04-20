'use client'

import { useState, useTransition } from 'react'
import { updateTenantBranding } from './actions'
import type { PickupLocation, ExperiencePillar, HowItWorksStep } from '@/lib/supabase/types'
import { DEFAULT_EXPERIENCE_PILLARS } from '@/lib/constants/experience-pillars'
import { DEFAULT_HOW_IT_WORKS } from '@/lib/constants/how-it-works'
import SettingsTabs, { type SettingsTab } from './SettingsTabs'
import BrandTab from './BrandTab'
import SiteContentTab from './SiteContentTab'
import LocationsTab from './LocationsTab'

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
    site_theme?: 'dark' | 'light'
  } | null
}

export default function BrandSettings({ tenant }: Props) {
  const [isPending, startTransition] = useTransition()
  const [msg, setMsg] = useState('')
  const [activeTab, setActiveTab] = useState<SettingsTab>('brand')

  // Brand identity
  const [brandName, setBrandName] = useState(tenant?.brand_name || tenant?.name || '')
  const [slug, setSlug] = useState(tenant?.slug || '')
  const [logoUrl, setLogoUrl] = useState(tenant?.logo_url || '')
  const [primary, setPrimary] = useState(tenant?.primary_color || '#000000')
  const [accent, setAccent] = useState(tenant?.accent_color || '#3B82F6')
  const [siteTheme, setSiteTheme] = useState<'dark' | 'light'>(tenant?.site_theme || 'dark')

  // Site content
  const [tagline, setTagline] = useState(tenant?.tagline || '')
  const [description, setDescription] = useState(tenant?.description || '')
  const [heroImageUrl, setHeroImageUrl] = useState(tenant?.hero_image_url || '')

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
        site_theme: siteTheme,
      })
      if (result.error) setMsg('Error: ' + result.error)
      else setMsg('Settings saved successfully.')
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {msg && (
        <div className={`p-3 rounded-xl text-sm border ${msg.startsWith('Error') ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'}`}>
          {msg}
        </div>
      )}

      <SettingsTabs activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'brand' && (
        <BrandTab
          tenant={tenant}
          brandName={brandName} setBrandName={setBrandName}
          slug={slug} setSlug={setSlug}
          logoUrl={logoUrl} setLogoUrl={setLogoUrl}
          primary={primary} setPrimary={setPrimary}
          accent={accent} setAccent={setAccent}
          siteTheme={siteTheme} setSiteTheme={setSiteTheme}
          setMsg={setMsg}
        />
      )}

      {activeTab === 'content' && (
        <SiteContentTab
          tagline={tagline} setTagline={setTagline}
          description={description} setDescription={setDescription}
          heroImageUrl={heroImageUrl} setHeroImageUrl={setHeroImageUrl}
          pillars={pillars} setPillars={setPillars}
          howItWorks={howItWorks} setHowItWorks={setHowItWorks}
          setMsg={setMsg}
        />
      )}

      {activeTab === 'locations' && (
        <LocationsTab
          whatsappPhone={whatsappPhone} setWhatsappPhone={setWhatsappPhone}
          businessHours={businessHours} setBusinessHours={setBusinessHours}
          locations={locations} setLocations={setLocations}
        />
      )}

      {/* Submit */}
      <div className="flex justify-end">
        <button type="submit" disabled={isPending}
          className="bg-white text-black hover:bg-white/90 px-10 py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-white/5 transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]">
          {isPending ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </form>
  )
}
