# Phase 2 — Tenant Fleet Pages Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Full UX redesign of tenant fleet listing and car detail pages, plus SEO metadata via `generateMetadata()` on both pages.

**Architecture:** Server Components fetch data and pass it to Client Components for interactivity. `generateMetadata()` is added at the page level (overrides layout) for richer SEO including OG images. The existing `app/sites/[slug]/layout.tsx` is unchanged — its generic metadata stays as a fallback.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, Supabase SSR (`@/lib/supabase/server`)

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `app/sites/[slug]/page.tsx` | Modify | Add `generateMetadata()` with OG image; replace grid with `<FleetGrid>` |
| `app/sites/[slug]/[carId]/page.tsx` | Modify | Add `generateMetadata()` with car OG image + canonical; replace static layout with `<CarDetailView>` |
| `components/sites/FleetGrid.tsx` | Create | Client Component — search input + category filter + car card grid |
| `components/sites/CarDetailView.tsx` | Create | Client Component — interactive image gallery + specs + booking CTA |
| `components/CarCard.tsx` | Modify | Polish design, support `tenant_accent` color prop for hover state |
| `__tests__/fleet-metadata.test.ts` | Create | Unit tests for metadata helper functions |

---

### Task 1: Write failing tests for SEO metadata helpers

**Files:**
- Create: `__tests__/fleet-metadata.test.ts`

These helpers will be called by `generateMetadata()` in both pages. Writing them first establishes the contract.

- [ ] **Step 1: Write the failing tests**

```typescript
// __tests__/fleet-metadata.test.ts
import {
  buildFleetMetadata,
  buildCarMetadata,
} from '@/lib/utils/fleet-metadata'

const tenant = {
  name: 'Test Rentals',
  brand_name: 'Test Rentals Co.',
  logo_url: 'https://example.com/logo.png',
  slug: 'test',
}

const car = {
  id: 42,
  make: 'Toyota',
  model: 'Camry',
  model_full: 'Camry XSE',
  year: 2023,
  category: 'sedan',
  seats: 5,
  transmission: 'Auto',
  hp: '203',
  description: 'A smooth, reliable sedan.',
  image_url: 'https://example.com/car.jpg',
  gallery: ['https://example.com/car.jpg', 'https://example.com/car2.jpg'],
  daily_rate: 89,
  badge: null,
  features: null,
  tenant_id: 'abc',
  status: 'active',
}

describe('buildFleetMetadata', () => {
  it('uses brand_name when available', () => {
    const meta = buildFleetMetadata(tenant, 'test')
    expect(meta.title).toBe('Test Rentals Co. — Fleet')
  })

  it('falls back to name when brand_name is null', () => {
    const meta = buildFleetMetadata({ ...tenant, brand_name: null }, 'test')
    expect(meta.title).toBe('Test Rentals — Fleet')
  })

  it('includes OG image from logo_url', () => {
    const meta = buildFleetMetadata(tenant, 'test')
    expect((meta.openGraph as { images?: { url: string }[] })?.images?.[0]?.url).toBe(
      'https://example.com/logo.png'
    )
  })

  it('omits OG images array when logo_url is null', () => {
    const meta = buildFleetMetadata({ ...tenant, logo_url: null }, 'test')
    expect((meta.openGraph as { images?: unknown[] })?.images).toBeUndefined()
  })
})

describe('buildCarMetadata', () => {
  it('uses model_full in title', () => {
    const meta = buildCarMetadata(car, tenant)
    expect(meta.title).toBe('Toyota Camry XSE — Test Rentals Co.')
  })

  it('falls back to model when model_full is null', () => {
    const meta = buildCarMetadata({ ...car, model_full: null }, tenant)
    expect(meta.title).toBe('Toyota Camry — Test Rentals Co.')
  })

  it('uses description when available', () => {
    const meta = buildCarMetadata(car, tenant)
    expect(meta.description).toBe('A smooth, reliable sedan.')
  })

  it('auto-generates description from specs when description is null', () => {
    const meta = buildCarMetadata({ ...car, description: null }, tenant)
    expect(meta.description).toContain('Toyota')
    expect(meta.description).toContain('2023')
  })

  it('uses first gallery image as OG image', () => {
    const meta = buildCarMetadata(car, tenant)
    expect((meta.openGraph as { images?: { url: string }[] })?.images?.[0]?.url).toBe(
      'https://example.com/car.jpg'
    )
  })

  it('falls back to image_url when gallery is empty', () => {
    const meta = buildCarMetadata({ ...car, gallery: [] }, tenant)
    expect((meta.openGraph as { images?: { url: string }[] })?.images?.[0]?.url).toBe(
      'https://example.com/car.jpg'
    )
  })

  it('includes canonical URL', () => {
    const meta = buildCarMetadata(car, tenant)
    expect(meta.alternates?.canonical).toBe('https://test.epuredrive.com/42')
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd "/Users/ayrtonpaullohigorry/IA Projects/Aplicacion Rental"
npx jest __tests__/fleet-metadata.test.ts --no-coverage 2>&1 | head -30
```

