# Split Reservation Across Cars

## Summary

Today a reservation is one row in `reservations`: one car, one date range, one price, one Google Calendar event. When a customer wants a car for a date range but that car is only free for part of it, staff currently has no way to represent "one customer request, two cars" — they'd have to create two unrelated reservations, or manually override the overbooking check.

This feature adds automatic conflict detection to the booking creation form: when the requested car is unavailable for part of the requested range, the system proposes splitting the booking into two linked segments — the requested car for the free portion, and a staff-chosen alternate car for the conflicting portion (extending to the end of the range). The customer sees one booking code, one combined confirmation; internally there are two `reservations` rows, each syncing its own Google Calendar event.

## Scope

- **In scope**: detecting a partial-availability conflict during *creation* of a new reservation, proposing a 2-segment split, letting staff pick the alternate car, splitting the total price proportionally by nights, saving both segments atomically, sending one combined confirmation, and creating one calendar event per segment.
- **Out of scope (explicitly deferred)**:
  - Splitting an *already-existing* confirmed reservation when its dates are edited later (the existing single-reservation overlap-conflict alert stays as-is for edits).
  - More than 2 segments. If the requested car is blocked only in the *middle* of the range and becomes free again afterward, the alternate car is kept through the end of the range rather than reverting to the original car — a true 3-segment "sandwich" split is out of scope for v1.
  - Auto-selecting the alternate car (staff picks manually from active cars; the system still validates availability on submit).
  - Any change to how a *single-car* reservation is created, priced, or synced — that path is untouched.

## Data Model

Add one nullable column to `reservations`:

```sql
alter table reservations add column booking_group_id uuid null;
create index reservations_booking_group_id_idx on reservations (booking_group_id) where booking_group_id is not null;
```

