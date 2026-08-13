# Tenant Feedback Email Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send tenants a product-feedback email 14 days after signup, with a 7-day reminder if they haven't responded, capturing a 1–5 rating + comment in the dashboard.

**Architecture:** A daily pg_cron job hits `POST /api/cron/tenant-feedback`, which does two independent passes over `tenants` (initial send, then reminder) using the existing `sendEmail()`/Resend infra and marker columns — the exact shape of `review-requests` and `return-reminders`. The capture side is a normal authenticated dashboard page (`requireTenantId()` + a server action) writing to a new `tenant_feedback` table.

**Tech Stack:** Next.js App Router (server actions + route handlers), Supabase (Postgres + RLS), Resend (`lib/email/resend.ts`), Jest for tests.

## Global Constraints

- New tables must have RLS enabled with the project's standard two-policy convention: `<table>_tenant` (`tenant_id = current_tenant_id()`, all commands) and `superuser_<table>_all` (`is_superuser()`, all commands) — verified against `reservations` and `tenant_notification_prefs`.
- `reservations.id` and `tenants.id` are `uuid`; `cars.id` is `integer` — not `bigint`. The `Reservation` TS interface incorrectly types `id: number`; trust the live schema, not that type, for any new FK.
- Cron routes: `POST`, guarded by `Authorization: Bearer <CRON_SECRET>` compared against `process.env.CRON_SECRET`, returning 401 on mismatch — copy this guard verbatim from `app/api/cron/review-requests/route.ts`.
- `sendEmail()` (`lib/email/resend.ts`) already no-ops with a console warning when `RESEND_API_KEY` is unset — do not add redundant handling for that case.
- No test exists today for any `/api/cron/*` route or any `lib/email/templates/*` function — match that precedent; do not add cron-route or email-template tests for this feature. Do add tests for anything handling authenticated/public write input (the server action).
- Reply-to for tenant-facing platform emails: `info@epuredrive.com` (already used in `lib/email/templates/support.ts`).

---

## File Structure

- Create: `supabase/migrations/20260813000000_add_tenant_feedback.sql` — schema for this feature.
- Modify: `lib/supabase/types.ts` — add `feedback_email_sent_at`/`feedback_reminder_sent_at` to `Tenant`, add `TenantFeedback` interface.
- Create: `lib/feedback/validate-rating.ts` — shared `isValidRating()` helper (reused by the renter-review plan too).
- Create: `components/ui/StarRating.tsx` — shared 1–5 star picker (reused by the renter-review plan too).
- Modify: `lib/email/templates/platform.ts` — add `tenantFeedbackRequestEmail()` and `tenantFeedbackReminderEmail()`.
- Create: `app/api/cron/tenant-feedback/route.ts` — the two-pass cron handler.
- Create: `app/(dashboard)/dashboard/feedback/actions.ts` — `submitTenantFeedback()` server action.
- Create: `app/(dashboard)/dashboard/feedback/page.tsx` — server page (auth + header).
- Create: `app/(dashboard)/dashboard/feedback/FeedbackForm.tsx` — client form (star picker + textarea + submit).
- Test: `__tests__/lib/validate-rating.test.ts`
- Test: `__tests__/dashboard/tenant-feedback-actions.test.ts`

---

### Task 1: Schema — `tenant_feedback` table + tenant marker columns

**Files:**
- Create: `supabase/migrations/20260813000000_add_tenant_feedback.sql`

**Interfaces:**
- Produces: table `tenant_feedback(id uuid, tenant_id uuid, rating int, comment text, created_at timestamptz)`; columns `tenants.feedback_email_sent_at timestamptz`, `tenants.feedback_reminder_sent_at timestamptz`.

- [ ] **Step 1: Write the migration file**

```sql
-- supabase/migrations/20260813000000_add_tenant_feedback.sql

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS feedback_email_sent_at timestamptz;
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS feedback_reminder_sent_at timestamptz;

COMMENT ON COLUMN tenants.feedback_email_sent_at IS
  'When the 14-day product feedback request email was sent. NULL = not yet sent.';
COMMENT ON COLUMN tenants.feedback_reminder_sent_at IS
  'When the 7-day feedback reminder was sent (only if no tenant_feedback row exists yet). NULL = not sent / not needed.';

CREATE TABLE IF NOT EXISTS tenant_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE tenant_feedback IS
  'Product feedback submitted by tenants via the 14-day feedback email CTA.';

ALTER TABLE tenant_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_feedback_tenant ON tenant_feedback
  FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY superuser_tenant_feedback_all ON tenant_feedback
  FOR ALL
  USING (is_superuser());
```

