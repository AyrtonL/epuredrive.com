import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthorizationUrl } from '@/lib/quickbooks/oauth-client'

export async function GET(request: Request) {
  // Require authentication — only tenant operators can initiate OAuth
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Derive tenant_id from the user's profile, don't trust query params
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  const tenantId = profile?.tenant_id
  if (!tenantId) {
    return NextResponse.json({ error: 'No tenant found for user' }, { status: 403 })
  }

  try {
    const authUrl = getAuthorizationUrl(tenantId)
    return NextResponse.redirect(authUrl, 302)
  } catch (err) {
    console.error('[qb-auth] Failed to generate auth URL:', err)
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }
}
