# Next.js Migration — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the existing vanilla HTML/JS rental app to Next.js 14 (App Router), shipping a SaaS marketing site, per-tenant public fleet pages, and a dashboard entry with fleet customizer — ready for first signups in April 2026.

**Architecture:** Next.js middleware reads the hostname on every request and rewrites subdomain requests (`{slug}.epuredrive.com`) to `/_sites/[slug]/` routes. The main domain serves the marketing site via the `(marketing)` route group. Dashboard routes are auth-guarded server-side. The existing Netlify functions (Stripe, iCal, Gmail) are untouched.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, `@supabase/ssr`, Netlify Next.js Plugin

---

## Key Constants (referenced throughout)

- **éPure Drive tenant ID:** `8be5b928-ca59-4b29-a34b-75b18c9273db`
- **éPure Drive slug:** `ayrtonn-lg-1774229361678`
- **Supabase URL:** `https://brwzjwbpguiignrxvjdc.supabase.co`
- **Supabase anon key:** `sb_publishable_krEuIpNhJVcADIUyBXYy9g_fiXrXzV9`
- **create-tenant function:** `/.netlify/functions/create-tenant`
- **Image URL note:** Cars in DB store relative paths like `assets/images/Audi A3/car_1.jpg`. Prefix with `/` when rendering in Next.js (images will live in `public/assets/`).

---

## File Map

| File | Purpose |
|------|---------|
| `middleware.ts` | Subdomain router — rewrites `{slug}.epuredrive.com` to `/_sites/{slug}/` |
| `lib/utils/routing.ts` | Pure function to extract tenant slug from hostname (testable) |
| `lib/supabase/server.ts` | Supabase client for Server Components |
| `lib/supabase/client.ts` | Supabase client for Client Components |
| `lib/supabase/types.ts` | TypeScript types for Tenant, Car |
| `app/(marketing)/layout.tsx` | Marketing site shell (navbar, fonts) |
| `app/(marketing)/page.tsx` | Hero + pricing section |
| `app/(marketing)/sign-up/page.tsx` | Tenant registration |
| `app/(marketing)/login/page.tsx` | Auth login |
| `app/_sites/[slug]/layout.tsx` | Loads tenant from DB by slug, provides context |
| `app/_sites/[slug]/page.tsx` | Public fleet listing |
| `app/_sites/[slug]/[carId]/page.tsx` | Car detail page |
| `app/dashboard/layout.tsx` | Auth guard — redirects to /login if no session |
| `app/dashboard/page.tsx` | Dashboard overview (welcome, stats, link to old dashboard) |
| `app/dashboard/fleet/page.tsx` | Fleet customizer + éPure Drive preview iframe |
| `app/api/seed-sample-car/route.ts` | Seeds 1 sample car for new tenants with 0 cars |
| `components/CarCard.tsx` | Reusable car card for fleet listing |
| `components/FleetPreview.tsx` | iframe wrapper showing éPure Drive's live fleet page |
| `components/SignUpForm.tsx` | Client component — sign-up form |
| `components/LoginForm.tsx` | Client component — login form |
| `netlify.toml` | Updated for Next.js build |
| `__tests__/routing.test.ts` | Unit tests for slug extraction logic |

---

## Task 1: Initialize Next.js in the existing repo

**Files:**
- Create: `package.json` (replace), `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.mjs`, `app/globals.css`, `app/layout.tsx`

- [ ] **Step 1: Back up existing package.json**

```bash
cp "package.json" "package.json.bak"
```

- [ ] **Step 2: Initialize Next.js 14**

Run in the repo root. When prompted "Would you like to proceed?", answer `y`. Accept all defaults — TypeScript: Yes, ESLint: Yes, Tailwind: Yes, `src/` dir: No, App Router: Yes, import alias: `@/*`.

```bash
npx create-next-app@14 . --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*"
```

- [ ] **Step 3: Re-add imapflow to package.json**

Open `package.json` and add `imapflow` back under `dependencies`:

```json
"imapflow": "^1.0.0"
```

- [ ] **Step 4: Install Supabase SSR packages**

```bash
npm install @supabase/ssr @supabase/supabase-js
```

- [ ] **Step 5: Install Jest + React Testing Library**

```bash
npm install -D jest jest-environment-jsdom @testing-library/react @testing-library/jest-dom ts-jest @types/jest
```

- [ ] **Step 6: Add jest.config.ts to project root**

```typescript
// jest.config.ts
import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  setupFilesAfterFramework: ['<rootDir>/jest.setup.ts'],
}

export default createJestConfig(config)
```

- [ ] **Step 7: Add jest.setup.ts**

```typescript
// jest.setup.ts
import '@testing-library/jest-dom'
```

- [ ] **Step 8: Add test script to package.json**

In `package.json`, add to `scripts`:

```json
"test": "jest",
"test:watch": "jest --watch"
```

- [ ] **Step 9: Remove Next.js default boilerplate**

Replace `app/globals.css` with just Tailwind directives:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Replace `app/page.tsx` with a placeholder (will be replaced in Task 6):

```tsx
export default function Home() {
  return <div>Loading...</div>
}
```

- [ ] **Step 10: Add .superpowers to .gitignore**

Open `.gitignore` and add:

```
.superpowers/
```

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: initialize Next.js 14 with TypeScript, Tailwind, and Supabase"
```

---

## Task 2: Move static assets and preserve coexistence files

**Files:**
- Modify: `public/` (new directory contents)

- [ ] **Step 1: Copy assets into public/**

```bash
cp -r assets public/assets
cp favicon.svg public/favicon.svg
```

- [ ] **Step 2: Copy admin dashboard for coexistence**

```bash
mkdir -p public/admin
cp admin/dashboard.html public/admin/dashboard.html
cp -r admin/js public/admin/js
```

- [ ] **Step 3: Copy static legal pages**

```bash
cp terms.html public/terms.html
cp privacy.html public/privacy.html
cp rental-agreement.html public/rental-agreement.html
cp consignment.html public/consignment.html
```

- [ ] **Step 4: Verify assets are accessible**

Start the dev server and confirm `http://localhost:3000/assets/images/Audi%20A3/car_1.jpg` returns an image.

