# SEO — Marketing Site (epuredrive.com)

**Date:** 2026-04-13  
**Scope:** epuredrive.com marketing pages only (not tenant fleet subdomains)  
**Approach:** Option B — Technical foundation + structured data

---

## Goal

Improve Google's ability to crawl, index, and understand the epuredrive.com marketing site. Target audience is car rental operators searching for fleet management software. No new content pages are in scope — all improvements are technical (metadata, crawl directives, structured data).

---

## Files Changed

### New files
- `app/robots.ts` — crawl directives + sitemap pointer
- `lib/utils/jsonld.ts` — shared JSON-LD schema builders

### Modified files
- `app/sitemap.ts` — add missing pages, remove auth pages
- `app/(marketing)/page.tsx` — add JSON-LD (Organization + WebSite + SoftwareApplication)
- `app/(marketing)/faq/page.tsx` — add FAQPage JSON-LD + canonical + OG
- `app/(marketing)/terms/page.tsx` — add canonical + OG
- `app/(marketing)/privacy/page.tsx` — add canonical + OG
- `app/(marketing)/login/page.tsx` — add noindex
- `app/(marketing)/sign-up/page.tsx` — add noindex
- `app/(marketing)/forgot-password/page.tsx` — add noindex
- `app/(marketing)/reset-password/page.tsx` — add noindex

---

## Section 1: robots.ts

New file at `app/robots.ts` using Next.js `MetadataRoute.Robots` type.

Rules:
- Allow all on `/`
- Disallow `/dashboard/`, `/login`, `/sign-up`, `/forgot-password`, `/reset-password`
- Point to `https://epuredrive.com/sitemap.xml`

---

## Section 2: Sitemap fixes

Changes to `app/sitemap.ts`:

**Add** static entries:
- `https://epuredrive.com/faq` — priority 0.6, changeFrequency: monthly
- `https://epuredrive.com/terms` — priority 0.4, changeFrequency: yearly
- `https://epuredrive.com/privacy` — priority 0.4, changeFrequency: yearly

**Remove** entries:
- `https://epuredrive.com/login`
- `https://epuredrive.com/sign-up`

Tenant subdomain entries (`https://${slug}.epuredrive.com`) remain unchanged.

---

## Section 3: Metadata fixes

### Auth pages — noindex
Add to `metadata` export in `/login`, `/sign-up`, `/forgot-password`, `/reset-password`:
```ts
robots: { index: false, follow: false }
```

### /faq
Add canonical (`https://epuredrive.com/faq`) and openGraph block.

### /terms
Add canonical (`https://epuredrive.com/terms`) and openGraph block.

### /privacy
Add canonical (`https://epuredrive.com/privacy`) and openGraph block.

---

## Section 4: JSON-LD Structured Data

### lib/utils/jsonld.ts

Exports four pure functions (no React dependency, no user input — all static server-side data):

- `buildOrganizationSchema(): object`
- `buildWebSiteSchema(): object`
- `buildSoftwareApplicationSchema(): object`
- `buildFAQPageSchema(faqs: { q: string; a: string }[]): object`

All functions return plain objects. Pages serialize them with `JSON.stringify` and inject via a `<script type="application/ld+json">` tag in the page component. Because all content is statically defined (no user input), there is no XSS risk.

### Homepage schema bundle

Three schemas rendered on the homepage:

1. **Organization**
   - name: "éPure Drive"
   - url: "https://epuredrive.com"
   - logo: "https://epuredrive.com/favicon.svg"
   - contactPoint: customer support email

2. **WebSite**
   - name: "éPure Drive"
   - url: "https://epuredrive.com"
   - potentialAction: SearchAction

3. **SoftwareApplication**
   - applicationCategory: "BusinessApplication"
   - operatingSystem: "Web"
   - description: "Car rental fleet management software for operators in Miami. Manage bookings, vehicles, finances, and customer records from one dashboard."
   - offers: Free plan at $0

### FAQ page schema

**FAQPage** schema generated from the existing `faqs` array in `faq/page.tsx`. All 16 questions included. Each item maps to a `Question` + `acceptedAnswer` pair.

This is the highest-impact change — FAQPage schemas are eligible for Google's expanded rich results (accordion FAQ blocks shown directly in SERP).

---

## What this does NOT include (Option C scope)

- No new content pages (`/blog`, `/resources`, `/features`)
- No changes to tenant fleet subdomain SEO
- No hreflang (single language, single region)
- No performance/Core Web Vitals work

---

## Success criteria

- `robots.txt` accessible at `https://epuredrive.com/robots.txt` and correctly disallowing auth/dashboard routes
- `sitemap.xml` includes `/faq`, `/terms`, `/privacy` and excludes auth pages
- Google Search Console shows FAQ rich results eligibility after re-crawl
- No noindex pages appearing in GSC coverage report
- All public marketing pages have canonical tags
