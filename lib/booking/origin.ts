// lib/booking/origin.ts
//
// CSRF guard for the public booking endpoints. Bookings come from the
// platform (epuredrive.com, *.epuredrive.com), localhost in dev, or a
// tenant's own custom domain (tenants.custom_domain, e.g. sswrental.autos) —
// the old hardcoded check 403'd every booking made on a custom domain.

import type { SupabaseClient } from '@supabase/supabase-js'

const PLATFORM_HOST = 'epuredrive.com'
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1'])

function stripWww(hostname: string): string {
  return hostname.startsWith('www.') ? hostname.slice(4) : hostname
}

function isPlatformHost(hostname: string): boolean {
  return hostname === PLATFORM_HOST || hostname.endsWith(`.${PLATFORM_HOST}`) || LOCAL_HOSTS.has(hostname)
}

/** Pure check against an already-loaded list of tenant custom domains. */
export function isAllowedOriginHost(hostname: string, customDomains: readonly string[]): boolean {
  const host = hostname.toLowerCase()
  if (isPlatformHost(host)) return true
  const bare = stripWww(host)
  return customDomains.some((d) => stripWww(d.toLowerCase()) === bare)
}

function hostnameOf(origin: string | null): string | null {
  if (!origin) return null
  try {
    return new URL(origin).hostname.toLowerCase()
  } catch {
    return null
  }
}

/** Origin header → allowed? Looks up custom domains only for non-platform hosts. */
export async function isAllowedBookingOrigin(origin: string | null, supabase: SupabaseClient): Promise<boolean> {
  const hostname = hostnameOf(origin)
  if (!hostname) return false
  if (isPlatformHost(hostname)) return true
  const bare = stripWww(hostname)
  const { data, error } = await supabase
    .from('tenants')
    .select('custom_domain')
    .in('custom_domain', [bare, `www.${bare}`])
  if (error) {
    console.error('[booking-origin] custom domain lookup failed:', error.message)
    return false
  }
  return isAllowedOriginHost(hostname, (data ?? []).map((r) => r.custom_domain as string))
}
