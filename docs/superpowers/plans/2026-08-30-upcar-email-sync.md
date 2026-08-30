# Upcar Email Booking Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically turn Upcar (`support@upcar.ai`) booking emails into `reservations` rows, reusing the existing Turo Gmail connection and cron.

**Architecture:** The existing `GET /api/cron/poll-turo-emails` route polls one Gmail mailbox for Turo emails. We extract its shared plumbing into `lib/email-sync/`, add a second parser (`parseUpcarEmail`), and run a second Gmail search (`from:support@upcar.ai`) through the same upsert path. Dedup is a partial unique index on an `Upcar-Res #<id>` marker in `reservations.notes`, mirroring the existing `uniq_turo_res_id`.

**Tech Stack:** Next.js 15 App Router (route handlers), TypeScript, Supabase (Postgres via `@supabase/supabase-js` admin client), Jest (`next/jest`, jsdom default / `@jest-environment node` for server code), Netlify hosting, Supabase `pg_cron` trigger.

**Spec:** `docs/superpowers/specs/2026-08-30-upcar-email-sync-design.md`

## Global Constraints

- **Endpoint path is frozen:** the route stays at `app/api/cron/poll-turo-emails/route.ts` / URL `/api/cron/poll-turo-emails`. The `pg_cron` job and `netlify/functions/poll-turo-emails.js` point at it; renaming is out of scope.
- **Do not modify `parseTuroEmail` logic.** It moves file-to-file byte-for-byte. Project memory documents months of debugging; a behavior change there is a regression.
- **`source` values:** Turo rows use `source = 'turo'`, Upcar rows use `source = 'upcar'`. Never `'manual'` (that is the table default for operator-entered bookings).
- **`notes` dedup markers:** Turo = `Turo #<gmailMsgId>` plus optional ` Turo-Res #<resId>`. Upcar = `Upcar #<gmailMsgId> Upcar-Res #<bookingId>`.
- **Booking appears only on acceptance.** The `New Booking Request` email must be ignored (`parseUpcarEmail` returns `null`). No `pending` reservations.
- **`Please Check Out Your Trip` / trip-ended emails are ignored.** No auto-completion.
- **Times normalized to 24-hour `HH:MM`** (e.g. `"12:30"`, `"09:00"`) for `reservations.pickup_time` / `return_time`.
- **File size:** keep new/modified files focused; the coding-style rule caps files at 800 lines (the current route is ~700 and must come down).
- **Tests:** `npm test` (Jest). Server-side test files start with `/** @jest-environment node */`. Path alias `@/` → repo root.
- **Commits:** conventional-commit prefixes (`feat:`, `refactor:`, `test:`, `docs:`). Attribution is disabled globally — no `Co-Authored-By` trailer.
- **Branch:** work on `main` (project convention: "Always push to `main` so changes go live immediately"). Do NOT push until Task 7.

---

## File Structure

**New files:**
- `lib/email-sync/shared.ts` — provider-agnostic plumbing: Gmail fetch/refresh, MIME body extraction, sync claim-lock, `findCarId`, `findExistingReservation`, `processEmail`, shared types & constants.
- `lib/email-sync/turo.ts` — `parseTuroEmail` (moved verbatim from the route) + its Turo-only helpers (`parseTuroDate`, `parseSlashDate`).
- `lib/email-sync/upcar.ts` — `parseUpcarEmail` + Upcar date/time helpers (new).
- `lib/email-sync/types.ts` — `EmailSync`, `ParsedEmail`, `ExistingReservation`, `PollConfig` (shared type surface, imported by all of the above and the route).
- `__tests__/lib/email-sync/upcar.test.ts` — unit tests for `parseUpcarEmail`.
- `__tests__/lib/email-sync/fixtures/upcar/*.txt` — real captured email bodies.
- `supabase/migrations/20260830120000_add_upcar_res_id_index.sql` — the partial unique index.

**Modified files:**
- `app/api/cron/poll-turo-emails/route.ts` — becomes a thin orchestrator importing from `lib/email-sync/`; adds the second (Upcar) Gmail search.
- `app/(dashboard)/dashboard/integrations/turo/FeedManager.tsx` — copy-only change (heading + disclaimer mention Upcar).

**Unchanged (verify still green):**
- `__tests__/lib/google-calendar.test.ts`, `__tests__/lib/overlap.test.ts`, and the rest of `npm test`.
- `netlify/functions/poll-turo-emails.js`, the `pg_cron` job.

---

## Task 1: Extract `lib/email-sync/` — pure refactor, zero behavior change

Move the route's internals into modules with no logic changes, so Upcar code has a clean surface to attach to. `parseTuroEmail` is currently private to the route and imported nowhere else (verified: `grep -rn parseTuroEmail` returns only the route), so this is a safe move.

**Files:**
- Create: `lib/email-sync/types.ts`
- Create: `lib/email-sync/shared.ts`
- Create: `lib/email-sync/turo.ts`
- Modify: `app/api/cron/poll-turo-emails/route.ts` (replace internals with imports)

**Interfaces:**
- Consumes: nothing (first task).
- Produces:
  - `types.ts`:
    ```ts
    export interface EmailSync {
      id: string
      tenant_id: string
      gmail_address: string
      access_token: string
      refresh_token: string
      app_specific_password?: string
      provider?: string
      last_checked?: string
    }
    export interface ParsedEmail {
      type: 'confirm' | 'modify' | 'cancel' | 'return'
      messageId: string
      reservationId: string | null
      customer_name: string | null
      vehicle_name?: string
      pickup_date: string | null
      return_date: string | null
      pickup_time?: string | null      // NEW — 24h "HH:MM", Turo leaves undefined
      return_time?: string | null      // NEW
      customer_phone?: string | null   // NEW
      customer_dob?: string | null     // NEW — "YYYY-MM-01"
      total_amount?: number | null
      source?: 'turo' | 'upcar'
      status?: string
    }
    export interface ExistingReservation { id: string; status: string | null }
    export interface PollConfig {
      fromAddress: string
      parse: (body: string, subject: string, messageId: string) => ParsedEmail | null
    }
    ```
  - `shared.ts` (all moved verbatim from the route, only `import` lines adjusted):
    `refreshAccessToken(sync: EmailSync): Promise<string>`,
    `sleep(ms: number): Promise<void>`,
    `claimSync(syncId: string): Promise<boolean>`,
    `releaseSync(syncId: string): Promise<void>`,
    `gmailFetch(path: string, sync: EmailSync, attempt?: number): Promise<any>`,
    `getMessageBody(payload: GmailPart): string`,
    `getImapBody(rawEmail: string | Buffer): string`,
    `findCarId(tenantId: string, vehicleName: string | undefined): Promise<number | null>`,
    `findExistingReservation(parsed: ParsedEmail, tenantId: string): Promise<ExistingReservation | null>`,
    `processEmail(parsed: ParsedEmail, sync: EmailSync): Promise<void>`,
    plus exported consts `GMAIL_BASE`, `GOOGLE_TOKEN_URL`, `CURSOR_LOOKBACK_MS`, `SYNC_LOCK_STALE_MS`, `PROTECTED_STATUSES`, and the `GmailPart` interface.
  - `turo.ts`: `parseTuroEmail(body: string, subject: string, messageId: string): ParsedEmail | null` (moved verbatim), plus its private helpers `parseTuroDate`, `parseSlashDate`, and `MONTH_MAP` (keep `MONTH_MAP` here — Upcar defines its own).

