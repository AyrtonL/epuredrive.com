# Next.js Migration — Phase 2 Design

**Date:** 2026-03-30
**Status:** Approved
**Goal:** Full migration of `admin/dashboard.html` to Next.js, plus SEO metadata and full UX overhaul of tenant fleet pages.

---

## Context

Phase 1 delivered: marketing site `(marketing)/`, tenant fleet pages `app/sites/[slug]/`, and a dashboard entry with fleet customizer. The existing `admin/dashboard.html` (2574 lines, 11 tabs) remains live as a fallback.

Phase 2 replaces it entirely with proper Next.js routes — no hybrid state. There are no live customers yet, so a clean full replacement (build everything, ship in one deploy) is the right approach.

---

## Scope

1. **Admin dashboard** — full migration of all 11 tabs, grouped into 6 sidebar sections, under `app/dashboard/*`
2. **Tenant fleet pages** — full UX overhaul of fleet listing and car detail pages, plus SEO metadata via `generateMetadata()`

---

## Architecture

### Admin Dashboard Routes

```
app/dashboard/
├── layout.tsx                  ← expanded sidebar + auth guard
├── page.tsx                    ← Overview (stats, quick links)
├── bookings/
│   └── page.tsx                ← Reservations table
├── fleet/
│   ├── page.tsx                ← Car list (replaces fleet customizer)
│   └── [carId]/page.tsx        ← Car edit form
├── maintenance/
│   └── page.tsx                ← Maintenance records
├── finance/
│   ├── expenses/page.tsx
│   ├── reports/page.tsx
│   └── roi/page.tsx
├── clients/
│   ├── customers/page.tsx
│   └── consignments/page.tsx
├── team/
│   └── page.tsx                ← Users + permissions
└── integrations/
    └── turo/page.tsx
```

### Tenant Fleet Routes

```
app/sites/[slug]/
├── layout.tsx                  ← tenant branding context (existing, unchanged)
├── page.tsx                    ← fleet listing (full redesign + generateMetadata)
└── [carId]/
    └── page.tsx                ← car detail (full redesign + generateMetadata)
```

---

## Sidebar Navigation

The dashboard sidebar replaces the current flat 11-tab navigation with 6 grouped sections. Built in `dashboard/layout.tsx` using `usePathname()` for active state.

| Group | Pages |
|---|---|
| **Overview** | `/dashboard` |
| **Operations** | Bookings `/dashboard/bookings`, Cars `/dashboard/fleet`, Maintenance `/dashboard/maintenance` |
| **Finance** | Expenses `/dashboard/finance/expenses`, Reports `/dashboard/finance/reports`, ROI `/dashboard/finance/roi` |
| **Clients** | Customers `/dashboard/clients/customers`, Consignments `/dashboard/clients/consignments` |
| **Team** | `/dashboard/team` |
| **Integrations** | Turo `/dashboard/integrations/turo` |

Groups are collapsible. On mobile the sidebar becomes a drawer. Role-based visibility (finance/staff roles) is read from the `profiles` table in the layout and passed as props to the Sidebar component.

---

## Shared Dashboard Components

```
components/dashboard/
├── Sidebar.tsx             ← grouped nav, collapse/expand, mobile drawer
├── SidebarGroup.tsx        ← collapsible group with child links
├── PageHeader.tsx          ← page title + action button slot
├── DataTable.tsx           ← reusable sortable/filterable table
└── StatCard.tsx            ← metric card for Overview page
```

---

## Data Fetching Pattern

All dashboard pages are Server Components. Client Components handle interactivity only.

```
page.tsx (Server Component)
  └── fetches data from Supabase server client
  └── passes data to Client Component (table, form)
        └── Client Component handles UI interactions
              └── Server Action handles mutations (create, update, delete)
```

Supabase clients:
- `lib/supabase/server.ts` — used in Server Components and Server Actions
- `lib/supabase/client.ts` — used in Client Components

---

## Tenant Fleet Pages

### Fleet Listing (`app/sites/[slug]/page.tsx`)

- `generateMetadata()` returns: title `{Tenant Name} — Fleet`, description from tenant tagline or default, OG image from tenant logo
- Server Component fetches tenant record + cars (tenant-scoped via RLS)
- `<FleetGrid>` Client Component: car cards with filter/search
- Empty state if tenant has 0 cars: "Fleet coming soon"

### Car Detail (`app/sites/[slug]/[carId]/page.tsx`)

- `generateMetadata()` returns: title `{Car Name} — {Tenant Name}`, description from car description or auto-generated from specs, OG image from first car photo
- Canonical URL: `https://{slug}.epuredrive.com/{carId}`
- Server Component fetches car + tenant
- `<CarDetailView>` Client Component: image gallery, specs grid, booking CTA button
- Car images: prefix DB relative paths (`assets/images/...`) with `/` for Next.js public folder resolution

---

## Error Handling

### Dashboard
- Expired/missing session → redirect to `/login` in `dashboard/layout.tsx`
- Empty table states → `<EmptyState>` component with relevant CTA per page
- Failed Server Action mutations → typed error return, inline toast in Client Component
- Role-based nav hiding → computed in layout from `profiles.role`, no client-side CSS hacks

### Tenant Fleet
- Unknown slug → `notFound()` → Next.js 404 page
- Tenant with 0 cars → friendly empty state component
- Missing car photo → fallback to `/public/assets/images/placeholder.jpg`
- Tenant with no branding → fall back to éPure Drive defaults (name, accent color)

---

## Visual Design

- **Sidebar:** dark background, matching existing `admin/dashboard.html` color scheme
- **Components:** Tailwind CSS + shadcn/ui (already installed in Phase 1)
- **Tenant fleet:** full redesign matching the quality of existing `fleet.html` and `car-detail.html`, responsive

---

## Testing

- Existing unit test for slug extraction: `__tests__/routing.test.ts` (unchanged)
- Server Action tests: create booking, update car, delete car
- Playwright E2E:
  - Dashboard: login → view bookings → add a car
  - Fleet: visit tenant subdomain → view car detail

---

## What Is NOT Changing in Phase 2

- Supabase schema (no new tables or columns)
- Netlify functions (Stripe, iCal, Gmail — untouched)
- Existing RLS policies
- Marketing site `(marketing)/` routes
- `middleware.ts` subdomain router

---

## Out of Scope (Phase 3)

- Checkout + booking flow in Next.js (replacing `checkout.html`)
- Fleet customizer expansion (brand colors, fonts, custom domain support)
- Superadmin panel migration (`admin/superadmin.html`)
- Marketing site growth features (tenant showcase, blog, referral)
- Stripe per-tenant (connect accounts vs platform fee)
