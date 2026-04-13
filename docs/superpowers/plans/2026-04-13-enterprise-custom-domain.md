# Enterprise Custom Domain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow Enterprise tenants to point their own domain (e.g., `fleet.yourbrand.com`) to their fleet page, with tenant isolation enforced at the middleware and DB layers.

**Architecture:** Single Netlify deployment. `middleware.ts` reads the `Host` header — if it matches `*.epuredrive.com` the existing slug routing applies; if it's any other hostname, a Supabase lookup resolves `custom_domain → slug` and rewrites the request to `/sites/{slug}/...`. Unknown hosts return 404. The `custom_domains` feature flag gates the save UI for the tenant.

**Tech Stack:** Next.js 14 App Router, Supabase (PostgreSQL + RLS), TypeScript, Netlify, `@supabase/supabase-js`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `supabase/migrations/YYYYMMDD_add_custom_domain.sql` | Create | DB column + index |
| `lib/supabase/edge.ts` | Create | Minimal Supabase client for middleware (no cookies) |
| `middleware.ts` | Modify | Add custom domain → slug resolution |
| `app/(dashboard)/dashboard/settings/actions.ts` | Modify | Add `saveCustomDomain()` server action |
| `app/(dashboard)/dashboard/settings/domain/DomainSettings.tsx` | Modify | Wire custom domain input to server action |

**Not changing:**
- `lib/utils/routing.ts` — stays slug-only; custom domain lookup is separate
- Admin flags UI — already supports enabling `custom_domains` per tenant via `setTenantFlagOverride`
- `lib/supabase/feature-flags.ts` — already works; no changes needed

---

## Task 1: DB Migration — Add `custom_domain` Column

**Files:**
- Create: `supabase/migrations/20260413000001_add_custom_domain.sql`

- [ ] **Step 1.1: Create the migration file**

```sql
-- supabase/migrations/20260413000001_add_custom_domain.sql

-- Add custom_domain column to tenants
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS custom_domain TEXT UNIQUE;

-- Fast index for middleware lookup (runs on every request from a custom domain)
CREATE INDEX IF NOT EXISTS idx_tenants_custom_domain
  ON tenants (custom_domain)
  WHERE custom_domain IS NOT NULL;
```

- [ ] **Step 1.2: Apply the migration via Supabase MCP**

Run in Supabase SQL editor or via MCP:
```sql
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS custom_domain TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_tenants_custom_domain ON tenants (custom_domain) WHERE custom_domain IS NOT NULL;
```

Expected: no error, column appears in `information_schema.columns`.

- [ ] **Step 1.3: Verify**

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'tenants' AND column_name = 'custom_domain';
```

Expected result: `custom_domain | text | YES`

- [ ] **Step 1.4: Commit**

```bash
git add supabase/migrations/20260413000001_add_custom_domain.sql
git commit -m "feat: add custom_domain column to tenants"
```

---

## Task 2: Edge Supabase Client

**Files:**
- Create: `lib/supabase/edge.ts`

The middleware cannot use `lib/supabase/server.ts` because that calls `cookies()` which requires the request context. We need a minimal client that only uses the anon key — no cookies, no auth session.

- [ ] **Step 2.1: Write the failing test**

Create `__tests__/lib/supabase/edge.test.ts`:

```typescript
import { createEdgeClient } from '@/lib/supabase/edge'

describe('createEdgeClient', () => {
  it('returns a supabase client with from() method', () => {
    const client = createEdgeClient()
    expect(typeof client.from).toBe('function')
  })

  it('throws if NEXT_PUBLIC_SUPABASE_URL is missing', () => {
    const orig = process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    expect(() => createEdgeClient()).toThrow()
    process.env.NEXT_PUBLIC_SUPABASE_URL = orig
  })
})
```

- [ ] **Step 2.2: Run test to verify it fails**

```bash
npx jest __tests__/lib/supabase/edge.test.ts --no-coverage
```

Expected: FAIL — `createEdgeClient` not found.

- [ ] **Step 2.3: Implement `lib/supabase/edge.ts`**

```typescript
// lib/supabase/edge.ts
// Minimal Supabase client for use in Next.js middleware.
// Does NOT use cookies() — safe to call in edge/middleware context.
import { createClient } from '@supabase/supabase-js'