- [ ] **Step 1: Create `lib/email-sync/types.ts`**

Paste the type block from the Interfaces section above. These are the only new fields vs. today: `pickup_time`, `return_time`, `customer_phone`, `customer_dob` on `ParsedEmail`, and the `source` union narrows `string` → `'turo' | 'upcar'`.

- [ ] **Step 2: Create `lib/email-sync/shared.ts` by moving code from the route**

Cut these from `app/api/cron/poll-turo-emails/route.ts` and paste into `shared.ts`, unchanged except imports:
- consts: `GMAIL_BASE`, `GOOGLE_TOKEN_URL`, `CURSOR_LOOKBACK_MS`, `SYNC_LOCK_STALE_MS`, `PROTECTED_STATUSES`
- `interface GmailPart`
- functions: `refreshAccessToken`, `sleep`, `claimSync`, `releaseSync`, `gmailFetch`, `getMessageBody`, `decodeMimePart`, `extractMimeParts`, `getImapBody`, `findCarId`, `findExistingReservation`, `processEmail`

Top of `shared.ts`:
```ts
import { createAdminClient } from '@/lib/supabase/admin'
import { generateBookingCode } from '@/lib/booking-code'
import type { EmailSync, ParsedEmail, ExistingReservation } from './types'

export const GMAIL_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me'
export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
export const CURSOR_LOOKBACK_MS = 3 * 24 * 60 * 60 * 1000
export const SYNC_LOCK_STALE_MS = 2 * 60 * 1000
export const PROTECTED_STATUSES = new Set(['active', 'completed'])
```
Mark every moved function `export`. Delete the local `EmailSync` / `ParsedEmail` / `ExistingReservation` interface declarations that were in the route (they now come from `./types`).

Do NOT change any function body in this step. `processEmail` gets its Upcar changes in Task 4.

- [ ] **Step 3: Create `lib/email-sync/turo.ts` by moving the Turo parser**

Cut `MONTH_MAP`, `parseTuroDate`, `parseSlashDate`, and `parseTuroEmail` from the route into `turo.ts`:
```ts
import type { ParsedEmail } from './types'

const MONTH_MAP: Record<string, string> = { /* unchanged */ }
function parseTuroDate(str: string): string | null { /* unchanged */ }
function parseSlashDate(str: string): string | null { /* unchanged */ }
export function parseTuroEmail(body: string, subject: string, messageId: string): ParsedEmail | null { /* unchanged */ }
```
The parser body is unchanged. It already sets `source: 'turo'` on confirm/modify — leave that.

- [ ] **Step 4: Rewrite the route as an orchestrator**

`app/api/cron/poll-turo-emails/route.ts` keeps: `export const dynamic`, `verifyCronSecret`, `pollGmail`, `pollIcloud`, and `GET`. It imports everything else. In THIS task `pollGmail` still only searches Turo — the Upcar wiring is Task 4. New top of file:
```ts
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  GMAIL_BASE, GOOGLE_TOKEN_URL, CURSOR_LOOKBACK_MS,
  refreshAccessToken, gmailFetch, getMessageBody, getImapBody,
  claimSync, releaseSync, processEmail,
} from '@/lib/email-sync/shared'
import { parseTuroEmail } from '@/lib/email-sync/turo'
import type { EmailSync } from '@/lib/email-sync/types'
```
Inside `pollGmail`, the search query line stays `const query = \`from:noreply@mail.turo.com after:${afterTimestamp}\`` and it still calls `parseTuroEmail(body, subject, msg.id)`. Inside `pollIcloud`, unchanged. `GET` unchanged.

Delete the now-duplicated helper definitions from the route.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. (Fix import paths / missing `export` keywords only.)

- [ ] **Step 6: Run the full test suite**

Run: `npm test`
Expected: PASS — same set of passing tests as before this task. `__tests__/lib/google-calendar.test.ts` and `__tests__/lib/overlap.test.ts` in particular must be green.

- [ ] **Step 7: Build**

Run: `npm run build`
Expected: build succeeds (this is what Netlify runs; a lint/type failure here silently keeps the old site live — see project memory `feedback_verify_netlify_deploy_after_push`).

- [ ] **Step 8: Commit**

```bash
git add lib/email-sync app/api/cron/poll-turo-emails/route.ts
git commit -m "refactor: extract poll-turo-emails internals into lib/email-sync"
```

---

## Task 2: Database migration — `uniq_upcar_res_id` index

**Files:**
- Create: `supabase/migrations/20260830120000_add_upcar_res_id_index.sql`

**Interfaces:**
- Consumes: nothing.
- Produces: a partial unique index enforcing one `reservations` row per Upcar booking id.

- [ ] **Step 1: Write the migration**

`supabase/migrations/20260830120000_add_upcar_res_id_index.sql`:
```sql
-- Dedup Upcar-sourced reservations by the Upcar booking id embedded in `notes`
-- (marker: "Upcar-Res #<id>"). Mirrors uniq_turo_res_id. The id is stable across
-- a booking's accept / modify / car-swap / cancel emails, so all of them update
-- the one row instead of inserting duplicates under concurrent poll runs.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_upcar_res_id
  ON public.reservations ((substring(notes from 'Upcar-Res #([0-9]+)')))
  WHERE source = 'upcar' AND notes ~ 'Upcar-Res #[0-9]+';
```

