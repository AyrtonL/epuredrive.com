// lib/supabase/middleware.ts
// Refreshes the Supabase session once per request in middleware, so the
// rotated tokens are written back to the browser's cookies.
//
// Server Components cannot set cookies (lib/supabase/server.ts swallows the
// error), so without this every dashboard render with an expired access token
// refreshed on its own and threw the new tokens away. A burst of RSC
// prefetches then raced on one refresh token (409 "Too many concurrent token
// refresh requests"), which on 2026-10-25 logged the user out.
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/** Never let a slow Auth server hold the page: past this, render as-is. */
const REFRESH_TIMEOUT_MS = 5000

function hasAuthCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some(({ name }) => name.startsWith('sb-') && name.includes('-auth-token'))
}

export async function refreshSession(
  request: NextRequest,
  requestHeaders: Headers
): Promise<NextResponse> {
  let response = NextResponse.next({ request: { headers: requestHeaders } })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key || !hasAuthCookie(request)) return response

  const supabase = createServerClient(url, key, {
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, { ...init, signal: AbortSignal.timeout(REFRESH_TIMEOUT_MS) }),
    },
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
        // Hand the new tokens to Server Components in this same request…
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        const cookieHeader = request.headers.get('cookie')
        if (cookieHeader !== null) requestHeaders.set('cookie', cookieHeader)
        else requestHeaders.delete('cookie')
        response = NextResponse.next({ request: { headers: requestHeaders } })
        // …and to the browser for every request after it.
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  try {
    // Reads the cookie and only calls Auth when the access token has expired.
    // The dashboard layout still verifies the user with getUser().
    await supabase.auth.getSession()
  } catch (err) {
    console.error('[middleware] session refresh failed', err instanceof Error ? err.message : err)
  }
  return response
}
