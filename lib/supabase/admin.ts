import { createClient } from '@supabase/supabase-js'

/**
 * Creates a Supabase client with service role key.
 * Bypasses RLS — use only in server-side API routes and cron handlers.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase admin credentials')
  return createClient(url, key)
}