- [ ] **Step 2: Apply it to the database**

Use the Supabase MCP `apply_migration` tool (project ref `brwzjwbpguiignrxvjdc`), name `add_upcar_res_id_index`, with the SQL above.
Expected: success, no rows affected (no `source='upcar'` rows exist yet).

- [ ] **Step 3: Verify the index exists**

Run via Supabase MCP `execute_sql`:
```sql
select indexname from pg_indexes where tablename = 'reservations' and indexname = 'uniq_upcar_res_id';
```
Expected: one row.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260830120000_add_upcar_res_id_index.sql
git commit -m "feat: add uniq_upcar_res_id partial index for Upcar dedup"
```

---

## Task 3: `parseUpcarEmail` + unit tests (TDD)

The core of the feature. Build the parser test-first against real captured email bodies.

**Files:**
- Create: `lib/email-sync/upcar.ts`
- Create: `__tests__/lib/email-sync/upcar.test.ts`
- Create: `__tests__/lib/email-sync/fixtures/upcar/accepted.txt`
- Create: `__tests__/lib/email-sync/fixtures/upcar/modification-approved.txt`
- Create: `__tests__/lib/email-sync/fixtures/upcar/car-swap-accepted.txt`
- Create: `__tests__/lib/email-sync/fixtures/upcar/booking-request.txt`
- Create: `__tests__/lib/email-sync/fixtures/upcar/check-out.txt`

**Interfaces:**
- Consumes: `ParsedEmail` from `@/lib/email-sync/types`.
- Produces: `parseUpcarEmail(body: string, subject: string, messageId: string): ParsedEmail | null`
  - Accepted email → `{ type: 'confirm', source: 'upcar', status: 'confirmed', reservationId, customer_name, customer_phone, customer_dob, vehicle_name, pickup_date, return_date, pickup_time, return_time, total_amount }`
  - Modification email → `{ type: 'modify', source: 'upcar', reservationId, customer_name, vehicle_name, pickup_date, return_date, pickup_time, return_time, total_amount }` (status omitted)
  - Car swap email → `{ type: 'modify', source: 'upcar', reservationId, vehicle_name, pickup_date: null, return_date: null }` (only the car changed)
  - Cancellation email → `{ type: 'cancel', source: 'upcar', reservationId, customer_name, pickup_date: null, return_date: null }`
  - Anything else → `null`

- [ ] **Step 1: Create the fixture files**

`__tests__/lib/email-sync/fixtures/upcar/accepted.txt` — exact plain-text body of the "Accepted" email:
```
| # Booking Accepted! Hi Ayrton Lohigorry, Great news! You have accepted a booking request for Audi Q3 2018 from Justin Taylor. Booking Details: Booking ID: 17776 Guest: Justin Taylor Guest Phone: +19292588593 Guest DL Name: Justin Taylor Guest DOB: 12/1994 Start Date: Fri, Aug 28 - 12:30 PM End Date: Sun, Aug 30 - 10:00 AM Pickup Location: 19707 Turnberry Way, Aventura, FL 33180 Your Earnings: $82.50 Miles Included: 400 Important: Please do not hand over the keys to the guest until the booking start time.
```

`__tests__/lib/email-sync/fixtures/upcar/modification-approved.txt`:
```
| # Hi Ayrton Lohigorry, Great news! A booking modification request has been approved: * Booking ID: 17776 * Car: Audi Q3 2018 * Guest Name: Justin Taylor * Trip start 08/28/2026 12:30 PM 08/28/2026 11:30 AM * Trip end 08/30/2026 10:00 AM * Your Total Earnings: $82.50 You can review the updated booking details by clicking the button below: View Booking Details
```

`__tests__/lib/email-sync/fixtures/upcar/car-swap-accepted.txt`:
```
| # Car Swap Accepted for booking 17776 Hi Ayrton, Justin has accepted your car swap request for booking 17776. Old Car: Audi A3 2017 New Car: Audi Q3 2018 You can view the trip details at: View Trip Details Thank you for using Upcar.
```

`__tests__/lib/email-sync/fixtures/upcar/booking-request.txt`:
```
| # New Booking Request - Action Required Hi Ayrton, You've received a new booking request for your Audi A3 2017 from Justin. ### Booking Request Details Booking ID: 17776 Guest Name: Justin Guest Phone: +19292588593 Guest DL Name: Justin Taylor Guest DOB: 12/1994 Car: Audi A3 2017 License Plate: Eb21YC Start Time: Friday, August 28, 2026 at 1:30 PM End Time: Sunday, August 30, 2026 at 10:00 AM Pickup Location: 19707 Turnberry Way, Aventura, FL, 33180 Your Estimated Earnings: $110.00 The guest is waiting for your response. Note: If you don't respond within 4 hours, this booking will be automatically accepted.
```

`__tests__/lib/email-sync/fixtures/upcar/check-out.txt`:
```
| # Hi Ayrton, Your car rental trip has ended, but you haven't completed the checkout process yet. Please check out to confirm you've received your car back in good condition. ### Trip Details: Trip ID: 17776 Trip End Time: Sunday, August 30th, 2026 at 10:00 AM EDT Car: Audi Q3 2018 Guest: Justin Taylor
```

- [ ] **Step 2: Write the failing test file**

`__tests__/lib/email-sync/upcar.test.ts`:
```ts
/** @jest-environment node */
import { readFileSync } from 'fs'
import { join } from 'path'
import { parseUpcarEmail } from '@/lib/email-sync/upcar'

const fx = (name: string) =>
  readFileSync(join(__dirname, 'fixtures/upcar', name), 'utf-8')

