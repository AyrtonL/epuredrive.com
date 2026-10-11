// Security (mirrors google-calendar/start):
//   - tenant_id is NEVER taken from the query string — it comes from the
//     authenticated session. Previously ?tenant_id= went straight into
//     `state`, so anyone could connect *their* Gmail to another tenant (tenant
//     ids are public) and inject fake "Turo" bookings into that dashboard.
//   - state is a random single-use nonce in an httpOnly cookie (10 min).
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'node:crypto'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const STATE_COOKIE = 'gmail_oauth_state'
const STATE_TTL_SECONDS = 600

const SCOPE = 'https://www.googleapis.com/auth/gmail.readonly'

function getRedirectUri(): string {
  // Always use the canonical production URL — never the deploy-preview host.
  // Register EXACTLY this value in Google Cloud Console → OAuth credentials.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')
  if (appUrl) return `${appUrl}/api/integrations/turo/gmail/callback`

  // Fallback for local dev only
  return 'http://localhost:3000/api/integrations/turo/gmail/callback'
}

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', request.url))

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()
  if (typeof profile?.tenant_id !== 'string') {
    return NextResponse.redirect(new URL('/dashboard/integrations/turo?gmail=error', request.url))
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) {
    return NextResponse.json({ error: 'Server misconfigured: missing GOOGLE_CLIENT_ID' }, { status: 500 })
  }

  const redirectUri = getRedirectUri()

  const state = crypto.randomBytes(16).toString('hex')
  cookies().set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: STATE_TTL_SECONDS,
    path: '/',
  })

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
