import { NextRequest, NextResponse } from 'next/server'

const stores = new Map<string, Map<string, number[]>>()

interface RateLimitOptions {
  windowMs?: number
  max?: number
}

export function rateLimit(
  request: NextRequest,
  key: string,
  { windowMs = 60_000, max = 10 }: RateLimitOptions = {},
): NextResponse | null {
  const ip =
    request.headers.get('x-forwarded-for') ??
    request.headers.get('x-real-ip') ??
    'unknown'

  if (!stores.has(key)) stores.set(key, new Map())
  const store = stores.get(key)!

  const now = Date.now()
  const timestamps = (store.get(ip) ?? []).filter((t) => now - t < windowMs)

  if (timestamps.length >= max) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  store.set(ip, [...timestamps, now])
  return null
}