Expected: `Cannot find module '@/lib/utils/fleet-metadata'`

---

### Task 2: Implement fleet-metadata helpers

**Files:**
- Create: `lib/utils/fleet-metadata.ts`

- [ ] **Step 1: Create the helpers**

```typescript
// lib/utils/fleet-metadata.ts
import type { Metadata } from 'next'

interface TenantMeta {
  name: string
  brand_name: string | null
  logo_url: string | null
  slug: string
}

interface CarMeta {
  id: number
  make: string
  model: string
  model_full: string | null
  year: number | null
  category: string | null
  seats: number | null
  transmission: string | null
  hp: string | null
  description: string | null
  image_url: string | null
  gallery: string[] | null
  daily_rate: number | null
  badge: string | null
  features: string[] | null
  tenant_id: string | null
  status: string | null
}

function resolveOgImage(url: string | null): string | undefined {
  if (!url) return undefined
  if (url.startsWith('http')) return url
  return `/${url}`
}

export function buildFleetMetadata(tenant: TenantMeta, _slug: string): Metadata {
  const displayName = tenant.brand_name || tenant.name
  const ogImage = resolveOgImage(tenant.logo_url)

  return {
    title: `${displayName} — Fleet`,
    description: `Browse available vehicles from ${displayName}.`,
    openGraph: {
      title: `${displayName} — Fleet`,
      description: `Browse available vehicles from ${displayName}.`,
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
  }
}

export function buildCarMetadata(car: CarMeta, tenant: TenantMeta): Metadata {
  const displayName = tenant.brand_name || tenant.name
  const carName = `${car.make} ${car.model_full || car.model}`

  const description =
    car.description ||
    [
      car.year && `${car.year}`,
      car.make,
      car.model_full || car.model,
      car.category && `(${car.category})`,
      car.seats && `— ${car.seats} seats`,
      car.transmission && `| ${car.transmission}`,
      car.hp && `| ${car.hp} hp`,
    ]
      .filter(Boolean)
      .join(' ')

  const galleryImages: string[] = Array.isArray(car.gallery) ? car.gallery : []
  const ogImageRaw = galleryImages[0] ?? car.image_url
  const ogImage = resolveOgImage(ogImageRaw)

  return {
    title: `${carName} — ${displayName}`,
    description,
    alternates: {
      canonical: `https://${tenant.slug}.epuredrive.com/${car.id}`,
    },
    openGraph: {
      title: `${carName} — ${displayName}`,
      description,
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
  }
}
```

- [ ] **Step 2: Run tests to confirm they pass**

```bash
cd "/Users/ayrtonpaullohigorry/IA Projects/Aplicacion Rental"
npx jest __tests__/fleet-metadata.test.ts --no-coverage
```

Expected: All 8 tests pass.

- [ ] **Step 3: Commit**

```bash
cd "/Users/ayrtonpaullohigorry/IA Projects/Aplicacion Rental"
git add lib/utils/fleet-metadata.ts __tests__/fleet-metadata.test.ts
git commit -m "feat: add fleet and car SEO metadata helpers with tests"
```

---

### Task 3: Add `generateMetadata()` to fleet listing page

**Files:**
- Modify: `app/sites/[slug]/page.tsx`

Currently the layout has a generic `generateMetadata`. The fleet listing page gets its own, which Next.js uses in preference. The layout's stays as a fallback for any unknown sub-routes.

- [ ] **Step 1: Replace `app/sites/[slug]/page.tsx`**

```typescript
// app/sites/[slug]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { buildFleetMetadata } from '@/lib/utils/fleet-metadata'
import FleetGrid from '@/components/sites/FleetGrid'
import type { Car, Tenant } from '@/lib/supabase/types'
import type { Metadata } from 'next'