describe('parseUpcarEmail', () => {
  it('parses an Accepted email into a confirm', () => {
    const p = parseUpcarEmail(
      fx('accepted.txt'),
      'Booking 17776 Accepted - Your Car Has Been Booked',
      'msg-accepted',
    )
    expect(p).toMatchObject({
      type: 'confirm',
      source: 'upcar',
      status: 'confirmed',
      reservationId: '17776',
      customer_name: 'Justin Taylor',
      customer_phone: '+19292588593',
      customer_dob: '1994-12-01',
      vehicle_name: 'Audi Q3 2018',
      pickup_date: '2026-08-28',
      return_date: '2026-08-30',
      pickup_time: '12:30',
      return_time: '10:00',
      total_amount: 82.5,
      messageId: 'msg-accepted',
    })
  })

  it('infers the year for the year-less Accepted date from the email received date', () => {
    // received Dec 2026, trip "Jan 3" with no year -> should roll to 2027
    const body = fx('accepted.txt')
      .replace('Fri, Aug 28 - 12:30 PM', 'Sat, Jan 3 - 09:00 AM')
      .replace('Sun, Aug 30 - 10:00 AM', 'Mon, Jan 5 - 11:00 AM')
    const p = parseUpcarEmail(body, 'Booking 17776 Accepted', 'm', new Date('2026-12-20T00:00:00Z'))
    expect(p?.pickup_date).toBe('2027-01-03')
    expect(p?.return_date).toBe('2027-01-05')
  })

  it('parses a Modification Approved email, taking the NEW (not struck-through) datetime', () => {
    const p = parseUpcarEmail(
      fx('modification-approved.txt'),
      'Booking 17776 Modification Approved',
      'msg-mod',
    )
    expect(p).toMatchObject({
      type: 'modify',
      source: 'upcar',
      reservationId: '17776',
      vehicle_name: 'Audi Q3 2018',
      pickup_date: '2026-08-28',
      pickup_time: '11:30',        // the SECOND time on the "Trip start" line
      return_date: '2026-08-30',
      return_time: '10:00',
      total_amount: 82.5,
    })
    expect(p?.status).toBeUndefined()
  })

  it('parses a Car Swap Accepted email as a modify carrying only the new car', () => {
    const p = parseUpcarEmail(
      fx('car-swap-accepted.txt'),
      'Booking 17776 Car Swap Accepted',
      'msg-swap',
    )
    expect(p).toMatchObject({
      type: 'modify',
      source: 'upcar',
      reservationId: '17776',
      vehicle_name: 'Audi Q3 2018',
      pickup_date: null,
      return_date: null,
    })
  })

  it('treats a cancellation subject as a cancel', () => {
    const p = parseUpcarEmail(
      'Hi Ayrton, your booking has been cancelled. Booking ID: 17776 Guest Name: Justin Taylor',
      'Booking 17776 Cancelled',
      'msg-cancel',
    )
    expect(p).toMatchObject({ type: 'cancel', source: 'upcar', reservationId: '17776' })
  })

  it.each([
    ['booking-request.txt', 'Booking 17776 New Booking Request - Action Required'],
    ['check-out.txt', 'Please Check Out Your Trip 17776'],
  ])('ignores %s', (file, subject) => {
    expect(parseUpcarEmail(fx(file), subject, 'm')).toBeNull()
  })

  it.each([
    'Booking 17776 New Message From Justin',
    'New Device Login Alert',
    'Your OTP Code',
    'Complete your Upcar payout setup',
    'Renter DL Photos Submitted for Trip ID: 17776',
    'Upcar is now live in 18 states',
  ])('ignores non-booking subject: %s', (subject) => {
    expect(parseUpcarEmail('some body text', subject, 'm')).toBeNull()
  })

  it('returns null when a required date cannot be parsed', () => {
    const body = fx('accepted.txt').replace('Start Date: Fri, Aug 28 - 12:30 PM', 'Start Date: unknown')
    expect(parseUpcarEmail(body, 'Booking 17776 Accepted', 'm')).toBeNull()
  })
})
```

- [ ] **Step 3: Run it, verify it fails**

Run: `npm test -- upcar.test.ts`
Expected: FAIL — `Cannot find module '@/lib/email-sync/upcar'`.

- [ ] **Step 4: Implement `lib/email-sync/upcar.ts`**

```ts
import type { ParsedEmail } from './types'

const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7,
  august: 8, september: 9, october: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9,
  oct: 10, nov: 11, dec: 12,
}

const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`

function to24h(hour: number, minute: number, ampm: string): string {
  let h = hour % 12
  if (/pm/i.test(ampm)) h += 12
  return `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

// "08/28/2026 12:30 PM" -> { date: "2026-08-28", time: "12:30" }
function parseSlashDateTime(str: string): { date: string; time: string } | null {
  const m = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)/i)
  if (!m) return null
  return {
    date: iso(+m[3], +m[1], +m[2]),
    time: to24h(+m[4], +m[5], m[6]),
  }
}

// "Fri, Aug 28 - 12:30 PM" (no year) or "Friday, August 28, 2026 at 1:30 PM"
function parseNamedDateTime(
  str: string,
  reference: Date,
): { date: string; time: string } | null {
  // with explicit year
  let m = str.match(/([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4}).*?(\d{1,2}):(\d{2})\s*(AM|PM)/i)
  if (m && MONTHS[m[1].toLowerCase()]) {
    return { date: iso(+m[3], MONTHS[m[1].toLowerCase()], +m[2]), time: to24h(+m[4], +m[5], m[6]) }
  }
  // no year — infer from the email received date
  m = str.match(/([A-Za-z]{3,}),?\s+(\d{1,2})\s*[-–]\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i)
  if (m && MONTHS[m[1].toLowerCase()]) {
    const month = MONTHS[m[1].toLowerCase()]
    const day = +m[2]
    let year = reference.getUTCFullYear()
    // an accepted booking never starts materially before the email that announced it
    const candidate = Date.UTC(year, month - 1, day)
    if (candidate < reference.getTime() - 2 * 24 * 60 * 60 * 1000) year += 1
    return { date: iso(year, month, day), time: to24h(+m[3], +m[4], m[5]) }
  }
  return null
}

function bookingId(subject: string, body: string): string | null {
  return (
    subject.match(/Booking\s+(\d+)/i)?.[1] ??
    subject.match(/Trip\s+(?:ID:?\s*)?(\d+)/i)?.[1] ??
    body.match(/Booking ID:?\s*(\d+)/i)?.[1] ??
    body.match(/Trip ID:?\s*(\d+)/i)?.[1] ??
    null
  )
}

