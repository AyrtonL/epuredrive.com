export function buildOrganizationSchema(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'éPure Drive',
    url: 'https://epuredrive.com',
    logo: 'https://epuredrive.com/favicon.svg',
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: 'support@epuredrive.com',
    },
  }
}

export function buildWebSiteSchema(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'éPure Drive',
    url: 'https://epuredrive.com',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://epuredrive.com/?s={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  }
}

export function buildSoftwareApplicationSchema(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'éPure Drive',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description:
      'Rental car fleet management software for independent car rental operators. Manage bookings, vehicles, finances, and customer records from one dashboard.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      description: 'Free plan — up to 5 vehicles',
    },
  }
}

export function buildFAQPageSchema(
  faqs: { q: string; a: string }[]
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.a,
      },
    })),
  }
}

/* ─── Tenant Page Schemas ─── */

interface BreadcrumbItem {
  name: string
  url: string
}

export function buildBreadcrumbSchema(items: BreadcrumbItem[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

interface AutoRentalInput {
  name: string
  slug: string
  logoUrl: string | null
  description?: string | null
}

export function buildAutoRentalSchema(tenant: AutoRentalInput): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'AutoRental',
    name: tenant.name,
    url: `https://${tenant.slug}.epuredrive.com`,
    ...(tenant.logoUrl ? { image: tenant.logoUrl } : {}),
    ...(tenant.description ? { description: tenant.description } : {}),
  }
}

interface CarProductInput {
  make: string
  model: string
  modelFull: string | null
  description: string | null
  imageUrl: string | null
  dailyRate: number | null
  year: number | null
}

export function buildCarProductSchema(
  car: CarProductInput,
  tenant: { name: string; slug: string }
): Record<string, unknown> {
  const modelDisplay = car.modelFull ?? car.model
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${car.make} ${modelDisplay}`,
    ...(car.description ? { description: car.description } : {}),
    ...(car.imageUrl ? { image: car.imageUrl } : {}),
    ...(car.year ? { model: modelDisplay, vehicleModelDate: String(car.year) } : {}),
    brand: { '@type': 'Brand', name: car.make },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'USD',
      ...(car.dailyRate ? { price: String(car.dailyRate) } : {}),
      availability: 'https://schema.org/InStock',
      seller: {
        '@type': 'AutoRental',
        name: tenant.name,
        url: `https://${tenant.slug}.epuredrive.com`,
      },
    },
  }
}

/* ─── Marketing Page Schemas (pricing, video, breadcrumbs) ─── */

interface PricingPlanInput {
  name: string
  price: number
  billingPeriod: 'month' | 'year' | 'one-time'
  description: string
  features: string[]
  url: string
}

/**
 * Product + Offer schema for a pricing plan. Enables rich snippets with
 * price in Google search results. Use one per plan (Starter / Pro / Max).
 */
export function buildPricingPlanSchema(
  plan: PricingPlanInput
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `éPure Drive — ${plan.name}`,
    description: plan.description,
    brand: { '@type': 'Brand', name: 'éPure Drive' },
    offers: {
      '@type': 'Offer',
      price: String(plan.price),
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: plan.url,
      ...(plan.billingPeriod === 'month'
        ? {
            priceSpecification: {
              '@type': 'UnitPriceSpecification',
              price: String(plan.price),
              priceCurrency: 'USD',
              billingIncrement: 1,
              unitCode: 'MON',
            },
          }
        : {}),
    },
  }
}

interface VideoObjectInput {
  name: string
  description: string
  thumbnailUrl: string
  uploadDate: string
  contentUrl?: string
  embedUrl?: string
  duration?: string // ISO 8601, e.g. 'PT2M'
}

/**
 * VideoObject schema for the product demo video. Lets Google index the
 * video and display a thumbnail in search results.
 */
export function buildVideoObjectSchema(
  video: VideoObjectInput
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: video.name,
    description: video.description,
    thumbnailUrl: video.thumbnailUrl,
    uploadDate: video.uploadDate,
    ...(video.contentUrl ? { contentUrl: video.contentUrl } : {}),
    ...(video.embedUrl ? { embedUrl: video.embedUrl } : {}),
    ...(video.duration ? { duration: video.duration } : {}),
  }
}
