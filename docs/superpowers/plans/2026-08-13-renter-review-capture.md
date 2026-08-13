# Renter Review Capture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the existing post-return "Leave a Review" email so its CTA actually captures a 1–5 star rating + comment (instead of redirecting to the tenant's homepage), stored privately for the tenant.

**Architecture:** The existing `review-requests` cron (unchanged trigger: 1 day after `return_date`) generates a random `review_token` per reservation and points the email at a new public, no-login page (`/sites/[slug]/review/[token]`). That page's client form posts to a new `/api/reviews/submit` route — modeled directly on the existing `/api/agreement/sign` route (same admin-client-by-token pattern, same rate-limiting) — which validates and inserts into a new `reservation_reviews` table.

**Tech Stack:** Next.js App Router (route handlers + public server/client page pair), Supabase (Postgres + RLS), Jest for tests.

**Depends on:** `docs/superpowers/plans/2026-08-13-tenant-feedback-email.md` Tasks 3 (`lib/feedback/validate-rating.ts`) and 4 (`components/ui/StarRating.tsx`) — both are shared, reused here verbatim. Implement that plan's Tasks 3–4 first if not already done.

## Global Constraints

- `reservations.id` is `uuid`, `tenants.id` is `uuid`, `cars.id` is `integer` — verified against the live schema (the `Reservation` TS type's `id: number` is wrong; don't copy it).
- New table RLS: the project's standard two-policy convention (`<table>_tenant` scoped by `current_tenant_id()`, `superuser_<table>_all` via `is_superuser()`), verified against `reservations`/`tenant_notification_prefs`.
- The public review page and its submit route get **zero** dashboard auth — they must look up everything from the opaque `review_token`, never trust a client-supplied `reservation_id`/`tenant_id`, and use `createAdminClient()` (service role) for all reads/writes, exactly like `/api/agreement/sign`.
- Public write endpoints in this codebase are rate-limited via `rateLimit()` from `lib/rate-limit.ts` — copy the `/api/agreement/sign` usage (`windowMs`/`max`) rather than inventing new limiter code.
- `/sites/[slug]/...` pages use the light theme (`bg-gray-100`/`bg-white`/`text-gray-*`, `accentColor` from `tenant.primary_color`) — not the dashboard's dark `glass`/`text-white` theme. Follow `AgreementSigner.tsx`'s visual conventions.
- No test exists today for `/api/cron/review-requests`; match that precedent and do not add one for the (minimally changed) cron route. The new `/api/reviews/submit` route is new untrusted-input surface and does get a test, mirroring `__tests__/telematics/webhook-route.test.ts`'s mocked-admin-client integration style.

---

## File Structure

- Create: `supabase/migrations/20260813010000_add_reservation_reviews.sql`
- Modify: `lib/supabase/types.ts` — add `reservations.review_token`, add `ReservationReview` interface.
- Modify: `lib/email/templates/rentals.ts` — no signature change to `reviewRequestCustomerEmail`, only how its `reviewUrl` is built at the call site.
- Modify: `app/api/cron/review-requests/route.ts` — generate + persist `review_token`, build the new review URL.
- Create: `app/api/reviews/submit/route.ts` — validates token + rating, inserts `reservation_reviews`.
- Create: `app/(sites)/sites/[slug]/review/[token]/page.tsx` — public server page, looks up reservation/car/tenant by token.
- Create: `app/(sites)/sites/[slug]/review/[token]/ReviewForm.tsx` — public client form (star picker + textarea + submit + already-submitted/invalid states).
- Test: `__tests__/api/reviews-submit.test.ts`

---

### Task 1: Schema — `reservation_reviews` table + `review_token` column

**Files:**
- Create: `supabase/migrations/20260813010000_add_reservation_reviews.sql`

**Interfaces:**
- Produces: table `reservation_reviews(id uuid, reservation_id uuid, tenant_id uuid, car_id integer, rating int, comment text, created_at timestamptz)`, unique on `reservation_id`; column `reservations.review_token uuid`.

- [ ] **Step 1: Write the migration file**

