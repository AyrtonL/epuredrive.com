# Next.js Migration Design — éPure Drive SaaS Platform

**Date:** 2026-03-29
**Status:** Approved
**Goal:** Migrate the current vanilla HTML/JS app to Next.js 14 (App Router) to support a multi-tenant SaaS platform with three distinct surfaces: a marketing site, per-tenant public fleet pages, and an admin dashboard.

---

## Overview

The current app (epuredrive.com) is a single-brand rental site. The goal is to evolve it into a SaaS platform where any car rental business can sign up, get their own public fleet page at `{slug}.epuredrive.com`, and manage it through a dashboard.

**Three surfaces, one codebase:**

| Surface | URL | Purpose | Rendering |
|---|---|---|---|
| Marketing site | `epuredrive.com` | SaaS landing page, pricing, sign up/login | SSG |
| Tenant fleet page | `{slug}.epuredrive.com` | Public fleet browsing + booking | SSR |
| Admin dashboard | `epuredrive.com/dashboard` | Reservation mgmt + fleet customizer | CSR + auth |

---

## Architecture

### Routing — Next.js Middleware

A single `middleware.ts` at the project root inspects `request.headers.get('host')` on every request:

- `epuredrive.com` or `www.epuredrive.com` → serve the `(marketing)` route group
- `{slug}.epuredrive.com` (any non-reserved subdomain) → rewrite to `(tenant)` route group, injecting `slug` as a header/cookie for server components to read
- `epuredrive.com/dashboard/*` → auth-guarded, serve dashboard routes

Reserved subdomains (www, admin, app, api) pass through unchanged.

### Folder Structure

```
/
├── middleware.ts                  ← subdomain router
├── app/
│   ├── (marketing)/               ← epuredrive.com root
│   │   ├── layout.tsx
│   │   ├── page.tsx               ← hero + pricing
│   │   ├── pricing/page.tsx
│   │   ├── login/page.tsx
│   │   └── sign-up/page.tsx
│   ├── (tenant)/                  ← {slug}.epuredrive.com
│   │   ├── layout.tsx
│   │   ├── page.tsx               ← fleet listing
│   │   ├── [carId]/page.tsx       ← car detail
│   │   └── checkout/page.tsx
│   └── dashboard/                 ← epuredrive.com/dashboard
│       ├── layout.tsx             ← auth guard
│       ├── page.tsx               ← overview
│       ├── fleet/page.tsx         ← fleet customizer
│       ├── cars/page.tsx
│       └── reservations/page.tsx
├── components/                    ← shared UI components
├── lib/
│   ├── supabase/                  ← browser + server clients
│   └── utils/
├── public/                        ← static assets (migrated from /assets)
└── netlify/
    └── functions/                 ← existing functions kept as-is
```

Route groups `(marketing)` and `(tenant)` use Next.js parentheses syntax — they do not affect URL paths but allow each surface to have its own layout, metadata, and loading states.

### Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Backend:** Supabase (existing project, no schema changes in Phase 1)
- **Auth:** Supabase Auth (existing)
- **Hosting:** Netlify (Next.js runtime)
- **Payments:** Stripe (existing Netlify functions, unchanged)

---

## Tenant Data Flow

1. Request arrives at `{slug}.epuredrive.com`
2. Middleware rewrites to `(tenant)/page.tsx`, sets `x-tenant-slug` request header
3. Server component reads the slug, queries Supabase for the tenant record
4. Fetches tenant's cars (RLS ensures only that tenant's cars are returned)
5. Renders fleet page with tenant branding (name, logo, colors from `tenants` table)

---

## Tenant Onboarding Flow

1. Visitor lands on `epuredrive.com` → sees marketing site
2. Clicks "Get started" → `/sign-up` → creates Supabase auth user + tenant row + profile row
3. Redirected to `/dashboard` (auth-guarded)
4. Dashboard shows Fleet Customizer:
   - **Preview iframe** showing éPure Drive's live fleet page (the tenant slug for éPure Drive, e.g. `epuredrive.epuredrive.com`, created during setup) as an example of what their page will look like
   - **Their page** is pre-seeded with 1 sample car (cloned from one of éPure Drive's cars)
   - They can edit the sample car, add more, set their logo/name, and click "Publish"
5. Their public fleet page goes live at `{their-slug}.epuredrive.com`

---

## Phase 1 — April 2026 (Signups Ready)

**Scope:** Everything needed to onboard the first tenants.

### New Next.js project
- Initialize Next.js 14 + TypeScript + Tailwind
- Configure Supabase SSR client (`@supabase/ssr`)
- Set up middleware for subdomain routing
- Configure `netlify.toml` for Next.js runtime
- Add `.superpowers/` to `.gitignore`

### Surface 1 — Marketing site
- Hero section with value proposition and CTA
- Pricing section (plans/tiers — content TBD)
- `/sign-up` — tenant registration form (company name, email, password) → calls existing `create-tenant` Netlify function
- `/login` → Supabase auth → redirect to `/dashboard`

### Surface 2 — Dashboard entry
- Auth guard in `dashboard/layout.tsx` (redirect to `/login` if no session)
- Overview page: welcome message, link to their public fleet URL, quick stats
- Fleet Customizer panel (`/dashboard/fleet`):
  - Preview iframe of éPure Drive's fleet page
  - Form to edit tenant name and logo
  - Car list (starts with 1 sample car)
  - "Publish" / "View live page" button
- Navigation link to existing `admin/dashboard.html` for full reservation/car management during transition

### Surface 3 — Tenant fleet page
- Migrate `fleet.html` → `app/(tenant)/page.tsx`
- Server-side tenant resolution by slug
- Car listing from Supabase (tenant-scoped)
- Migrate `car-detail.html` → `app/(tenant)/[carId]/page.tsx`
- Basic booking flow (reservation form)

### Coexistence strategy
The existing `admin/dashboard.html` remains live and accessible at its current URL throughout Phase 1. The new dashboard entry page links to it. No disruption to current operations.

---

## Phase 2 — Post First Users

- Full migration of `admin/dashboard.html` → Next.js (reservations, cars, calendar)
- Fleet customizer expanded: brand colors, fonts, layout options, custom domain support
- Full booking + checkout flow in Next.js (Stripe per-tenant)
- Superadmin panel migration
- Marketing site growth features: tenant showcase, blog, referral program
- SEO metadata per tenant on fleet pages

---

## What Is NOT Changing (Phase 1)

- Supabase schema (no new tables or columns needed for Phase 1)
- Netlify functions (Stripe, iCal sync, Gmail automator — all kept as-is)
- Existing RLS policies
- Domain/DNS configuration (wildcard subdomain already configured)

---

## Open Questions (Phase 2)

- Pricing tiers: how many plans, what limits per plan?
- Custom domain support: will tenants bring their own domain?
- Stripe per-tenant: connect accounts vs. platform fee model?