- [ ] **Step 2: Apply the migration to the live database**

Run via the Supabase MCP `apply_migration` tool (project `brwzjwbpguiignrxvjdc`), name `add_tenant_feedback`, query = the file contents above. This project applies migrations directly rather than via a CI pipeline — confirmed by checking `supabase/migrations/20260804010000_add_card_surcharge.sql`'s sibling columns already live in production.

- [ ] **Step 3: Verify the table and columns exist**

Run via `mcp__claude_ai_Supabase__execute_sql`:
```sql
select column_name from information_schema.columns where table_name='tenant_feedback' order by ordinal_position;
select column_name from information_schema.columns where table_name='tenants' and column_name like 'feedback%';
select polname from pg_policy where polrelid = 'tenant_feedback'::regclass;
```
Expected: 5 columns on `tenant_feedback` (`id`, `tenant_id`, `rating`, `comment`, `created_at`), 2 columns on `tenants`, 2 policies (`tenant_feedback_tenant`, `superuser_tenant_feedback_all`).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260813000000_add_tenant_feedback.sql
git commit -m "feat(db): add tenant_feedback table and feedback email tracking columns"
```

---

### Task 2: TypeScript types

**Files:**
- Modify: `lib/supabase/types.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `TenantFeedback` interface; `Tenant.feedback_email_sent_at`, `Tenant.feedback_reminder_sent_at`.

- [ ] **Step 1: Find the `Tenant` interface and add the two new columns**

Locate `export interface Tenant {` in `lib/supabase/types.ts` and add, near the other timestamp fields:

```typescript
  feedback_email_sent_at: string | null
  feedback_reminder_sent_at: string | null
```

- [ ] **Step 2: Add the `TenantFeedback` interface**

Add near the bottom of the file, alongside other standalone record interfaces (e.g. next to `ReservationExtra`):

```typescript
export interface TenantFeedback {
  id: string
  tenant_id: string
  rating: number
  comment: string | null
  created_at: string
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors introduced by this change (pre-existing errors elsewhere, if any, are unrelated and out of scope).

- [ ] **Step 4: Commit**

```bash
git add lib/supabase/types.ts
git commit -m "feat(types): add TenantFeedback type and tenant feedback marker columns"
```

---

### Task 3: Shared rating validation helper (TDD)

**Files:**
- Create: `lib/feedback/validate-rating.ts`
- Test: `__tests__/lib/validate-rating.test.ts`

**Interfaces:**
- Produces: `isValidRating(value: unknown): value is 1 | 2 | 3 | 4 | 5` — used by both this plan's server action and the renter-review plan's submit route.

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/lib/validate-rating.test.ts
import { isValidRating } from '@/lib/feedback/validate-rating'

describe('isValidRating', () => {
  test('accepts integers 1 through 5', () => {
    expect(isValidRating(1)).toBe(true)
    expect(isValidRating(3)).toBe(true)
    expect(isValidRating(5)).toBe(true)
  })

  test('rejects 0, 6, and negative numbers', () => {
    expect(isValidRating(0)).toBe(false)
    expect(isValidRating(6)).toBe(false)
    expect(isValidRating(-1)).toBe(false)
  })

  test('rejects non-integers', () => {
    expect(isValidRating(3.5)).toBe(false)
  })

  test('rejects non-number input without throwing', () => {
    expect(isValidRating('3')).toBe(false)
    expect(isValidRating(null)).toBe(false)
    expect(isValidRating(undefined)).toBe(false)
    expect(isValidRating({})).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/lib/validate-rating.test.ts`
Expected: FAIL — `Cannot find module '@/lib/feedback/validate-rating'`

- [ ] **Step 3: Write the implementation**

```typescript
// lib/feedback/validate-rating.ts
export function isValidRating(value: unknown): value is 1 | 2 | 3 | 4 | 5 {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/lib/validate-rating.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/feedback/validate-rating.ts __tests__/lib/validate-rating.test.ts
git commit -m "feat(feedback): add shared rating validation helper"
```