```sql
-- supabase/migrations/20260813010000_add_reservation_reviews.sql

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS review_token uuid;

COMMENT ON COLUMN reservations.review_token IS
  'Opaque token for the public no-login review page, generated when the review-request email is sent. Same pattern as agreement_token.';

CREATE TABLE IF NOT EXISTS reservation_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  car_id integer REFERENCES cars(id) ON DELETE SET NULL,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reservation_id)
);

COMMENT ON TABLE reservation_reviews IS
  'Star rating + comment left by a renter via the post-return review-request email. Private to the tenant in v1.';

ALTER TABLE reservation_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY reservation_reviews_tenant ON reservation_reviews
  FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY superuser_reservation_reviews_all ON reservation_reviews
  FOR ALL
  USING (is_superuser());
```

- [ ] **Step 2: Apply the migration to the live database**

Run via the Supabase MCP `apply_migration` tool (project `brwzjwbpguiignrxvjdc`), name `add_reservation_reviews`, query = the file contents above.

- [ ] **Step 3: Verify**

```sql
select column_name from information_schema.columns where table_name='reservation_reviews' order by ordinal_position;
select column_name from information_schema.columns where table_name='reservations' and column_name='review_token';
select conname from pg_constraint where conrelid = 'reservation_reviews'::regclass and contype='u';
```
Expected: 7 columns on `reservation_reviews`, `review_token` present on `reservations`, one unique constraint on `reservation_id`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260813010000_add_reservation_reviews.sql
git commit -m "feat(db): add reservation_reviews table and reservations.review_token column"
```

---

### Task 2: TypeScript types

**Files:**
- Modify: `lib/supabase/types.ts`

**Interfaces:**
- Produces: `Reservation.review_token: string | null`; `ReservationReview` interface.

- [ ] **Step 1: Add `review_token` next to the existing `agreement_token`/review fields on `Reservation`**

```typescript
  review_token: string | null
