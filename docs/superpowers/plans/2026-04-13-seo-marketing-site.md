# SEO Marketing Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve crawlability, indexing, and structured data for the epuredrive.com marketing site so Google understands it as fleet management SaaS and surfaces it to car rental operators.

**Architecture:** Seven focused changes — robots directives, sitemap corrections, noindex on auth pages, canonical/OG on legal pages, and JSON-LD structured data (Organization + WebSite + SoftwareApplication on homepage, FAQPage on /faq). JSON-LD logic lives in `lib/utils/jsonld.ts` (pure functions, unit-tested). A thin `JsonLd` component handles the script injection in one audited place. Everything else is metadata-only changes.

**Tech Stack:** Next.js 14 App Router, TypeScript, Jest + ts-jest

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `lib/utils/jsonld.ts` | Pure functions that return JSON-LD schema objects |
| Create | `lib/__tests__/jsonld.test.ts` | Unit tests for all four schema builders |
| Create | `components/JsonLd.tsx` | Thin wrapper that injects a JSON-LD script tag |
| Create | `app/robots.ts` | Crawl directives + sitemap pointer |
| Modify | `app/sitemap.ts` | Add /faq /terms /privacy; remove /login /sign-up |
| Modify | `app/(marketing)/login/page.tsx` | Add noindex |
| Modify | `app/(marketing)/sign-up/page.tsx` | Add noindex |
| Modify | `app/(marketing)/forgot-password/page.tsx` | Add noindex |
| Modify | `app/(marketing)/reset-password/page.tsx` | Add noindex |
| Modify | `app/(marketing)/faq/page.tsx` | Add canonical, OG, FAQPage JSON-LD |
| Modify | `app/(marketing)/terms/page.tsx` | Add canonical + OG |
| Modify | `app/(marketing)/privacy/page.tsx` | Add canonical + OG |
| Modify | `app/(marketing)/page.tsx` | Add Organization + WebSite + SoftwareApplication JSON-LD |

---

## Task 1: Create lib/utils/jsonld.ts with unit tests

**Files:**
- Create: `lib/utils/jsonld.ts`
- Create: `lib/__tests__/jsonld.test.ts`

- [ ] **Step 1: Write failing tests**

Create `lib/__tests__/jsonld.test.ts`:

```ts
import {
  buildOrganizationSchema,
  buildWebSiteSchema,
  buildSoftwareApplicationSchema,
  buildFAQPageSchema,
} from '../utils/jsonld'

describe('buildOrganizationSchema', () => {
  it('returns correct @type and required fields', () => {
    const schema = buildOrganizationSchema()
    expect(schema['@context']).toBe('https://schema.org')
    expect(schema['@type']).toBe('Organization')
    expect(schema.name).toBe('éPure Drive')
    expect(schema.url).toBe('https://epuredrive.com')
    expect(schema.logo).toBe('https://epuredrive.com/favicon.svg')
    expect(schema.contactPoint).toMatchObject({
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: 'support@epuredrive.com',
    })
  })
})

describe('buildWebSiteSchema', () => {
  it('returns correct @type and potentialAction', () => {
    const schema = buildWebSiteSchema()
    expect(schema['@context']).toBe('https://schema.org')
    expect(schema['@type']).toBe('WebSite')
    expect(schema.name).toBe('éPure Drive')
    expect(schema.url).toBe('https://epuredrive.com')
    expect(schema.potentialAction).toMatchObject({
      '@type': 'SearchAction',
      target: expect.stringContaining('epuredrive.com'),
    })
  })
})

describe('buildSoftwareApplicationSchema', () => {
  it('returns correct @type, category, and free offer', () => {
    const schema = buildSoftwareApplicationSchema()
    expect(schema['@context']).toBe('https://schema.org')
    expect(schema['@type']).toBe('SoftwareApplication')
    expect(schema.applicationCategory).toBe('BusinessApplication')
    expect(schema.operatingSystem).toBe('Web')
    expect(schema.offers).toMatchObject({
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    })
    expect(schema.description).toContain('car rental')
  })
})

describe('buildFAQPageSchema', () => {
  it('returns FAQPage with mainEntity array', () => {
    const faqs = [
      { q: 'What is it?', a: 'A SaaS platform.' },
      { q: 'Is it free?', a: 'Yes, up to 5 vehicles.' },
    ]
    const schema = buildFAQPageSchema(faqs)
    expect(schema['@context']).toBe('https://schema.org')
    expect(schema['@type']).toBe('FAQPage')
    expect(schema.mainEntity).toHaveLength(2)
    expect(schema.mainEntity[0]).toMatchObject({
      '@type': 'Question',
      name: 'What is it?',
      acceptedAnswer: { '@type': 'Answer', text: 'A SaaS platform.' },
    })
  })

  it('returns empty mainEntity for empty input', () => {
    const schema = buildFAQPageSchema([])
    expect(schema.mainEntity).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest lib/__tests__/jsonld.test.ts --no-coverage
```

