// app/api/auth/callback/route.ts
// Handles the OAuth callback from Supabase (Google, Apple, etc.)
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Check if the user already has a tenant — if not, create one
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('tenant_id')
          .eq('id', user.id)
          .maybeSingle()

        if (!profile?.tenant_id) {
          // New OAuth user — create tenant via the Netlify function
          await fetch(`${origin}/.netlify/functions/create-tenant`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.id,
              email: user.email,
              company: user.user_metadata?.full_name || '',
            }),
          })
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // OAuth error — redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