- For a normal (non-split) reservation, `booking_group_id` is `null`, same as today.
- For a split reservation, both segment rows get the same freshly-generated `booking_group_id`, and — confirmed via `information_schema` — **both rows also share the same `booking_code`** (that column has no unique constraint in this table; only the legacy `confirmation_number` column is unique, and it's unrelated to this flow). This is what lets the customer-facing confirmation show a single code while two independent rows exist underneath.
- No other schema changes. Each segment row keeps its own `car_id`, `pickup_date`/`return_date`, `total_amount`, `status`, and `google_calendar_event_id`, exactly like a normal reservation — every existing per-row code path (availability check, calendar sync, notifications, webhooks, customer roster upsert) keeps working unmodified on each segment.

Rejected alternative: a separate `reservation_segments` child table with one parent `reservations` row. Rejected because `car_id` and date range live on `reservations` everywhere in the codebase (availability checks, calendar sync, pricing, bookings table UI) — moving them to a child table would require rewriting all of that. The chosen approach reuses it as-is.

## Conflict Detection

Reuse existing `lib/reservations/overlap.ts` logic, unchanged:

- `findOverlappingReservations(candidate, existing)` and `rangesOverlap()` stay as they are.
- `overbookingConflict()` in `actions.ts` stays as the single-car check; it's called once per segment when a split is submitted (see below), not modified.

New pure function `lib/reservations/split.ts`:

```ts
computeSplitSuggestion(requestedRange, overlappingReservations): {
  segmentA: { start: string; end: string }   // requested car, from requested start up to (conflictStart - 1 day)
  segmentB: { start: string; end: string }   // alternate car, from conflictStart to requested end
} | null
```

- `conflictStart` = the earliest date within the requested range where an overlapping blocking reservation begins (clamped to the requested range's start if the conflicting reservation started before it).
- Returns `null` if there's no conflict, or if the conflict covers the *entire* requested range (nothing to split — that's just a normal "car unavailable" block, handled by the existing conflict toast).
- If segment A would have zero nights (conflict starts on day 1 of the request), there is nothing to split either — the whole range needs an alternate car, so this also returns `null` and the existing single-car conflict UI applies.

## UI Flow (BookingModal.tsx)

1. Staff fills in customer + picks a car + date range, same as today.
2. On car or date change, the existing overlap check runs (as it does today for the plain conflict warning). If it comes back non-empty, call `computeSplitSuggestion`.
3. If it returns a suggestion, replace the plain "conflict" warning with a **split panel** showing:
   - Segment A: requested car, computed date range (read-only), nights.
   - Segment B: date range (read-only) + a `<select>` of active cars (excluding the requested car) for staff to choose the alternate. No pre-filtering by availability in the dropdown for v1 — availability is re-validated on submit, same as the single-car path does today.
   - Both segments' nights feed the price split shown live once a total is entered (see Pricing below).
4. If `computeSplitSuggestion` returns `null` but an overlap exists, fall back to today's behavior: block with the existing conflict toast (with the existing `allowOverlap` staff override still available).
5. Staff still enters **one total price** for the whole reservation in the existing "Charges" tab; the modal shows the computed per-segment split next to it as read-only info (not separately editable — keeps the form surface small for v1).

## Pricing

Proportional-by-nights split of the single entered total:

```
nightsA, nightsB = nights in each segment
rawA = total * nightsA / (nightsA + nightsB)
amountA = round(rawA, 2)
amountB = total - amountA   // remainder absorbed by segment B so the two sum exactly to total
```

Segment B (typically the longer or equal segment given the "conflict extends to the end" rule) absorbs the rounding remainder. Extras/add-ons already on the reservation (the `extras` JSON array with `per_day` pricing) are **not split** — they're attached to segment A only (the originally requested car/trip), since extras conceptually belong to the whole customer visit rather than a specific car-segment; this matches today's behavior where extras aren't tied to a specific car either.

## Server Action

New `createSplitReservation(formData)` in `actions.ts`, alongside the existing `createReservation`:

1. Validate both segments' payloads (reuse the same field validation `createReservation` does for customer/dates/etc., applied to each segment's car+dates).
2. Run `overbookingConflict()` for segment A (car A, range A) and segment B (car B, range B) independently — same function, same `allowOverlap` override semantics as today. Abort with the existing conflict error shape if either fails, unless overridden.
3. Generate **one** `bookingCode` via `generateBookingCode()` and **one** `bookingGroupId` via `crypto.randomUUID()`.
4. Insert both rows into `reservations` in a single Supabase batch insert (both rows in one `.insert([...])` call so it's one round trip; not wrapped in a DB transaction since Supabase's JS client doesn't expose multi-statement transactions — acceptable here because both rows are independent inserts with no foreign key between them, so a partial failure just leaves an orphaned single segment that staff can see and delete, same risk profile as any other multi-step Supabase operation already in this codebase, e.g. the customer roster upsert steps in `createReservation`).
5. Upsert the customer roster **once** (not per segment).
6. If either segment's status is confirmed/active, call the existing `notifyAndSyncConfirmedReservation`-equivalent **per segment** so each gets its own Google Calendar event stored on its own `google_calendar_event_id` — no changes needed to `lib/google-calendar.ts`.
7. Send **one** combined confirmation email/notification (new template variant) listing both segments (car, dates, amount) under the shared `bookingCode`, instead of the two separate per-segment emails that would result from calling the existing single-segment notifier twice.
8. Dispatch **one** `booking.created` webhook payload with a `segments: [...]` array, instead of two separate webhook calls.

## Bookings List / Editing

- `BookingsTable.tsx` shows both segment rows as normal entries (no merged row), each tagged with a small "1/2" / "2/2" badge and the shared `booking_code` when `booking_group_id` is not null, so staff visually recognize them as linked. Clicking either opens the normal single-reservation edit modal — no special split-editing UI (out of scope, per Scope section above).
- Editing or cancelling one segment does **not** cascade to the other. They're linked only for display (badge + shared code) and originated together — otherwise fully independent rows, consistent with the "edit-time splitting is out of scope" decision.

## Error Handling

- Segment A or B individually failing the availability check on submit (e.g., another booking was created in the meantime) surfaces the existing per-car conflict message, scoped to that segment, with the same `allowOverlap` staff override.
- If the insert of segment A succeeds but segment B fails (network blip, validation error), the action returns an error identifying which segment failed; segment A remains as a normal-looking single reservation with a `booking_group_id` pointing at a group that (for now) only has one row. Staff can either retry adding segment B manually via the existing "add reservation" flow (using the same car, and manually matching dates — the badge just won't show "2/2" for it) or delete the orphaned segment A and start over. This matches how any partial-multi-step Supabase mutation already degrades elsewhere in this codebase.

## Testing

- Unit tests for `computeSplitSuggestion` in `lib/reservations/split.ts`: conflict at start, conflict at end, conflict covering full range (→ null), no conflict (→ null), conflict starting exactly on day 1 (→ null, zero-night segment A case).
- Unit tests for the price-split math: even split, odd-cent rounding, single-night segment.
- Integration test for `createSplitReservation`: happy path inserts 2 rows sharing `booking_group_id`/`booking_code`; segment B conflict aborts the whole submission; confirmed status produces 2 distinct `google_calendar_event_id`s (mock the calendar client).
- Manual verification in the dashboard: create a booking whose dates partially overlap an existing confirmed booking on the same car, confirm the split panel appears with the correct date boundaries, submit with a chosen alternate car, and verify in Supabase that both rows exist with the same code/group id and that two calendar events were created (check `google_calendar_event_id` on both rows, and the Google Calendar UI).