Expected: `Cannot find module '../utils/jsonld'`

- [ ] **Step 3: Create lib/utils/jsonld.ts**

```ts
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
      'Car rental fleet management software for operators in Miami. Manage bookings, vehicles, finances, and customer records from one dashboard.',
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
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx jest lib/__tests__/jsonld.test.ts --no-coverage
```

Expected: `Tests: 5 passed, 5 total`

- [ ] **Step 5: Commit**

```bash
git add lib/utils/jsonld.ts lib/__tests__/jsonld.test.ts
git commit -m "feat: add JSON-LD schema builder utilities with tests"
```

---

## Task 2: Create JsonLd component

**Files:**
- Create: `components/JsonLd.tsx`

This component is the single place where a JSON-LD `<script>` tag is injected. All callers pass a pre-built plain object — the component serializes and renders it. Because the input is always a statically-built schema object from `lib/utils/jsonld.ts` (never user input), this is safe.

- [ ] **Step 1: Create components/JsonLd.tsx**

```tsx
interface JsonLdProps {
  schema: Record<string, unknown>
}

export default function JsonLd({ schema }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      // Content is always a static schema object built server-side — never user input.
      // eslint-disable-next-line react/no-danger
      {...{ dangerouslySetInnerHTML: { __html: JSON.stringify(schema) } }}
    />
  )
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add components/JsonLd.tsx
git commit -m "feat: add JsonLd component for structured data injection"
```

---

## Task 3: Create app/robots.ts

**Files:**
- Create: `app/robots.ts`

- [ ] **Step 1: Create app/robots.ts**

```ts
import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/dashboard/',
        '/login',
        '/sign-up',
        '/forgot-password',
        '/reset-password',
      ],
    },
    sitemap: 'https://epuredrive.com/sitemap.xml',
  }
}
```

- [ ] **Step 2: Verify the output**

Start dev server (`npm run dev`) and open `http://localhost:3000/robots.txt`.

Expected content:
```
User-agent: *
Allow: /
Disallow: /dashboard/
Disallow: /login
Disallow: /sign-up
Disallow: /forgot-password
Disallow: /reset-password

Sitemap: https://epuredrive.com/sitemap.xml
```

- [ ] **Step 3: Commit**

```bash
git add app/robots.ts
git commit -m "feat: add robots.ts with crawl directives and sitemap pointer"
```

---

## Task 4: Fix app/sitemap.ts

**Files:**
- Modify: `app/sitemap.ts`

- [ ] **Step 1: Replace staticPages array**

The current `staticPages` block (lines 13–17) is:
```ts
const staticPages: MetadataRoute.Sitemap = [
  { url: BASE_URL, lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
  { url: `${BASE_URL}/login`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  { url: `${BASE_URL}/sign-up`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
]
```

Replace it with:
```ts
const staticPages: MetadataRoute.Sitemap = [
  { url: BASE_URL, lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
  { url: `${BASE_URL}/faq`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
  { url: `${BASE_URL}/terms`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.4 },
  { url: `${BASE_URL}/privacy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.4 },
]
```

- [ ] **Step 2: Verify**

With dev server running, open `http://localhost:3000/sitemap.xml`.

Confirm:
- `https://epuredrive.com/faq` present
- `https://epuredrive.com/terms` present
- `https://epuredrive.com/privacy` present
- `https://epuredrive.com/login` absent
- `https://epuredrive.com/sign-up` absent

- [ ] **Step 3: Commit**

```bash
git add app/sitemap.ts
git commit -m "fix: add faq/terms/privacy to sitemap, remove auth pages"
```

---

## Task 5: Add noindex to auth pages

**Files:**
- Modify: `app/(marketing)/login/page.tsx`
- Modify: `app/(marketing)/sign-up/page.tsx`
- Modify: `app/(marketing)/forgot-password/page.tsx`
- Modify: `app/(marketing)/reset-password/page.tsx`

- [ ] **Step 1: Update login/page.tsx**

Replace line 5:
```ts
export const metadata: Metadata = { title: 'Sign In — éPure Drive Platform' }
```
With:
```ts
export const metadata: Metadata = {
  title: 'Sign In — éPure Drive Platform',
  robots: { index: false, follow: false },
}
```

