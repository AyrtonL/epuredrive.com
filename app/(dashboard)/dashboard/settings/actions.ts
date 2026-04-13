'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import { isFeatureEnabled } from '@/lib/supabase/feature-flags'

async function getTenantId(): Promise<string> {
  const { tenantId } = await requireTenantId()
  return tenantId
}

async function syncNetlifyDomainAlias(oldSlug: string | null, newSlug: string): Promise<string | null> {
  const token = process.env.NETLIFY_AUTH_TOKEN
  const siteId = process.env.NETLIFY_SITE_ID
  if (!token || !siteId) {
    console.error('[syncNetlifyDomainAlias] Missing NETLIFY_AUTH_TOKEN or NETLIFY_SITE_ID')
    return 'Domain alias could not be registered: missing Netlify credentials'
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }

  const getRes = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}`, { headers, cache: 'no-store' })
  if (!getRes.ok) {
    console.error('[syncNetlifyDomainAlias] GET site failed:', getRes.status, await getRes.text())
    return `Domain alias could not be registered (Netlify error ${getRes.status})`
  }

  const site = await getRes.json()
  const current: string[] = site.domain_aliases ?? []

  const oldAlias = oldSlug ? `${oldSlug}.epuredrive.com` : null
  const newAlias = `${newSlug}.epuredrive.com`

  const updated = current.filter(a => a !== oldAlias)
  if (!updated.includes(newAlias)) updated.push(newAlias)

  const patchRes = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ domain_aliases: updated }),
  })
  if (!patchRes.ok) {
    console.error('[syncNetlifyDomainAlias] PATCH failed:', patchRes.status, await patchRes.text())
    return `Domain alias could not be registered (Netlify error ${patchRes.status})`
  }

  return null
}

export async function updateTenantBranding(data: {
  brand_name?: string | null
  primary_color?: string | null
  accent_color?: string | null
  logo_url?: string | null
  slug?: string | null
  tagline?: string | null
  description?: string | null
  hero_image_url?: string | null
  whatsapp_phone?: string | null
  business_hours?: string | null
  pickup_locations?: Array<{ label: string; address: string; note: string; fee: number; maps_query: string }>
}): Promise<{ error: string | null }> {
  const supabase = createClient()
  const tenantId = await getTenantId()

  // If slug is changing, sync Netlify domain aliases
  if (data.slug) {
    const { data: current } = await supabase
      .from('tenants')
      .select('slug')
      .eq('id', tenantId)
      .single()
    const oldSlug = current?.slug ?? null
    if (oldSlug !== data.slug) {
      const netlifyError = await syncNetlifyDomainAlias(oldSlug, data.slug)
      if (netlifyError) {
        return { error: netlifyError }
      }
    }
  }

  const { error } = await supabase.from('tenants').update(data).eq('id', tenantId)
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/settings')
  return { error: error?.message ?? null }
}

export async function uploadLogo(
  formData: FormData
): Promise<{ url: string | null; error: string | null }> {
  const supabase = createClient()
  const tenantId = await getTenantId()

  const file = formData.get('file') as File | null
  if (!file) return { url: null, error: 'No file provided.' }

  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
  if (!allowed.includes(file.type)) {
    return { url: null, error: 'Only JPEG, PNG, WebP, and SVG are allowed.' }
  }
  if (file.size > 5 * 1024 * 1024) {
    return { url: null, error: 'File must be under 5MB.' }
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
  const fileName = `${tenantId}/logo-${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from('tenant-assets')
    .upload(fileName, file, { contentType: file.type, upsert: false })

  if (error) return { url: null, error: error.message }

  const { data: { publicUrl } } = supabase.storage
    .from('tenant-assets')
    .getPublicUrl(fileName)

  return { url: publicUrl, error: null }
}

