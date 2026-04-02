/**
 * POST /api/tenant/create
 * Creates a tenant + profile row, then registers the subdomain on Netlify.
 * Requires: SUPABASE_SERVICE_ROLE_KEY, NETLIFY_AUTH_TOKEN, NETLIFY_SITE_ID
 */

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

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
    return NextResponse.json({ tenantId: profiles[0].tenant_id })
  }

  // 2 — Create tenant
  const name = company || email?.split('@')[0] || 'My Fleet'
  const rawSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 32) + '-' + Date.now()
  const slug = rawSlug.slice(0, 63)

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
  const netlifyToken = process.env.NETLIFY_AUTH_TOKEN
  const netlifySiteId = process.env.NETLIFY_SITE_ID
  if (netlifyToken && netlifySiteId) {
    try {
      const netlifyHeaders = {
        Authorization: `Bearer ${netlifyToken}`,
        'Content-Type': 'application/json',
      }
      const siteRes = await fetch(`https://api.netlify.com/api/v1/sites/${netlifySiteId}`, {
        headers: netlifyHeaders,
      })
      const site = await siteRes.json()
      const currentAliases: string[] = site.domain_aliases || []
      const newAlias = `${slug}.epuredrive.com`
      if (!currentAliases.includes(newAlias)) {
        await fetch(`https://api.netlify.com/api/v1/sites/${netlifySiteId}`, {
          method: 'PATCH',
          headers: netlifyHeaders,
          body: JSON.stringify({ domain_aliases: [...currentAliases, newAlias] }),
        })
      }
    } catch (err: unknown) {
      console.error('[create-tenant] Netlify domain alias failed:', err instanceof Error ? err.message : err)
    }
  }

  return NextResponse.json({ tenantId, slug })
}
