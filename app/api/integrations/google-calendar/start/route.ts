// app/api/integrations/google-calendar/start/route.ts
// GET /api/integrations/google-calendar/start
// Kicks off the Google Calendar OAuth flow.
//
// Security (mirrors app/api/telematics/oauth/start/route.ts):
//   - tenant_id is NEVER trusted from the query string — it's derived from
//     the authenticated session, so one tenant can't hijack another tenant's
//     Calendar connection by passing an arbitrary tenant_id.
//   - state nonce is 16 random bytes hex, stored in an httpOnly+secure cookie
//     with 600s TTL; the callback compares and then deletes it.

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'node:crypto'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const STATE_COOKIE = 'gcal_oauth_state'
const STATE_TTL_SECONDS = 600
// userinfo.email is needed to show which Google account is connected in the dashboard
const SCOPE = 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email'

function getSiteUrl(req: Request): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin
}

export async function GET(request: Request) {
  const siteUrl = getSiteUrl(request)
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
    return NextResponse.redirect(new URL('/dashboard/settings', siteUrl))
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) {
    return NextResponse.json({ error: 'Server misconfigured: missing GOOGLE_CLIENT_ID' }, { status: 500 })
  }

  const state = crypto.randomBytes(16).toString('hex')
  cookies().set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: STATE_TTL_SECONDS,
    path: '/',
  })

  const redirectUri = `${siteUrl.replace(/\/$/, '')}/api/integrations/google-calendar/callback`

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', SCOPE)
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('prompt', 'consent')
  url.searchParams.set('state', state)

  return NextResponse.redirect(url.toString())
}