export function createEdgeClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }
  return createClient(url, key, { auth: { persistSession: false } })
}
```

- [ ] **Step 2.4: Run test to verify it passes**

```bash
npx jest __tests__/lib/supabase/edge.test.ts --no-coverage
```

Expected: PASS

- [ ] **Step 2.5: Commit**

```bash
git add lib/supabase/edge.ts __tests__/lib/supabase/edge.test.ts
git commit -m "feat: add edge Supabase client for middleware"
```

---

## Task 3: Middleware — Custom Domain Resolution

**Files:**
- Modify: `middleware.ts`

**Current behavior:** `getTenantSlug(host)` extracts slug from `*.epuredrive.com` subdomains. No DB calls.

**New behavior:**
1. If `getTenantSlug(host)` returns a slug → existing rewrite logic (unchanged)
2. If host does NOT match `*.epuredrive.com` → query `tenants` table by `custom_domain`
3. If a tenant is found → rewrite to `/sites/{slug}/...`
4. If not found → return `NextResponse.json({ error: 'Not found' }, { status: 404 })`

- [ ] **Step 3.1: Write the failing test**

Create `__tests__/middleware.test.ts`:

```typescript
import { middleware } from '@/middleware'
import { NextRequest } from 'next/server'

// Mock createEdgeClient
jest.mock('@/lib/supabase/edge', () => ({
  createEdgeClient: jest.fn(),
}))
import { createEdgeClient } from '@/lib/supabase/edge'

function makeRequest(host: string, path = '/') {
  return new NextRequest(`http://${host}${path}`, {
    headers: { host },
  })
}

