// lib/supabase/edge.ts
// Minimal Supabase client for use in Next.js middleware.
// Does NOT use cookies() — safe to call in edge/middleware context.
import { createClient } from '@supabase/supabase-js'

export function createEdgeClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }
  return createClient(url, key, { auth: { persistSession: false } })
}
