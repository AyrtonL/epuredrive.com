# Upcar Email Booking Sync — Design

**Date:** 2026-08-30
**Status:** Approved, pending implementation plan
**Related:** `2026-03-28-turo-email-sync-design.md`, `2026-03-28-icloud-email-sync-design.md`

## Problem

The operator lists the same fleet on **Upcar** (`upcar.ai`) in addition to Turo.
Upcar bookings do not currently appear anywhere in the app. They need to flow
into the `reservations` table automatically, the same way Turo bookings do.

## Goals

- New Upcar bookings, modifications, and car swaps appear as `reservations`
  automatically, with no manual entry.
- Reuse the existing Gmail connection and cron — no second OAuth flow, no new
  credentials table, no new scheduled job.
- Capture pickup/return **times** (Upcar emails include them), feeding the
  time-aware overlap detection added in commit `d3fe5cd`.

## Non-Goals

- No pre-acceptance "pending" reservations. A booking appears only once Upcar
  has accepted it (explicit accept or the 4-hour auto-accept).
- No auto-completion of trips from the "trip ended / please check out" email.
- No dashboard UI beyond a one-line copy change.
- iCloud/IMAP path for Upcar is out of scope for now (Gmail only). The shared
  code should not preclude adding it later.

## Context: how Turo sync works today

`GET /api/cron/poll-turo-emails` (`app/api/cron/poll-turo-emails/route.ts`,
~700 lines) is triggered by a Supabase `pg_cron` job every 15 min and also by a
manual "Sync Now" button in the dashboard.

- Reads the single active `turo_email_syncs` row (tenant
  `8be5b928-ca59-4b29-a34b-75b18c9273db`, `gmail_address =
  ayrtonn.lg@gmail.com`, `provider = gmail`).
- `pollGmail()` force-refreshes the access token, searches
  `from:noreply@mail.turo.com after:<cursor>`, walks results oldest-first.
- `parseTuroEmail()` turns each message into a `ParsedEmail`
  (`confirm | modify | cancel | return`).
- `processEmail()` upserts into `reservations`, keyed by the Turo reservation id
  stored in `notes` as `Turo-Res #<id>`, backed by partial unique index
  `uniq_turo_res_id`.
- `findCarId()` fuzzy-matches the vehicle string to a `cars` row.
- `PROTECTED_STATUSES = {active, completed}` — a re-scanned confirm/modify email
  must never regress a trip that has already been picked up or finished.
- A `sync_started_at` claim-lock serialises concurrent runs (cron tick + manual
  click).

**The same Gmail mailbox already receives the Upcar emails** (`support@upcar.ai`),
and the OAuth token holds `gmail.readonly`. So Upcar is purely a second search +
a second parser over the same infrastructure.

## Architecture

```
pg_cron (*/15)  ─▶  GET /api/cron/poll-turo-emails
                      │  (reads the one turo_email_syncs row)
                      │
                      ├─ pollGmail({ from: 'noreply@mail.turo.com', parse: parseTuroEmail })
                      │                                             │
                      └─ pollGmail({ from: 'support@upcar.ai',       │
                      │              parse: parseUpcarEmail })       │
                      │                                             ▼
                      │                                    processEmail(parsed, sync)
                      │                                             │
                      │                                             ▼
                      └─ update turo_email_syncs.last_checked   reservations (upsert)
```

Shared, unchanged: cursor + 3-day lookback, claim-lock, token refresh,
`processEmail`, `findCarId`, `findExistingReservation`, `PROTECTED_STATUSES`,
manual "Sync Now".

Shared failure mode (accepted): one Gmail token failure pauses **both** Turo and
Upcar sync, because they share the `turo_email_syncs` row. It is one inbox; a
reconnect fixes both.

## Code structure

The route is already ~700 lines; adding Upcar inline breaks the 800-line cap in
the coding-style rules. Extract into a module dir, **moving the Turo parser
verbatim** (project memory `project_turo_email_sync` is emphatic that the Turo
parser must not be re-debugged — this is a pure move, no logic change):

```
lib/email-sync/
  shared.ts   — getMessageBody, getImapBody, decodeMimePart, extractMimeParts,
                gmailFetch, refreshAccessToken, sleep,
                claimSync / releaseSync,
                findCarId, findExistingReservation, processEmail,
                shared types (EmailSync, ParsedEmail, ExistingReservation),
                PROTECTED_STATUSES, MONTH_MAP, date helpers
  turo.ts     — parseTuroEmail  (moved as-is from the route)
  upcar.ts    — parseUpcarEmail (new)
  index.ts    — re-exports (optional, for a tidy import surface)

app/api/cron/poll-turo-emails/route.ts
              — thin orchestrator: auth, load sync row, per sync call
                pollGmail twice (Turo + Upcar) / pollIcloud once (Turo only),
                aggregate counts, update last_checked, error handling
__tests__/lib/email-sync/
  turo.test.ts   — move the existing google-calendar-adjacent parser tests here
                   if any target parseTuroEmail; otherwise leave existing tests
  upcar.test.ts  — new
```

