'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function getTenantId(): Promise<string> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: p } = await supabase.from('profiles').select('tenant_id').eq('id', user!.id).single()
  return p!.tenant_id
}

async function syncNetlifyDomainAlias(oldSlug: string | null, newSlug: string): Promise<void> {
  const token = process.env.NETLIFY_AUTH_TOKEN
  const siteId = process.env.NETLIFY_SITE_ID
  if (!token || !siteId) return

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }

  const res = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}`, { headers })
  const site = await res.json()
  const current: string[] = site.domain_aliases ?? []

  const oldAlias = oldSlug ? `${oldSlug}.epuredrive.com` : null
  const newAlias = `${newSlug}.epuredrive.com`

  const updated = current.filter(a => a !== oldAlias)
  if (!updated.includes(newAlias)) updated.push(newAlias)

  await fetch(`https://api.netlify.com/api/v1/sites/${siteId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ domain_aliases: updated }),
  })
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
      await syncNetlifyDomainAlias(oldSlug, data.slug)
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
