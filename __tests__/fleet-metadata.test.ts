import { buildFleetMetadata, buildCarMetadata } from '@/lib/utils/fleet-metadata'

// Minimal types for testing
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

const baseTenant: TenantMeta = {
  name: 'Acme Rentals',
  brand_name: null,
  slug: 'acme',
  logo_url: null,
}

const baseCar: CarMeta = {
  id: 42,
  make: 'BMW',
  model: 'X5',
  model_full: 'X5 xDrive40i',
  description: 'A premium SUV.',
  image_url: 'assets/images/bmw-x5.jpg',
  gallery: null,
}

describe('buildFleetMetadata', () => {
  it('uses brand_name as title when set', () => {
    const tenant = { ...baseTenant, brand_name: 'Pure Drive' }
    const result = buildFleetMetadata(tenant, 'acme')
    expect(result.title).toBe('Pure Drive — Fleet')
  })

  it('falls back to name when brand_name is null', () => {
    const result = buildFleetMetadata(baseTenant, 'acme')
    expect(result.title).toBe('Acme Rentals — Fleet')
  })

  it('includes OG image from logo_url when present', () => {
    const tenant = { ...baseTenant, logo_url: 'https://cdn.example.com/logo.png' }
    const result = buildFleetMetadata(tenant, 'acme')
    const og = result.openGraph as { images?: { url: string }[] }
    expect(og?.images?.[0]?.url).toBe('https://cdn.example.com/logo.png')
  })

  it('omits OG images when logo_url is null', () => {
    const result = buildFleetMetadata(baseTenant, 'acme')
    const og = result.openGraph as { images?: unknown[] } | undefined
    expect(og?.images).toBeUndefined()
  })
})

describe('buildCarMetadata', () => {
  it('uses model_full in title when available', () => {
    const result = buildCarMetadata(baseCar, baseTenant)
    expect(result.title).toBe('BMW X5 xDrive40i — Acme Rentals')
  })

  it('falls back to model when model_full is null', () => {
    const car = { ...baseCar, model_full: null }
    const result = buildCarMetadata(car, baseTenant)
    expect(result.title).toBe('BMW X5 — Acme Rentals')
  })

  it('uses car description when provided', () => {
    const result = buildCarMetadata(baseCar, baseTenant)
    expect(result.description).toBe('A premium SUV.')
  })

  it('generates a description when car.description is null', () => {
    const car = { ...baseCar, description: null }
    const result = buildCarMetadata(car, baseTenant)
    expect(result.description).toContain('BMW')
    expect(result.description).toContain('X5')
  })

  it('uses gallery[0] as OG image when gallery is present', () => {
    const car = { ...baseCar, gallery: ['https://cdn.example.com/g1.jpg', 'https://cdn.example.com/g2.jpg'] }
    const result = buildCarMetadata(car, baseTenant)
    const og = result.openGraph as { images?: { url: string }[] }
    expect(og?.images?.[0]?.url).toBe('https://cdn.example.com/g1.jpg')
  })

  it('falls back to image_url when gallery is null or empty', () => {
    const result = buildCarMetadata(baseCar, baseTenant)
    const og = result.openGraph as { images?: { url: string }[] }
    expect(og?.images?.[0]?.url).toContain('bmw-x5')
  })

  it('sets canonical URL', () => {
    const result = buildCarMetadata(baseCar, baseTenant)
    expect((result as { alternates?: { canonical?: string } }).alternates?.canonical).toContain('acme')
    expect((result as { alternates?: { canonical?: string } }).alternates?.canonical).toContain('42')
  })
})