`pollGmail` signature changes from `pollGmail(sync, msgErrors?)` to
`pollGmail(sync, { fromAddress, parse }, msgErrors?)` (or a small `PollConfig`
object). `pollIcloud` keeps Turo-only behavior for now but takes the same config
shape so Upcar-over-IMAP is a later one-liner.

The route file path and URL stay `poll-turo-emails` — the `pg_cron` job and the
Netlify wrapper point at it, and renaming is out of scope. A code comment notes
it now polls Turo **and** Upcar.

### `findExistingReservation` change

Add an Upcar branch, parallel to the Turo one:

```
if (parsed.source === 'upcar' && parsed.reservationId) {
  match reservations where tenant_id = ? and notes like '%Upcar-Res #<id>%'
}
```

Keep the existing Turo-Res # and Gmail-message-id branches untouched. The
message-id fallback branch already works for any provider (`<provider> #<msgId>`
marker), so Upcar rows synced before an id is captured still dedupe.

## The Upcar email parser (`parseUpcarEmail`)

Signature mirrors `parseTuroEmail(body, subject, messageId): ParsedEmail | null`.

Sender is always `support@upcar.ai` (the poll query guarantees it). Classify by
subject, then body:

| Kind | Subject contains | `ParsedEmail.type` | Effect in `processEmail` |
|---|---|---|---|
| Accepted | `Accepted` or `Car Has Been Booked` | `confirm` | upsert, `status = 'confirmed'` |
| Modification | `Modification Approved` or `Modification Auto-Approved` | `modify` | update dates/times/earnings (respect `PROTECTED_STATUSES`) |
| Car swap | `Car Swap Accepted` | `modify` | same as modify; vehicle = "New Car" value |
| Cancelled | `cancel`, `canceled`, `cancelled`, or `declined` | `cancel` | `status = 'cancelled'` |
| Trip ended | `Please Check Out Your Trip` | — | **ignored** (return `null`) |
| Everything else | booking request, new message, DL photos, device login, OTP, payout setup, marketing | — | **ignored** (return `null`) |

