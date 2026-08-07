import { createClient } from '@supabase/supabase-js'

// Next.js patches the global fetch() to cache GET requests by default, and PostgREST
// (what supabase-js uses under the hood for .select()) issues GET requests. Route-level
// `export const dynamic = 'force-dynamic'` does not reliably stop this for fetches made
// inside a library several calls deep — found 2026-08-07 via poll-turo-emails: a
// dedup-lookup query (same URL, same params) kept returning its first-ever ("no rows")
// response forever, even after the row it was checking for was created, because Next.js
// cached that first GET. Force every admin-client request to bypass the cache so reads
// are always live.
function noStoreFetch(input: RequestInfo | URL, init?: RequestInit) {
  return fetch(input, { ...init, cache: 'no-store' })
}

/**
 * Creates a Supabase client with service role key.
 * Bypasses RLS — use only in server-side API routes and cron handlers.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase admin credentials')
  return createClient(url, key, { global: { fetch: noStoreFetch } })
}
