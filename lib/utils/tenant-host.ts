import { createClient } from '@supabase/supabase-js'
import { getTenantSlug } from './routing'

export const MAIN_SITE_URL = 'https://epuredrive.com'

const MAIN_HOSTS = new Set(['epuredrive.com', 'www.epuredrive.com', 'localhost', '127.0.0.1'])

export function anonSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

/**
 * Resolves which tenant a host belongs to: slug.epuredrive.com directly, or a
 * custom domain through the tenants.custom_domain column. Returns null for the
 * main marketing host and for unknown domains.
 */
export async function resolveTenantSlugFromHost(host: string | null): Promise<string | null> {
  if (!host) return null
  const subdomainSlug = getTenantSlug(host)
  if (subdomainSlug) return subdomainSlug

  const hostname = host.split(':')[0].toLowerCase()
  if (MAIN_HOSTS.has(hostname) || hostname.endsWith('.epuredrive.com')) return null

  const { data } = await anonSupabase()
    .from('tenants')
    .select('slug')
    .eq('custom_domain', hostname)
    .maybeSingle()
  return (data?.slug as string | undefined) ?? null
}