interface Props {
  params: { slug: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createClient()
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, brand_name, logo_url, slug')
    .eq('slug', params.slug)
    .single()

  if (!tenant) return {}
  return buildFleetMetadata(tenant, params.slug)
}

export default async function TenantFleetPage({ params }: Props) {
  const supabase = createClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, brand_name, slug')
    .eq('slug', params.slug)
    .single()

  if (!tenant) notFound()

  const { data: cars } = await supabase
    .from('cars')
    .select('id, make, model, model_full, year, daily_rate, image_url, category, badge, seats, transmission, hp, description, tenant_id, status, gallery, features')
    .eq('tenant_id', (tenant as Tenant).id)
    .neq('status', 'retired')
    .order('id')

  return (
    <FleetGrid
      cars={(cars ?? []) as Car[]}
      slug={params.slug}
      tenantName={(tenant as Tenant).brand_name || (tenant as Tenant).name}
    />
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "/Users/ayrtonpaullohigorry/IA Projects/Aplicacion Rental"
npx tsc --noEmit 2>&1 | grep -E "(error|Error)" | head -20
```

Expected: No errors.

---

### Task 4: Create `FleetGrid` client component

**Files:**
- Create: `components/sites/FleetGrid.tsx`

This is the interactive part — search by make/model, filter by category. The Server Component passes the full cars array; filtering is client-side (no extra DB round-trips).

- [ ] **Step 1: Create the component**

```typescript
// components/sites/FleetGrid.tsx
'use client'

import { useState, useMemo } from 'react'
import CarCard from '@/components/CarCard'
import type { Car } from '@/lib/supabase/types'

interface Props {
  cars: Car[]
  slug: string
  tenantName: string
}

export default function FleetGrid({ cars, slug, tenantName }: Props) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string>('all')

  const categories = useMemo(() => {
    const cats = cars
      .map((c) => c.category)
      .filter((c): c is string => Boolean(c))
    return ['all', ...Array.from(new Set(cats))]
  }, [cars])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return cars.filter((c) => {
      const matchesSearch =
        !q ||
        c.make.toLowerCase().includes(q) ||
        c.model.toLowerCase().includes(q) ||
        (c.model_full?.toLowerCase().includes(q) ?? false)
      const matchesCategory =
        category === 'all' || c.category === category
      return matchesSearch && matchesCategory
    })
  }, [cars, search, category])