describe('middleware', () => {
  it('rewrites *.epuredrive.com subdomains without DB call', async () => {
    const req = makeRequest('myfleet.epuredrive.com', '/cars')
    const res = await middleware(req)
    expect(res.headers.get('x-middleware-rewrite')).toContain('/sites/myfleet/cars')
    expect(createEdgeClient).not.toHaveBeenCalled()
  })

  it('looks up custom domain in DB and rewrites if found', async () => {
    const mockClient = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: { slug: 'acme-rentals' }, error: null,
            }),
          }),
        }),
      }),
    }
    ;(createEdgeClient as jest.Mock).mockReturnValue(mockClient)

    const req = makeRequest('fleet.acme.com', '/')
    const res = await middleware(req)
    expect(res.headers.get('x-middleware-rewrite')).toContain('/sites/acme-rentals')
  })

  it('returns 404 for unknown custom domains', async () => {
    const mockClient = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    }
    ;(createEdgeClient as jest.Mock).mockReturnValue(mockClient)

    const req = makeRequest('unknown.example.com', '/')
    const res = await middleware(req)
    expect(res.status).toBe(404)
  })
})
```

- [ ] **Step 3.2: Run test to verify it fails**

```bash
npx jest __tests__/middleware.test.ts --no-coverage
```

Expected: FAIL — custom domain cases not handled.

- [ ] **Step 3.3: Implement updated `middleware.ts`**

```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getTenantSlug } from '@/lib/utils/routing'
import { createEdgeClient } from '@/lib/supabase/edge'

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? ''

  // Path 1: epuredrive.com subdomain → slug-based rewrite (no DB call)
  const slug = getTenantSlug(host)
  if (slug) {
    const url = request.nextUrl.clone()
    url.pathname = `/sites/${slug}${url.pathname === '/' ? '' : url.pathname}`
    return NextResponse.rewrite(url)
  }

  // Path 2: custom domain → look up tenant by custom_domain column
  const hostname = host.split(':')[0]
  const isEpureDomain = hostname === 'epuredrive.com' ||
    hostname === 'www.epuredrive.com' ||
    hostname.endsWith('.epuredrive.com')

  if (!isEpureDomain) {
    const supabase = createEdgeClient()
    const { data } = await supabase
      .from('tenants')
      .select('slug')
      .eq('custom_domain', hostname)
      .maybeSingle()

    if (!data?.slug) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const url = request.nextUrl.clone()
    url.pathname = `/sites/${data.slug}${url.pathname === '/' ? '' : url.pathname}`
    return NextResponse.rewrite(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

- [ ] **Step 3.4: Run tests to verify they pass**

```bash
npx jest __tests__/middleware.test.ts --no-coverage
```

Expected: all 3 tests PASS

- [ ] **Step 3.5: Commit**

```bash
git add middleware.ts __tests__/middleware.test.ts
git commit -m "feat: add custom domain resolution in middleware"
```

---

## Task 4: Server Action — `saveCustomDomain`

**Files:**
- Modify: `app/(dashboard)/dashboard/settings/actions.ts`

This action:
1. Validates the domain format
2. Saves `custom_domain` to the `tenants` table
3. Calls Netlify API to add it as a domain alias (same pattern as `syncNetlifyDomainAlias`)

- [ ] **Step 4.1: Write the failing test**

Create `__tests__/app/dashboard/settings/actions.test.ts`:

```typescript
// We test validation logic only — Supabase and Netlify calls are mocked.
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))
jest.mock('@/lib/supabase/dashboard-auth', () => ({
  requireTenantId: jest.fn().mockResolvedValue({
    tenantId: 'tenant-123',
    supabase: null,
  }),
}))

import { saveCustomDomain } from '@/app/(dashboard)/dashboard/settings/actions'

describe('saveCustomDomain', () => {
  it('rejects epuredrive.com domain', async () => {
    const result = await saveCustomDomain({ domain: 'fleet.epuredrive.com' })
    expect(result.error).toMatch(/cannot use epuredrive\.com/i)
  })

  it('rejects plain domain without subdomain (root apex)', async () => {
    const result = await saveCustomDomain({ domain: 'yourdomain' })
    expect(result.error).toMatch(/invalid domain format/i)
  })

  it('accepts valid custom domain format', async () => {
    // Supabase mock returns success
    const mockSupabase = {
      from: jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      }),
    }
    const { createClient } = require('@/lib/supabase/server')
    createClient.mockReturnValue(mockSupabase)

    // Skip Netlify call by not setting env vars
    const result = await saveCustomDomain({ domain: 'fleet.acme.com' })
    // May have Netlify error but domain format is valid
    expect(result.error).not.toMatch(/invalid domain format/i)
    expect(result.error).not.toMatch(/cannot use epuredrive\.com/i)
  })
})
```

- [ ] **Step 4.2: Run test to verify it fails**

```bash
npx jest __tests__/app/dashboard/settings/actions.test.ts --no-coverage
```

Expected: FAIL — `saveCustomDomain` not exported.

- [ ] **Step 4.3: Add `saveCustomDomain` to `actions.ts`**

Add after the existing `updateTenantBranding` function in `app/(dashboard)/dashboard/settings/actions.ts`:

```typescript
const DOMAIN_REGEX = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i

async function syncNetlifyCustomDomain(domain: string): Promise<string | null> {
  const token = process.env.NETLIFY_AUTH_TOKEN
  const siteId = process.env.NETLIFY_SITE_ID
  if (!token || !siteId) {
    console.error('[syncNetlifyCustomDomain] Missing NETLIFY_AUTH_TOKEN or NETLIFY_SITE_ID')
    return 'Could not register domain in hosting: missing credentials'
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }

  const getRes = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}`, {
    headers, cache: 'no-store',
  })
  if (!getRes.ok) return `Netlify error ${getRes.status} while reading site`

  const site = await getRes.json()
  const current: string[] = site.domain_aliases ?? []

  if (!current.includes(domain)) {
    const patchRes = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ domain_aliases: [...current, domain] }),
    })
    if (!patchRes.ok) return `Netlify error ${patchRes.status} while adding domain alias`
  }

  return null
}

export async function saveCustomDomain(
  data: { domain: string | null }
): Promise<{ error: string | null }> {
  const supabase = createClient()
  const tenantId = await getTenantId()

  // Clearing the custom domain is always allowed
  if (!data.domain) {
    const { error } = await supabase
      .from('tenants')
      .update({ custom_domain: null })
      .eq('id', tenantId)
    revalidatePath('/dashboard/settings/domain')
    return { error: error?.message ?? null }
  }

  const domain = data.domain.trim().toLowerCase()

  if (domain.includes('epuredrive.com')) {
    return { error: 'Cannot use epuredrive.com as a custom domain.' }
  }

  if (!DOMAIN_REGEX.test(domain)) {
    return { error: 'Invalid domain format. Use something like fleet.yourcompany.com' }
  }

  // Sync to Netlify first
  const netlifyError = await syncNetlifyCustomDomain(domain)
  if (netlifyError) return { error: netlifyError }

  const { error } = await supabase
    .from('tenants')
    .update({ custom_domain: domain })
    .eq('id', tenantId)

  revalidatePath('/dashboard/settings/domain')
  return { error: error?.message ?? null }
}
```

- [ ] **Step 4.4: Run tests to verify they pass**

```bash
npx jest __tests__/app/dashboard/settings/actions.test.ts --no-coverage
```

Expected: all 3 tests PASS

- [ ] **Step 4.5: Commit**

```bash
git add app/(dashboard)/dashboard/settings/actions.ts \
        __tests__/app/dashboard/settings/actions.test.ts
