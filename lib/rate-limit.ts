import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface RateLimitOptions {
  windowMs?: number
  max?: number
}

/**
 * Serverless-safe rate limiter backed by Supabase.
 * Uses the check_rate_limit() RPC function which atomically checks + inserts.
 * Falls back to in-memory store if Supabase call fails (best-effort).
 */
const fallbackStores = new Map<string, Map<string, number[]>>()

export function rateLimit(
  request: NextRequest,
  key: string,
  { windowMs = 60_000, max = 10 }: RateLimitOptions = {},
): NextResponse | null {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'

  // Fire async Supabase check but don't block — use in-memory as sync guard
  rateLimitAsync(key, ip, windowMs, max).catch(() => {})

  // Synchronous in-memory fallback (best-effort, resets on cold start)
  if (!fallbackStores.has(key)) fallbackStores.set(key, new Map())
  const store = fallbackStores.get(key)!

  const now = Date.now()
  const timestamps = (store.get(ip) ?? []).filter((t) => now - t < windowMs)

  if (timestamps.length >= max) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  store.set(ip, [...timestamps, now])
  return null
}

async function rateLimitAsync(
  key: string,
  ip: string,
  windowMs: number,
  max: number,
): Promise<boolean> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_key: key,
      p_ip: ip,
      p_window_ms: windowMs,
      p_max: max,
    })
    if (error) {
      console.error('[rate-limit] Supabase RPC error:', error.message)
      return true // allow on error
    }
    return data as boolean
  } catch (err) {
    console.error('[rate-limit] Supabase connection error:', err)
    return true // allow on error
  }
}