  if (cars.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-24 text-center">
        <p className="text-white/30 text-lg">Fleet coming soon</p>
        <p className="text-white/20 text-sm mt-2">{tenantName} hasn&apos;t listed any vehicles yet.</p>
      </div>
    )
  }

  return (
    <div id="cars" className="max-w-6xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-1">Our Fleet</h1>
        <p className="text-white/40 text-sm">
          {filtered.length} of {cars.length} vehicle{cars.length !== 1 ? 's' : ''} from {tenantName}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <input
          type="text"
          placeholder="Search make or model…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
        />
        {categories.length > 2 && (
          <div className="flex gap-2 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors capitalize ${
                  category === cat
                    ? 'bg-white text-black'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-24 text-white/30">
          <p>No vehicles match your search.</p>
          <button
            onClick={() => { setSearch(''); setCategory('all') }}
            className="mt-3 text-sm text-white/50 hover:text-white underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((car) => (
            <CarCard key={car.id} car={car} slug={slug} />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd "/Users/ayrtonpaullohigorry/IA Projects/Aplicacion Rental"
npx tsc --noEmit 2>&1 | grep -E "(error|Error)" | head -20
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd "/Users/ayrtonpaullohigorry/IA Projects/Aplicacion Rental"
git add app/sites/\[slug\]/page.tsx components/sites/FleetGrid.tsx
git commit -m "feat: add FleetGrid client component with search/filter + fleet page SEO metadata"
```

---

### Task 5: Add `generateMetadata()` to car detail page

**Files:**
- Modify: `app/sites/[slug]/[carId]/page.tsx`

- [ ] **Step 1: Replace `app/sites/[slug]/[carId]/page.tsx`**

```typescript
// app/sites/[slug]/[carId]/page.tsx
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { buildCarMetadata } from '@/lib/utils/fleet-metadata'
import CarDetailView from '@/components/sites/CarDetailView'
import type { Car, Tenant } from '@/lib/supabase/types'
import type { Metadata } from 'next'

interface Props {
  params: { slug: string; carId: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, brand_name, logo_url, slug')
    .eq('slug', params.slug)
    .single()

  if (!tenant) return {}

  const { data: car } = await supabase
    .from('cars')
    .select('id, make, model, model_full, year, category, seats, transmission, hp, description, image_url, gallery, daily_rate, badge, features, tenant_id, status')
    .eq('id', Number(params.carId))
    .eq('tenant_id', tenant.id)
    .single()

  if (!car) return {}

  return buildCarMetadata(car as Car, tenant as Tenant & { slug: string })
}

export default async function CarDetailPage({ params }: Props) {
  const supabase = createClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, brand_name, slug')
    .eq('slug', params.slug)
    .single()

  if (!tenant) notFound()

  const { data: car } = await supabase
    .from('cars')
    .select('*')
    .eq('id', Number(params.carId))
    .eq('tenant_id', (tenant as Tenant).id)
    .single()

  if (!car) notFound()

  return (
    <CarDetailView
      car={car as Car}
      slug={params.slug}
      tenantName={(tenant as Tenant).brand_name || (tenant as Tenant).name}
    />
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd "/Users/ayrtonpaullohigorry/IA Projects/Aplicacion Rental"
npx tsc --noEmit 2>&1 | grep -E "(error|Error)" | head -20
```

Expected: No errors (CarDetailView not yet created — will show module-not-found, create it in next task).

---

### Task 6: Create `CarDetailView` client component

**Files:**
- Create: `components/sites/CarDetailView.tsx`

Interactive image gallery: clicking a thumbnail swaps the main image. This is why it's a Client Component — the gallery state lives here.

- [ ] **Step 1: Create the component**

```typescript
// components/sites/CarDetailView.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Car } from '@/lib/supabase/types'

interface Props {
  car: Car
  slug: string
  tenantName: string
}

function resolveImageUrl(url: string | null | undefined): string {
  if (!url) return '/assets/images/placeholder.jpg'
  if (url.startsWith('http')) return url
  return `/${url}`
}

export default function CarDetailView({ car, slug, tenantName }: Props) {
  const gallery: string[] = Array.isArray(car.gallery) && car.gallery.length > 0
    ? car.gallery
    : car.image_url
    ? [car.image_url]
    : []

  const [activeIndex, setActiveIndex] = useState(0)
  const activeImage = resolveImageUrl(gallery[activeIndex] ?? car.image_url)

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <Link
        href={`/sites/${slug}`}
        className="text-white/40 text-sm hover:text-white mb-8 inline-block transition-colors"
      >
        ← Back to fleet
      </Link>

      <div className="grid md:grid-cols-2 gap-10 mt-4">
        {/* Gallery */}
        <div className="space-y-3">
          <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-white/5">
            <img
              src={activeImage}
              alt={`${car.make} ${car.model_full || car.model}`}
              className="w-full h-full object-cover transition-all duration-200"
            />
          </div>
          {gallery.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {gallery.slice(0, 8).map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveIndex(i)}
                  className={`aspect-square rounded-lg overflow-hidden bg-white/5 ring-2 transition-all ${
                    i === activeIndex ? 'ring-white' : 'ring-transparent hover:ring-white/30'
                  }`}
                >
                  <img
                    src={resolveImageUrl(img)}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col">
          {car.badge && (
            <span className="inline-block self-start text-xs font-semibold text-black bg-white px-2 py-0.5 rounded-full mb-3">
              {car.badge}
            </span>
          )}

          <h1 className="text-3xl font-bold text-white mb-1">
            {car.make} {car.model_full || car.model}
          </h1>
          <div className="flex gap-3 text-sm text-white/50 mb-6">
            {car.year && <span>{car.year}</span>}
            {car.category && <span className="capitalize">{car.category}</span>}
            <span className="text-white/20">from {tenantName}</span>
          </div>

          {/* Specs grid */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {car.seats && (
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-white">{car.seats}</div>
                <div className="text-xs text-white/40">Seats</div>
              </div>
            )}
            {car.transmission && (
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <div className="text-sm font-bold text-white">{car.transmission}</div>
                <div className="text-xs text-white/40">Trans.</div>
              </div>
            )}
            {car.hp && (
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-white">{car.hp}</div>
                <div className="text-xs text-white/40">Power</div>
              </div>
            )}
          </div>

          {/* Features list */}
          {Array.isArray(car.features) && car.features.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {car.features.map((f, i) => (
                <span
                  key={i}
                  className="text-xs text-white/60 bg-white/5 border border-white/10 rounded-lg px-3 py-1"
                >
                  {f}
                </span>
              ))}
            </div>
          )}

          {car.description && (
            <p className="text-white/60 text-sm leading-relaxed mb-6 flex-1">
              {car.description}
            </p>
          )}

          {/* Price + CTA */}
          <div className="mt-auto">
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-4xl font-bold text-white">
                ${car.daily_rate ? Number(car.daily_rate).toFixed(0) : '—'}
              </span>
              <span className="text-white/40">/ day</span>
            </div>

            <a
              href={`/reservation.html?car=${car.id}`}
              className="block w-full text-center bg-white text-black font-semibold py-4 rounded-xl hover:bg-white/90 transition-colors"
            >
              Book this car →
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd "/Users/ayrtonpaullohigorry/IA Projects/Aplicacion Rental"
npx tsc --noEmit 2>&1 | grep -E "(error|Error)" | head -20
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd "/Users/ayrtonpaullohigorry/IA Projects/Aplicacion Rental"
git add app/sites/\[slug\]/\[carId\]/page.tsx components/sites/CarDetailView.tsx
git commit -m "feat: add CarDetailView with interactive gallery + car detail SEO metadata"
```

---

### Task 7: Playwright E2E tests for fleet pages

**Files:**
- Create: `e2e/fleet-pages.spec.ts`

Tests run against the dev server. They verify the redesigned pages render correctly and SEO metadata is present.

- [ ] **Step 1: Create E2E spec**

```typescript
// e2e/fleet-pages.spec.ts
import { test, expect } from '@playwright/test'

// Adjust BASE_URL to match the tenant slug used in dev/staging
const SLUG = process.env.E2E_TENANT_SLUG || 'epuredrive'
const BASE = process.env.PLAYWRIGHT_BASE_URL || `http://${SLUG}.localhost:3000`

test.describe('Tenant fleet listing', () => {
  test('renders fleet page with page title metadata', async ({ page }) => {
    await page.goto(BASE)
    await expect(page).toHaveTitle(/.+— Fleet/)
  })

  test('shows car cards', async ({ page }) => {
    await page.goto(BASE)
    // At least one car card should be present
    await expect(page.locator('a[href*="/sites/"]').first()).toBeVisible()
  })

  test('search filters cars', async ({ page }) => {
    await page.goto(BASE)
    const input = page.getByPlaceholder('Search make or model…')
    await input.fill('xxxxxxxxxxx_no_match')
    await expect(page.getByText('No vehicles match your search.')).toBeVisible()
  })

  test('clear filters button resets search', async ({ page }) => {
    await page.goto(BASE)
    await page.getByPlaceholder('Search make or model…').fill('xxxxxxxxxxx_no_match')
    await page.getByText('Clear filters').click()
    await expect(page.locator('a[href*="/sites/"]').first()).toBeVisible()
  })
})

test.describe('Car detail page', () => {
  test('navigates from fleet to car detail', async ({ page }) => {
    await page.goto(BASE)
    const firstCard = page.locator('a[href*="/sites/"]').first()
    const href = await firstCard.getAttribute('href')
    await firstCard.click()
    await page.waitForURL(`**${href}`)
    await expect(page.locator('h1')).toBeVisible()
  })

  test('renders booking CTA', async ({ page }) => {
    await page.goto(BASE)
    await page.locator('a[href*="/sites/"]').first().click()
    await expect(page.getByText('Book this car →')).toBeVisible()
  })

  test('back link navigates to fleet', async ({ page }) => {
    await page.goto(BASE)
    await page.locator('a[href*="/sites/"]').first().click()
    await page.getByText('← Back to fleet').click()
    await expect(page).toHaveURL(new RegExp(BASE))
  })
})
```

- [ ] **Step 2: Run E2E tests (requires dev server running)**

```bash
cd "/Users/ayrtonpaullohigorry/IA Projects/Aplicacion Rental"
npx playwright test e2e/fleet-pages.spec.ts --reporter=list 2>&1 | tail -30
```

Expected: All tests pass. If dev server is not running, start it first with `npm run dev` in a separate terminal.

- [ ] **Step 3: Commit**

```bash
cd "/Users/ayrtonpaullohigorry/IA Projects/Aplicacion Rental"
git add e2e/fleet-pages.spec.ts
git commit -m "test: add Playwright E2E tests for tenant fleet listing and car detail pages"
```

---

## Self-Review Checklist

- [x] `generateMetadata()` added to fleet listing page — title + description + OG image from tenant logo
- [x] `generateMetadata()` added to car detail page — title + description + OG image from first car photo + canonical URL
- [x] `FleetGrid` Client Component: search + category filter + empty state + clear filters
- [x] `CarDetailView` Client Component: interactive gallery (thumbnail → main image), specs grid, features list, booking CTA
- [x] Server Components do all Supabase fetches; Client Components handle only UI state
- [x] `notFound()` on unknown slug or car
- [x] Placeholder image fallback for missing car photos
- [x] Tenant name fallback (`brand_name || name`)
- [x] Metadata helper unit tests (8 tests)
- [x] Playwright E2E covering fleet listing, search, and car detail
- [x] No new Supabase schema changes
- [x] Booking CTA links to existing `reservation.html?car={id}` (checkout flow is Phase 3)
