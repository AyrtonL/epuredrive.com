'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function getTenantId(): Promise<string> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: p } = await supabase.from('profiles').select('tenant_id').eq('id', user!.id).single()
  return p!.tenant_id
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

  const getRes = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}`, { headers })
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
