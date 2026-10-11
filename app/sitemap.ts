import type { MetadataRoute } from 'next'
import { headers } from 'next/headers'
import { MAIN_SITE_URL, anonSupabase, resolveTenantSlugFromHost } from '@/lib/utils/tenant-host'
import { tenantSiteUrl } from '@/lib/utils/fleet-metadata'

/**
 * Last real content change per marketing page. Update the date when a page's
 * copy changes — a lastmod that always says "now" teaches Google to ignore it.
 */
const MARKETING_PAGES: {
  path: string
  lastModified: string
  changeFrequency: 'weekly' | 'monthly' | 'yearly'
  priority: number
  hreflang?: boolean
}[] = [
  { path: '', lastModified: '2026-10-10', changeFrequency: 'weekly', priority: 1.0, hreflang: true },
  { path: '/es', lastModified: '2026-10-10', changeFrequency: 'weekly', priority: 1.0, hreflang: true },
  { path: '/features', lastModified: '2026-10-10', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/faq', lastModified: '2026-10-10', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/terms', lastModified: '2026-10-10', changeFrequency: 'yearly', priority: 0.4 },
  { path: '/privacy', lastModified: '2026-10-10', changeFrequency: 'yearly', priority: 0.4 },
  { path: '/cookies', lastModified: '2026-10-10', changeFrequency: 'yearly', priority: 0.3 },
]

function marketingSitemap(): MetadataRoute.Sitemap {
  return MARKETING_PAGES.map((page) => ({
    url: `${MAIN_SITE_URL}${page.path}`,
    lastModified: new Date(page.lastModified),
    changeFrequency: page.changeFrequency,
    priority: page.priority,
    ...(page.hreflang
      ? {
          alternates: {
            languages: {
              en: MAIN_SITE_URL,
              es: `${MAIN_SITE_URL}/es`,
              'x-default': MAIN_SITE_URL,
            },
          },
        }
      : {}),
  }))
}

/**
 * A tenant's own sitemap, served on slug.epuredrive.com/sitemap.xml. Search
 * engines only accept sitemap URLs on the sitemap's own host, so tenant pages
 * can't live in the main sitemap. Tenants without a bookable vehicle get an
 * empty sitemap (their pages are also noindex — see the [slug] layout).
 */
async function tenantSitemap(slug: string): Promise<MetadataRoute.Sitemap> {
  const supabase = anonSupabase()
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, slug')
    .eq('slug', slug)
    .maybeSingle()
  if (!tenant) return []

  const { data: cars } = await supabase
    .from('cars')
    .select('id')
    .eq('tenant_id', tenant.id)
    .in('status', ['available', 'active'])
  if (!cars || cars.length === 0) return []

  const base = tenantSiteUrl(slug)
  return [
    { url: base, changeFrequency: 'daily', priority: 1.0 },
    { url: `${base}/fleet`, changeFrequency: 'daily', priority: 0.8 },
    ...cars.map((car) => ({
      url: `${base}/${car.id}`,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ]
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const tenantSlug = await resolveTenantSlugFromHost(headers().get('host'))
  if (tenantSlug) return tenantSitemap(tenantSlug)
  return marketingSitemap()
}
