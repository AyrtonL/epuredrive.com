export function buildOrganizationSchema(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'éPure Drive',
    alternateName: 'Epure Drive',
    url: 'https://epuredrive.com',
    logo: 'https://epuredrive.com/icon-512.png',
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: 'info@epuredrive.com',
    },
  }
}

export function buildWebSiteSchema(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'éPure Drive',
    alternateName: 'Epure Drive',
    url: 'https://epuredrive.com',
    // No SearchAction: the site has no search page, and Google retired the
    // sitelinks search box in 2024.
  }
}

export function buildSoftwareApplicationSchema(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'éPure Drive',
    alternateName: 'Epure Drive',
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
  telephone?: string | null
  address?: string | null
  /** Pickup / delivery locations shown on the site (e.g. "MIA Airport") */
  areaServed?: string[]
  /** Lowest and highest daily rate of the active fleet, in USD */
  dailyRateRange?: { min: number; max: number } | null
}

/** Schema.org expects international phone numbers; DB values are often bare digits. */
function formatTelephone(raw: string): string {
  const trimmed = raw.trim()
  if (trimmed.startsWith('+')) return trimmed
  const digits = trimmed.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return trimmed
}

/** Car images can be stored as site-relative paths ("assets/images/..."). */
function absoluteImageUrl(url: string): string {
  if (url.startsWith('http')) return url
  return `https://epuredrive.com/${url.replace(/^\//, '')}`
}

export function buildAutoRentalSchema(tenant: AutoRentalInput): Record<string, unknown> {
  const range = tenant.dailyRateRange
  return {
    '@context': 'https://schema.org',
    '@type': 'AutoRental',
    name: tenant.name,
    url: `https://${tenant.slug}.epuredrive.com`,
    ...(tenant.logoUrl ? { image: tenant.logoUrl, logo: tenant.logoUrl } : {}),
    ...(tenant.description ? { description: tenant.description } : {}),
    ...(tenant.telephone ? { telephone: formatTelephone(tenant.telephone) } : {}),
    ...(tenant.address ? { address: tenant.address } : {}),
    ...(tenant.areaServed && tenant.areaServed.length > 0
      ? { areaServed: tenant.areaServed.map((name) => ({ '@type': 'Place', name })) }
      : {}),
    ...(range
      ? { priceRange: range.min === range.max ? `$${range.min}/day` : `$${range.min}–$${range.max}/day` }
      : {}),
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
  /** Canonical URL of the car detail page */
  url?: string
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
    ...(car.imageUrl ? { image: absoluteImageUrl(car.imageUrl) } : {}),
    ...(car.year ? { model: modelDisplay, vehicleModelDate: String(car.year) } : {}),
    brand: { '@type': 'Brand', name: car.make },
    ...(car.url ? { url: car.url } : {}),
    offers: {
      '@type': 'Offer',
      priceCurrency: 'USD',
      ...(car.url ? { url: car.url } : {}),
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
 *
 * The extra merchant-listing fields (image, sku, hasMerchantReturnPolicy,
 * shippingDetails) are needed because Google automatically tries to
 * promote Product schemas to the stricter "Merchant Listing" rich
 * result class. Without them we pass Product Snippets but fail
 * Merchant Listings. For a digital SaaS subscription there is no
 * shipping and no returns, but the fields must still be declared
 * explicitly in a format Google accepts.
 */
export function buildPricingPlanSchema(
  plan: PricingPlanInput
): Record<string, unknown> {
  const sku = `epd-${plan.name.toLowerCase()}-${plan.billingPeriod}`
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `éPure Drive — ${plan.name}`,
    description: plan.description,
    sku,
    mpn: sku,
    image: 'https://epuredrive.com/og-image.jpg',
    brand: { '@type': 'Brand', name: 'éPure Drive' },
    offers: {
      '@type': 'Offer',
      price: String(plan.price),
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: plan.url,
      priceValidUntil: '2027-12-31',
      itemCondition: 'https://schema.org/NewCondition',
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        applicableCountry: 'US',
        returnPolicyCategory:
          'https://schema.org/MerchantReturnNotPermitted',
      },
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingRate: {
          '@type': 'MonetaryAmount',
          value: '0',
          currency: 'USD',
        },
        shippingDestination: {
          '@type': 'DefinedRegion',
          geoTargetName: 'US',
        },
        deliveryTime: {
          '@type': 'ShippingDeliveryTime',
          handlingTime: {
            '@type': 'QuantitativeValue',
            minValue: 0,
            maxValue: 0,
            unitCode: 'DAY',
          },
          transitTime: {
            '@type': 'QuantitativeValue',
            minValue: 0,
            maxValue: 0,
            unitCode: 'DAY',
          },
        },
      },
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