- [ ] **Step 2: Update sign-up/page.tsx**

Replace line 5:
```ts
export const metadata: Metadata = { title: 'Sign Up — éPure Drive Platform' }
```
With:
```ts
export const metadata: Metadata = {
  title: 'Sign Up — éPure Drive Platform',
  robots: { index: false, follow: false },
}
```

- [ ] **Step 3: Update forgot-password/page.tsx**

Replace line 4:
```ts
export const metadata: Metadata = { title: 'Reset Password — éPure Drive Platform' }
```
With:
```ts
export const metadata: Metadata = {
  title: 'Reset Password — éPure Drive Platform',
  robots: { index: false, follow: false },
}
```

- [ ] **Step 4: Update reset-password/page.tsx**

Replace line 4:
```ts
export const metadata: Metadata = { title: 'Set New Password — éPure Drive Platform' }
```
With:
```ts
export const metadata: Metadata = {
  title: 'Set New Password — éPure Drive Platform',
  robots: { index: false, follow: false },
}
```

- [ ] **Step 5: Verify**

In browser DevTools `<head>` for each page, confirm `<meta name="robots" content="noindex,nofollow">` is present on:
- `http://localhost:3000/login`
- `http://localhost:3000/sign-up`
- `http://localhost:3000/forgot-password`
- `http://localhost:3000/reset-password`

- [ ] **Step 6: Commit**

```bash
git add "app/(marketing)/login/page.tsx" "app/(marketing)/sign-up/page.tsx" "app/(marketing)/forgot-password/page.tsx" "app/(marketing)/reset-password/page.tsx"
git commit -m "fix: add noindex to auth pages"
```

---

## Task 6: Add canonical + OG to /faq, /terms, /privacy

**Files:**
- Modify: `app/(marketing)/faq/page.tsx`
- Modify: `app/(marketing)/terms/page.tsx`
- Modify: `app/(marketing)/privacy/page.tsx`

- [ ] **Step 1: Update faq/page.tsx metadata**

Replace the existing metadata export (lines 3–6) with:
```ts
export const metadata: Metadata = {
  title: 'FAQ — Frequently Asked Questions',
  description: 'Answers to common questions about éPure Drive, fleet management, pricing, and getting started.',
  alternates: { canonical: 'https://epuredrive.com/faq' },
  openGraph: {
    title: 'FAQ — Frequently Asked Questions | éPure Drive',
    description: 'Answers to common questions about éPure Drive, fleet management, pricing, and getting started.',
    url: 'https://epuredrive.com/faq',
  },
}
```

- [ ] **Step 2: Update terms/page.tsx metadata**

Replace the existing metadata export (lines 3–8) with:
```ts
export const metadata: Metadata = {
  title: 'Terms & Conditions — éPure Drive',
  description:
    'Read the full terms and conditions for renting a vehicle with éPure Drive in Miami, Aventura, and South Florida.',
  alternates: { canonical: 'https://epuredrive.com/terms' },
  openGraph: {
    title: 'Terms & Conditions — éPure Drive',
    description: 'Read the full terms and conditions for renting a vehicle with éPure Drive in Miami, Aventura, and South Florida.',
    url: 'https://epuredrive.com/terms',
  },
}
```

- [ ] **Step 3: Update privacy/page.tsx metadata**

Replace the existing metadata export (lines 3–8) with:
```ts
export const metadata: Metadata = {
  title: 'Privacy Policy — éPure Drive',
  description: 'Privacy Policy for éPure Drive — how we collect, use, and protect your personal information.',
  alternates: { canonical: 'https://epuredrive.com/privacy' },
  openGraph: {
    title: 'Privacy Policy — éPure Drive',
    description: 'Privacy Policy for éPure Drive — how we collect, use, and protect your personal information.',
    url: 'https://epuredrive.com/privacy',
  },
}
```

- [ ] **Step 4: Verify**

In DevTools `<head>` for each page confirm canonical link:
- `http://localhost:3000/faq` → `<link rel="canonical" href="https://epuredrive.com/faq">`
- `http://localhost:3000/terms` → `<link rel="canonical" href="https://epuredrive.com/terms">`
- `http://localhost:3000/privacy` → `<link rel="canonical" href="https://epuredrive.com/privacy">`

- [ ] **Step 5: Commit**

```bash
git add "app/(marketing)/faq/page.tsx" "app/(marketing)/terms/page.tsx" "app/(marketing)/privacy/page.tsx"
git commit -m "feat: add canonical and OG tags to faq, terms, privacy pages"
```

---

## Task 7: Add JSON-LD to homepage

