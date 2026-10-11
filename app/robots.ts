import type { MetadataRoute } from 'next'
import { headers } from 'next/headers'
import { MAIN_SITE_URL, resolveTenantSlugFromHost } from '@/lib/utils/tenant-host'
import { tenantSiteUrl } from '@/lib/utils/fleet-metadata'

/**
 * Host-aware robots.txt. Middleware no longer rewrites /robots.txt into a
 * tenant site, so every tenant host (subdomain or custom domain) gets its own
 * rules and a pointer to its own sitemap instead of an HTML "Vehicle" page.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const tenantSlug = await resolveTenantSlugFromHost(headers().get('host'))

  if (tenantSlug) {
    return {
      rules: {
        userAgent: '*',
        allow: '/',
        disallow: ['/booking-confirmation', '/my-booking', '/agreement/', '/review/', '/api/'],
      },
      // Custom domains point at the canonical subdomain sitemap; cross-host
      // sitemap references from robots.txt are accepted by search engines.
      sitemap: `${tenantSiteUrl(tenantSlug)}/sitemap.xml`,
    }
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Auth pages are not blocked here: they carry a noindex meta tag, which
      // crawlers can only see if they are allowed to fetch the page.
      disallow: ['/dashboard/', '/api/'],
    },
    sitemap: `${MAIN_SITE_URL}/sitemap.xml`,
  }
}