---

### Task 4: Shared `StarRating` component

**Files:**
- Create: `components/ui/StarRating.tsx`

**Interfaces:**
- Consumes: nothing external.
- Produces: `<StarRating value={number} onChange={(n: number) => void} disabled?={boolean} />` — a controlled 1–5 star picker. Reused verbatim by the renter-review plan's public form.

- [ ] **Step 1: Write the component**

No dependency on an icon library exists in this project (`package.json` has no `lucide-react`/`react-icons`) — render stars as plain unicode characters, matching the codebase's existing plain-CSS component style (see `components/ui/TimePicker.tsx`).

```typescript
// components/ui/StarRating.tsx
'use client'

import { useState } from 'react'

interface StarRatingProps {
  value: number
  onChange: (rating: number) => void
  disabled?: boolean
}

export default function StarRating({ value, onChange, disabled = false }: StarRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null)
  const display = hovered ?? value

  return (
    <div role="radiogroup" aria-label="Rating" className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n === 1 ? '' : 's'}`}
          disabled={disabled}
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(null)}
          className="text-3xl leading-none transition-colors disabled:cursor-not-allowed"
          style={{ color: n <= display ? '#f5b400' : '#3a3a3a' }}
        >
          {n <= display ? '★' : '☆'}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add components/ui/StarRating.tsx
git commit -m "feat(ui): add shared StarRating picker component"
```

---

### Task 5: Email templates

**Files:**
- Modify: `lib/email/templates/platform.ts`

**Interfaces:**
- Consumes: `compactLayout` from `./_layout` (already imported in this file).
- Produces: `tenantFeedbackRequestEmail(params: { operatorName: string }): { subject: string; html: string }`, `tenantFeedbackReminderEmail(params: { operatorName: string }): { subject: string; html: string }`.

- [ ] **Step 1: Add the two template functions**

Append to `lib/email/templates/platform.ts` (below the existing `onboardingEmail`, following its style):

```typescript
export function tenantFeedbackRequestEmail(params: {
  operatorName: string
}): { subject: string; html: string } {
  return {
    subject: 'How is éPure Drive working for you?',
    html: compactLayout({
      subheadline: 'Quick question',
      headline: `Got 60 seconds, ${params.operatorName}?`,
      body: `You've been running your fleet on éPure Drive for a couple weeks now. We'd love to know what's working, what's confusing, and what's missing — it goes straight to the team building this.`,
      cta: { label: 'Share Feedback', href: `${APP_URL}/dashboard/feedback` },
      note: 'You can also just reply to this email — we read every one.',
    }),
  }
}

export function tenantFeedbackReminderEmail(params: {
  operatorName: string
}): { subject: string; html: string } {
  return {
    subject: 'Still want to hear from you — éPure Drive',
    html: compactLayout({
      subheadline: 'Friendly reminder',
      headline: `One more ask, ${params.operatorName}.`,
      body: `We reached out last week for feedback on éPure Drive and haven't heard back. If you have a minute, it really does shape what we build next.`,
      cta: { label: 'Share Feedback', href: `${APP_URL}/dashboard/feedback` },
      note: 'You can also just reply to this email — we read every one.',
    }),
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add lib/email/templates/platform.ts
git commit -m "feat(email): add tenant feedback request and reminder templates"
```

---

### Task 6: `submitTenantFeedback` server action (TDD)

**Files:**
- Create: `app/(dashboard)/dashboard/feedback/actions.ts`
- Test: `__tests__/dashboard/tenant-feedback-actions.test.ts`

**Interfaces:**
- Consumes: `requireTenantId()` from `@/lib/supabase/dashboard-auth`, `isValidRating()` from `@/lib/feedback/validate-rating` (Task 3).
- Produces: `submitTenantFeedback(params: { rating: number; comment: string }): Promise<{ error: string | null }>`.

- [ ] **Step 1: Write the failing test**

This mocks `dashboard-auth` and the Supabase client the same way `telematics-actions` would be tested — following the mocked-admin-client integration style already established in `__tests__/telematics/webhook-route.test.ts`.

```typescript
// __tests__/dashboard/tenant-feedback-actions.test.ts
/**
 * @jest-environment node
 */

const inserted: Array<Record<string, unknown>> = []

jest.mock('@/lib/supabase/dashboard-auth', () => ({
  requireTenantId: jest.fn(() =>
    Promise.resolve({ supabase: {}, tenantId: 'tenant-123' }),
  ),
}))

jest.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    from: (table: string) => ({
      insert: (row: Record<string, unknown>) => {
        inserted.push({ table, ...row })
        return Promise.resolve({ error: null })
      },
    }),
  }),
}))

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))

