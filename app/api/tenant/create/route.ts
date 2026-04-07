/**
 * POST /api/tenant/create
 * Creates a tenant + profile row, then registers the subdomain on Netlify.
 * Requires: SUPABASE_SERVICE_ROLE_KEY, NETLIFY_AUTH_TOKEN, NETLIFY_SITE_ID
 */

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ROOT_DOMAIN = 'epuredrive.com'
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/

function buildSlug(input: string) {
  const base = String(input || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 40) || 'fleet'

  const candidate = `${base}-${Date.now()}`.slice(0, 63).replace(/^-+|-+$/g, '')
  return candidate.replace(/-+$/g, '') || `fleet-${Date.now()}`
}

async function ensureDomainAlias(slug: string) {
  if (!slug || !SLUG_RE.test(slug)) return

  const netlifyToken = process.env.NETLIFY_AUTH_TOKEN
  const netlifySiteId = process.env.NETLIFY_SITE_ID || process.env.SITE_ID
  if (!netlifyToken || !netlifySiteId) return

  const alias = `${slug}.${ROOT_DOMAIN}`
  const netlifyHeaders = {
    Authorization: `Bearer ${netlifyToken}`,
    'Content-Type': 'application/json',
  }

  const siteRes = await fetch(`https://api.netlify.com/api/v1/sites/${netlifySiteId}`, {
    headers: netlifyHeaders,
  })
  if (!siteRes.ok) {
    throw new Error(`Netlify site lookup failed (${siteRes.status})`)
  }

  const site = await siteRes.json()
  const currentAliases: string[] = Array.isArray(site?.domain_aliases) ? site.domain_aliases : []
  if (currentAliases.includes(alias)) return

  const patchRes = await fetch(`https://api.netlify.com/api/v1/sites/${netlifySiteId}`, {
    method: 'PATCH',
    headers: netlifyHeaders,
    body: JSON.stringify({ domain_aliases: [...currentAliases, alias] }),
  })

  if (!patchRes.ok) {
    throw new Error(`Netlify alias update failed (${patchRes.status})`)
  }
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { userId, email, company } = body as Record<string, string>
  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // 1 — Check if user already has a tenant
  const { data: profiles } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', userId)
    .limit(1)

  if (profiles?.[0]?.tenant_id) {
    const tenantId: string = profiles[0].tenant_id
    const { data: tenants } = await supabase
      .from('tenants')
      .select('slug, name')
      .eq('id', tenantId)
      .limit(1)

    const existingTenant = tenants?.[0] as { slug?: string | null; name?: string | null } | undefined
    let slug = existingTenant?.slug ?? undefined
    if (!slug || !SLUG_RE.test(slug)) {
      slug = buildSlug(existingTenant?.name || company || email?.split('@')[0] || 'my-fleet')
      await supabase.from('tenants').update({ slug }).eq('id', tenantId)
    }

    try {
      await ensureDomainAlias(slug)
    } catch (err: unknown) {
      console.error('[create-tenant] Netlify domain alias failed:', err instanceof Error ? err.message : err)
    }

    return NextResponse.json({ tenantId, slug })
  }

  // 2 — Create tenant
  const name = company || email?.split('@')[0] || 'My Fleet'
  const slug = buildSlug(name)

  const { data: tenants, error: tenantError } = await supabase
    .from('tenants')
    .insert({ name, slug, plan: 'free' })
    .select('id')

  if (tenantError || !tenants?.[0]?.id) {
    return NextResponse.json({ error: tenantError?.message || 'Failed to create tenant' }, { status: 400 })
  }

  const tenantId: string = tenants[0].id

  // 3 — Create profile
  await supabase.from('profiles').upsert({ id: userId, tenant_id: tenantId, role: 'admin' })

  // 4 — Register tenant subdomain as Netlify domain alias
  try {
    await ensureDomainAlias(slug)
  } catch (err: unknown) {
    console.error('[create-tenant] Netlify domain alias failed:', err instanceof Error ? err.message : err)
  }

  return NextResponse.json({ tenantId, slug })
}