export async function uploadHeroImage(
  formData: FormData
): Promise<{ url: string | null; error: string | null }> {
  const supabase = createClient()
  const tenantId = await getTenantId()

  const file = formData.get('file') as File | null
  if (!file) return { url: null, error: 'No file provided.' }

  const allowed = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowed.includes(file.type)) {
    return { url: null, error: 'Only JPEG, PNG, and WebP are allowed.' }
  }
  if (file.size > 10 * 1024 * 1024) {
    return { url: null, error: 'File must be under 10MB.' }
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const fileName = `${tenantId}/hero-${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from('tenant-assets')
    .upload(fileName, file, { contentType: file.type, upsert: false })

  if (error) return { url: null, error: error.message }

  const { data: { publicUrl } } = supabase.storage
    .from('tenant-assets')
    .getPublicUrl(fileName)

  return { url: publicUrl, error: null }
}

export async function getTenantBranding(): Promise<{
  brand_name: string | null
  primary_color: string | null
  accent_color: string | null
  name: string | null
  plan: string | null
  slug: string | null
} | null> {
  const supabase = createClient()
  const tenantId = await getTenantId()
  const { data } = await supabase.from('tenants')
    .select('name, plan, slug, brand_name, primary_color, accent_color')
    .eq('id', tenantId).single()
  return data ?? null
}

// ── Custom Domain ──────────────────────────────────────────────────────────────

const DOMAIN_REGEX = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i

async function syncNetlifyCustomDomain(domain: string): Promise<string | null> {
  const token = process.env.NETLIFY_AUTH_TOKEN
  const siteId = process.env.NETLIFY_SITE_ID
  if (!token || !siteId) {
    console.error('[syncNetlifyCustomDomain] Missing NETLIFY_AUTH_TOKEN or NETLIFY_SITE_ID')
    return 'Could not register domain in hosting: missing credentials'
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }

  const getRes = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}`, {
    headers, cache: 'no-store',
  })
  if (!getRes.ok) return `Netlify error ${getRes.status} while reading site`

  const site = await getRes.json()
  const current: string[] = site.domain_aliases ?? []

  if (!current.includes(domain)) {
    const patchRes = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ domain_aliases: [...current, domain] }),
    })
    if (!patchRes.ok) return `Netlify error ${patchRes.status} while adding domain alias`
  }

  return null
}

async function removeNetlifyCustomDomain(domain: string): Promise<void> {
  const token = process.env.NETLIFY_AUTH_TOKEN
  const siteId = process.env.NETLIFY_SITE_ID
  if (!token || !siteId) return

  try {
    const getRes = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!getRes.ok) return
    const site = await getRes.json()
    const aliases: string[] = site.domain_aliases ?? []
    const updated = aliases.filter((a: string) => a !== domain)
    await fetch(`https://api.netlify.com/api/v1/sites/${siteId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain_aliases: updated }),
    })
  } catch {
    // Best-effort — do not throw, the primary error is already being surfaced
  }
}

export async function saveCustomDomain(
  data: { domain: string | null }
): Promise<{ error: string | null }> {
  const supabase = createClient()
  const tenantId = await getTenantId()

  if (data.domain !== null) {
    const allowed = await isFeatureEnabled(tenantId, 'custom_domains')
    if (!allowed) {
      return { error: 'Custom domains require an Enterprise plan. Contact support to upgrade.' }
    }
  }

  if (!data.domain) {
    const { error } = await supabase
      .from('tenants')
      .update({ custom_domain: null })
      .eq('id', tenantId)
    if (!error) revalidatePath('/dashboard/settings/domain')
    return { error: error?.message ?? null }
  }

  const domain = data.domain.trim().toLowerCase()

  if (domain.includes('epuredrive.com')) {
    return { error: 'Cannot use epuredrive.com as a custom domain.' }
  }

  if (!DOMAIN_REGEX.test(domain)) {
    return { error: 'Invalid domain format. Use something like fleet.yourcompany.com' }
  }

  const netlifyError = await syncNetlifyCustomDomain(domain)
  if (netlifyError) return { error: netlifyError }

  const { error: dbError } = await supabase
    .from('tenants')
    .update({ custom_domain: domain })
    .eq('id', tenantId)

  if (dbError) {
    // Compensating rollback: remove the alias from Netlify
    await removeNetlifyCustomDomain(domain)
    return { error: dbError.message }
  }

  revalidatePath('/dashboard/settings/domain')
  return { error: null }
}
