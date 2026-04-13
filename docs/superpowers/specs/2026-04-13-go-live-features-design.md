# Go-Live Features — Design Spec
**Date:** 2026-04-13  
**Status:** Approved  
**Scope:** 4 independent features for éPure Drive go-live sprint

---

## Feature 1: Google Analytics Mounting

**Problem:** `components/GoogleAnalytics.tsx` exists and is production-ready (returns null if no env var), but is never rendered.

**Change:**  
- Import and render `<GoogleAnalytics />` inside `<body>` in `app/layout.tsx`

**Files modified:** 1  
**Risk:** None — component already guards against missing env var.

---

## Feature 2: Availability Calendar Visual

**Problem:** `BookingWidget` already fetches `bookedRanges` and validates conflicts after the user selects dates, but customers have no way to know which dates are unavailable *before* selecting.

**Approach:** Add a visual "Unavailable periods" section inside `BookingWidget`, visible when `bookedRanges.length > 0`. No new dependencies.

**UI:**
- Small header label: "Unavailable periods"
- Each range rendered as an amber/red pill: "Jan 15 – Jan 18"
- Positioned between the date inputs and the location select
- Only rendered when there are booked ranges
- Also add `min={today}` to both date inputs to block past dates

**Data flow:** `bookedRanges` already fetched from `/api/availability` on mount. No new API calls needed.

**Files modified:** 1 (`components/sites/BookingWidget.tsx`)

---

## Feature 3: Invite Member

**Problem:** The "Invite Member" button in `settings/roles/page.tsx` has no onClick handler.

**Approach:** Use Supabase Auth `admin.inviteUserByEmail()` with user metadata, and create the profile on first dashboard access.

**Full flow:**
1. Admin clicks "Invite Member" → modal opens with email input + role select
2. Admin submits → Server Action calls `supabase.auth.admin.inviteUserByEmail(email, { data: { tenant_id, role } })`
3. Invited user receives Supabase email with magic link (valid 24h)
4. User clicks link → sets password → authenticated
5. On first dashboard access: middleware checks if `profiles` row exists for user → if not, creates one from `user.user_metadata.tenant_id` and `user.user_metadata.role`

**Roles available:** admin, manager, staff, finance (matches existing `ROLE_CONFIG`)

**Error handling:**
- Duplicate email → show "An invitation has already been sent to this address"
- Network error → show generic error message in modal
- Missing role → client-side validation before submit

**Files created/modified:**
- `app/(dashboard)/dashboard/settings/roles/actions.ts` — new Server Action
- `app/(dashboard)/dashboard/settings/roles/page.tsx` — add modal state + InviteModal inline component
- Dashboard middleware (`middleware.ts` or auth helper) — profile auto-creation on first access

---

## Feature 4: Rate Limiting with Upstash Redis

**Problem:** Current rate limiting uses an in-memory `Map` in `/api/booking/request/route.ts`. This resets on every serverless cold start, making the limit ineffective in production.

**Approach:** Replace with `@upstash/ratelimit` + `@upstash/redis`. Same behavior (5 requests / 10 min / IP), but state persists in Redis across instances.

**Implementation:**
- Create `lib/ratelimit.ts` with a shared `Ratelimit` instance using `slidingWindow(5, '10 m')`
- Replace the `Map` + timestamp logic in `/api/booking/request/route.ts` with `ratelimit.limit(ip)`
- Remove the now-unused `rateLimitStore` Map

**Env vars required (Netlify + local `.env.local`):**
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

**Files created/modified:**
- `lib/ratelimit.ts` — new file
- `app/api/booking/request/route.ts` — replace rate limit logic

---

## Out of Scope (deferred)

- **Rate Limiting with Upstash** — in-memory Map is sufficient for beta volume. Migrate if abuse is observed post-launch.

## Implementation Order

1. Google Analytics (trivial — 2 lines)
2. Availability Calendar Visual (1 file, no dependencies)
3. Invite Member (most complex — modal + Server Action + middleware)