import { submitTenantFeedback } from '@/app/(dashboard)/dashboard/feedback/actions'

describe('submitTenantFeedback', () => {
  beforeEach(() => {
    inserted.length = 0
  })

  test('inserts a valid rating + comment scoped to the authenticated tenant', async () => {
    const result = await submitTenantFeedback({ rating: 4, comment: 'Pretty good so far' })
    expect(result.error).toBeNull()
    expect(inserted).toEqual([
      {
        table: 'tenant_feedback',
        tenant_id: 'tenant-123',
        rating: 4,
        comment: 'Pretty good so far',
      },
    ])
  })

  test('rejects an out-of-range rating without inserting', async () => {
    const result = await submitTenantFeedback({ rating: 7, comment: 'x' })
    expect(result.error).toBe('Invalid rating.')
    expect(inserted).toHaveLength(0)
  })

  test('stores null for an empty comment', async () => {
    await submitTenantFeedback({ rating: 5, comment: '   ' })
    expect(inserted[0].comment).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/dashboard/tenant-feedback-actions.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```typescript
// app/(dashboard)/dashboard/feedback/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import { createClient } from '@/lib/supabase/server'
import { isValidRating } from '@/lib/feedback/validate-rating'

export async function submitTenantFeedback(params: {
  rating: number
  comment: string
}): Promise<{ error: string | null }> {
  if (!isValidRating(params.rating)) {
    return { error: 'Invalid rating.' }
  }

  const { tenantId } = await requireTenantId()
  const supabase = createClient()

  const trimmedComment = params.comment.trim()
  const { error } = await supabase.from('tenant_feedback').insert({
    tenant_id: tenantId,
    rating: params.rating,
    comment: trimmedComment.length > 0 ? trimmedComment : null,
  })

  if (error) return { error: 'Could not save feedback. Please try again.' }

  revalidatePath('/dashboard/feedback')
  return { error: null }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/dashboard/tenant-feedback-actions.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add "app/(dashboard)/dashboard/feedback/actions.ts" __tests__/dashboard/tenant-feedback-actions.test.ts
git commit -m "feat(dashboard): add submitTenantFeedback server action"
```

---

### Task 7: Feedback dashboard page + form

**Files:**
- Create: `app/(dashboard)/dashboard/feedback/page.tsx`
- Create: `app/(dashboard)/dashboard/feedback/FeedbackForm.tsx`

**Interfaces:**
- Consumes: `requireTenantId()` (`@/lib/supabase/dashboard-auth`), `PageHeader` (`@/components/dashboard/PageHeader`), `StarRating` (`@/components/ui/StarRating`, Task 4), `submitTenantFeedback` (`./actions`, Task 6).
- Produces: the `/dashboard/feedback` route the email CTA links to.

- [ ] **Step 1: Write the server page**

```typescript
// app/(dashboard)/dashboard/feedback/page.tsx
import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import PageHeader from '@/components/dashboard/PageHeader'
import FeedbackForm from './FeedbackForm'

export default async function FeedbackPage() {
  await requireTenantId()

  return (
    <div className="max-w-2xl mx-auto space-y-10 animate-fade-in pb-32">
      <PageHeader
        title="Feedback"
        description="Tell us what's working and what isn't — it goes straight to the team building this."
      />
      <FeedbackForm />
    </div>
  )
}
```

- [ ] **Step 2: Write the client form**

Follows the `useTransition` + optimistic-state pattern already used in `TelematicsPrefs.tsx`.

```typescript
// app/(dashboard)/dashboard/feedback/FeedbackForm.tsx
'use client'

import { useState, useTransition } from 'react'
import StarRating from '@/components/ui/StarRating'
import { submitTenantFeedback } from './actions'

export default function FeedbackForm() {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [isPending, startTransition] = useTransition()
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (rating < 1) {
      setError('Please select a rating.')
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await submitTenantFeedback({ rating, comment })
      if (result.error) {
        setError(result.error)
      } else {
        setSubmitted(true)
      }
    })
  }

  if (submitted) {
    return (
      <div className="glass border border-white/10 rounded-3xl p-8 text-center">
        <p className="text-white font-semibold">Thanks — we got it.</p>
        <p className="text-white/40 text-sm mt-2">Your feedback was sent to the team.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="glass border border-white/10 rounded-3xl p-8 space-y-6">
      <div>
        <label className="text-white text-sm font-medium block mb-3">How's it going overall?</label>
        <StarRating value={rating} onChange={setRating} disabled={isPending} />
      </div>
      <div>
        <label htmlFor="feedback-comment" className="text-white text-sm font-medium block mb-3">
          Anything specific? (optional)
        </label>
        <textarea
          id="feedback-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          disabled={isPending}
          rows={5}
          maxLength={2000}
          className="w-full rounded-xl bg-white/[0.03] border border-white/10 p-4 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/30"
          placeholder="What's working, what's confusing, what's missing..."
        />
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="w-full py-3 rounded-xl bg-white text-black font-semibold text-sm disabled:opacity-50"
      >
        {isPending ? 'Sending...' : 'Send Feedback'}
      </button>
    </form>
  )
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`, log into the dashboard, navigate to `/dashboard/feedback`, submit a rating + comment. Confirm the "Thanks — we got it" state renders and that a row appears:
```sql
select * from tenant_feedback order by created_at desc limit 1;
```

- [ ] **Step 5: Commit**

```bash
git add "app/(dashboard)/dashboard/feedback/page.tsx" "app/(dashboard)/dashboard/feedback/FeedbackForm.tsx"
git commit -m "feat(dashboard): add feedback capture page"
```

---

### Task 8: Cron route — `/api/cron/tenant-feedback`

**Files:**
- Create: `app/api/cron/tenant-feedback/route.ts`

**Interfaces:**
- Consumes: `createAdminClient` (`@/lib/supabase/admin`), `sendEmail` (`@/lib/email/resend`), `tenantFeedbackRequestEmail`/`tenantFeedbackReminderEmail` (`@/lib/email/templates/platform`, Task 5).
- Produces: `POST /api/cron/tenant-feedback` — two-pass send, matching the auth/shape of `app/api/cron/review-requests/route.ts`.

- [ ] **Step 1: Write the route**

```typescript
// app/api/cron/tenant-feedback/route.ts
/**
 * POST /api/cron/tenant-feedback
 * Pass 1: sends a product-feedback request 14 days after tenant signup.
 * Pass 2: sends one reminder 7 days after that, only if no feedback was submitted.
 * Call daily via cron.
 * Requires: Authorization: Bearer <CRON_SECRET>
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/resend'
import { tenantFeedbackRequestEmail, tenantFeedbackReminderEmail } from '@/lib/email/templates/platform'

function daysAgoRange(days: number): { startStr: string; endStr: string } {
  const end = new Date()
  end.setDate(end.getDate() - days)
  const start = new Date()
  start.setDate(start.getDate() - (days + 1))
  return { startStr: start.toISOString(), endStr: end.toISOString() }
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  let initialSent = 0
  let remindersSent = 0

  // Pass 1: initial send, 14–15 days after signup.
  {
    const { startStr, endStr } = daysAgoRange(14)
    const { data: tenants, error } = await supabase
      .from('tenants')
      .select('id, owner_name, owner_email, status, created_at, feedback_email_sent_at')
      .is('feedback_email_sent_at', null)
      .not('owner_email', 'is', null)
      .eq('status', 'active')
      .gte('created_at', startStr)
      .lte('created_at', endStr)
      .limit(500)

    if (error) {
      console.error('[cron/tenant-feedback] initial select failed:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    for (const t of tenants ?? []) {
      if (!t.owner_email) continue
      const res = await sendEmail({
        to: t.owner_email,
        replyTo: 'info@epuredrive.com',
        ...tenantFeedbackRequestEmail({ operatorName: t.owner_name || 'there' }),
      }).catch(() => null)

      if (res) {
        await supabase.from('tenants').update({ feedback_email_sent_at: new Date().toISOString() }).eq('id', t.id)
        initialSent += 1
      }
    }
  }

  // Pass 2: reminder, 7–8 days after the initial email, only if still no feedback row.
  {
    const { startStr, endStr } = daysAgoRange(7)
    const { data: tenants, error } = await supabase
      .from('tenants')
      .select('id, owner_name, owner_email, feedback_email_sent_at, feedback_reminder_sent_at')
      .not('feedback_email_sent_at', 'is', null)
      .is('feedback_reminder_sent_at', null)
      .not('owner_email', 'is', null)
      .gte('feedback_email_sent_at', startStr)
      .lte('feedback_email_sent_at', endStr)
      .limit(500)

    if (error) {
      console.error('[cron/tenant-feedback] reminder select failed:', error.message)
      return NextResponse.json({ error: error.message, initialSent }, { status: 500 })
    }

    for (const t of tenants ?? []) {
      if (!t.owner_email) continue

      const { data: existingFeedback } = await supabase
        .from('tenant_feedback')
        .select('id')
        .eq('tenant_id', t.id)
        .limit(1)
        .maybeSingle()

      if (existingFeedback) continue

      const res = await sendEmail({
        to: t.owner_email,
        replyTo: 'info@epuredrive.com',
        ...tenantFeedbackReminderEmail({ operatorName: t.owner_name || 'there' }),
      }).catch(() => null)

      if (res) {
        await supabase.from('tenants').update({ feedback_reminder_sent_at: new Date().toISOString() }).eq('id', t.id)
        remindersSent += 1
      }
    }
  }

  return NextResponse.json({ initialSent, remindersSent })
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Manual verification against a real dev tenant row**

Temporarily backdate a test tenant's `created_at` to 14 days ago, then invoke the route directly:
```bash
curl -s -X POST https://epuredrive.com/api/cron/tenant-feedback \
  -H "Authorization: Bearer $(grep CRON_SECRET .env.local | cut -d= -f2-)"
```
Confirm `{"initialSent":1,"remindersSent":0}` (or the actual matching count), that the tenant received the email, and that `tenants.feedback_email_sent_at` is now set:
```sql
select id, owner_email, feedback_email_sent_at from tenants where id = '<test-tenant-id>';
```
Restore the test tenant's `created_at` afterward if it was a real (non-throwaway) row.

- [ ] **Step 4: Commit**

```bash
git add "app/api/cron/tenant-feedback/route.ts"
git commit -m "feat(cron): add tenant-feedback cron route (initial send + 7-day reminder)"
```

---

### Task 9: Register the pg_cron job

**Files:** none (direct SQL against the live database, matching how the other 7 pg_cron jobs were registered — none of them are tracked as migration files either; confirmed via `grep -rl cron.schedule supabase/migrations` returning nothing).

- [ ] **Step 1: Schedule the job**

Run via `mcp__claude_ai_Supabase__execute_sql` (project `brwzjwbpguiignrxvjdc`):

```sql
select cron.schedule(
  'tenant-feedback',
  '0 16 * * *',
  $$
  select net.http_post(
    url := 'https://epuredrive.com/api/cron/tenant-feedback',
    headers := jsonb_build_object('Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='cron_secret')),
    timeout_milliseconds := 55000);
  $$
);
```

`0 16 * * *` runs daily at 16:00 UTC, after the existing `maintenance-alerts` (13:00), `review-requests` (14:00), and `return-reminders` (15:00) jobs.

- [ ] **Step 2: Verify the job is registered**

```sql
select jobname, schedule from cron.job where jobname = 'tenant-feedback';
```
Expected: one row, schedule `0 16 * * *`.

- [ ] **Step 3: No commit needed** (this step only changes live DB state, not the repo).

---

## Self-Review Notes

- **Spec coverage:** 14-day initial send ✅ (Task 8, pass 1), 7-day reminder gated on no submission ✅ (Task 8, pass 2), in-app capture (rating + comment) ✅ (Tasks 6–7), reuse of existing cron/email infra ✅ (Tasks 8–9 mirror `review-requests`), RLS per project convention ✅ (Task 1).
- **Type consistency checked:** `StarRating` props (`value`, `onChange`, `disabled`) match between Task 4's definition and Task 7's usage. `submitTenantFeedback({ rating, comment })` signature matches between Task 6's implementation/test and Task 7's `FeedbackForm` call site. `TenantFeedback` fields (Task 2) match the columns inserted in Task 6 and the migration in Task 1.
