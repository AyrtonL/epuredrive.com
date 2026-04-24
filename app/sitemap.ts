import type { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

const BASE_URL = 'https://epuredrive.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Static marketing pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
      alternates: {
        languages: {
          en: BASE_URL,
          es: `${BASE_URL}/es`,
          'x-default': BASE_URL,
        },
      },
    },
    {
      url: `${BASE_URL}/es`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
      alternates: {
        languages: {
          en: BASE_URL,
          es: `${BASE_URL}/es`,
          'x-default': BASE_URL,
        },
      },
    },
    { url: `${BASE_URL}/features`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/faq`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/terms`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.4 },
    { url: `${BASE_URL}/privacy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.4 },
    { url: `${BASE_URL}/cookies`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
  ]

  // Dynamic tenant fleet pages
  const { data: tenants } = await supabase
    .from('tenants')
    .select('slug')
    .not('slug', 'is', null)

  const tenantPages: MetadataRoute.Sitemap = (tenants ?? []).map((t) => ({
    url: `https://${t.slug}.epuredrive.com`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }))

  // Dynamic car detail pages per tenant
  const { data: cars } = await supabase
    .from('cars')
    .select('id, tenant_id, tenants!inner(slug)')
    .in('status', ['available', 'active'])

  const carPages: MetadataRoute.Sitemap = (cars ?? []).map((car) => {
    const tenant = car.tenants as unknown as { slug: string }
    return {
      url: `https://${tenant.slug}.epuredrive.com/${car.id}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }
  })

  return [...staticPages, ...tenantPages, ...carPages]
}