```

- [ ] **Step 2: Add the `ReservationReview` interface**

```typescript
export interface ReservationReview {
  id: string
  reservation_id: string
  tenant_id: string
  car_id: number | null
  rating: number
  comment: string | null
  created_at: string
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add lib/supabase/types.ts
git commit -m "feat(types): add ReservationReview type and reservations.review_token"
```

---

### Task 3: `/api/reviews/submit` route (TDD)

**Files:**
- Create: `app/api/reviews/submit/route.ts`
- Test: `__tests__/api/reviews-submit.test.ts`

**Interfaces:**
- Consumes: `createAdminClient` (`@/lib/supabase/admin`), `rateLimit` (`@/lib/rate-limit`), `isValidRating` (`@/lib/feedback/validate-rating`, from the tenant-feedback plan).
- Produces: `POST /api/reviews/submit` — body `{ token: string, rating: number, comment?: string }`, response `{ success: true }` / `{ error: string }`.

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/api/reviews-submit.test.ts
/**
 * @jest-environment node
 */

jest.mock('@/lib/rate-limit', () => ({ rateLimit: jest.fn(() => null) }))

interface FakeReservation {
  id: string
  tenant_id: string
  car_id: number | null
  review_token: string
}

const RESERVATION: FakeReservation = {
  id: 'res-1',
  tenant_id: 'tenant-1',
  car_id: 42,
  review_token: 'tok-abc',
}

const inserted: Array<Record<string, unknown>> = []
let existingReview: { id: string } | null = null
let insertShouldConflict = false

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === 'reservations') {
        return {
          select: () => ({
            eq: (_col: string, value: string) => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: value === RESERVATION.review_token ? RESERVATION : null,
                  error: null,
                }),
            }),
          }),
        }
      }
      if (table === 'reservation_reviews') {
        return {
          insert: (row: Record<string, unknown>) => {
            if (insertShouldConflict) {
              return Promise.resolve({ error: { code: '23505', message: 'duplicate key' } })
            }
            inserted.push(row)
            return Promise.resolve({ error: null })
          },
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    },
  }),
}))

import { POST } from '@/app/api/reviews/submit/route'
import { NextRequest } from 'next/server'

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('https://epuredrive.com/api/reviews/submit', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/reviews/submit', () => {
  beforeEach(() => {
    inserted.length = 0
    existingReview = null
    insertShouldConflict = false
  })

  test('invalid token returns 404', async () => {
    const res = await POST(makeRequest({ token: 'nope', rating: 5, comment: '' }))
    expect(res.status).toBe(404)
  })

  test('invalid rating returns 400 without inserting', async () => {
    const res = await POST(makeRequest({ token: 'tok-abc', rating: 9, comment: '' }))
    expect(res.status).toBe(400)
    expect(inserted).toHaveLength(0)
  })

  test('valid submission inserts scoped to the token-resolved reservation', async () => {
    const res = await POST(makeRequest({ token: 'tok-abc', rating: 5, comment: 'Great car!' }))
    expect(res.status).toBe(200)
    expect(inserted).toEqual([
      {
        reservation_id: 'res-1',
        tenant_id: 'tenant-1',
        car_id: 42,
        rating: 5,
        comment: 'Great car!',
      },
    ])
  })

  test('duplicate submission (unique violation) returns 409', async () => {
    insertShouldConflict = true
    const res = await POST(makeRequest({ token: 'tok-abc', rating: 4, comment: '' }))
    expect(res.status).toBe(409)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/api/reviews-submit.test.ts`
Expected: FAIL — `Cannot find module '@/app/api/reviews/submit/route'`

- [ ] **Step 3: Write the implementation**

```typescript
// app/api/reviews/submit/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rate-limit'
import { isValidRating } from '@/lib/feedback/validate-rating'

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, 'reviews-submit', { windowMs: 60_000, max: 5 })
  if (limited) return limited

  try {
    const { token, rating, comment } = await req.json()

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 })
    }
    if (!isValidRating(rating)) {
      return NextResponse.json({ error: 'Invalid rating' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: reservation } = await supabase
      .from('reservations')
      .select('id, tenant_id, car_id')
      .eq('review_token', token)
      .maybeSingle()

    if (!reservation) {
      return NextResponse.json({ error: 'This link is no longer valid.' }, { status: 404 })
    }

    const trimmedComment = typeof comment === 'string' ? comment.trim() : ''

    const { error } = await supabase.from('reservation_reviews').insert({
      reservation_id: reservation.id,
      tenant_id: reservation.tenant_id,
      car_id: reservation.car_id,
      rating,
      comment: trimmedComment.length > 0 ? trimmedComment : null,
    })

    if (error) {
      if ((error as { code?: string }).code === '23505') {
        return NextResponse.json({ error: "You've already left a review." }, { status: 409 })
      }
      return NextResponse.json({ error: 'Could not save your review.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/api/reviews-submit.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add "app/api/reviews/submit/route.ts" __tests__/api/reviews-submit.test.ts
git commit -m "feat(api): add /api/reviews/submit route for renter review capture"
```

---

### Task 4: Point the review-request email at the new capture page

**Files:**
- Modify: `app/api/cron/review-requests/route.ts:86-120` (the send loop)

**Interfaces:**
- Consumes: `reviewRequestCustomerEmail` (`@/lib/email/templates/rentals`, unchanged signature — its existing optional `reviewUrl` param is now always supplied).
- Produces: `reservations.review_token` populated at send time; email CTA now points at `/sites/{slug}/review/{token}`.

- [ ] **Step 1: Replace the send loop**

Replace the existing loop body (from `for (const r of reservations) {` through its closing `}`) with:

```typescript
  for (const r of reservations) {
    if (!r.customer_email || !r.tenant_id) continue
    const tenant = tenantMap.get(r.tenant_id)
    if (!tenant) continue

    const tenantSlug = tenant.slug || ''
    const carName = carMap.get(r.car_id ?? -1) ?? 'Vehicle'
    const brand = {
      name: tenant.brand_name || tenant.name || 'Your rental company',
      logoUrl: tenant.logo_url ?? null,
      email: tenant.owner_email ?? null,
      phone: tenant.company_phone || tenant.whatsapp_phone || tenant.owner_phone || null,
      address: tenant.company_address ?? null,
    }

    const reviewToken = crypto.randomUUID()
    const reviewUrl = `https://epuredrive.com/sites/${tenantSlug}/review/${reviewToken}`