function guestName(body: string): string | null {
  const m =
    body.match(/Guest DL Name:?\s*([A-Za-z][A-Za-z .'’-]+?)(?=\s+(?:Guest|Booking|Start|Trip|Pickup|Car|DOB|License|Your)\b|\s*$)/i) ||
    body.match(/Guest Name:?\s*([A-Za-z][A-Za-z .'’-]+?)(?=\s+(?:Guest|Booking|Start|Trip|Pickup|Car|DOB|License|Message|Your)\b|\s*$)/i) ||
    body.match(/Guest:?\s*([A-Za-z][A-Za-z .'’-]+?)(?=\s+(?:Guest|Booking|Start|Trip|Pickup|Car|DOB|License|Your)\b|\s*$)/i)
  return m ? m[1].trim() : null
}

function vehicleName(body: string): string | undefined {
  const m =
    body.match(/New Car:?\s*(.+?)(?=\s*(?:You can|$|\n))/i) ||
    body.match(/\bCar:?\s*(.+?)(?=\s*(?:\*|Guest|License|You can|$|\n))/i) ||
    body.match(/booking request for (.+?) from /i)
  if (!m) return undefined
  return m[1].replace(/\s+at\s+.+$/i, '').trim()
}

function earnings(body: string): number | null {
  const m = body.match(/Your (?:Estimated |Total )?(?:Total )?Earnings:?\s*\$([0-9,]+(?:\.\d{2})?)/i)
  return m ? parseFloat(m[1].replace(/,/g, '')) : null
}

function phone(body: string): string | null {
  const m = body.match(/Guest Phone:?\s*(\+?[\d][\d\s()-]{6,}\d)/i)
  return m ? m[1].replace(/[^\d+]/g, '') : null
}

function dob(body: string): string | null {
  const m = body.match(/Guest DOB:?\s*(\d{1,2})\/(\d{4})/i)
  return m ? `${m[2]}-${String(+m[1]).padStart(2, '0')}-01` : null
}

/**
 * Parse an Upcar host email (`support@upcar.ai`) into a ParsedEmail, or null if
 * it is not a booking lifecycle email we act on.
 *
 * @param reference  the email's received date, used to infer the year on the
 *                   year-less "Start Date: Fri, Aug 28" format. Defaults to now.
 */
export function parseUpcarEmail(
  body: string,
  subject: string,
  messageId: string,
  reference: Date = new Date(),
): ParsedEmail | null {
  const s = subject
  const isAccepted = /\bAccepted\b|Car Has Been Booked/i.test(s)
  const isModification = /Modification (?:Approved|Auto-Approved)/i.test(s)
  const isCarSwap = /Car Swap Accepted/i.test(s)
  const isCancel = /\b(cancell?ed|cancel|declined)\b/i.test(s)

  // Explicitly ignored booking-adjacent emails
  if (
    /New Booking Request|Change Requested|New Message From|Please Check Out|Vehicle Not Returned|DL Photos|Device Login|OTP|payout setup|Listing Approved/i.test(s)
  ) {
    return null
  }
  if (!isAccepted && !isModification && !isCarSwap && !isCancel) return null

  const reservationId = bookingId(s, body)

  if (isCancel) {
    return {
      type: 'cancel', source: 'upcar', messageId, reservationId,
      customer_name: guestName(body), pickup_date: null, return_date: null,
    }
  }

  if (isCarSwap) {
    // TODO(upcar): a swap email carries no dates — only the new car. Update car_id only.
    return {
      type: 'modify', source: 'upcar', messageId, reservationId,
      customer_name: guestName(body), vehicle_name: vehicleName(body),
      pickup_date: null, return_date: null,
    }
  }

  // Accepted + Modification both carry dates/times/earnings
  let pickup: { date: string; time: string } | null = null
  let ret: { date: string; time: string } | null = null

  if (isModification) {
    // "Trip start <old> <new>"  — the LAST datetime before "Trip end" is the new value
    const startBlock = body.match(/Trip start\b([\s\S]*?)Trip end\b/i)?.[1] ?? ''
    const endBlock = body.match(/Trip end\b([\s\S]*?)(?:Your (?:Total )?Earnings|View Booking|$)/i)?.[1] ?? ''
    const lastDT = (blk: string) => {
      const all = blk.match(/\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}\s*(?:AM|PM)/gi)
      return all?.length ? parseSlashDateTime(all[all.length - 1]) : null
    }
    pickup = lastDT(startBlock)
    ret = lastDT(endBlock)
  } else {
    const startStr = body.match(/Start (?:Date|Time):?\s*(.+?)(?=\s+End (?:Date|Time):)/i)?.[1] ?? ''
    const endStr = body.match(/End (?:Date|Time):?\s*(.+?)(?=\s+(?:Pickup|Return|Your|Miles|Important|$))/i)?.[1] ?? ''
    pickup = parseNamedDateTime(startStr, reference)
    ret = parseNamedDateTime(endStr, reference)
  }

  if (!pickup || !ret) return null

  return {
    type: isModification ? 'modify' : 'confirm',
    source: 'upcar',
    messageId,
    reservationId,
    customer_name: guestName(body),
    customer_phone: isAccepted ? phone(body) : null,
    customer_dob: isAccepted ? dob(body) : null,
    vehicle_name: vehicleName(body),
    pickup_date: pickup.date,
    pickup_time: pickup.time,
    return_date: ret.date,
    return_time: ret.time,
    total_amount: earnings(body),
    ...(isModification ? {} : { status: 'confirmed' }),
  }
}
```

- [ ] **Step 5: Run the tests, iterate to green**

Run: `npm test -- upcar.test.ts`
Expected: all PASS. If a regex misses on the real fixture text, adjust the regex in `upcar.ts` (not the test expectations, unless an expectation is wrong about the real data). Common fixups: the `vehicleName` / `guestName` lookahead label list, the earnings label alternation.

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add lib/email-sync/upcar.ts __tests__/lib/email-sync
git commit -m "feat: add parseUpcarEmail with unit tests"
```

---

## Task 4: Wire Upcar into the poll route + `processEmail`

Run a second Gmail search for `support@upcar.ai` and make the shared upsert path Upcar-aware (provider marker, partial update for car-swap/modify, new columns).

**Files:**
- Modify: `lib/email-sync/shared.ts` (`processEmail`, `findExistingReservation`)
- Modify: `app/api/cron/poll-turo-emails/route.ts` (`pollGmail` takes a `PollConfig`; `GET` calls it twice)
- Create: `__tests__/lib/email-sync/process-upcar.test.ts`

**Interfaces:**
- Consumes: `parseUpcarEmail` (Task 3), `parseTuroEmail` (Task 1), `ParsedEmail` / `PollConfig` / `EmailSync` (Task 1), `uniq_upcar_res_id` (Task 2).
- Produces:
  - `pollGmail(sync: EmailSync, config: PollConfig, msgErrors?: string[]): Promise<number>`
  - `processEmail` handling `parsed.source === 'upcar'`:
    - `cancel` → set `status='cancelled'` on the matched row (unchanged shape).
    - `confirm` → insert with `source:'upcar'`, `notes` marker `Upcar #<msgId> Upcar-Res #<id>`, plus `pickup_time`/`return_time`/`customer_phone`/`customer_dob` when present; or update an existing row.
    - `modify` → **partial** update: only write `pickup_date`,`return_date`,`pickup_time`,`return_time`,`total_amount`,`car_id`,`vehicle` fields that are non-null in `parsed`; still respect `PROTECTED_STATUSES`; never touch `status`.
  - `findExistingReservation` matches Upcar rows via `notes like '%Upcar-Res #<id>%'`.

- [ ] **Step 1: Write the failing `processEmail` test**

`__tests__/lib/email-sync/process-upcar.test.ts`:
```ts
/** @jest-environment node */
import { processEmail } from '@/lib/email-sync/shared'
import type { ParsedEmail, EmailSync } from '@/lib/email-sync/types'

const rows: any[] = []
const state = { existing: null as any }

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          eq: () => ({ like: () => ({ limit: () => Promise.resolve({ data: state.existing ? [state.existing] : [], error: null }) }) }),
          like: () => ({ limit: () => Promise.resolve({ data: state.existing ? [state.existing] : [], error: null }) }),
        }),
      }),
      insert: (payload: any) => { rows.push(payload); return Promise.resolve({ error: null }) },
      update: (payload: any) => ({ eq: () => { rows.push({ __update: payload }); return Promise.resolve({ data: null, error: null }) } }),
    }),
  }),
}))
jest.mock('@/lib/booking-code', () => ({ generateBookingCode: () => 'E-TEST01' }))

const sync = { id: 's1', tenant_id: 't1' } as EmailSync
beforeEach(() => { rows.length = 0; state.existing = null })

const confirm: ParsedEmail = {
  type: 'confirm', source: 'upcar', messageId: 'm1', reservationId: '17776',
  customer_name: 'Justin Taylor', customer_phone: '+19292588593', customer_dob: '1994-12-01',
  vehicle_name: 'Audi Q3 2018', pickup_date: '2026-08-28', pickup_time: '12:30',
  return_date: '2026-08-30', return_time: '10:00', total_amount: 82.5, status: 'confirmed',
}

it('inserts an Upcar confirm with the Upcar-Res marker and time/phone/dob', async () => {
  await processEmail(confirm, sync)
  expect(rows).toHaveLength(1)
  expect(rows[0]).toMatchObject({
    source: 'upcar', customer_name: 'Justin Taylor', customer_phone: '+19292588593',
    customer_dob: '1994-12-01', pickup_time: '12:30', return_time: '10:00',
    booking_code: 'E-TEST01',
  })
  expect(rows[0].notes).toContain('Upcar-Res #17776')
})

it('car-swap modify updates only car/vehicle, not dates', async () => {
  state.existing = { id: 'r1', status: 'confirmed' }
  const swap: ParsedEmail = {
    type: 'modify', source: 'upcar', messageId: 'm2', reservationId: '17776',
    customer_name: 'Justin Taylor', vehicle_name: 'Audi Q3 2018',
    pickup_date: null, return_date: null,
  }
  await processEmail(swap, sync)
  const upd = rows.find((r) => r.__update)?.__update
  expect(upd).toBeDefined()
  expect(upd).not.toHaveProperty('pickup_date')
  expect(upd).not.toHaveProperty('status')
})

it('does not regress a protected (completed) status on modify', async () => {
  state.existing = { id: 'r1', status: 'completed' }
  const mod: ParsedEmail = {
    type: 'modify', source: 'upcar', messageId: 'm3', reservationId: '17776',
    customer_name: 'Justin Taylor', pickup_date: '2026-08-28', pickup_time: '11:30',
    return_date: '2026-08-30', return_time: '10:00', total_amount: 82.5,
  }
  await processEmail(mod, sync)
  const upd = rows.find((r) => r.__update)?.__update
  expect(upd).not.toHaveProperty('status')
  expect(upd.pickup_time).toBe('11:30')
})
```

- [ ] **Step 2: Run it, verify it fails**

Run: `npm test -- process-upcar.test.ts`
Expected: FAIL (assertions on `source`/`notes`/partial-update not yet satisfied — likely the marker still says `Turo`).

- [ ] **Step 3: Update `findExistingReservation` in `shared.ts`**

Add the Upcar branch before the message-id fallback:
```ts
if (parsed.source === 'upcar' && parsed.reservationId) {
  const { data, error } = await supabase
    .from('reservations')
    .select('id, status')
    .eq('tenant_id', tenantId)
    .like('notes', `%Upcar-Res #${parsed.reservationId}%`)
    .limit(1)
  if (error) throw new Error(`Existing-reservation lookup by Upcar-Res # failed: ${error.message}`)
  if (data?.[0]) return data[0]
}
```
Keep the existing Turo-Res # and message-id branches. Also generalise the message-id fallback marker match from `Turo #` to `(?:Turo|Upcar) #` so re-fetches of an Upcar email with no id still dedupe:
```ts
.like('notes', `%${parsed.source === 'upcar' ? 'Upcar' : 'Turo'} #${parsed.messageId}%`)
```

- [ ] **Step 4: Update `processEmail` in `shared.ts`**

```ts
export async function processEmail(parsed: ParsedEmail, sync: EmailSync): Promise<void> {
  const supabase = createAdminClient()
  const provider = parsed.source === 'upcar' ? 'Upcar' : 'Turo'

  if (parsed.type === 'cancel') {
    const existing = await findExistingReservation(parsed, sync.tenant_id)
    if (existing) await supabase.from('reservations').update({ status: 'cancelled' }).eq('id', existing.id)
    return
  }

  if (parsed.type === 'return') {                          // Turo-only
    const existing = await findExistingReservation(parsed, sync.tenant_id)
    if (existing && parsed.total_amount != null) {
      await supabase.from('reservations').update({ total_amount: parsed.total_amount }).eq('id', existing.id)
    }
    return
  }

  const existing = await findExistingReservation(parsed, sync.tenant_id)
  const carId = await findCarId(sync.tenant_id, parsed.vehicle_name)
  const ref = `${provider} #${parsed.messageId}${parsed.reservationId ? ` ${provider}-Res #${parsed.reservationId}` : ''}`
  const notes = carId ? ref : `${ref} [vehicle: ${parsed.vehicle_name || 'unknown'}]`

  if (existing) {
    const preserveStatus = PROTECTED_STATUSES.has(existing.status ?? '')
    const update: Record<string, unknown> = { notes }
    // Turo confirm/modify always carries full dates -> keep writing them unconditionally.
    // Upcar modify/car-swap can be partial -> only write provided fields.
    const writeIfSet = (k: string, v: unknown) => { if (v != null) update[k] = v }
    if (parsed.source === 'upcar') {
      writeIfSet('pickup_date', parsed.pickup_date)
      writeIfSet('return_date', parsed.return_date)
      writeIfSet('pickup_time', parsed.pickup_time)
      writeIfSet('return_time', parsed.return_time)
      writeIfSet('total_amount', parsed.total_amount)
      if (carId) update.car_id = carId
    } else {
      update.pickup_date = parsed.pickup_date
      update.return_date = parsed.return_date
      update.total_amount = parsed.total_amount
      if (carId) update.car_id = carId
      if (!preserveStatus) update.status = parsed.status
    }
    await supabase.from('reservations').update(update).eq('id', existing.id)
  } else {
    const { error: insertError } = await supabase.from('reservations').insert({
      tenant_id: sync.tenant_id,
      car_id: carId,
      customer_name: parsed.customer_name,
      ...(parsed.customer_phone ? { customer_phone: parsed.customer_phone } : {}),
      ...(parsed.customer_dob ? { customer_dob: parsed.customer_dob } : {}),
      pickup_date: parsed.pickup_date,
      return_date: parsed.return_date,
      ...(parsed.pickup_time ? { pickup_time: parsed.pickup_time } : {}),
      ...(parsed.return_time ? { return_time: parsed.return_time } : {}),
      total_amount: parsed.total_amount,
      status: parsed.status,
      source: parsed.source,
      notes,
      booking_code: generateBookingCode(),
    })
    if (insertError) throw new Error(`Insert failed for ${parsed.messageId}: ${insertError.message}`)
  }
}
```
Note the Turo `else` branch is the exact current behavior — no Turo regression.

- [ ] **Step 5: Run the process test + full suite**

Run: `npm test -- process-upcar.test.ts` then `npm test`
Expected: new test PASS; whole suite green.

- [ ] **Step 6: Make `pollGmail` take a `PollConfig` in the route**

In `app/api/cron/poll-turo-emails/route.ts`:
```ts
import { parseUpcarEmail } from '@/lib/email-sync/upcar'
import type { EmailSync, PollConfig } from '@/lib/email-sync/types'

const TURO_CONFIG: PollConfig = { fromAddress: 'noreply@mail.turo.com', parse: parseTuroEmail }
const UPCAR_CONFIG: PollConfig = { fromAddress: 'support@upcar.ai', parse: parseUpcarEmail }
```
Change `pollGmail(sync, msgErrors?)` → `pollGmail(sync, config, msgErrors?)`. Inside:
```ts
const query = `from:${config.fromAddress} after:${afterTimestamp}`
// ...
const parsed = config.parse(body, subject, msg.id)
```
`pollIcloud` stays Turo-only; internally it can call `parseTuroEmail` directly (no signature change needed) — or accept `config` and ignore all but Turo. Simplest: leave `pollIcloud` untouched.

- [ ] **Step 7: Call both searches in `GET`**

In the per-sync loop, replace the single Gmail call:
```ts
const synced =
  sync.provider === 'icloud'
    ? await pollIcloud(sync)
    : (await pollGmail(sync, TURO_CONFIG, errorDetails)) +
      (await pollGmail(sync, UPCAR_CONFIG, errorDetails))
```
Everything else in `GET` (claim lock, `last_checked` update, error→deactivate) is unchanged and correctly wraps both.

- [ ] **Step 8: Typecheck, test, build**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: all green.

- [ ] **Step 9: Commit**

```bash
git add lib/email-sync/shared.ts app/api/cron/poll-turo-emails/route.ts __tests__/lib/email-sync/process-upcar.test.ts
git commit -m "feat: poll support@upcar.ai and upsert Upcar bookings via shared path"
```

---

## Task 5: Dashboard copy — mention Upcar

**Files:**
- Modify: `app/(dashboard)/dashboard/integrations/turo/FeedManager.tsx`

**Interfaces:**
- Consumes / Produces: none (static copy).

- [ ] **Step 1: Update three strings**

In `FeedManager.tsx`:
- Line ~103: `Turo Email Reader` → `Turo & Upcar Email Reader`
- Line ~104-106 paragraph → `Automatically sync new bookings, modifications, and cancellations directly from your Turo and Upcar emails.`
- Line ~186 disclaimer → `*We only read emails from noreply@mail.turo.com and support@upcar.ai. You must use an App-Specific Password.`

Leave `page.tsx` (`PageHeader title="Turo"`) and all behavior unchanged.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/dashboard/integrations/turo/FeedManager.tsx"
git commit -m "feat: note Upcar sync in the email reader card"
```

---

## Task 6: Deploy, backfill, verify

**Files:** none (operational).

- [ ] **Step 1: Push**

```bash
git push origin main
```

- [ ] **Step 2: Confirm the Netlify build went green**

Use the Netlify API (token in `.env.local` / project memory) to check the latest deploy for site `aca8175e-457e-4e87-b38b-1c5ca1e03dc8` reached `state: "ready"`. A failed build (ESLint/type error) silently leaves the old site live — see memory `feedback_verify_netlify_deploy_after_push`. If it failed, read the build log, fix, recommit, repush.

- [ ] **Step 3: Backfill existing Upcar emails**

Booking #17776's emails are from 2026-08-28 — older than the 3-day cursor lookback. The current `last_checked` is recent, so a plain "Sync Now" will not reach them. Options, in order of preference:
1. Temporarily set the cursor back: via Supabase MCP `execute_sql`
   `update turo_email_syncs set last_checked = now() - interval '10 days' where gmail_address = 'ayrtonn.lg@gmail.com';`
   then trigger the cron route once (curl with `Authorization: Bearer <CRON_SECRET>` — value in Netlify env / Supabase Vault `cron_secret`), then let the next scheduled run re-advance `last_checked`.
2. If a wider one-off is needed later, add the same kind of `?sinceDays=` debug branch the Turo backfill used (then remove it).

Reprocessing is idempotent via `uniq_upcar_res_id`.

- [ ] **Step 4: Verify booking #17776 landed correctly**

Via Supabase MCP `execute_sql`:
```sql
select r.customer_name, r.customer_phone, r.customer_dob, r.pickup_date, r.pickup_time,
       r.return_date, r.return_time, r.total_amount, r.status, r.source, r.notes,
       c.make, c.model, c.year
from reservations r left join cars c on c.id = r.car_id
where r.source = 'upcar' and r.notes like '%Upcar-Res #17776%';
```
Expected exactly one row:
- `customer_name` = `Justin Taylor`, `customer_phone` = `+19292588593`, `customer_dob` = `1994-12-01`
- `pickup_date` = `2026-08-28`, `pickup_time` = `12:30` (or `11:30` if the modification email was processed last — either is correct, whichever email is newest)
- `return_date` = `2026-08-30`, `return_time` = `10:00`
- `total_amount` = `82.50`, `status` = `confirmed`, `source` = `upcar`
- car resolves to the Audi Q3 2018 (the final car after the swap), or Audi A3 2017 if the swap email sorted earlier — check which Upcar email has the latest `internalDate` and confirm the row matches it
- `notes` contains `Upcar #<msgId> Upcar-Res #17776`

- [ ] **Step 5: Verify no duplicate + no Turo regression**

```sql
select source, count(*) from reservations group by source;   -- turo count unchanged (was 30), upcar >= 1
select count(*) from reservations where notes like '%Upcar-Res #17776%';  -- exactly 1
```

- [ ] **Step 6: Run "Sync Now" from the dashboard once**

Confirm it returns `Sync complete — N booking(s) processed.` and does not error, and that a second immediate click reports the lock or `0` processed (no duplicate row created).

- [ ] **Step 7: Log to Notion**

Per `CLAUDE.md`, add a Dev Log entry ([Dev Log — Changelog](https://app.notion.com/34142609acfe81318e2cd64751dc48fe)): date 2026-08-30, files touched (`lib/email-sync/*`, `app/api/cron/poll-turo-emails/route.ts`, `FeedManager.tsx`, migration), status complete, VERIFIED line listing the #17776 checks above. Also update [Active Projects](https://www.notion.so/33a42609acfe8122ba7af19c3ef0f03c) if an Upcar/Turo sync item exists there.

- [ ] **Step 8: Update project memory**

Append to `project_turo_email_sync.md` (or add a sibling `project_upcar_email_sync.md` and link it): Upcar rides the same `turo_email_syncs` Gmail row; parser in `lib/email-sync/upcar.ts`; dedup via `uniq_upcar_res_id` on `Upcar-Res #<id>`; cancellation subject pattern is a guess pending a real sample; the poll route now runs two Gmail searches. Add the pointer line to `MEMORY.md`.

---

## Self-Review

**1. Spec coverage:**
- "Ride existing Gmail connection, no new OAuth/table/cron" → Task 4 (second `pollGmail` call, same route/row). ✓
- "Extract into `lib/email-sync/`, move Turo parser verbatim" → Task 1. ✓
- `parseUpcarEmail` types (accepted/modify/car-swap/cancel/ignored) → Task 3. ✓
- Date/time quirks (year-less, full-year, modification old+new) → Task 3 `parseNamedDateTime` / `parseSlashDateTime` / modification "last datetime" logic + tests. ✓
- Capture times → `ParsedEmail.pickup_time/return_time` (Task 1), populated (Task 3), written (Task 4). ✓
- Dedup index `uniq_upcar_res_id` → Task 2. ✓
- `findExistingReservation` Upcar branch → Task 4 Step 3. ✓
- `processEmail` provider-aware marker + partial update → Task 4 Step 4. ✓
- Ignore booking request (no pending rows) + ignore trip-ended → Task 3 ignore list + tests. ✓
- Cancellation heuristic + TODO → Task 3 (`isCancel`, TODO comment) + spec risk table. ✓
- UI copy change, keep "Turo" title → Task 5. ✓
- Rollout: deploy, verify Netlify, backfill older-than-lookback #17776, verify row, Notion → Task 6. ✓
- `PROTECTED_STATUSES` still guards Upcar modify → Task 4 test "does not regress a protected status". ✓

**2. Placeholder scan:** No "TBD"/"handle edge cases"/"similar to Task N". The one `TODO(upcar)` comment is intentional (unverifiable cancellation format, no sample exists) and is called out in the spec's risk table. Backfill "option 2" references the historical Turo `?sinceDays=` approach but option 1 is fully specified and sufficient.

**3. Type consistency:**
- `parseUpcarEmail(body, subject, messageId, reference?)` — 4th arg used in Task 3 tests and Task 4 is consistent (route passes 3 args; default `new Date()` applies — acceptable, the 15-min cadence makes "now" a fine reference for fresh emails; only the historical backfill of a year-less date could drift, and #17776's emails carry full `MM/DD/YYYY` in the modification path).
- `PollConfig { fromAddress, parse }` — defined Task 1, consumed Task 4. `parse` signature `(body, subject, messageId) => ParsedEmail | null` matches both `parseTuroEmail` and `parseUpcarEmail` (the optional 4th `reference` arg is compatible). ✓
- `pollGmail(sync, config, msgErrors?)` — consistent Task 4 Steps 6–7. ✓
- `processEmail` / `findExistingReservation` / `findCarId` signatures unchanged from the original route. ✓
- `notes` marker string `${provider} #${messageId} ${provider}-Res #${id}` — matches the `%Upcar-Res #<id>%` LIKE in `findExistingReservation` and the migration regex `Upcar-Res #([0-9]+)`. ✓
