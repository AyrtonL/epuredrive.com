// Security (mirrors google-calendar/callback): tenant_id comes from the
// authenticated session, never from `state`; `state` must match the single-use
// nonce cookie set by /start before any token exchange.
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const STATE_COOKIE = 'gmail_oauth_state'

function getRedirectUri(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')
  if (appUrl) return `${appUrl}/api/integrations/turo/gmail/callback`
  return 'http://localhost:3000/api/integrations/turo/gmail/callback'
}

export async function GET(request: Request) {
  // Single-use nonce: clear the cookie before doing anything else.
  const storedState = cookies().get(STATE_COOKIE)?.value ?? null
  cookies().delete(STATE_COOKIE)

  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const oauthError = searchParams.get('error')

  const DASHBOARD_URL = '/dashboard/integrations/turo?gmail=connected'
  const ERROR_URL = '/dashboard/integrations/turo?gmail=error'

  const sessionClient = createClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', request.url))
  const { data: callerProfile } = await sessionClient
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()
  const tenantId = callerProfile?.tenant_id
  if (typeof tenantId !== 'string') return NextResponse.redirect(new URL(ERROR_URL, request.url))

  if (oauthError || !code || !state || !storedState || state !== storedState) {
    console.warn('[gmail-callback] state/code validation failed', {
      tenantId, hasCode: Boolean(code), stateMatches: Boolean(state) && state === storedState,
    })
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
      console.error('[gmail-callback] Token exchange failed:', tokenRes.status, tokens?.error)
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

    // Preserve the existing watermark on reconnect. Resetting it 30 days back makes the next
    // poll re-scan old emails and re-insert bookings the user already has (or deleted).
    const { data: prior } = await supabase
      .from('turo_email_syncs')
      .select('last_checked')
      .eq('tenant_id', tenantId)
      .maybeSingle()
    const lastChecked = prior?.last_checked ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const { error: upsertError } = await supabase.from('turo_email_syncs').upsert({
      tenant_id: tenantId,
      gmail_address: gmailAddress,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      active: true,
      provider: 'gmail',
      last_checked: lastChecked,
    }, { onConflict: 'tenant_id' })

    if (upsertError) {
      console.error('[gmail-callback] Supabase upsert error:', upsertError)
      return NextResponse.redirect(new URL(ERROR_URL, request.url))
    }

    console.info(`[gmail-callback] Connected Gmail for tenant ${tenantId}`)
    return NextResponse.redirect(new URL(DASHBOARD_URL, request.url))
  } catch (err) {
    console.error('[gmail-callback] Internal error:', err)
    return NextResponse.redirect(new URL(ERROR_URL, request.url))
  }
}
