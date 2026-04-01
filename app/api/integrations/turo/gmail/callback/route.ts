import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const TOKEN_URL = 'https://oauth2.googleapis.com/token'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const tenantId = searchParams.get('state')
  const error = searchParams.get('error')

  const DASHBOARD_URL = '/dashboard/integrations/turo?gmail=connected'
  const ERROR_URL = '/dashboard/integrations/turo?gmail=error'

  if (error || !code || !tenantId) {
    console.error('[gmail-callback] OAuth Error or missing params:', { error, tenantId })
    return NextResponse.redirect(new URL(ERROR_URL, request.url))
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    console.error('[gmail-callback] Missing GOOGLE_CLIENT_ID/SECRET')
    return NextResponse.redirect(new URL(ERROR_URL, request.url))
  }

  const host = request.headers.get('host')
  const protocol = host?.includes('localhost') ? 'http' : 'https'
  const redirectUri = `${protocol}://${host}/api/integrations/turo/gmail/callback`

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

    // 3. Save to Supabase (using Service Role for RLS bypass if needed, or normal client)
    // We use the server client which should have sufficient perms if it's the admin
    const supabase = createClient()
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

    return NextResponse.redirect(new URL(DASHBOARD_URL, request.url))
  } catch (err) {
    console.error('[gmail-callback] Internal error:', err)
    return NextResponse.redirect(new URL(ERROR_URL, request.url))
  }
}
