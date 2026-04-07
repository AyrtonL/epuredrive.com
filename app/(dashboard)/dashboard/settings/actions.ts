'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function getTenantId(): Promise<string> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: p } = await supabase.from('profiles').select('tenant_id').eq('id', user!.id).single()
  return p!.tenant_id
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

  const newSlug = data.slug

  // Get current tenant to check if slug changed
  const { data: currentTenant } = await supabase
    .from('tenants')
    .select('slug')
    .eq('id', tenantId)
    .single()

  const oldSlug = currentTenant?.slug

  if (newSlug && oldSlug && newSlug !== oldSlug) {
    // Check if new slug is already taken
    const { data: existing } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', newSlug)
      .neq('id', tenantId)
      .single()

    if (existing) {
      return { error: 'Subdomain is already taken by another account.' }
    }
  }

  const { error } = await supabase.from('tenants').update(data).eq('id', tenantId)
  if (error) {
    return { error: error.message }
  }

  // If the slug was changed, update Netlify domain aliases
  if (newSlug && oldSlug && newSlug !== oldSlug) {
    const netlifyToken = process.env.NETLIFY_AUTH_TOKEN
    const netlifySiteId = process.env.NETLIFY_SITE_ID

    if (netlifyToken && netlifySiteId) {
      try {
        const netlifyHeaders = {
          Authorization: `Bearer ${netlifyToken}`,
          'Content-Type': 'application/json',
        }
        
        // Fetch current site settings
        const siteRes = await fetch(`https://api.netlify.com/api/v1/sites/${netlifySiteId}`, {
          headers: netlifyHeaders,
        })
        const site = await siteRes.json()
        
        let currentAliases: string[] = site.domain_aliases || []
        
        const oldAlias = `${oldSlug}.epuredrive.com`
        const newAlias = `${newSlug}.epuredrive.com`
        
        // Remove the old alias and add the new one
        currentAliases = currentAliases.filter(alias => alias !== oldAlias)
        if (!currentAliases.includes(newAlias)) {
          currentAliases.push(newAlias)
        }
        
        // Patch the site aliases
        await fetch(`https://api.netlify.com/api/v1/sites/${netlifySiteId}`, {
          method: 'PATCH',
          headers: netlifyHeaders,
          body: JSON.stringify({ domain_aliases: currentAliases }),
        })
      } catch (err: unknown) {
        console.error('[updateTenantBranding] Failed to update Netlify alias:', err instanceof Error ? err.message : err)
      }
    }
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/settings')
  return { error: null }
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