**Files:**
- Modify: `app/(marketing)/page.tsx`

- [ ] **Step 1: Add imports**

At the top of `app/(marketing)/page.tsx`, after the existing imports (`Link`, `Image`), add:

```ts
import JsonLd from '@/components/JsonLd'
import {
  buildOrganizationSchema,
  buildWebSiteSchema,
  buildSoftwareApplicationSchema,
} from '@/lib/utils/jsonld'
```

- [ ] **Step 2: Add JsonLd components to the return**

In `app/(marketing)/page.tsx`, at the very end of the JSX return, just before the closing `</>`, add:

```tsx
      <JsonLd schema={buildOrganizationSchema()} />
      <JsonLd schema={buildWebSiteSchema()} />
      <JsonLd schema={buildSoftwareApplicationSchema()} />
```

The full end of the return will look like:
```tsx
      {/* ─────────────────── Final CTA ─────────────────── */}
      <section className="relative py-32 bg-black overflow-hidden">
        {/* ... existing section content ... */}
      </section>

      <JsonLd schema={buildOrganizationSchema()} />
      <JsonLd schema={buildWebSiteSchema()} />
      <JsonLd schema={buildSoftwareApplicationSchema()} />
    </>
  )
}
```

- [ ] **Step 3: Verify**

Open `http://localhost:3000`. In DevTools → Elements, search for `application/ld+json`. Confirm three `<script>` tags with valid JSON appear.

Paste the Organization schema into [Google's Rich Results Test](https://search.google.com/test/rich-results) to confirm it validates.

- [ ] **Step 4: Commit**

```bash
git add "app/(marketing)/page.tsx"
git commit -m "feat: add Organization, WebSite, SoftwareApplication JSON-LD to homepage"
```

---

## Task 8: Add FAQPage JSON-LD to /faq

**Files:**
- Modify: `app/(marketing)/faq/page.tsx`

- [ ] **Step 1: Add imports**

At the top of `app/(marketing)/faq/page.tsx`, after `import type { Metadata } from 'next'`, add:

```ts
import JsonLd from '@/components/JsonLd'
import { buildFAQPageSchema } from '@/lib/utils/jsonld'
```

- [ ] **Step 2: Flatten the faqs array**

The existing `faqs` array (which closes around line 93) has structure:
`{ category: string, items: { q: string, a: string }[] }[]`

After the closing `]` of the `faqs` array definition and before `export default function FAQPage`, add:

```ts
const allFaqItems = faqs.flatMap((section) => section.items)
```

- [ ] **Step 3: Add JsonLd to the return**

In `FAQPage`, at the very end of the return block, just before the final closing `</div>`, add:

```tsx
      <JsonLd schema={buildFAQPageSchema(allFaqItems)} />
```

- [ ] **Step 4: Verify**

Open `http://localhost:3000/faq`. In DevTools → Elements, find `<script type="application/ld+json">`. The JSON should contain `"@type": "FAQPage"` with 16 items in `mainEntity`.

Paste into [Google's Rich Results Test](https://search.google.com/test/rich-results). It should detect "FAQPage" as eligible for rich results.

- [ ] **Step 5: Run full test suite**

```bash
npx jest --no-coverage
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add "app/(marketing)/faq/page.tsx"
git commit -m "feat: add FAQPage JSON-LD structured data to /faq"
```

---

## Final verification checklist

- [ ] `http://localhost:3000/robots.txt` — correct disallow rules, sitemap line present
- [ ] `http://localhost:3000/sitemap.xml` — `/faq`, `/terms`, `/privacy` present; `/login`, `/sign-up` absent
- [ ] `/login` `<head>` → `<meta name="robots" content="noindex,nofollow">`
- [ ] `/sign-up` `<head>` → `<meta name="robots" content="noindex,nofollow">`
- [ ] `/forgot-password` `<head>` → `<meta name="robots" content="noindex,nofollow">`
- [ ] `/reset-password` `<head>` → `<meta name="robots" content="noindex,nofollow">`
- [ ] `/faq` `<head>` → `<link rel="canonical" href="https://epuredrive.com/faq">`
- [ ] `/terms` `<head>` → `<link rel="canonical" href="https://epuredrive.com/terms">`
- [ ] `/privacy` `<head>` → `<link rel="canonical" href="https://epuredrive.com/privacy">`
- [ ] `https://epuredrive.com` → three JSON-LD script tags in body
- [ ] `https://epuredrive.com/faq` → FAQPage JSON-LD script tag with 16 questions
- [ ] All Jest tests pass: `npx jest --no-coverage`