    const res = await sendEmail({
      to: r.customer_email,
      fromName: brand.name,
      replyTo: brand.email ?? undefined,
      ...reviewRequestCustomerEmail({
        customerName: r.customer_name || 'there',
        brand,
        carName,
        tenantSlug,
        reviewUrl,
      }),
    }).catch(() => null)

    if (res) {
      await supabase
        .from('reservations')
        .update({ review_email_sent_at: new Date().toISOString(), review_token: reviewToken })
        .eq('id', r.id)
      sent += 1
    }
  }
```

The only behavioral change: `review_token` is generated with `crypto.randomUUID()` (Node's global Web Crypto API, already used bare/unimported this way in `app/(dashboard)/dashboard/bookings/actions.ts` for `agreement_token`) and persisted alongside the existing `review_email_sent_at` marker; `reviewUrl` is now always passed explicitly instead of relying on `reviewRequestCustomerEmail`'s tenant-homepage fallback.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add "app/api/cron/review-requests/route.ts"
git commit -m "feat(cron): review-request emails now link to the in-app review capture page"
```

---

### Task 5: Public review page

**Files:**
- Create: `app/(sites)/sites/[slug]/review/[token]/page.tsx`
- Create: `app/(sites)/sites/[slug]/review/[token]/ReviewForm.tsx`

**Interfaces:**
- Consumes: `createAdminClient` (`@/lib/supabase/admin`), `StarRating` (`@/components/ui/StarRating`, from the tenant-feedback plan).
- Produces: the public `/sites/{slug}/review/{token}` route the (updated) review-request email links to.

- [ ] **Step 1: Write the server page**

Mirrors the lookup shape of `app/(sites)/sites/[slug]/agreement/[token]/page.tsx`, but renders an inline "invalid link" / "already reviewed" state itself instead of calling `notFound()`, and does the already-reviewed check server-side.

```typescript
// app/(sites)/sites/[slug]/review/[token]/page.tsx
import { createAdminClient } from '@/lib/supabase/admin'
import ReviewForm from './ReviewForm'

interface Props {
  params: { slug: string; token: string }
}

function InvalidLink({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm p-8 max-w-sm w-full text-center">
        <p className="text-gray-700 font-semibold">{message}</p>
      </div>
    </div>
  )
}

export default async function ReviewPage({ params }: Props) {
  const supabase = createAdminClient()

  const { data: reservation } = await supabase
    .from('reservations')
    .select('id, tenant_id, car_id, customer_name')
    .eq('review_token', params.token)
    .maybeSingle()

  if (!reservation) {
    return <InvalidLink message="This link is no longer valid." />
  }

  const { data: existingReview } = await supabase
    .from('reservation_reviews')
    .select('id')
    .eq('reservation_id', reservation.id)
    .maybeSingle()

  if (existingReview) {
    return <InvalidLink message="You've already left a review — thank you!" />
  }

  const [{ data: tenant }, { data: car }] = await Promise.all([
    supabase
      .from('tenants')
      .select('name, brand_name, slug, logo_url, primary_color')
      .eq('id', reservation.tenant_id)
      .maybeSingle(),
    reservation.car_id
      ? supabase.from('cars').select('make, model, model_full').eq('id', reservation.car_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  if (!tenant) {
    return <InvalidLink message="This link is no longer valid." />
  }

  const tenantName = tenant.brand_name || tenant.name || 'Your rental company'
  const carName = car ? `${car.make} ${car.model_full || car.model}` : 'your rental'
  const accentColor = tenant.primary_color || '#00d2ff'

  return (
    <ReviewForm
      token={params.token}
      tenantName={tenantName}
      tenantLogoUrl={tenant.logo_url}
      carName={carName}
      customerName={reservation.customer_name || 'there'}
      accentColor={accentColor}
    />
  )
}
```

- [ ] **Step 2: Write the client form**

