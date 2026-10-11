import type { Metadata } from 'next'

interface TenantMeta {
  name: string
  brand_name: string | null
  slug: string
  logo_url: string | null
}

interface CarMeta {
  id: number
  make: string
  model: string
  model_full: string | null
  description: string | null
  image_url: string | null
  gallery: string[] | null
}

function resolveImageUrl(url: string | null): string | null {
  if (!url) return null
  if (url.startsWith('http')) return url
  return `/${url}`
}

/** Meta descriptions longer than this get cut off in search results. */
const MAX_DESCRIPTION = 155

function clampDescription(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= MAX_DESCRIPTION) return clean
  const cut = clean.slice(0, MAX_DESCRIPTION - 1)
  const lastSpace = cut.lastIndexOf(' ')
  return `${cut.slice(0, lastSpace > 80 ? lastSpace : cut.length)}…`
}

export function tenantSiteUrl(slug: string): string {
  return `https://${slug}.epuredrive.com`
}

/**
 * Tenant pages must carry their own Open Graph and Twitter tags. Without them
 * the root layout's tags (the éPure Drive SaaS pitch) leak into every share
 * preview of a tenant's fleet or car on WhatsApp, Instagram and Facebook.
 */
function socialTags(opts: {
  title: string
  description: string
  url: string
  siteName: string
  imageUrl: string | null
}): Pick<Metadata, 'openGraph' | 'twitter'> {
  const images = opts.imageUrl ? [{ url: opts.imageUrl }] : undefined
  return {
    openGraph: {
      title: opts.title,
      description: opts.description,
      url: opts.url,
      siteName: opts.siteName,
      type: 'website',
      ...(images ? { images } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: opts.title,
      description: opts.description,
      ...(opts.imageUrl ? { images: [opts.imageUrl] } : {}),
    },
  }
}

export function buildFleetMetadata(tenant: TenantMeta, _slug: string): Metadata {
  const displayName = tenant.brand_name ?? tenant.name
  const canonicalUrl = tenantSiteUrl(tenant.slug)
  const title = `${displayName} — Fleet`
  const description = `Browse available vehicles from ${displayName}.`

  return {
    title,
    description,
    // No explicit image: the PNG from [slug]/opengraph-image.tsx is used.
    // Tenant logos are often SVG, which Facebook/WhatsApp previews can't show.
    ...socialTags({ title, description, url: canonicalUrl, siteName: displayName, imageUrl: null }),
    alternates: {
      canonical: canonicalUrl,
    },
  }
}

export function buildFleetListMetadata(tenant: TenantMeta): Metadata {
  const displayName = tenant.brand_name ?? tenant.name
  const url = `${tenantSiteUrl(tenant.slug)}/fleet`
  const title = `${displayName} — Full Fleet`
  const description = `Browse all vehicles available from ${displayName}. Check live availability and book online.`

  return {
    title,
    description,
    ...socialTags({ title, description, url, siteName: displayName, imageUrl: null }),
    alternates: { canonical: url },
  }
}

export function buildCarMetadata(car: CarMeta, tenant: TenantMeta): Metadata {
  const displayName = tenant.brand_name ?? tenant.name
  const modelDisplay = car.model_full ?? car.model
  const title = `${car.make} ${modelDisplay} — ${displayName}`
  const description = clampDescription(
    car.description ?? `Rent the ${car.make} ${car.model} from ${displayName}. Book online today.`
  )
  const url = `${tenantSiteUrl(tenant.slug)}/${car.id}`

  const ogImageUrl =
    resolveImageUrl(car.gallery?.[0] ?? null) ?? resolveImageUrl(car.image_url)

  return {
    title,
    description,
    ...socialTags({ title, description, url, siteName: displayName, imageUrl: ogImageUrl }),
    alternates: {
      canonical: url,
    },
  }
}
