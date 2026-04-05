import { NextResponse } from 'next/server'

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
  const { searchParams } = new URL(request.url)
  const tenant_id = searchParams.get('tenant_id')

  if (!tenant_id) {
    return NextResponse.json({ error: 'tenant_id is required' }, { status: 400 })
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) {
    return NextResponse.json({ error: 'Server misconfigured: missing GOOGLE_CLIENT_ID' }, { status: 500 })
  }

  const redirectUri = getRedirectUri()

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', SCOPE)
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('prompt', 'consent')
  url.searchParams.set('state', tenant_id)

  return NextResponse.redirect(url.toString())
}