git commit -m "feat: add saveCustomDomain server action"
```

---

## Task 5: Wire DomainSettings.tsx — Save Custom Domain

**Files:**
- Modify: `app/(dashboard)/dashboard/settings/domain/DomainSettings.tsx`

The custom domain input already exists visually. Currently it's a non-functional `<input>` inside a locked section. We need to:
1. Add local state for `customDomain`
2. Seed it from a new `custom_domain` prop
3. Add a save button that calls `saveCustomDomain()`
4. Show success/error feedback

- [ ] **Step 5.1: Update the Props interface and page to pass `custom_domain`**

In `app/(dashboard)/dashboard/settings/domain/page.tsx`, update the tenant select and pass the value:

```typescript
// page.tsx — update the select and the component call
const [{ data: tenant }, customDomainsEnabled] = await Promise.all([
  supabase
    .from('tenants')
    .select('name, slug, brand_name, plan, custom_domain')  // add custom_domain
    .eq('id', tenantId)
    .single(),
  isFeatureEnabled(tenantId, 'custom_domains'),
])

// Pass it through:
<DomainSettings
  tenant={tenant}
  customDomainsEnabled={customDomainsEnabled}
/>
```

- [ ] **Step 5.2: Update DomainSettings.tsx Props and add save logic**

Replace the entire file content with the updated version:

```typescript
'use client'

import { useState, useTransition } from 'react'
import { updateTenantBranding, saveCustomDomain } from '../actions'

interface Props {
  tenant: {
    name?: string | null
    slug?: string | null
    brand_name?: string | null
    plan?: string | null
    custom_domain?: string | null
  } | null
  customDomainsEnabled?: boolean
}