```bash
npm run dev
# In browser: http://localhost:3000/assets/images/Audi%20A3/car_1.jpg
```

Expected: image loads.

- [ ] **Step 5: Commit**

```bash
git add public/
git commit -m "chore: copy static assets and coexistence files into public/"
```

---

## Task 3: Update netlify.toml for Next.js

**Files:**
- Modify: `netlify.toml`

- [ ] **Step 1: Install Netlify Next.js plugin**

```bash
npm install -D @netlify/plugin-nextjs
```

- [ ] **Step 2: Replace netlify.toml build section**

Replace the entire `[build]` section and edge function config with:

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"

[functions]
  directory = "netlify/functions"
```

Keep all existing `[[headers]]` blocks and the `[functions.sync-ical-cron]` and `[functions.poll-turo-emails]` schedule blocks.

Remove the old edge function block:
```toml
# REMOVE these lines:
[[edge_functions]]
  path = "/*"
  function = "subdomain-rewrite"
```

The Netlify edge function directory can also be removed from `[build]` — Next.js middleware replaces it.

- [ ] **Step 3: Verify build config**

```bash
npm run build
```

Expected: build completes with no errors. `.next/` directory created.

- [ ] **Step 4: Commit**

```bash
git add netlify.toml package.json package-lock.json
git commit -m "chore: configure Netlify Next.js plugin and update build settings"
```

---

## Task 4: Supabase client utilities and types

**Files:**
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/types.ts`

- [ ] **Step 1: Create lib/supabase/types.ts**

```typescript
// lib/supabase/types.ts

export interface Tenant {
  id: string
  name: string
  slug: string
  plan: string | null
  logo_url: string | null
  primary_color: string | null
  accent_color: string | null
  brand_name: string | null
}

export interface Car {
  id: number
  make: string
  model: string
  model_full: string | null
  year: number | null
  daily_rate: number | null
  image_url: string | null
  gallery: string[] | null
  category: string | null
  badge: string | null
  seats: number | null
  transmission: string | null
  hp: string | null
  features: string[] | null
  description: string | null
  tenant_id: string | null
  status: string | null
}
```

- [ ] **Step 2: Create lib/supabase/server.ts**

```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

- [ ] **Step 3: Create lib/supabase/client.ts**

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 4: Add environment variables to .env.local**

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://brwzjwbpguiignrxvjdc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_krEuIpNhJVcADIUyBXYy9g_fiXrXzV9
EPUREDRIVE_TENANT_SLUG=ayrtonn-lg-1774229361678
```

