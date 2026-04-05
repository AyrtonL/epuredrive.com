import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function getRedirectUri(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')
  if (appUrl) return `${appUrl}/api/integrations/turo/gmail/callback`
  return 'http://localhost:3000/api/integrations/turo/gmail/callback'
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const tenantId = searchParams.get('state')
  const oauthError = searchParams.get('error')

  const DASHBOARD_URL = '/dashboard/integrations/turo?gmail=connected'
  const ERROR_URL = '/dashboard/integrations/turo?gmail=error'

  if (oauthError || !code || !tenantId || !UUID_RE.test(tenantId)) {
    console.error('[gmail-callback] OAuth error or invalid params:', { oauthError, tenantId })
    return NextResponse.redirect(new URL(ERROR_URL, request.url))
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    console.error('[gmail-callback] Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET env vars')
    return NextResponse.redirect(new URL(ERROR_URL, request.url))
  }

  // Must match exactly what was sent in gmail-oauth-start
  const redirectUri = getRedirectUri()

  try {
    // 1. Exchange code for tokens
    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    })

    const tokens = await tokenRes.json()
    if (!tokenRes.ok || !tokens.access_token || !tokens.refresh_token) {
      console.error('[gmail-callback] Token exchange failed:', tokens)
      return NextResponse.redirect(new URL(ERROR_URL, request.url))
    }

    // 2. Fetch Gmail address
    const profileRes = await fetch('https://www.googleapis.com/gmail/v1/users/me/profile', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const profile = profileRes.ok ? await profileRes.json() : {}
    const gmailAddress = profile.emailAddress || 'unknown@gmail.com'

    // 3. Save to Supabase using service role (bypasses RLS — same pattern as iCloud connect)
    const supabase = createAdminClient()
    const { error: upsertError } = await supabase.from('turo_email_syncs').upsert({
      tenant_id: tenantId,
      gmail_address: gmailAddress,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      active: true,
      provider: 'gmail',
      last_checked: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    }, { onConflict: 'tenant_id' })

    if (upsertError) {
      console.error('[gmail-callback] Supabase upsert error:', upsertError)
      return NextResponse.redirect(new URL(ERROR_URL, request.url))
    }

    console.log(`[gmail-callback] Connected Gmail ${gmailAddress} for tenant ${tenantId}`)
    return NextResponse.redirect(new URL(DASHBOARD_URL, request.url))
  } catch (err) {
    console.error('[gmail-callback] Internal error:', err)
    return NextResponse.redirect(new URL(ERROR_URL, request.url))
  }
}
