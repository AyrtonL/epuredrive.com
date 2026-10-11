import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import * as React from 'react'

// Next.js bundles a React build that exports cache(); the stable react@18
// package used by Jest does not. Fall back to a passthrough there (cache() is
// already a passthrough outside a React render).
const cache: <T extends (...args: never[]) => unknown>(fn: T) => T =
  (React as { cache?: <T>(fn: T) => T }).cache ?? ((fn) => fn)

export function createClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}

/**
 * Per-request memoized auth lookup for Server Components. The layout, page and
 * requireTenantId() all need the user; sharing one call avoids repeated
 * /auth/v1 round-trips (and repeated token refreshes) on every page load.
 * Outside a React render (actions, route handlers) cache() is a passthrough.
 */
export const getAuthUser = cache(async () => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
})