> **Cancellation pattern is unverified.** No cancellation/decline email exists in
> the mailbox yet (only one test booking, #17776). Implement the `cancel` branch
> on the `cancel|canceled|cancelled|declined` subject heuristic and leave a
> `// TODO(upcar): verify against a real cancellation email` comment. First real
> cancellation should be checked by hand.

### Fields

| Field | Source patterns (case-insensitive) | Notes |
|---|---|---|
| `reservationId` | subject `Booking (\d+)` / `Trip (\d+)`; body `Booking ID:\s*(\d+)`, `Trip ID:\s*(\d+)` | stable across a booking's emails |
| `customer_name` | body `Guest(?: Name)?:\s*(.+)` (stop at newline / next label); prefer `Guest DL Name:` when present for the full legal name | |
| `customer_phone` | `Guest Phone:\s*(\+?[\d\s()-]+)` | keep `+` and digits |
| `customer_dob` | `Guest DOB:\s*(\d{1,2})/(\d{4})` → `YYYY-MM-01` | Upcar only gives month/year |
| `vehicle_name` | `booking request for (.+?) from`, `Car:\s*(.+)`, `New Car:\s*(.+)` (car swap → New Car) | strips trailing location like the Turo parser does |
| `pickup_date` / `return_date` | see date parsing below | ISO `YYYY-MM-DD` |
| `pickup_time` / `return_time` | same matches as dates, time component | 24h `HH:MM` |
| `total_amount` | `Your (?:Estimated |Total )?(?:Earnings|Total Earnings):\s*\$([0-9,]+(?:\.\d{2})?)` | host earnings, not guest total |
| `source` | literal `'upcar'` | |
| `status` | `'confirmed'` for confirm/modify | |

### Date/time parsing

Three formats seen in real emails:

1. **Accepted email** — `Start Date: Fri, Aug 28 - 12:30 PM` /
   `End Date: Sun, Aug 30 - 10:00 AM`. **No year.** Infer: try the email's
   received year; if that puts the trip more than ~30 days before the email
   date, use the next year. (Bookings are always at or after the email.)
2. **Booking-request email** (ignored for creation, but the format may appear
   elsewhere) — `Start Time: Friday, August 28, 2026 at 1:30 PM`. Has year.
3. **Modification email** — structured list:
   `Trip start` then `08/28/2026 12:30 PM 08/28/2026 11:30 AM` (old value first,
   struck-through in HTML, then new value), `Trip end` then
   `08/30/2026 10:00 AM`. After tag-stripping both datetimes sit on one line —
   take the **last** `MM/DD/YYYY hh:mm (AM|PM)` match as the new value.

Helper functions:
- `parseUpcarMonthDay(str, referenceDate)` → handles formats 1 and 2.
- `parseUpcarSlashDateTime(str)` → handles format 3, returns `{ date, time }`.
- `to24h(hh, mm, ampm)` → `"HH:MM"`.

If a required date cannot be parsed, return `null` (skip the email) — same
posture as `parseTuroEmail`.

## `processEmail` changes

`processEmail` already branches on `parsed.type`. Changes:

- The `ref` / `notes` marker becomes provider-aware:
  - Turo: unchanged — `Turo #<msgId>` + optional ` Turo-Res #<id>`.
  - Upcar: `Upcar #<msgId> Upcar-Res #<id>` (+ ` [vehicle: <name>]` when
    `findCarId` misses).
- The `insert` path sets `pickup_time` / `return_time` from `parsed` when
  present (Turo `parsed` leaves them undefined → table defaults, unchanged).
- The `update` path (existing row) also writes `pickup_time` / `return_time`
  when the parsed email carries them.
- `customer_phone`, `customer_dob` written on insert when present.

`ParsedEmail` gains optional `pickup_time?`, `return_time?`, `customer_phone?`,
`customer_dob?`. Turo continues to omit them.

## Database migration

Single migration file
`supabase/migrations/<ts>_add_upcar_res_id_index.sql`:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS uniq_upcar_res_id
  ON public.reservations ((substring(notes from 'Upcar-Res #([0-9]+)')))
  WHERE source = 'upcar' AND notes ~ 'Upcar-Res #[0-9]+';
```

Mirrors `uniq_turo_res_id`. No column changes — `pickup_time`, `return_time`,
`customer_phone`, `customer_dob`, `source`, `notes` all already exist and are
nullable / defaulted.

## UI

`app/(dashboard)/dashboard/integrations/turo/FeedManager.tsx` only:

- Heading `Turo Email Reader` → `Turo & Upcar Email Reader`.
- Body copy → "Automatically sync new bookings, modifications, and
  cancellations from your Turo **and Upcar** emails."
- iCloud disclaimer line → "We only read emails from `noreply@mail.turo.com`
  and `support@upcar.ai`."

`page.tsx` title stays "Turo". `turo_sync` feature flag continues to gate the
whole page (Upcar has no separate flag).

## Testing

- `__tests__/lib/email-sync/upcar.test.ts` — `parseUpcarEmail` against real
  captured bodies:
  - Accepted → `confirm`, correct guest/car/dates/times/earnings, year inferred.
  - Modification Approved → `modify`, **new** (not struck-through) datetime wins.
  - Car Swap Accepted → `modify`, vehicle = New Car.
  - Booking request, new-message, device-login, OTP, payout-setup, marketing →
    `null`.
  - Missing/garbled date → `null`.
- Fixtures: plain-text bodies stored under
  `__tests__/lib/email-sync/fixtures/upcar/*.txt`.
- Regression: existing `poll-turo-emails` and `google-calendar` test suites must
  still pass after the `lib/email-sync/` extraction (the Turo parser moves
  byte-for-byte).
- `parseTuroEmail` tests, if they import from the route today, re-point to
  `lib/email-sync/turo`.

## Rollout

1. Ship migration + code to `main` (auto-deploys via Netlify).
2. Verify the Netlify build passed (memory
   `feedback_verify_netlify_deploy_after_push`).
3. One manual "Sync Now" (or a one-off wider `sinceDays` scan) to backfill
   existing Upcar emails — booking #17776 is from 2026-08-28, older than the
   3-day lookback, so a one-time wider window is needed. Idempotent via
   `uniq_upcar_res_id`.
4. Confirm booking #17776 landed in `reservations` with `source='upcar'`,
   correct car match, dates `2026-08-28`–`2026-08-30`, times `12:30`/`10:00`,
   earnings `82.50`, and a `Upcar-Res #17776` marker in `notes`.
5. Log to Notion Dev Log per `CLAUDE.md`.

## Risks

| Risk | Mitigation |
|---|---|
| Extraction breaks the working Turo flow | Move parser verbatim; run full Turo + calendar test suites; the route's public behavior is unchanged |
| Cancellation subject pattern wrong (no sample) | Heuristic + explicit TODO + manual check on first real cancellation |
| Year inference wrong for year-less dates | Reference the email's received date; bookings are always ≥ email date; modification emails (which carry full `MM/DD/YYYY`) supersede |
| Upcar changes its email templates | Parser returns `null` on unrecognized shape (no crash, no bad write); covered by unit tests that will start failing |
| Two Gmail searches per run ~doubles poll work | Both are low-volume; same token, same 15-min cadence; negligible |
