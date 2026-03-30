// app/dashboard/fleet/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import FleetPreview from '@/components/FleetPreview'
import type { Tenant, Car } from '@/lib/supabase/types'

export default function FleetCustomizerPage() {
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [cars, setCars] = useState<Car[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [brandName, setBrandName] = useState('')
  const [logoUrl, setLogoUrl] = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single()
      if (!profile?.tenant_id) return

      const { data: t } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', profile.tenant_id)
        .single()
      if (t) {
        setTenant(t as Tenant)
        setBrandName(t.brand_name || t.name || '')
        setLogoUrl(t.logo_url || '')
      }

      // Seed sample car if needed
      await fetch('/api/seed-sample-car', { method: 'POST' })

      const { data: carRows } = await supabase
        .from('cars')
        .select('id, make, model, model_full, year, daily_rate, image_url, badge, status')
        .eq('tenant_id', profile.tenant_id)
        .order('id')
      setCars((carRows as Car[]) || [])
    }
    load()
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!tenant) return
    setSaving(true)

    const supabase = createClient()
    await supabase
      .from('tenants')
      .update({ brand_name: brandName, logo_url: logoUrl || null })
      .eq('id', tenant.id)

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const fleetUrl = tenant ? `https://${tenant.slug}.epuredrive.com` : ''

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Fleet Page</h1>
        <p className="text-white/40 text-sm">Customize how your public fleet page looks.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left: settings */}
        <div className="space-y-6">
          {/* Example preview callout */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <div className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
              Example — éPure Drive&apos;s live page
            </div>
            <FleetPreview />
            <p className="text-xs text-white/30 mt-3">
              This is what a finished fleet page looks like. Yours will be at{' '}
              {fleetUrl ? (
                <a href={fleetUrl} target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white">
                  {fleetUrl} ↗
                </a>
              ) : '…'}
            </p>
          </div>

          {/* Settings form */}
          <form onSubmit={handleSave} className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
            <h2 className="font-semibold text-white">Your page settings</h2>
            <div>
              <label className="block text-sm text-white/60 mb-1">Display name</label>
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-white/30"
              />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1">Logo URL (optional)</label>
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-white/5 border border-white/10 text-white placeholder:text-white/20 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-white/30"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-white text-black font-semibold py-2.5 rounded-lg text-sm hover:bg-white/90 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save changes'}
            </button>
          </form>
        </div>

        {/* Right: cars list */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">Your cars ({cars.length})</h2>
            <a
              href="/admin/dashboard.html"
              className="text-xs text-white/50 hover:text-white transition-colors"
            >
              Manage in full dashboard ↗
            </a>
          </div>
          {cars.length === 0 ? (
            <p className="text-white/30 text-sm py-8 text-center">Loading…</p>
          ) : (
            <div className="space-y-2">
              {cars.map((car) => (
                <div key={car.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                  {car.image_url && (
                    <img
                      src={car.image_url.startsWith('http') ? car.image_url : `/${car.image_url}`}
                      alt=""
                      className="w-14 h-10 object-cover rounded-lg"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">
                      {car.make} {car.model_full || car.model}
                    </div>
                    <div className="text-xs text-white/40">
                      {car.year} · ${car.daily_rate ? Number(car.daily_rate).toFixed(0) : '—'}/day
                      {car.badge && ` · ${car.badge}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {fleetUrl && (
            <a
              href={fleetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 block w-full text-center border border-white/20 text-white text-sm font-semibold py-2.5 rounded-xl hover:border-white/40 transition-colors"
            >
              View live fleet page ↗
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
