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

export function buildFleetMetadata(tenant: TenantMeta, _slug: string): Metadata {
  const displayName = tenant.brand_name ?? tenant.name
  const ogImages = tenant.logo_url ? [{ url: tenant.logo_url }] : undefined

  return {
    title: `${displayName} — Fleet`,
    description: `Browse available vehicles from ${displayName}.`,
    openGraph: {
      title: `${displayName} — Fleet`,
      description: `Browse available vehicles from ${displayName}.`,
      ...(ogImages ? { images: ogImages } : {}),
    },
  }
}

export function buildCarMetadata(car: CarMeta, tenant: TenantMeta): Metadata {
  const displayName = tenant.brand_name ?? tenant.name
  const modelDisplay = car.model_full ?? car.model
  const title = `${car.make} ${modelDisplay} — ${displayName}`
  const description =
    car.description ?? `Rent the ${car.make} ${car.model} from ${displayName}. Book online today.`

  const ogImageUrl =
    resolveImageUrl(car.gallery?.[0] ?? null) ?? resolveImageUrl(car.image_url)

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      ...(ogImageUrl ? { images: [{ url: ogImageUrl }] } : {}),
    },
    alternates: {
      canonical: `https://${tenant.slug}.epuredrive.com/${car.id}`,
    },
  }
}
