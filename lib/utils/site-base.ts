import { headers } from 'next/headers'
import { TENANT_HOST_HEADER } from './site-base-header'

export { TENANT_HOST_HEADER }

/** True when the current request came in on a tenant subdomain or custom domain. */
export function isTenantHostRequest(): boolean {
  return headers().get(TENANT_HOST_HEADER) === '1'
}

/**
 * Path prefix for links inside a tenant site, resolved on the server so the
 * SSR HTML already carries working links (crawlers and pre-hydration clicks).
 *
 * - On slug.epuredrive.com or a custom domain the site lives at "/" → ''
 * - On epuredrive.com/sites/[slug] (direct path) → '/sites/[slug]'
 */
export function getSiteBase(slug: string): string {
  return isTenantHostRequest() ? '' : `/sites/${slug}`
}
