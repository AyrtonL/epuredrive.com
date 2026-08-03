// app/api/integrations/google-calendar/callback/route.ts
// GET /api/integrations/google-calendar/callback?code=&state=
// Completes the Google Calendar OAuth flow.
//
// Security (mirrors app/api/telematics/oauth/callback/route.ts):
//   - tenant_id is derived fresh from the authenticated session — never from
//     the `state` query param — so the connection can't be written to a
//     tenant the caller doesn't belong to.
//   - The state cookie is deleted unconditionally at the top so the nonce is
//     single-use regardless of outcome, and compared against the query param
//     before any token exchange happens.
//   - Token response bodies are never logged.

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const STATE_COOKIE = 'gcal_oauth_state'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GENERIC_ERROR_PATH = '/dashboard/integrations/google-calendar?error=1'

function getSiteUrl(req: Request): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin
}

export async function GET(request: Request) {
  const siteUrl = getSiteUrl(request)
  const genericError = new URL(GENERIC_ERROR_PATH, siteUrl)

  // Single-use nonce: clear the cookie before doing anything else.
  const storedState = cookies().get(STATE_COOKIE)?.value ?? null
  cookies().delete(STATE_COOKIE)

  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const oauthError = url.searchParams.get('error')

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/login', siteUrl))
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  const tenantId = (profile as { tenant_id?: unknown } | null)?.tenant_id
  if (typeof tenantId !== 'string') {
    return NextResponse.redirect(genericError)
  }

  if (oauthError || !code || !state || !storedState || state !== storedState) {
    console.warn('[gcal oauth] state/code validation failed', {
      tenantId,
      hasCode: Boolean(code),
      hasState: Boolean(state),
      hasCookie: Boolean(storedState),
      stateMatches: state === storedState,
    })
    return NextResponse.redirect(genericError)
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    console.error('[gcal oauth] Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET env vars')
    return NextResponse.redirect(genericError)
  }

  const redirectUri = `${siteUrl.replace(/\/$/, '')}/api/integrations/google-calendar/callback`

  try {
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
      console.warn('[gcal oauth] token exchange failed', { tenantId, ok: tokenRes.ok })
      return NextResponse.redirect(genericError)
    }

    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const googleProfile = profileRes.ok ? await profileRes.json() : {}
    const googleEmail = googleProfile.email || 'unknown@gmail.com'

    // Persist using the service-role client (RLS has no INSERT policy for this
    // table by design — writes only ever happen here, gated by the session
    // check above).
    const admin = createAdminClient()
    const { error: upsertError } = await admin.from('google_calendar_connections').upsert({
      tenant_id: tenantId,
      google_email: googleEmail,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      active: true,
    }, { onConflict: 'tenant_id' })

    if (upsertError) {
      console.warn('[gcal oauth] connection upsert failed', { tenantId, msg: upsertError.message })
      return NextResponse.redirect(genericError)
    }

    console.info(`[gcal oauth] Connected Google Calendar for tenant ${tenantId}`)
    return NextResponse.redirect(new URL('/dashboard/integrations/google-calendar?connected=1', siteUrl))
  } catch (err) {
    console.warn('[gcal oauth] internal error', { tenantId })
    return NextResponse.redirect(genericError)
  }
}
