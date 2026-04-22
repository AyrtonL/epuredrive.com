// app/api/auth/callback/route.ts
// Handles the OAuth callback from Supabase (Google, Apple, etc.)
// and the email-confirmation link for password signups.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
  }

  const supabase = createClient()
  const { data: sessionData, error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError || !sessionData?.session) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
  }

  const user = sessionData.session.user
  const accessToken = sessionData.session.access_token

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .maybeSingle()

  // Existing user — just continue.
  if (profile?.tenant_id) {
    return NextResponse.redirect(`${origin}${next}`)
  }

  // New user — provision tenant.
  const company =
    user.user_metadata?.company ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    ''

  const tenantRes = await fetch(`${origin}/.netlify/functions/create-tenant`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ company }),
  })

  if (!tenantRes.ok) {
    return NextResponse.redirect(`${origin}/login?error=tenant_create_failed`)
  }

  const provider = user.app_metadata?.provider === 'google' ? 'google' : 'email'
  const nextUrl = new URL(next, origin)
  nextUrl.searchParams.set('signup', provider)
  return NextResponse.redirect(nextUrl.toString())
}
