# Feedback Emails (Tenants + Renters) — Design

**Date:** 2026-08-13
**Status:** Approved

## Problem

There's no way to hear from either audience of this app:

- **Tenants** (rental companies using the SaaS dashboard) get zero solicited feedback about the product — no signal on what's confusing, missing, or broken during onboarding.
- **Renters** (end customers who rented a car) already get a "Leave a Review" email one day after return (`app/api/cron/review-requests/route.ts`, cron `review-requests`), but the CTA just redirects to `https://{slug}.epuredrive.com` — the tenant's homepage. No rating or comment is ever actually captured. The email marks itself sent (`reservations.review_email_sent_at`) regardless of whether the renter did anything once they landed on the site.

No `review` or `feedback` table exists in the schema today.

## Goals

- Ask tenants for product feedback 14 days after signup, capture it in-app (rating + comment), with one reminder if they don't respond.
- Turn the existing renter review-request email into an actual feedback capture: a public, no-login page where the renter leaves a star rating + comment, stored and visible to the tenant privately.
- Follow the existing infra patterns exactly: pg_cron → `/api/cron/*` route (Bearer `cron_secret` from Supabase Vault) → `lib/email/resend.ts` `sendEmail()`, matching `review-requests` / `return-reminders`.

## Non-Goals

- Publishing renter reviews publicly (as testimonials on the tenant's site) — v1 is private-only, tenant-side visibility. A "publish to site" toggle is a future iteration, not part of this design.
- A tenant-facing dashboard UI to browse `tenant_feedback` responses — v1 is captured to a table; you read it directly (Supabase Studio / SQL) rather than building an admin view.
- Changing the renter email's trigger timing (stays 1 day after `return_date`, 1–14 day catch-up window) — only the destination of the CTA changes.
- Multiple reminders or drip sequences — one initial email + at most one reminder, for tenants only. Renters get a single email, no reminder (consistent with today's behavior).

## Design

### 1. Schema

```sql
-- tenants: track tenant-feedback email + reminder state
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS feedback_email_sent_at timestamptz;
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS feedback_reminder_sent_at timestamptz;
COMMENT ON COLUMN tenants.feedback_email_sent_at IS 'When the 14-day product feedback request email was sent. NULL = not yet sent.';
COMMENT ON COLUMN tenants.feedback_reminder_sent_at IS 'When the 7-day feedback reminder was sent (only if no tenant_feedback row exists yet). NULL = not sent / not needed.';

-- tenant_feedback: product feedback captured from tenants
CREATE TABLE IF NOT EXISTS tenant_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE tenant_feedback IS 'Product feedback submitted by tenants via the 14-day feedback email CTA.';

-- reservation_reviews: renter reviews captured from the post-return email
-- NOTE: reservations.id is uuid (not bigint) and cars.id is integer — verified
-- against the live schema, not the Reservation TS type (which incorrectly types id as number).
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
COMMENT ON TABLE reservation_reviews IS 'Star rating + comment left by a renter via the post-return review-request email. Private to the tenant in v1.';
```

`UNIQUE (reservation_id)` on `reservation_reviews` prevents a renter from submitting twice off the same link (the submit endpoint upserts / rejects on conflict).

Every table in this project has RLS enabled with the same two-policy convention (verified against `reservations`/`tenant_notification_prefs`): a `tenant_id = current_tenant_id()` policy for tenant-scoped access and an `is_superuser()` policy for platform admin access. Both new tables get that same pair — nothing new to invent. `reservation_reviews` writes come from an unauthenticated public page, so the insert route must go through a server action / API route using the admin client (which bypasses RLS via the service role key) — never a direct client-side Supabase insert.

### 2. Tenant feedback flow

**Cron:** new pg_cron job `tenant-feedback`, same shape as `review-requests`:

```sql
select net.http_post(
  url := 'https://epuredrive.com/api/cron/tenant-feedback',
  headers := jsonb_build_object('Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='cron_secret')),
  timeout_milliseconds := 55000
);
```
Scheduled daily (e.g. `0 16 * * *`, after the existing three daily email crons at 13/14/15h).

**Route:** `app/api/cron/tenant-feedback/route.ts`, `POST`, Bearer-secret guarded like every other `/api/cron/*` route.

Two passes per run:

1. **Initial send** — tenants where `created_at` is 14–15 days ago, `status = 'active'`, `owner_email IS NOT NULL`, `feedback_email_sent_at IS NULL`. Send email, set `feedback_email_sent_at = now()`.
2. **Reminder** — tenants where `feedback_email_sent_at` is 7–8 days in the past, `feedback_reminder_sent_at IS NULL`, and no row exists in `tenant_feedback` for that `tenant_id`. Send reminder, set `feedback_reminder_sent_at = now()`.

Both passes reuse `sendEmail()` from `lib/email/resend.ts`, `replyTo` set to `info@epuredrive.com` — the same support address already used as the reply target in `lib/email/templates/support.ts` — so tenants can also just reply in Gmail as a secondary channel.

**Email template:** `lib/email/templates/platform.ts` — this is the existing home for platform-to-tenant emails (`welcomeEmail`, `onboardingEmail`, both using `compactLayout`/`heroLayout`, the éPure Drive brand, not the tenant's own brand). Add `tenantFeedbackRequestEmail()` and `tenantFeedbackReminderEmail()` there using `compactLayout`, CTA "Share Feedback" → `https://epuredrive.com/dashboard/feedback`.

**Capture page:** `app/(dashboard)/dashboard/feedback/page.tsx` — authenticated (existing dashboard auth), simple form: 1–5 star picker + textarea, submits to a server action that inserts into `tenant_feedback` using the tenant_id from the authenticated session (never trust a client-supplied tenant_id).

### 3. Renter review flow (upgrade existing cron)

No changes to `app/api/cron/review-requests/route.ts`'s selection logic (still `return_date` 1–14 days ago, `agreement_signed_at` not null, not cancelled, `review_email_sent_at IS NULL`).

**Change:** `reviewRequestCustomerEmail()` in `lib/email/templates/rentals.ts` gets a new `reviewUrl` value: instead of `https://{tenantSlug}.epuredrive.com`, build `https://epuredrive.com/sites/{tenantSlug}/review/{reviewToken}`.

`reviewToken` follows the exact pattern already used for `reservations.agreement_token`: a plain random UUID (`crypto.randomUUID()`), generated and persisted at send time, looked up with a direct `.eq()` — no JWT/signing scheme, consistent with how the agreement link already works. Add `reservations.review_token uuid` (nullable, generated by the cron the first time it emails that reservation) via the same migration that adds the two `tenants` columns and the new tables:

```sql
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS review_token uuid;
COMMENT ON COLUMN reservations.review_token IS 'Opaque token for the public no-login review page, generated when the review-request email is sent. Same pattern as agreement_token.';
```

**New page:** `app/(sites)/sites/[slug]/review/[token]/page.tsx` — public, no auth. Looks up the reservation by `.eq('review_token', token)`, loads car + tenant for display context ("How was your BMW X5 rental with Acme Rentals?"), renders the same star + comment form pattern as the tenant feedback page. An unmatched token renders "This link is no longer valid."

**Submit:** server action / route handler re-looks-up `reservation_id`/`tenant_id`/`car_id` from `review_token` (never from client-supplied IDs), inserts into `reservation_reviews` via the admin client. On conflict (`UNIQUE (reservation_id)` violation), show "You've already left a review" instead of erroring.

### 4. Error handling

- Missing `RESEND_API_KEY`: `sendEmail()` already no-ops with a warning (existing behavior) — both new send paths inherit this, no new handling needed.
- Cron route auth failures: same 401 pattern as every existing `/api/cron/*` route.
- Review/feedback submit with invalid or expired token: render a clear "This link is no longer valid" state rather than a raw error.
- Duplicate submit (renter re-visits their review link after submitting): friendly "already submitted" message, not a 500.

### 5. Testing

- Unit: rating validation (1–5 bounds) in both submit routes; unmatched/consumed `review_token` handling.
- Integration: `POST /api/cron/tenant-feedback` — initial-send pass, reminder pass, and the "already has feedback so skip reminder" branch, following the same test structure as any existing `__tests__` coverage for `review-requests` (check whether one exists first — if `review-requests` itself has no test today, match that precedent rather than introducing an inconsistent standard for only the new route).
- Manual/E2E: submit both forms end-to-end against a real (dev) Supabase row per `CLAUDE.md`'s verification requirements — confirm the row lands with correct `tenant_id`/`reservation_id`, and that a second submit on the same review link is rejected.