export default function DomainSettings({ tenant, customDomainsEnabled = false }: Props) {
  const [isPending, startTransition] = useTransition()
  const [isCustomPending, startCustomTransition] = useTransition()
  const [msg, setMsg] = useState('')
  const [customMsg, setCustomMsg] = useState('')
  const [slug, setSlug] = useState(tenant?.slug || '')
  const [customDomain, setCustomDomain] = useState(tenant?.custom_domain || '')

  const publicUrl = slug ? `https://${slug}.epuredrive.com` : null

  async function handleSubdomainSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMsg('')
    startTransition(async () => {
      const result = await updateTenantBranding({
        slug: slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-') || null,
      })
      if (result.error) setMsg('Error: ' + result.error)
      else setMsg('Domain updated successfully.')
    })
  }

  async function handleCustomDomainSubmit(e: React.FormEvent) {
    e.preventDefault()
    setCustomMsg('')
    startCustomTransition(async () => {
      const result = await saveCustomDomain({
        domain: customDomain.trim() || null,
      })
      if (result.error) setCustomMsg('Error: ' + result.error)
      else setCustomMsg('Custom domain saved. Point your CNAME to your Netlify app URL.')
    })
  }

  return (
    <div className="space-y-8">
      {/* Subdomain — unchanged */}
      <div className="glass border border-white/10 rounded-3xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
            </svg>
          </div>
          <div>
            <h3 className="text-white font-bold">Subdomain</h3>
            <p className="text-white/30 text-xs">Your free éPure Drive subdomain</p>
          </div>
        </div>

        <form onSubmit={handleSubdomainSubmit} className="space-y-5">
          {msg && (
            <div className={`p-3 rounded-xl text-sm border ${msg.startsWith('Error') ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'}`}>
              {msg}
            </div>
          )}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest pl-1">Subdomain Slug</label>
            <div className="relative">
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                placeholder="your-brand"
                className="w-full bg-white/5 border border-white/5 rounded-2xl py-3 pl-4 pr-36 text-sm focus:ring-1 focus:ring-white/20 text-white outline-none transition-all"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-white/20 uppercase">.epuredrive.com</span>
            </div>
          </div>
          {publicUrl && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/[0.04]">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="text-white/50 text-sm hover:text-white transition-colors">
                {publicUrl}
              </a>
            </div>
          )}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="bg-white text-black hover:bg-white/90 px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-[0.15em] transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
            >
              {isPending ? 'Saving...' : 'Update Domain'}
            </button>
          </div>
        </form>
      </div>

      {/* Custom Domain */}
      <div className={`glass border rounded-3xl p-8 relative overflow-hidden ${customDomainsEnabled ? 'border-white/10' : 'border-white/[0.04]'}`}>
        {!customDomainsEnabled && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-10 flex items-center justify-center">
            <div className="text-center">
              <div className="px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-widest inline-block mb-3">
                Enterprise Only
              </div>
              <p className="text-white/40 text-sm">Custom domains are available on the Enterprise plan.</p>
            </div>
          </div>
        )}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
            </svg>
          </div>
          <div>
            <h3 className="text-white font-bold">Custom Domain</h3>
            <p className="text-white/30 text-xs">Point your own domain to your fleet page</p>
          </div>
        </div>

        <form onSubmit={handleCustomDomainSubmit} className="space-y-5">
          {customMsg && (
            <div className={`p-3 rounded-xl text-sm border ${customMsg.startsWith('Error') ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'}`}>
              {customMsg}
            </div>
          )}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest pl-1">Domain</label>
            <input
              type="text"
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value.toLowerCase())}
              disabled={!customDomainsEnabled}
              placeholder="fleet.yourbrand.com"
              className="w-full bg-white/5 border border-white/5 rounded-2xl py-3 px-4 text-sm text-white outline-none transition-all disabled:opacity-30 focus:ring-1 focus:ring-white/20"
            />
          </div>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">DNS Configuration</div>
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div><span className="text-white/30">Type:</span> <span className="text-white/60">CNAME</span></div>
              <div><span className="text-white/30">Host:</span> <span className="text-white/60">fleet</span></div>
              <div><span className="text-white/30">Value:</span> <span className="text-white/60">cname.epuredrive.com</span></div>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={!customDomainsEnabled || isCustomPending}
              className="bg-white text-black hover:bg-white/90 px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-[0.15em] transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
            >
              {isCustomPending ? 'Saving...' : 'Save Domain'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 5.3: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors on the modified files.

- [ ] **Step 5.4: Commit**

```bash
git add app/(dashboard)/dashboard/settings/domain/DomainSettings.tsx \
        app/(dashboard)/dashboard/settings/domain/page.tsx
git commit -m "feat: wire custom domain input to saveCustomDomain action"
```

---

## Task 6: Manual Admin Steps (per Enterprise tenant)

These steps are done by the admin in the dashboard and Netlify — no code changes.

- [ ] **Step 6.1: Set plan to Enterprise**

In Admin → Plans, change the tenant's plan to `enterprise`.

- [ ] **Step 6.2: Enable `custom_domains` feature flag for the tenant**

In Admin → Feature Flags, find `custom_domains`, add a per-tenant override → enabled = ON for this tenant.

- [ ] **Step 6.3: Add domain in Netlify dashboard**

Netlify → Site settings → Domain management → Add custom domain → enter `fleet.theirdomain.com` → SSL provisions automatically (~5 min).

- [ ] **Step 6.4: Send DNS instructions to tenant**

Email the tenant:
```
Add this DNS record at your domain registrar:

Type:   CNAME
Host:   fleet
Value:  [your-app].netlify.app
TTL:    3600

Propagation takes 15 min – 48 hours.
```

- [ ] **Step 6.5: Verify after propagation**

```bash
curl -I https://fleet.theirdomain.com
```

Expected: `HTTP/2 200` with your app's HTML.

---

## Self-Review

**Spec coverage check:**
- ✅ DB migration — Task 1
- ✅ Middleware host-based resolution — Task 3
- ✅ Unknown host → 404 — Task 3, Step 3.3
- ✅ `saveCustomDomain` server action — Task 4
- ✅ DomainSettings.tsx wired — Task 5
- ✅ Admin toggle — Task 6 (manual, existing flags UI)
- ✅ Netlify sync — Task 4, `syncNetlifyCustomDomain`
- ✅ Validation: reject `epuredrive.com` domains, invalid formats — Task 4

**Type consistency:**
- `saveCustomDomain` exported from `actions.ts` and imported in `DomainSettings.tsx` ✅
- `custom_domain` prop added to `tenant` object in both `page.tsx` and `DomainSettings.tsx` `Props` interface ✅
- `createEdgeClient` defined in Task 2, used in Task 3 ✅

**No placeholders found.** All steps have complete code.