- [ ] **Step 5: Add .env.local to .gitignore** (verify it's already there from create-next-app)

```bash
grep ".env.local" .gitignore
```

Expected: `.env.local` appears. If not, add it.

- [ ] **Step 6: Set env vars in Netlify** (so production also has them)

```bash
curl -s -X POST \
  "https://api.netlify.com/api/v1/accounts/5f56928be319ee80a35d7d89/env?site_id=aca8175e-457e-4e87-b38b-1c5ca1e03dc8" \
  -H "Authorization: Bearer nfp_bFdMPn4ARKz2d9ArL8CdHZMKG7wZF6FU28d4" \
  -H "Content-Type: application/json" \
  -d '[
    {"key":"NEXT_PUBLIC_SUPABASE_URL","values":[{"context":"all","value":"https://brwzjwbpguiignrxvjdc.supabase.co"}]},
    {"key":"NEXT_PUBLIC_SUPABASE_ANON_KEY","values":[{"context":"all","value":"sb_publishable_krEuIpNhJVcADIUyBXYy9g_fiXrXzV9"}]},
    {"key":"EPUREDRIVE_TENANT_SLUG","values":[{"context":"all","value":"ayrtonn-lg-1774229361678"}]}
  ]'
```

- [ ] **Step 7: Commit**

```bash
git add lib/ .env.local
git commit -m "feat: add Supabase client utilities and TypeScript types"
```

---

## Task 5: Routing utility and middleware

**Files:**
- Create: `lib/utils/routing.ts`
- Create: `middleware.ts`
- Create: `__tests__/routing.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/routing.test.ts
import { getTenantSlug } from '../lib/utils/routing'

describe('getTenantSlug', () => {
  it('returns slug for valid subdomain', () => {
    expect(getTenantSlug('myfleet.epuredrive.com')).toBe('myfleet')
  })

  it('returns slug with hyphens', () => {
    expect(getTenantSlug('ayrtonn-lg-1774229361678.epuredrive.com')).toBe('ayrtonn-lg-1774229361678')
  })

  it('returns null for main domain', () => {
    expect(getTenantSlug('epuredrive.com')).toBeNull()
  })

  it('returns null for www', () => {
    expect(getTenantSlug('www.epuredrive.com')).toBeNull()
  })

  it('returns null for reserved subdomains', () => {
    expect(getTenantSlug('admin.epuredrive.com')).toBeNull()
    expect(getTenantSlug('app.epuredrive.com')).toBeNull()
    expect(getTenantSlug('api.epuredrive.com')).toBeNull()
  })

  it('returns null for localhost', () => {
    expect(getTenantSlug('localhost:3000')).toBeNull()
  })

  it('returns null for unrelated domain', () => {
    expect(getTenantSlug('example.com')).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --testPathPattern=routing
```

Expected: FAIL — `getTenantSlug` not found.

- [ ] **Step 3: Create lib/utils/routing.ts**

```typescript
// lib/utils/routing.ts
const RESERVED = ['www', 'admin', 'app', 'api']

export function getTenantSlug(host: string): string | null {
  // Strip port if present (e.g. localhost:3000)
  const hostname = host.split(':')[0]
  const match = hostname.match(/^([a-z0-9][a-z0-9-]*[a-z0-9])\.epuredrive\.com$/)
  if (match && !RESERVED.includes(match[1])) {
    return match[1]
  }
  return null
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- --testPathPattern=routing
```

Expected: PASS — 7 tests pass.

- [ ] **Step 5: Create middleware.ts**

```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getTenantSlug } from '@/lib/utils/routing'

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? ''
  const slug = getTenantSlug(host)

  if (slug) {
    const url = request.nextUrl.clone()
    // Rewrite /{anything} on subdomain → /_sites/{slug}/{anything}
    url.pathname = `/_sites/${slug}${url.pathname === '/' ? '' : url.pathname}`
    return NextResponse.rewrite(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Skip Next.js internals, static files, and API routes
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

- [ ] **Step 6: Commit**

```bash
git add middleware.ts lib/utils/ __tests__/
git commit -m "feat: add subdomain routing middleware with unit tests"
```

---

## Task 6: Marketing site layout and hero page

**Files:**
- Create: `app/(marketing)/layout.tsx`
- Create: `app/(marketing)/page.tsx`
- Delete: `app/page.tsx` (the placeholder from Task 1)

- [ ] **Step 1: Create app/(marketing)/layout.tsx**

```tsx
// app/(marketing)/layout.tsx
import type { Metadata } from 'next'
import { Outfit } from 'next/font/google'
import '../globals.css'

const outfit = Outfit({ subsets: ['latin'], weight: ['400', '600', '700'] })

export const metadata: Metadata = {
  title: 'éPure Drive Platform — Fleet Pages for Car Rental Businesses',
  description: 'Get your own branded fleet page in minutes. Built for car rental operators.',
}

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={outfit.className}>
        <nav className="fixed top-0 w-full z-50 bg-[#0a0a0a]/90 backdrop-blur border-b border-white/10">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2">
              <img src="/assets/logo.png" alt="éPure Drive" className="h-8" />
            </a>
            <div className="flex items-center gap-4">
              <a href="/login" className="text-sm text-white/70 hover:text-white transition-colors">
                Sign in
              </a>
              <a
                href="/sign-up"
                className="text-sm bg-white text-black font-semibold px-4 py-2 rounded-lg hover:bg-white/90 transition-colors"
              >
                Get started
              </a>
            </div>
          </div>
        </nav>
        <main className="pt-16">{children}</main>
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Remove placeholder app/page.tsx**

```bash
rm app/page.tsx
```

- [ ] **Step 3: Create app/(marketing)/page.tsx**

```tsx
// app/(marketing)/page.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'éPure Drive Platform — Your Fleet Page, Live in Minutes',
}

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="min-h-[90vh] bg-[#0a0a0a] flex items-center">
        <div className="max-w-6xl mx-auto px-6 py-24 text-center">
          <span className="inline-block text-xs font-semibold tracking-widest text-white/50 uppercase mb-6">
            Fleet Pages for Car Rental Operators
          </span>
          <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight mb-6">
            Your fleet.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/40">
              Online in minutes.
            </span>
          </h1>
          <p className="text-lg text-white/60 max-w-2xl mx-auto mb-10">
            Get a branded public page for your rental fleet — with availability, pricing, and direct bookings.
            No coding required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/sign-up"
              className="bg-white text-black font-semibold px-8 py-4 rounded-xl text-base hover:bg-white/90 transition-colors"
            >
              Start for free →
            </a>
            <a
              href={`https://${process.env.EPUREDRIVE_TENANT_SLUG}.epuredrive.com`}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-white/20 text-white font-semibold px-8 py-4 rounded-xl text-base hover:border-white/40 transition-colors"
            >
              See a live example
            </a>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-[#111] py-24" id="pricing">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Simple pricing</h2>
          <p className="text-white/50 mb-16">Start free. Upgrade when you grow.</p>
          <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
            {/* Free plan */}
            <div className="border border-white/10 rounded-2xl p-8 text-left bg-[#0a0a0a]">
              <div className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-2">Free</div>
              <div className="text-4xl font-bold text-white mb-1">$0</div>
              <div className="text-white/40 text-sm mb-8">forever</div>
              <ul className="space-y-3 text-sm text-white/70 mb-8">
                <li>✓ 1 branded fleet page</li>
                <li>✓ Up to 5 cars</li>
                <li>✓ {'{slug}'}.epuredrive.com subdomain</li>
                <li>✓ Availability calendar</li>
              </ul>
              <a
                href="/sign-up"
                className="block text-center border border-white/20 text-white font-semibold px-6 py-3 rounded-xl text-sm hover:border-white/40 transition-colors"
              >
                Get started
              </a>
            </div>
            {/* Pro plan */}
            <div className="border border-white rounded-2xl p-8 text-left bg-[#0a0a0a] relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-black text-xs font-bold px-3 py-1 rounded-full">
                COMING SOON
              </div>
              <div className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-2">Pro</div>
              <div className="text-4xl font-bold text-white mb-1">$49</div>
              <div className="text-white/40 text-sm mb-8">/ month</div>
              <ul className="space-y-3 text-sm text-white/70 mb-8">
                <li>✓ Everything in Free</li>
                <li>✓ Unlimited cars</li>
                <li>✓ Custom domain</li>
                <li>✓ Brand colors & logo</li>
                <li>✓ Direct Stripe payments</li>
              </ul>
              <button
                disabled
                className="w-full text-center bg-white text-black font-semibold px-6 py-3 rounded-xl text-sm opacity-50 cursor-not-allowed"
              >
                Coming soon
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
```

- [ ] **Step 4: Verify page renders**

```bash
npm run dev
# Visit http://localhost:3000
```

Expected: dark marketing page with hero and pricing sections renders.

- [ ] **Step 5: Commit**

```bash
git add app/
git commit -m "feat: add marketing site layout and hero/pricing page"
```

---

## Task 7: Sign-up page

**Files:**
- Create: `app/(marketing)/sign-up/page.tsx`
- Create: `components/SignUpForm.tsx`

- [ ] **Step 1: Create components/SignUpForm.tsx**

```tsx
// components/SignUpForm.tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function SignUpForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const form = new FormData(e.currentTarget)
    const email = form.get('email') as string
    const password = form.get('password') as string
    const company = form.get('company') as string

    const supabase = createClient()

    // 1 — Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password })
    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    const userId = authData.user?.id
    if (!userId) {
      setError('Sign up failed — no user ID returned.')
      setLoading(false)
      return
    }

    // 2 — Create tenant via existing Netlify function
    const res = await fetch('/.netlify/functions/create-tenant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, email, company }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Failed to create your account.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      <div>
        <label htmlFor="company" className="block text-sm text-white/60 mb-1">Company name</label>
        <input
          id="company"
          name="company"
          type="text"
          required
          placeholder="Miami Luxury Rentals"
          className="w-full bg-white/5 border border-white/10 text-white placeholder:text-white/30 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-white/30"
        />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm text-white/60 mb-1">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="you@yourcompany.com"
          className="w-full bg-white/5 border border-white/10 text-white placeholder:text-white/30 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-white/30"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm text-white/60 mb-1">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          placeholder="Min. 8 characters"
          className="w-full bg-white/5 border border-white/10 text-white placeholder:text-white/30 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-white/30"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-white text-black font-semibold py-3 rounded-lg text-sm hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Creating account…' : 'Create your fleet page →'}
      </button>
      <p className="text-center text-xs text-white/30">
        Already have an account?{' '}
        <a href="/login" className="text-white/60 hover:text-white transition-colors">Sign in</a>
      </p>
    </form>
  )
}
```

- [ ] **Step 2: Create app/(marketing)/sign-up/page.tsx**

```tsx
// app/(marketing)/sign-up/page.tsx
import type { Metadata } from 'next'
import SignUpForm from '@/components/SignUpForm'

export const metadata: Metadata = { title: 'Sign Up — éPure Drive Platform' }

export default function SignUpPage() {
  return (
    <section className="min-h-[90vh] bg-[#0a0a0a] flex items-center justify-center">
      <div className="w-full max-w-md px-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Get your fleet page</h1>
          <p className="text-white/50 text-sm">Free forever. Live in minutes.</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
          <SignUpForm />
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Verify sign-up form renders**

```bash
npm run dev
# Visit http://localhost:3000/sign-up
```

Expected: sign-up form with company, email, password fields renders without errors.

- [ ] **Step 4: Commit**

```bash
git add app/ components/
git commit -m "feat: add sign-up page with tenant creation"
```

---

## Task 8: Login page

**Files:**
- Create: `app/(marketing)/login/page.tsx`
- Create: `components/LoginForm.tsx`

- [ ] **Step 1: Create components/LoginForm.tsx**

```tsx
// components/LoginForm.tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const form = new FormData(e.currentTarget)
    const email = form.get('email') as string
    const password = form.get('password') as string

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      <div>
        <label htmlFor="email" className="block text-sm text-white/60 mb-1">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="w-full bg-white/5 border border-white/10 text-white placeholder:text-white/30 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-white/30"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm text-white/60 mb-1">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          className="w-full bg-white/5 border border-white/10 text-white placeholder:text-white/30 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-white/30"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-white text-black font-semibold py-3 rounded-lg text-sm hover:bg-white/90 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Signing in…' : 'Sign in →'}
      </button>
      <p className="text-center text-xs text-white/30">
        Don&apos;t have an account?{' '}
        <a href="/sign-up" className="text-white/60 hover:text-white transition-colors">Sign up free</a>
      </p>
    </form>
  )
}
```

- [ ] **Step 2: Create app/(marketing)/login/page.tsx**

```tsx
// app/(marketing)/login/page.tsx
import type { Metadata } from 'next'
import LoginForm from '@/components/LoginForm'

export const metadata: Metadata = { title: 'Sign In — éPure Drive Platform' }

export default function LoginPage() {
  return (
    <section className="min-h-[90vh] bg-[#0a0a0a] flex items-center justify-center">
      <div className="w-full max-w-md px-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Welcome back</h1>
          <p className="text-white/50 text-sm">Sign in to manage your fleet</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
          <LoginForm />
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Verify login form renders**

```bash
# Visit http://localhost:3000/login
```

Expected: login form renders.

- [ ] **Step 4: Commit**

```bash
git add app/ components/
git commit -m "feat: add login page"
```

---

## Task 9: Tenant fleet layout (server-side tenant resolution)

**Files:**
- Create: `app/_sites/[slug]/layout.tsx`

- [ ] **Step 1: Create app/_sites/[slug]/layout.tsx**

This layout runs as a server component, loads the tenant from Supabase by slug, and passes it to children via props. If no tenant is found for the slug, it returns a 404.

```tsx
// app/_sites/[slug]/layout.tsx
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Tenant } from '@/lib/supabase/types'
import type { Metadata } from 'next'

interface Props {
  children: React.ReactNode
  params: { slug: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createClient()
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, brand_name')
    .eq('slug', params.slug)
    .single()

  const displayName = tenant?.brand_name || tenant?.name || 'Fleet'
  return {
    title: `${displayName} — Fleet`,
    description: `Browse available vehicles from ${displayName}.`,
  }
}

export default async function TenantLayout({ children, params }: Props) {
  const supabase = createClient()
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, slug, logo_url, brand_name, primary_color, accent_color')
    .eq('slug', params.slug)
    .single()

  if (!tenant) notFound()

  const displayName = (tenant as Tenant).brand_name || (tenant as Tenant).name

  return (
    <html lang="en">
      <body className="bg-[#0a0a0a] text-white min-h-screen">
        <nav className="sticky top-0 z-50 bg-[#0a0a0a]/90 backdrop-blur border-b border-white/10">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {(tenant as Tenant).logo_url ? (
                <img src={(tenant as Tenant).logo_url!} alt={displayName} className="h-8 object-contain" />
              ) : (
                <span className="font-bold text-lg text-white">{displayName}</span>
              )}
            </div>
            <a
              href="#cars"
              className="text-sm bg-white text-black font-semibold px-4 py-2 rounded-lg hover:bg-white/90 transition-colors"
            >
              View Fleet
            </a>
          </div>
        </nav>
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/_sites/
git commit -m "feat: add tenant layout with server-side slug resolution"
```

---

## Task 10: Tenant fleet listing page and CarCard component

**Files:**
- Create: `app/_sites/[slug]/page.tsx`
- Create: `components/CarCard.tsx`

- [ ] **Step 1: Create components/CarCard.tsx**

```tsx
// components/CarCard.tsx
import type { Car } from '@/lib/supabase/types'

interface Props {
  car: Car
  slug: string
}

function resolveImageUrl(url: string | null): string {
  if (!url) return '/assets/images/placeholder.jpg'
  // DB stores relative paths like "assets/images/..." — prefix with /
  if (url.startsWith('http')) return url
  return `/${url}`
}

export default function CarCard({ car, slug }: Props) {
  return (
    <a
      href={`/_sites/${slug}/${car.id}`}
      className="group block bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all hover:-translate-y-1"
    >
      <div className="aspect-[16/9] overflow-hidden bg-white/5">
        <img
          src={resolveImageUrl(car.image_url)}
          alt={`${car.make} ${car.model}`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>
      <div className="p-5">
        {car.badge && (
          <span className="inline-block text-xs font-semibold text-black bg-white px-2 py-0.5 rounded-full mb-2">
            {car.badge}
          </span>
        )}
        <h3 className="font-bold text-white text-lg leading-tight">
          {car.make} {car.model_full || car.model}
        </h3>
        <div className="flex gap-3 text-xs text-white/50 mt-1 mb-3">
          {car.year && <span>{car.year}</span>}
          {car.seats && <span>{car.seats} seats</span>}
          {car.transmission && <span>{car.transmission}</span>}
        </div>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xl font-bold text-white">
              ${car.daily_rate ? Number(car.daily_rate).toFixed(0) : '—'}
            </span>
            <span className="text-white/40 text-sm"> / day</span>
          </div>
          <span className="text-xs font-semibold text-white bg-white/10 px-3 py-1.5 rounded-lg group-hover:bg-white/20 transition-colors">
            View →
          </span>
        </div>
      </div>
    </a>
  )
}
```

- [ ] **Step 2: Create app/_sites/[slug]/page.tsx**

```tsx
// app/_sites/[slug]/page.tsx
import { createClient } from '@/lib/supabase/server'
import CarCard from '@/components/CarCard'
import type { Car, Tenant } from '@/lib/supabase/types'

interface Props {
  params: { slug: string }
}

export default async function TenantFleetPage({ params }: Props) {
  const supabase = createClient()

  // Load tenant
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, brand_name')
    .eq('slug', params.slug)
    .single()

  if (!tenant) return null // layout handles 404

  // Load tenant's active cars
  const { data: cars } = await supabase
    .from('cars')
    .select('id, make, model, model_full, year, daily_rate, image_url, category, badge, seats, transmission, hp, description, tenant_id, status')
    .eq('tenant_id', (tenant as Tenant).id)
    .neq('status', 'retired')
    .order('id')

  const displayName = (tenant as Tenant).brand_name || (tenant as Tenant).name

  return (
    <div id="cars" className="max-w-6xl mx-auto px-6 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white mb-2">Our Fleet</h1>
        <p className="text-white/50">
          {cars?.length ?? 0} vehicle{cars?.length !== 1 ? 's' : ''} available from {displayName}
        </p>
      </div>

      {cars && cars.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {cars.map((car) => (
            <CarCard key={car.id} car={car as Car} slug={params.slug} />
          ))}
        </div>
      ) : (
        <div className="text-center py-24 text-white/30">
          <p className="text-lg">No vehicles listed yet.</p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify tenant fleet page works locally**

To test locally, temporarily bypass the middleware by visiting `/_sites/ayrtonn-lg-1774229361678` directly (middleware only rewrites subdomains in production).

```bash
# Visit: http://localhost:3000/_sites/ayrtonn-lg-1774229361678
```

Expected: fleet page renders with éPure Drive's cars.

- [ ] **Step 4: Commit**

```bash
git add app/_sites/ components/CarCard.tsx
git commit -m "feat: add tenant fleet listing page with CarCard component"
```

---

## Task 11: Car detail page

**Files:**
- Create: `app/_sites/[slug]/[carId]/page.tsx`

- [ ] **Step 1: Create app/_sites/[slug]/[carId]/page.tsx**

```tsx
// app/_sites/[slug]/[carId]/page.tsx
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Car, Tenant } from '@/lib/supabase/types'

interface Props {
  params: { slug: string; carId: string }
}

function resolveImageUrl(url: string | null): string {
  if (!url) return '/assets/images/placeholder.jpg'
  if (url.startsWith('http')) return url
  return `/${url}`
}

export default async function CarDetailPage({ params }: Props) {
  const supabase = createClient()

  // Verify tenant exists
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, brand_name')
    .eq('slug', params.slug)
    .single()

  if (!tenant) notFound()

  // Load car — must belong to this tenant
  const { data: car } = await supabase
    .from('cars')
    .select('*')
    .eq('id', Number(params.carId))
    .eq('tenant_id', (tenant as Tenant).id)
    .single()

  if (!car) notFound()

  const c = car as Car
  const gallery: string[] = Array.isArray(c.gallery) ? c.gallery : []

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <a href="javascript:history.back()" className="text-white/40 text-sm hover:text-white mb-8 inline-block transition-colors">
        ← Back to fleet
      </a>

      <div className="grid md:grid-cols-2 gap-10 mt-4">
        {/* Gallery */}
        <div className="space-y-3">
          <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-white/5">
            <img
              src={resolveImageUrl(c.image_url)}
              alt={`${c.make} ${c.model}`}
              className="w-full h-full object-cover"
            />
          </div>
          {gallery.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {gallery.slice(0, 4).map((img, i) => (
                <div key={i} className="aspect-square rounded-lg overflow-hidden bg-white/5">
                  <img src={resolveImageUrl(img)} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">
            {c.make} {c.model_full || c.model}
          </h1>
          <div className="flex gap-3 text-sm text-white/50 mb-6">
            {c.year && <span>{c.year}</span>}
            {c.category && <span className="capitalize">{c.category}</span>}
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            {c.seats && (
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-white">{c.seats}</div>
                <div className="text-xs text-white/40">Seats</div>
              </div>
            )}
            {c.transmission && (
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-white">{c.transmission}</div>
                <div className="text-xs text-white/40">Trans.</div>
              </div>
            )}
            {c.hp && (
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-white">{c.hp}</div>
                <div className="text-xs text-white/40">Power</div>
              </div>
            )}
          </div>

          {c.description && (
            <p className="text-white/60 text-sm leading-relaxed mb-6">{c.description}</p>
          )}

          <div className="flex items-baseline gap-2 mb-6">
            <span className="text-4xl font-bold text-white">
              ${c.daily_rate ? Number(c.daily_rate).toFixed(0) : '—'}
            </span>
            <span className="text-white/40">/ day</span>
          </div>

          {/* Booking CTA — links to existing reservation flow */}
          <a
            href={`/reservation.html?car=${c.id}`}
            className="block w-full text-center bg-white text-black font-semibold py-4 rounded-xl hover:bg-white/90 transition-colors"
          >
            Book this car →
          </a>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify car detail page works**

```bash
# Visit: http://localhost:3000/_sites/ayrtonn-lg-1774229361678/2
```

Expected: 2017 Audi A3 detail page renders with gallery, specs, and booking button.

- [ ] **Step 3: Commit**

```bash
git add app/_sites/
git commit -m "feat: add car detail page for tenant fleet"
```

---

## Task 12: Dashboard layout with auth guard

**Files:**
- Create: `app/dashboard/layout.tsx`

- [ ] **Step 1: Create app/dashboard/layout.tsx**

```tsx
// app/dashboard/layout.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Outfit } from 'next/font/google'
import '../globals.css'

const outfit = Outfit({ subsets: ['latin'], weight: ['400', '600', '700'] })

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Load profile + tenant
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id, role, full_name')
    .eq('id', user.id)
    .single()

  const tenantId = profile?.tenant_id

  return (
    <html lang="en">
      <body className={`${outfit.className} bg-[#0d0d0d] text-white min-h-screen`}>
        <div className="flex h-screen overflow-hidden">
          {/* Sidebar */}
          <aside className="w-56 bg-[#111] border-r border-white/10 flex flex-col shrink-0">
            <div className="h-16 flex items-center px-5 border-b border-white/10">
              <img src="/assets/logo.png" alt="éPure Drive" className="h-7" />
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1">
              <a href="/dashboard" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors">
                Overview
              </a>
              <a href="/dashboard/fleet" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors">
                Fleet Page
              </a>
              <a href="/admin/dashboard.html" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors">
                Full Dashboard ↗
              </a>
            </nav>
            <div className="px-5 py-4 border-t border-white/10">
              <p className="text-xs text-white/30 truncate">{user.email}</p>
            </div>
          </aside>

          {/* Main */}
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Verify redirect works for unauthenticated users**

```bash
# Visit: http://localhost:3000/dashboard (not logged in)
```

Expected: redirected to `/login`.

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/
git commit -m "feat: add dashboard layout with auth guard and sidebar"
```

---

## Task 13: Dashboard overview page

**Files:**
- Create: `app/dashboard/page.tsx`

- [ ] **Step 1: Create app/dashboard/page.tsx**

```tsx
// app/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server'
import type { Tenant } from '@/lib/supabase/types'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user!.id)
    .single()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, slug, brand_name, logo_url')
    .eq('id', profile!.tenant_id)
    .single()

  const { count: carCount } = await supabase
    .from('cars')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', profile!.tenant_id)

  const t = tenant as Tenant
  const displayName = t.brand_name || t.name
  const fleetUrl = `https://${t.slug}.epuredrive.com`

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-white mb-1">Welcome, {displayName}</h1>
      <p className="text-white/40 text-sm mb-8">Here&apos;s your fleet at a glance.</p>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="text-3xl font-bold text-white">{carCount ?? 0}</div>
          <div className="text-sm text-white/40 mt-1">Cars listed</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="text-3xl font-bold text-white">—</div>
          <div className="text-sm text-white/40 mt-1">Views this month</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 md:col-span-1 col-span-2">
          <div className="text-sm font-semibold text-white mb-2">Your fleet page</div>
          <a
            href={fleetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-white/50 hover:text-white transition-colors break-all"
          >
            {fleetUrl} ↗
          </a>
        </div>
      </div>

      {/* CTAs */}
      <div className="grid md:grid-cols-2 gap-4">
        <a
          href="/dashboard/fleet"
          className="block bg-white/5 border border-white/10 hover:border-white/20 rounded-2xl p-6 transition-all group"
        >
          <div className="text-lg font-bold text-white mb-1 group-hover:text-white">Customize fleet page →</div>
          <p className="text-sm text-white/40">Edit your logo, name, and listed cars.</p>
        </a>
        <a
          href="/admin/dashboard.html"
          className="block bg-white/5 border border-white/10 hover:border-white/20 rounded-2xl p-6 transition-all group"
        >
          <div className="text-lg font-bold text-white mb-1">Full dashboard →</div>
          <p className="text-sm text-white/40">Manage reservations, calendars, and more.</p>
        </a>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat: add dashboard overview page with stats and navigation"
```

---

## Task 14: Fleet customizer page

**Files:**
- Create: `app/dashboard/fleet/page.tsx`
- Create: `components/FleetPreview.tsx`
- Create: `app/api/seed-sample-car/route.ts`

- [ ] **Step 1: Create app/api/seed-sample-car/route.ts**

Seeds 1 car for a new tenant if they have 0 cars. Clones car id=2 (Audi A3) from éPure Drive. Returns `{ seeded: true }` if a car was added, `{ seeded: false }` if cars already existed.

```typescript
// app/api/seed-sample-car/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const EPUREDRIVE_TENANT_ID = '8be5b928-ca59-4b29-a34b-75b18c9273db'
const SAMPLE_CAR_ID = 2 // Audi A3 2017

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) return NextResponse.json({ error: 'No tenant' }, { status: 400 })

  // Only seed if tenant has 0 cars
  const { count } = await supabase
    .from('cars')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', profile.tenant_id)

  if ((count ?? 0) > 0) return NextResponse.json({ seeded: false })

  // Fetch the sample car from éPure Drive
  const { data: source } = await supabase
    .from('cars')
    .select('make, model, model_full, year, daily_rate, image_url, gallery, category, badge, seats, transmission, hp, features, description')
    .eq('id', SAMPLE_CAR_ID)
    .eq('tenant_id', EPUREDRIVE_TENANT_ID)
    .single()

  if (!source) return NextResponse.json({ error: 'Sample car not found' }, { status: 500 })

  await supabase.from('cars').insert({
    ...source,
    tenant_id: profile.tenant_id,
    status: 'active',
    badge: 'Sample',
    notes: 'Sample car — replace or edit to get started',
  })

  return NextResponse.json({ seeded: true })
}
```

- [ ] **Step 2: Create components/FleetPreview.tsx**

```tsx
// components/FleetPreview.tsx
'use client'

const EPUREDRIVE_FLEET_URL = `https://${process.env.NEXT_PUBLIC_EPUREDRIVE_SLUG ?? 'ayrtonn-lg-1774229361678'}.epuredrive.com`

export default function FleetPreview() {
  return (
    <div className="rounded-2xl overflow-hidden border border-white/10 bg-white/5">
      <div className="flex items-center gap-2 px-4 py-3 bg-white/5 border-b border-white/10">
        <div className="flex gap-1.5">
          <span className="w-3 h-3 rounded-full bg-white/20" />
          <span className="w-3 h-3 rounded-full bg-white/20" />
          <span className="w-3 h-3 rounded-full bg-white/20" />
        </div>
        <span className="text-xs text-white/30 ml-2">{EPUREDRIVE_FLEET_URL}</span>
        <a
          href={EPUREDRIVE_FLEET_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-xs text-white/40 hover:text-white transition-colors"
        >
          Open ↗
        </a>
      </div>
      <iframe
        src={EPUREDRIVE_FLEET_URL}
        className="w-full"
        style={{ height: '480px', border: 'none' }}
        title="Example fleet page"
        loading="lazy"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  )
}
```

- [ ] **Step 3: Add NEXT_PUBLIC_EPUREDRIVE_SLUG to .env.local**

```bash
echo "NEXT_PUBLIC_EPUREDRIVE_SLUG=ayrtonn-lg-1774229361678" >> .env.local
```

Also add it to Netlify:

```bash
curl -s -X POST \
  "https://api.netlify.com/api/v1/accounts/5f56928be319ee80a35d7d89/env?site_id=aca8175e-457e-4e87-b38b-1c5ca1e03dc8" \
  -H "Authorization: Bearer nfp_bFdMPn4ARKz2d9ArL8CdHZMKG7wZF6FU28d4" \
  -H "Content-Type: application/json" \
  -d '[{"key":"NEXT_PUBLIC_EPUREDRIVE_SLUG","values":[{"context":"all","value":"ayrtonn-lg-1774229361678"}]}]'
```

- [ ] **Step 4: Create app/dashboard/fleet/page.tsx**

```tsx
// app/dashboard/fleet/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import FleetPreview from '@/components/FleetPreview'
import type { Tenant, Car } from '@/lib/supabase/types'

export default function FleetCustomizerPage() {
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [cars, setCars] = useState<Car[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [brandName, setBrandName] = useState('')
  const [logoUrl, setLogoUrl] = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single()
      if (!profile?.tenant_id) return

      const { data: t } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', profile.tenant_id)
        .single()
      if (t) {
        setTenant(t as Tenant)
        setBrandName(t.brand_name || t.name || '')
        setLogoUrl(t.logo_url || '')
      }

      // Seed sample car if needed
      await fetch('/api/seed-sample-car', { method: 'POST' })

      const { data: carRows } = await supabase
        .from('cars')
        .select('id, make, model, model_full, year, daily_rate, image_url, badge, status')
        .eq('tenant_id', profile.tenant_id)
        .order('id')
      setCars((carRows as Car[]) || [])
    }
    load()
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!tenant) return
    setSaving(true)

    const supabase = createClient()
    await supabase
      .from('tenants')
      .update({ brand_name: brandName, logo_url: logoUrl || null })
      .eq('id', tenant.id)

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const fleetUrl = tenant ? `https://${tenant.slug}.epuredrive.com` : ''

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Fleet Page</h1>
        <p className="text-white/40 text-sm">Customize how your public fleet page looks.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left: settings */}
        <div className="space-y-6">
          {/* Example preview callout */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <div className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
              Example — éPure Drive&apos;s live page
            </div>
            <FleetPreview />
            <p className="text-xs text-white/30 mt-3">
              This is what a finished fleet page looks like. Yours will be at{' '}
              {fleetUrl ? (
                <a href={fleetUrl} target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white">
                  {fleetUrl} ↗
                </a>
              ) : '…'}
            </p>
          </div>

          {/* Settings form */}
          <form onSubmit={handleSave} className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
            <h2 className="font-semibold text-white">Your page settings</h2>
            <div>
              <label className="block text-sm text-white/60 mb-1">Display name</label>
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-white/30"
              />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1">Logo URL (optional)</label>
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-white/5 border border-white/10 text-white placeholder:text-white/20 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-white/30"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-white text-black font-semibold py-2.5 rounded-lg text-sm hover:bg-white/90 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save changes'}
            </button>
          </form>
        </div>

        {/* Right: cars list */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">Your cars ({cars.length})</h2>
            <a
              href="/admin/dashboard.html"
              className="text-xs text-white/50 hover:text-white transition-colors"
            >
              Manage in full dashboard ↗
            </a>
          </div>
          {cars.length === 0 ? (
            <p className="text-white/30 text-sm py-8 text-center">Loading…</p>
          ) : (
            <div className="space-y-2">
              {cars.map((car) => (
                <div key={car.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                  {car.image_url && (
                    <img
                      src={car.image_url.startsWith('http') ? car.image_url : `/${car.image_url}`}
                      alt=""
                      className="w-14 h-10 object-cover rounded-lg"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">
                      {car.make} {car.model_full || car.model}
                    </div>
                    <div className="text-xs text-white/40">
                      {car.year} · ${car.daily_rate ? Number(car.daily_rate).toFixed(0) : '—'}/day
                      {car.badge && ` · ${car.badge}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {fleetUrl && (
            <a
              href={fleetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 block w-full text-center border border-white/20 text-white text-sm font-semibold py-2.5 rounded-xl hover:border-white/40 transition-colors"
            >
              View live fleet page ↗
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Verify fleet customizer renders when logged in**

```bash
# Visit http://localhost:3000/dashboard/fleet (must be logged in)
```

Expected: customizer renders with éPure Drive preview iframe, settings form, and car list (with 1 seeded car for new tenants).

- [ ] **Step 6: Commit**

```bash
git add app/dashboard/fleet/ app/api/ components/FleetPreview.tsx
git commit -m "feat: add fleet customizer with éPure Drive preview and sample car seeding"
```

---

## Task 15: Update root app/layout.tsx and verify full build

**Files:**
- Modify: `app/layout.tsx`

The root `app/layout.tsx` is required by Next.js but the actual layouts are defined in each route group. Simplify it to a passthrough:

- [ ] **Step 1: Replace app/layout.tsx**

```tsx
// app/layout.tsx
// Root layout — individual route groups define their own <html> and <body>
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children
}
```

- [ ] **Step 2: Run full build**

```bash
npm run build
```

Expected: build completes. Check output for any TypeScript errors and fix them before continuing.

- [ ] **Step 3: Run tests**

```bash
npm test
```

Expected: routing tests pass.

- [ ] **Step 4: Commit**

```bash
git add app/layout.tsx
git commit -m "chore: simplify root layout — route groups own their html/body"
```

---

## Task 16: Push to main and verify Netlify deployment

- [ ] **Step 1: Push to main**

```bash
git push origin main
```

- [ ] **Step 2: Monitor Netlify build**

```bash
# Check build status
curl -s "https://api.netlify.com/api/v1/sites/aca8175e-457e-4e87-b38b-1c5ca1e03dc8/deploys?per_page=1" \
  -H "Authorization: Bearer nfp_bFdMPn4ARKz2d9ArL8CdHZMKG7wZF6FU28d4" \
  | python3 -c "import sys,json; d=json.load(sys.stdin)[0]; print(d['state'], d.get('error_message',''))"
```

Expected: `ready` state.

- [ ] **Step 3: Smoke test production**

Verify each surface:

```
1. https://epuredrive.com                          → Marketing hero page
2. https://epuredrive.com/sign-up                  → Sign-up form
3. https://epuredrive.com/login                    → Login form
4. https://ayrtonn-lg-1774229361678.epuredrive.com → éPure Drive fleet page
5. https://epuredrive.com/dashboard                → Redirect to /login (if not logged in)
6. https://epuredrive.com/admin/dashboard.html     → Existing dashboard (coexistence)
```

- [ ] **Step 4: Test new tenant sign-up end-to-end**

1. Visit `https://epuredrive.com/sign-up`
2. Create a test account with a new email
3. Confirm redirect to `/dashboard`
4. Visit `/dashboard/fleet` — confirm 1 sample car appears
5. Visit `https://{new-tenant-slug}.epuredrive.com` — confirm fleet page is live

- [ ] **Step 5: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: post-deploy corrections"
git push origin main
```

---

## Self-Review Checklist

- [x] All spec requirements covered (marketing site, sign-up, login, tenant fleet page, car detail, dashboard, fleet customizer, sample car seeding, coexistence with existing dashboard)
- [x] No TBD or placeholder steps — all code provided
- [x] Types consistent: `Tenant` and `Car` defined in Task 4, used in Tasks 9–14
- [x] `resolveImageUrl` defined in both CarCard (Task 10) and car detail (Task 11) — identical implementation
- [x] `createClient()` from `lib/supabase/server` used in all server components; `lib/supabase/client` in client components
- [x] `getTenantSlug` tested in Task 5 before being used in middleware
- [x] éPure Drive tenant slug (`ayrtonn-lg-1774229361678`) hardcoded only in env vars — not scattered
- [x] Existing Netlify functions untouched
- [x] `admin/dashboard.html` preserved in `public/` for coexistence
