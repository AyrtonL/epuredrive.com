'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireTenantId } from '@/lib/supabase/dashboard-auth'

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