```typescript
// app/(sites)/sites/[slug]/review/[token]/ReviewForm.tsx
'use client'

import { useState } from 'react'
import StarRating from '@/components/ui/StarRating'

interface ReviewFormProps {
  token: string
  tenantName: string
  tenantLogoUrl: string | null
  carName: string
  customerName: string
  accentColor: string
}

export default function ReviewForm({
  token,
  tenantName,
  tenantLogoUrl,
  carName,
  customerName,
  accentColor,
}: ReviewFormProps) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (rating < 1) {
      setError('Please select a rating.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/reviews/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, rating, comment }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Something went wrong. Please try again.')
      }
      setDone(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-sm w-full text-center">
          <p className="text-gray-900 font-semibold">Thanks for the feedback!</p>
          <p className="text-gray-500 text-sm mt-2">{tenantName} appreciates it.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-12">
      <div
        className="bg-white rounded-2xl shadow-sm p-8 max-w-md w-full border-t-4"
        style={{ borderColor: accentColor }}
      >
        {tenantLogoUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={tenantLogoUrl} alt={tenantName} className="h-10 object-contain mb-6" />
        )}
        <h1 className="text-xl font-bold text-gray-900 mb-1">How was your trip?</h1>
        <p className="text-gray-500 text-sm mb-6">
          Hi {customerName}, tell {tenantName} what you thought of your {carName} rental.
        </p>
        <form onSubmit={handleSubmit} className="space-y-5">
          <StarRating value={rating} onChange={setRating} disabled={submitting} />
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={submitting}
            rows={4}
            maxLength={2000}
            placeholder="Anything you'd like to share? (optional)"
            className="w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-400"
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-gray-900 text-white font-semibold text-sm disabled:opacity-50"
          >
            {submitting ? 'Sending...' : 'Submit Review'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add "app/(sites)/sites/[slug]/review/[token]/page.tsx" "app/(sites)/sites/[slug]/review/[token]/ReviewForm.tsx"
git commit -m "feat(sites): add public review capture page"
```

---

### Task 6: End-to-end manual verification

**Files:** none — verification only, per this project's CLAUDE.md requirement to trace DB → JS → DOM after rendering/data changes and verify with realistic data.

- [ ] **Step 1: Pick (or create) a real dev reservation with a `return_date` of yesterday, `agreement_signed_at` set, and `review_email_sent_at IS NULL`**

```sql
select id, tenant_id, customer_email, return_date, agreement_signed_at, review_email_sent_at
from reservations
where review_email_sent_at is null and agreement_signed_at is not null
order by return_date desc limit 5;
```

- [ ] **Step 2: Trigger the cron route directly and confirm the token was generated**

```bash
curl -s -X POST https://epuredrive.com/api/cron/review-requests \
  -H "Authorization: Bearer $(grep CRON_SECRET .env.local | cut -d= -f2-)"
```
Then:
```sql
select id, review_email_sent_at, review_token from reservations where id = '<that-reservation-id>';
```
Expected: both columns populated.

- [ ] **Step 3: Open the review link in a browser**

`https://epuredrive.com/sites/{tenant-slug}/review/{review_token}` — confirm the tenant's name/logo render, select a star rating, add a comment, submit. Confirm the "Thanks for the feedback!" state appears.

- [ ] **Step 4: Verify the row landed correctly**

```sql
select * from reservation_reviews where reservation_id = '<that-reservation-id>';
```
Expected: one row with the chosen `rating`, the typed `comment`, correct `tenant_id`/`car_id`.

- [ ] **Step 5: Verify duplicate-submit protection**

Reload the same review URL and submit again. Expected: the page now shows "You've already left a review — thank you!" (server-side check) rather than the form.

---

## Self-Review Notes

- **Spec coverage:** public no-login capture page ✅ (Task 5), rating + comment stored privately per-tenant ✅ (Tasks 1, 3), existing cron trigger/timing untouched ✅ (Task 4 only changes the loop body, not the selection query), duplicate-submit handling ✅ (Task 3 test + Task 5 server-side check + Task 6 manual verification), token pattern matches `agreement_token` precedent ✅ (Task 4).
- **Type consistency checked:** `ReviewForm` props match between Task 5's page (constructing them) and component (consuming them). `/api/reviews/submit` request shape (`{ token, rating, comment }`) matches between Task 3's route/test and Task 5's `ReviewForm` fetch call. `reservation_reviews` columns (Task 1) match the insert payload in Task 3 and the `ReservationReview` type in Task 2.
- **Cross-plan dependency called out explicitly** in Global Constraints (needs `isValidRating` and `StarRating` from the tenant-feedback plan) so this plan is not accidentally executed standalone against a repo missing those two files.
