# Split Reservation Across Cars Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let staff create one customer-facing booking that's actually two linked `reservations` rows on two different cars, when the requested car is only free for part of the requested date range.

**Architecture:** A split booking is two normal `reservations` rows sharing a new `booking_group_id` and the same `booking_code`. Every existing per-row mechanism (availability check, Google Calendar sync, email templates, bookings list) is reused unmodified per row; only the *orchestration* (detect the conflict, propose the split, insert both rows together, send one combined notification) is new.

**Tech Stack:** Next.js App Router server actions, Supabase (Postgres + `supabase-js`), Jest for unit tests.

**Spec:** `docs/superpowers/specs/2026-08-25-split-reservation-across-cars-design.md`

## Global Constraints

- Split detection and creation applies **only when creating a new reservation** — editing an existing confirmed reservation's dates never triggers a split (per spec Scope section).
- Maximum **2 segments**. If the requested car frees up again later in the range, the alternate car is kept through the end of the range — no 3-segment "return to original car" logic (per spec Scope section).
- Both segment rows share the same `booking_code` and the new `booking_group_id`; `booking_code` has no DB uniqueness constraint (confirmed via `information_schema` — only the unrelated legacy `confirmation_number` column is unique), so this is safe.
- The staff-entered total price is split proportionally by nights between the two segments; extras/add-ons are **not** split — they stay attached to segment A only.
- No new database table. `booking_group_id uuid null` is the only schema change.
- Every existing single-car reservation code path (`createReservation`, `updateReservation`) is untouched.

---

## File Structure

- **`supabase/migrations/20260825120000_add_booking_group_id.sql`** (new) — adds the `booking_group_id` column + partial index.
- **`lib/supabase/types.ts`** (modify) — add `booking_group_id: string | null` to the `Reservation` interface.
- **`lib/reservations/split.ts`** (new) — pure functions: `computeSplitSuggestion`, `nightsBetween`, `splitTotalAmount`. No Supabase/React imports — fully unit-testable.
- **`__tests__/lib/split.test.ts`** (new) — unit tests for the three pure functions.
- **`app/(dashboard)/dashboard/bookings/actions.ts`** (modify) — add `getSplitSuggestion` (server action) and `createSplitReservation` (server action) plus an internal `notifyAndSyncConfirmedSplitReservation` helper, following the exact patterns of the existing `overbookingConflict` / `createReservation` / `notifyAndSyncConfirmedReservation`.
- **`app/(dashboard)/dashboard/bookings/BookingModal.tsx`** (modify) — detect a split opportunity as car/dates are chosen, render a suggestion panel with an alternate-car picker, and submit through `createSplitReservation` when staff accepts it.
- **`app/(dashboard)/dashboard/bookings/BookingsTable.tsx`** (modify) — show a "1/2" / "2/2" badge next to the booking code for rows that share a `booking_group_id`.

---

### Task 1: Database column + type

**Files:**
- Create: `supabase/migrations/20260825120000_add_booking_group_id.sql`
- Modify: `lib/supabase/types.ts:98-174` (the `Reservation` interface)

**Interfaces:**
- Produces: `Reservation.booking_group_id: string | null` — every later task that reads/writes a `Reservation` sees this field.

- [ ] **Step 1: Write the migration file**

```sql
-- supabase/migrations/20260825120000_add_booking_group_id.sql
-- Links two reservation rows that together represent one customer-facing
-- booking split across two cars. See
-- docs/superpowers/specs/2026-08-25-split-reservation-across-cars-design.md
alter table public.reservations
  add column if not exists booking_group_id uuid;

create index if not exists reservations_booking_group_id_idx
  on public.reservations (booking_group_id)
  where booking_group_id is not null;
```

- [ ] **Step 2: Apply the migration to the live Supabase project**

Use the `mcp__claude_ai_Supabase__apply_migration` tool with `project_id` `brwzjwbpguiignrxvjdc`, `name` `add_booking_group_id`, and the SQL body above.

- [ ] **Step 3: Verify the column exists**

Run via `mcp__claude_ai_Supabase__execute_sql` (project_id `brwzjwbpguiignrxvjdc`):

```sql
select column_name, is_nullable, data_type
from information_schema.columns
where table_name = 'reservations' and column_name = 'booking_group_id';
```

Expected: one row, `is_nullable = YES`, `data_type = uuid`.

- [ ] **Step 4: Add the field to the TypeScript type**

In `lib/supabase/types.ts`, inside the `Reservation` interface, right after the `google_calendar_event_id` field (currently the last field, line 173):

```typescript
  // Google Calendar sync
  google_calendar_event_id: string | null
  // Links two rows that together represent one split-across-cars booking (null for normal bookings)
  booking_group_id: string | null
}
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors. (Existing code that builds a `Reservation`-shaped insert payload via `Omit<Reservation, ...>` in `actions.ts`/`BookingModal.tsx` is unaffected since `booking_group_id` isn't in any of those `Omit` lists yet — it'll just be `undefined` on existing inserts, which Postgres defaults to `null`.)

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260825120000_add_booking_group_id.sql lib/supabase/types.ts
git commit -m "feat(bookings): add booking_group_id column for split reservations"
```

---

### Task 2: Pure split-computation functions

**Files:**
- Create: `lib/reservations/split.ts`
- Test: `__tests__/lib/split.test.ts`

**Interfaces:**
- Consumes: nothing (pure, no imports beyond types it defines itself).
- Produces:
  - `DateRange { start: string; end: string }`
  - `OverlapRange { pickup_date: string; return_date: string | null }`
  - `SplitSuggestion { segmentA: DateRange; segmentB: DateRange }`
  - `computeSplitSuggestion(requested: DateRange, conflicts: readonly OverlapRange[]): SplitSuggestion | null`
  - `nightsBetween(start: string, end: string): number`
  - `splitTotalAmount(total: number, nightsA: number, nightsB: number): { amountA: number; amountB: number }`
  - These are consumed by Task 3 (`getSplitSuggestion`) and Task 5/6 (`BookingModal.tsx`).

- [ ] **Step 1: Write the failing tests**

```typescript
// __tests__/lib/split.test.ts
import { computeSplitSuggestion, nightsBetween, splitTotalAmount } from '@/lib/reservations/split'

describe('computeSplitSuggestion', () => {
  it('splits when the conflict starts mid-range', () => {
    const result = computeSplitSuggestion(
      { start: '2026-09-01', end: '2026-09-10' },
      [{ pickup_date: '2026-09-04', return_date: '2026-09-06' }]
    )
    expect(result).toEqual({
      segmentA: { start: '2026-09-01', end: '2026-09-03' },
      segmentB: { start: '2026-09-04', end: '2026-09-10' },
    })
  })

  it('clamps the conflict start to the requested range when the existing booking starts earlier', () => {
    const result = computeSplitSuggestion(
      { start: '2026-09-01', end: '2026-09-10' },
      [{ pickup_date: '2026-08-20', return_date: '2026-09-05' }]
    )
    // The existing booking already covers day 1 of the request, so there's
    // no free portion to keep the requested car for — not splittable.
    expect(result).toBeNull()
  })

  it('returns null when the conflict starts on day 1 of the requested range', () => {
    const result = computeSplitSuggestion(
      { start: '2026-09-01', end: '2026-09-10' },
      [{ pickup_date: '2026-09-01', return_date: '2026-09-03' }]
    )
    expect(result).toBeNull()
  })

  it('returns null when there are no conflicts', () => {
    expect(computeSplitSuggestion({ start: '2026-09-01', end: '2026-09-10' }, [])).toBeNull()
  })

  it('takes the earliest conflict start across multiple overlapping reservations', () => {
    const result = computeSplitSuggestion(
      { start: '2026-09-01', end: '2026-09-15' },
      [
        { pickup_date: '2026-09-08', return_date: '2026-09-09' },
        { pickup_date: '2026-09-05', return_date: '2026-09-06' },
      ]
    )
    expect(result).toEqual({
      segmentA: { start: '2026-09-01', end: '2026-09-04' },
      segmentB: { start: '2026-09-05', end: '2026-09-15' },
    })
  })

  it('treats an open-ended existing reservation (null return_date) as blocking from its pickup date onward', () => {
    const result = computeSplitSuggestion(
      { start: '2026-09-01', end: '2026-09-10' },
      [{ pickup_date: '2026-09-06', return_date: null }]
    )
    expect(result).toEqual({
      segmentA: { start: '2026-09-01', end: '2026-09-05' },
      segmentB: { start: '2026-09-06', end: '2026-09-10' },
    })
  })
})

describe('nightsBetween', () => {
  it('computes whole nights between two dates', () => {
    expect(nightsBetween('2026-09-01', '2026-09-04')).toBe(3)
  })
  it('returns 0 for a same-day range', () => {
    expect(nightsBetween('2026-09-01', '2026-09-01')).toBe(0)
  })
})

describe('splitTotalAmount', () => {
  it('splits proportionally by nights', () => {
    expect(splitTotalAmount(1000, 3, 7)).toEqual({ amountA: 300, amountB: 700 })
  })
  it('rounds to the cent and assigns the remainder to segment B', () => {
    const { amountA, amountB } = splitTotalAmount(100, 1, 2)
    expect(amountA).toBe(33.33)
    expect(amountB).toBe(66.67)
    expect(Math.round((amountA + amountB) * 100) / 100).toBe(100)
  })
  it('gives everything to segment B when segment A has 0 nights', () => {
    expect(splitTotalAmount(500, 0, 5)).toEqual({ amountA: 0, amountB: 500 })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/lib/split.test.ts`
Expected: FAIL — `Cannot find module '@/lib/reservations/split'`

- [ ] **Step 3: Implement the pure functions**

```typescript
// lib/reservations/split.ts
//
// Pure date/price math for splitting one requested reservation across two
// cars when the requested car is only free for part of the range. See
// docs/superpowers/specs/2026-08-25-split-reservation-across-cars-design.md
// for the full design. No Supabase or React imports here on purpose — this
// is unit-tested in isolation and reused by both the server action
// (getSplitSuggestion) and the client form (BookingModal).

export interface DateRange {
  /** YYYY-MM-DD, inclusive */
  start: string
  /** YYYY-MM-DD, inclusive */
  end: string
}

export interface OverlapRange {
  pickup_date: string
  return_date: string | null
}

export interface SplitSuggestion {
  /** Requested car keeps this sub-range. */
  segmentA: DateRange
  /** Alternate car is needed from here through the end of the requested range. */
  segmentB: DateRange
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/**
 * Given the requested [start,end] range and the existing reservations that
 * overlap it on the requested car, propose a 2-segment split: the requested
 * car for the free portion at the start of the range, and an alternate car
 * for everything from the earliest conflict through the end of the range.
 *
 * Returns null when there's nothing to split — either no conflicts, or the
 * conflict already covers day 1 of the requested range (the whole range
 * needs an alternate car, which is just a plain "car unavailable" block,
 * not a split).
 */
export function computeSplitSuggestion(
  requested: DateRange,
  conflicts: readonly OverlapRange[]
): SplitSuggestion | null {
  if (conflicts.length === 0) return null

  const conflictStart = conflicts.reduce<string | null>((earliest, c) => {
    const clamped = c.pickup_date > requested.start ? c.pickup_date : requested.start
    if (earliest === null || clamped < earliest) return clamped
    return earliest
  }, null)

  if (conflictStart === null || conflictStart <= requested.start) return null

  const segmentAEnd = addDays(conflictStart, -1)

  return {
    segmentA: { start: requested.start, end: segmentAEnd },
    segmentB: { start: conflictStart, end: requested.end },
  }
}

/** Whole nights between two YYYY-MM-DD dates (same-day = 0 nights). */
export function nightsBetween(start: string, end: string): number {
  const s = new Date(`${start}T00:00:00Z`)
  const e = new Date(`${end}T00:00:00Z`)
  return Math.round((e.getTime() - s.getTime()) / 86_400_000)
}

/**
 * Split a single total price across two segments proportionally by nights.
 * Segment B absorbs the rounding remainder so the two always sum exactly to
 * `total`.
 */
export function splitTotalAmount(
  total: number,
  nightsA: number,
  nightsB: number
): { amountA: number; amountB: number } {
  const totalNights = nightsA + nightsB
  if (totalNights <= 0) return { amountA: 0, amountB: Math.round(total * 100) / 100 }
  const rawA = (total * nightsA) / totalNights
  const amountA = Math.round(rawA * 100) / 100
  const amountB = Math.round((total - amountA) * 100) / 100
  return { amountA, amountB }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/lib/split.test.ts`
Expected: PASS, all 11 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/reservations/split.ts __tests__/lib/split.test.ts
git commit -m "feat(bookings): add pure split-suggestion and price-split math"
```

---

### Task 3: `getSplitSuggestion` server action

**Files:**
- Modify: `app/(dashboard)/dashboard/bookings/actions.ts:322-341` (extract a shared query helper out of `overbookingConflict`, then add `getSplitSuggestion` after it)

**Interfaces:**
- Consumes: `computeSplitSuggestion`, `SplitSuggestion` from `lib/reservations/split.ts` (Task 2); `findOverlappingReservations`, `describeConflicts` from `lib/reservations/overlap.ts` (existing).
- Produces: `getSplitSuggestion(carId: number, pickupDate: string, returnDate: string): Promise<{ conflictMessage: string | null; suggestion: SplitSuggestion | null }>` — consumed by Task 5 (`BookingModal.tsx` detection effect).

- [ ] **Step 1: Extract the shared blocking-reservations query**

In `actions.ts`, replace the query inline in `overbookingConflict` (lines 327-341) with a small shared helper so `getSplitSuggestion` doesn't duplicate the same Supabase call:

```typescript
async function fetchBlockingReservationsForCar(
  supabase: ReturnType<typeof createClient>,
  tenantId: string,
  carId: number
): Promise<Reservation[]> {
  const { data } = await supabase
    .from('reservations')
    .select('id, booking_code, car_id, customer_name, pickup_date, return_date, status')
    .eq('tenant_id', tenantId)
    .eq('car_id', carId)
    .in('status', ['pending', 'confirmed', 'active'])
  return (data as Reservation[]) ?? []
}

/**
 * Overbooking guard. Returns a conflict message if the candidate overlaps an
 * existing pending/confirmed/active reservation on the same car, unless the
 * caller explicitly allows overlap. Returns null when there is no conflict.
 */
async function overbookingConflict(
  supabase: ReturnType<typeof createClient>,
  tenantId: string,
  candidate: OverlapCandidate
): Promise<string | null> {
  if (candidate.car_id == null || !candidate.pickup_date) return null
  const existing = await fetchBlockingReservationsForCar(supabase, tenantId, candidate.car_id)
  const conflicts = findOverlappingReservations(candidate, existing)
  return conflicts.length > 0 ? describeConflicts(conflicts) : null
}
```

- [ ] **Step 2: Add the `getSplitSuggestion` action**

Right after `overbookingConflict`, add:

```typescript
/**
 * Checks whether the requested car is free for the whole [pickupDate,
 * returnDate] range and, if not, proposes a 2-segment split (requested car
 * for the free portion + an alternate car for the rest). Called reactively
 * from BookingModal as staff picks a car/dates for a NEW reservation — see
 * docs/superpowers/specs/2026-08-25-split-reservation-across-cars-design.md.
 * Read-only: does not write anything.
 */
export async function getSplitSuggestion(
  carId: number,
  pickupDate: string,
  returnDate: string
): Promise<{ conflictMessage: string | null; suggestion: SplitSuggestion | null }> {
  const supabase = createClient()
  const tenantId = await getTenantId()
  const existing = await fetchBlockingReservationsForCar(supabase, tenantId, carId)
  const conflicts = findOverlappingReservations({ car_id: carId, pickup_date: pickupDate, return_date: returnDate }, existing)
  if (conflicts.length === 0) return { conflictMessage: null, suggestion: null }
  const suggestion = computeSplitSuggestion({ start: pickupDate, end: returnDate }, conflicts)
  return { conflictMessage: describeConflicts(conflicts), suggestion }
}
```

- [ ] **Step 3: Add the new imports**

At the top of `actions.ts`, alongside the existing `lib/reservations/overlap` import (line 13):

```typescript
import { findOverlappingReservations, describeConflicts, type OverlapCandidate } from '@/lib/reservations/overlap'
import { computeSplitSuggestion, type SplitSuggestion } from '@/lib/reservations/split'
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 5: Manually verify against live data**

Run via `mcp__claude_ai_Supabase__execute_sql` (project_id `brwzjwbpguiignrxvjdc`) to find a real car with an existing confirmed/pending/active reservation:

```sql
select car_id, pickup_date, return_date, status
from reservations
where tenant_id = (select id from tenants limit 1)
  and status in ('pending','confirmed','active')
order by pickup_date desc
limit 5;
```

Pick one row's `car_id` and dates, then in a scratch Node REPL or a temporary test call, confirm `getSplitSuggestion` (via the same logic path exercised by Task 2's unit tests) returns a non-null `suggestion` when you request a range that starts before that reservation and ends after it starts.

- [ ] **Step 6: Commit**

```bash
git add app/\(dashboard\)/dashboard/bookings/actions.ts
git commit -m "feat(bookings): add getSplitSuggestion server action"
```

---

### Task 4: `createSplitReservation` server action

**Files:**
- Modify: `app/(dashboard)/dashboard/bookings/actions.ts` (add after `updateReservation`, reusing `notifyAndSyncConfirmedReservation`'s neighboring helpers)

**Interfaces:**
- Consumes: `overbookingConflict`, `generateBookingCode`, `upsertCustomerFromBooking`, `getCarName`, `getTenantName`, `getTenantBrand`, `getOperatorEmails`, `dispatchWebhookEvent`, `createInAppNotification`, `sendEmail`, `newBookingEmail`, `bookingConfirmedEmail`, `bookingConfirmedCustomerEmail`, `createReservationCalendarEvent` — all existing, unmodified.
- Produces:
  - `SplitSharedInput = Omit<Reservation, 'id' | 'tenant_id' | 'created_at' | 'booking_code' | 'booking_group_id' | 'car_id' | 'pickup_date' | 'return_date' | 'total_amount'>`
  - `SplitSegmentInput { car_id: number; pickup_date: string; return_date: string; total_amount: number }`
  - `createSplitReservation(shared: SplitSharedInput, segmentA: SplitSegmentInput, segmentB: SplitSegmentInput, options?: { allowOverlap?: boolean }): Promise<{ error: string | null; conflict?: string }>` — consumed by Task 6 (`BookingModal.tsx` submit handler).

- [ ] **Step 1: Add the types and the action**

Add this after `updateReservation` (after its closing brace, i.e. after the code shown at `actions.ts:670`+):

```typescript
export type SplitSharedInput = Omit<
  Reservation,
  'id' | 'tenant_id' | 'created_at' | 'booking_code' | 'booking_group_id' | 'car_id' | 'pickup_date' | 'return_date' | 'total_amount'
>

export interface SplitSegmentInput {
  car_id: number
  pickup_date: string
  return_date: string
  total_amount: number
}

/**
 * Fires the combined "confirmed" notification (one customer email, one
 * operator email) and creates TWO Google Calendar events (one per car) for a
 * split reservation. Mirrors notifyAndSyncConfirmedReservation, but for two
 * linked rows sharing one booking_code instead of one row.
 */
function notifyAndSyncConfirmedSplitReservation(
  supabase: ReturnType<typeof createClient>,
  tenantId: string,
  segmentA: ReservationForNotify,
  segmentB: ReservationForNotify
): void {
  Promise.resolve().then(async () => {
    try {
      const [carNameA, carNameB, brand, emails] = await Promise.all([
        getCarName(supabase, segmentA.car_id),
        getCarName(supabase, segmentB.car_id),
        getTenantBrand(supabase, tenantId),
        getOperatorEmails(supabase, tenantId),
      ])
      const combinedCarName = `${carNameA} (${segmentA.pickup_date}–${segmentA.return_date}) + ${carNameB} (${segmentB.pickup_date}–${segmentB.return_date})`

      if (segmentA.customer_email) {
        await sendEmail({
          to: segmentA.customer_email,
          fromName: brand.name,
          replyTo: brand.email ?? undefined,
          ...bookingConfirmedCustomerEmail({
            customerName: segmentA.customer_name || 'Customer',
            brand,
            carName: combinedCarName,
            pickupDate: segmentA.pickup_date || 'TBD',
            returnDate: segmentB.return_date || 'TBD',
            pickupLocation: segmentA.pickup_location || 'To be confirmed',
            pickupTime: segmentA.pickup_time ?? undefined,
            returnTime: segmentB.return_time ?? undefined,
            reservationId: segmentA.id,
            bookingCode: segmentA.booking_code,
          }),
        })
      }

      if (emails.length > 0) {
        const tenantName = await getTenantName(supabase, tenantId)
        await sendEmail({
          to: emails,
          ...bookingConfirmedEmail({
            customerName: segmentA.customer_name || 'Unknown',
            carName: combinedCarName,
            pickupDate: segmentA.pickup_date || 'TBD',
            returnDate: segmentB.return_date || 'TBD',
            pickupLocation: segmentA.pickup_location || 'To be confirmed',
            pickupTime: segmentA.pickup_time ?? undefined,
            returnTime: segmentB.return_time ?? undefined,
            bookingCode: segmentA.booking_code,
            tenantName,
          }),
        })
      }
    } catch (e) {
      console.error('[notify] Split confirmed notification failed:', e)
    }
  })

  for (const segment of [segmentA, segmentB]) {
    Promise.resolve().then(async () => {
      try {
        const carName = await getCarName(supabase, segment.car_id)
        const eventId = await createReservationCalendarEvent(tenantId, {
          customerName: segment.customer_name || 'Customer',
          customerPhone: segment.customer_phone,
          carName,
          pickupDate: segment.pickup_date,
          pickupTime: segment.pickup_time,
          pickupLocation: segment.pickup_location,
          returnDate: segment.return_date,
          returnTime: segment.return_time,
          returnLocation: segment.return_location,
          bookingCode: segment.booking_code,
          notes: segment.notes,
        })
        if (eventId) {
          await supabase.from('reservations').update({ google_calendar_event_id: eventId }).eq('id', segment.id).eq('tenant_id', tenantId)
        }
      } catch (e) {
        console.error('[calendar] Split event creation failed:', e)
      }
    })
  }
}

/**
 * Creates a reservation split across two cars: two `reservations` rows
 * sharing one booking_code and a new booking_group_id. Used only when
 * creating a NEW reservation (see spec's Scope section — editing an
 * existing reservation never splits it).
 */
export async function createSplitReservation(
  shared: SplitSharedInput,
  segmentA: SplitSegmentInput,
  segmentB: SplitSegmentInput,
  options?: { allowOverlap?: boolean }
): Promise<{ error: string | null; conflict?: string }> {
  const supabase = createClient()
  const tenantId = await getTenantId()

  if (!options?.allowOverlap) {
    const conflictA = await overbookingConflict(supabase, tenantId, {
      car_id: segmentA.car_id, pickup_date: segmentA.pickup_date, return_date: segmentA.return_date,
    })
    if (conflictA) return { error: conflictA, conflict: conflictA }
    const conflictB = await overbookingConflict(supabase, tenantId, {
      car_id: segmentB.car_id, pickup_date: segmentB.pickup_date, return_date: segmentB.return_date,
    })
    if (conflictB) return { error: conflictB, conflict: conflictB }
  }

  const bookingCode = generateBookingCode()
  const bookingGroupId = crypto.randomUUID()

  const { data: inserted, error } = await supabase
    .from('reservations')
    .insert([
      { ...shared, ...segmentA, tenant_id: tenantId, booking_code: bookingCode, booking_group_id: bookingGroupId },
      { ...shared, ...segmentB, tenant_id: tenantId, booking_code: bookingCode, booking_group_id: bookingGroupId },
    ])
    .select('id, car_id')

  if (error) return { error: error.message }

  revalidatePath('/dashboard/bookings')

  const rows = inserted ?? []
  const rowA = rows.find((r) => r.car_id === segmentA.car_id) ?? null
  const rowB = rows.find((r) => r.car_id === segmentB.car_id) ?? null

  upsertCustomerFromBooking(supabase, tenantId, {
    customer_name: shared.customer_name ?? null,
    customer_email: shared.customer_email ?? null,
    customer_phone: shared.customer_phone ?? null,
    customer_dob: shared.customer_dob ?? null,
    customer_address: shared.customer_address ?? null,
    customer_zip: shared.customer_zip ?? null,
    license_number: shared.license_number ?? null,
    license_state: shared.license_state ?? null,
    license_country: shared.license_country ?? null,
    license_expiration_date: shared.license_expiration_date ?? null,
    insurance_provider: shared.insurance_provider ?? null,
    insurance_policy_number: shared.insurance_policy_number ?? null,
    insurance_expiration_date: shared.insurance_expiration_date ?? null,
  }).catch((err) => console.error('[bookings] customer upsert failed:', err))

  dispatchWebhookEvent(tenantId, 'booking.created', {
    reservation_ids: [rowA?.id ?? null, rowB?.id ?? null],
    booking_group_id: bookingGroupId,
    segments: [
      { car_id: segmentA.car_id, pickup_date: segmentA.pickup_date, return_date: segmentA.return_date },
      { car_id: segmentB.car_id, pickup_date: segmentB.pickup_date, return_date: segmentB.return_date },
    ],
    customer_name: shared.customer_name ?? null,
    customer_email: shared.customer_email ?? null,
    source: 'dashboard',
  }).catch((err) => console.error('[bookings] webhook dispatch failed:', err))

  Promise.resolve().then(async () => {
    try {
      const [emails, carNameA, carNameB, tenantName] = await Promise.all([
        getOperatorEmails(supabase, tenantId),
        getCarName(supabase, segmentA.car_id),
        getCarName(supabase, segmentB.car_id),
        getTenantName(supabase, tenantId),
      ])
      if (emails.length > 0) {
        const { subject, html } = newBookingEmail({
          customerName: shared.customer_name || 'Unknown',
          carName: `${carNameA} + ${carNameB}`,
          pickupDate: segmentA.pickup_date,
          returnDate: segmentB.return_date,
          totalAmount: segmentA.total_amount + segmentB.total_amount,
          tenantName,
        })
        await sendEmail({ to: emails, subject, html })
      }
    } catch (e) {
      console.error('[notify] New split booking email failed:', e)
    }
  })

  createInAppNotification({
    tenantId,
    event: 'new_booking',
    title: 'New Booking (split across 2 cars)',
    body: `${shared.customer_name || 'A customer'} booked ${segmentA.pickup_date} → ${segmentB.return_date}`,
    metadata: { booking_group_id: bookingGroupId, reservation_ids: [rowA?.id, rowB?.id] },
  }).catch(() => {})

  if (rowA && rowB && (shared.status === 'confirmed' || shared.status === 'active')) {
    notifyAndSyncConfirmedSplitReservation(
      supabase,
      tenantId,
      { ...shared, ...segmentA, id: rowA.id, booking_code: bookingCode },
      { ...shared, ...segmentB, id: rowB.id, booking_code: bookingCode }
    )
  }

  return { error: null }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors. If `ReservationForNotify` complains about missing fields, confirm `shared` (a `SplitSharedInput`) plus the segment's `car_id`/`pickup_date`/`return_date` together provide every field `ReservationForNotify` needs (`id`, `customer_name`, `customer_email`, `customer_phone`, `car_id`, `pickup_date`, `pickup_time`, `pickup_location`, `return_date`, `return_time`, `return_location`, `booking_code`, `notes`) — all of those except `id`/`car_id`/`pickup_date`/`return_date`/`booking_code` come from `shared`, which is a `Reservation` minus exactly those fields.

- [ ] **Step 3: Manual verification against live data**

Using the Supabase MCP tools and a disposable test tenant/customer row (do not use real customer data):

1. Call `createSplitReservation` indirectly by wiring it up through Task 6 first (UI), OR temporarily invoke it from a scratch script with `tsx` if the project has one — prefer testing through the UI once Task 6 lands, since this action only makes sense end-to-end. Skip standalone verification here and do it as part of Task 8.

- [ ] **Step 4: Commit**

```bash
git add app/\(dashboard\)/dashboard/bookings/actions.ts
git commit -m "feat(bookings): add createSplitReservation server action"
```

---

### Task 5: BookingModal — detect the split opportunity

**Files:**
- Modify: `app/(dashboard)/dashboard/bookings/BookingModal.tsx:1-24` (imports), `:71` (state), `:448-463` (render, insert panel after the existing conflict banner)

**Interfaces:**
- Consumes: `getSplitSuggestion` (Task 3), `SplitSuggestion` type (Task 2), existing `formData`, `isEditing`, `cars` props.
- Produces: `splitSuggestion: SplitSuggestion | null` and `altCarId: number | ''` state — consumed by Task 6 (submit handler).

- [ ] **Step 1: Add imports**

At the top of `BookingModal.tsx`, extend the existing `./actions` import (lines 6-15):

```typescript
import {
  createReservation,
  updateReservation,
  createSplitReservation,
  getSplitSuggestion,
  sendAgreement,
  getAgreementViewUrl,
  getAgreementEmailIssue,
  getLatestOdometer,
  searchCustomersForBooking,
  type CustomerLookup,
} from './actions'
import { nightsBetween, splitTotalAmount, type SplitSuggestion } from '@/lib/reservations/split'
```

- [ ] **Step 2: Add state**

Right after the existing `conflict` state (line 71):

```typescript
  const [conflict, setConflict] = useState<string | null>(null)
  const [splitSuggestion, setSplitSuggestion] = useState<SplitSuggestion | null>(null)
  const [altCarId, setAltCarId] = useState<number | ''>('')
```

- [ ] **Step 3: Add the detection effect**

Place this near the existing `nights` computation (after line 172, `const nights = calcNights(...)`):

```typescript
  useEffect(() => {
    if (isEditing) return // splitting only applies to NEW reservations
    const carId = formData.car_id ? Number(formData.car_id) : null
    const pickup = formData.pickup_date
    const ret = formData.return_date
    if (!carId || !pickup || !ret || ret < pickup) {
      setSplitSuggestion(null)
      setAltCarId('')
      return
    }
    let cancelled = false
    const timer = setTimeout(async () => {
      const { suggestion } = await getSplitSuggestion(carId, pickup, ret)
      if (!cancelled) {
        setSplitSuggestion(suggestion)
        setAltCarId('')
      }
    }, 400)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [isEditing, formData.car_id, formData.pickup_date, formData.return_date])
```

- [ ] **Step 4: Render the suggestion panel**

Right after the existing conflict banner's closing `)}` (line 463), before the `expirationWarnings` block:

```typescript
              {splitSuggestion && !conflict && (
                <div className="p-4 bg-sky-500/15 text-sky-200 rounded-xl text-sm border border-sky-500/30 space-y-3">
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 mt-0.5 shrink-0 text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M2 12h20"/></svg>
                    <span>
                      This car is only free {splitSuggestion.segmentA.start} → {splitSuggestion.segmentA.end}. Pick a second car for {splitSuggestion.segmentB.start} → {splitSuggestion.segmentB.end} to book both halves as one reservation.
                    </span>
                  </div>
                  <div className="space-y-1">
                    <label className={LABEL_CLASS}>Alternate Car for {splitSuggestion.segmentB.start} → {splitSuggestion.segmentB.end}</label>
                    <select
                      value={altCarId}
                      onChange={(e) => setAltCarId(e.target.value ? Number(e.target.value) : '')}
                      className={INPUT_CLASS}
                    >
                      <option value="" className="bg-[#0d0d0d]">Don&apos;t split — keep a single car</option>
                      {cars.filter((c) => c.id !== Number(formData.car_id)).map((c) => (
                        <option key={c.id} value={c.id} className="bg-[#0d0d0d]">
                          {c.make} {c.model_full || c.model}
                        </option>
                      ))}
                    </select>
                  </div>
                  {altCarId && formData.total_amount != null && Number(formData.total_amount) > 0 && (() => {
                    const nightsA = nightsBetween(splitSuggestion.segmentA.start, splitSuggestion.segmentA.end)
                    const nightsB = nightsBetween(splitSuggestion.segmentB.start, splitSuggestion.segmentB.end)
                    const { amountA, amountB } = splitTotalAmount(Number(formData.total_amount), nightsA, nightsB)
                    return (
                      <p className="text-xs text-sky-300/80">
                        Price split: ${amountA.toFixed(2)} for the first car, ${amountB.toFixed(2)} for the alternate car.
                      </p>
                    )
                  })()}
                </div>
              )}
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 6: Manual browser check**

Start the dev server (`npm run dev`), open the Bookings page, click "New Booking", pick a car and a date range that you know (from Task 3's Step 5 query) overlaps an existing pending/confirmed/active reservation partway through. Confirm the blue split panel appears with the correct sub-ranges and an alternate-car dropdown. Confirm it does NOT appear when editing an existing reservation, and disappears when you pick a fully-free date range.

- [ ] **Step 7: Commit**

```bash
git add app/\(dashboard\)/dashboard/bookings/BookingModal.tsx
git commit -m "feat(bookings): detect and surface split-reservation suggestions"
```

---

### Task 6: BookingModal — submit through the split path

**Files:**
- Modify: `app/(dashboard)/dashboard/bookings/BookingModal.tsx:248-340` (`handleSubmit`)

**Interfaces:**
- Consumes: `createSplitReservation` (Task 4), `splitSuggestion`/`altCarId` state (Task 5), `nightsBetween`/`splitTotalAmount` (Task 2).
- Produces: nothing new consumed elsewhere — this is the terminal wiring for the feature's happy path.

- [ ] **Step 1: Branch the submit handler**

In `handleSubmit` (starts at line 248), the existing code builds `dataToSubmit` (lines 280-321) and then calls `updateReservation`/`createReservation` (lines 325-327). Change the call site:

```typescript
    try {
      let result: { error: string | null; conflict?: string }
      if (!isEditing && splitSuggestion && altCarId) {
        const { car_id, pickup_date, return_date, total_amount, ...shared } = dataToSubmit
        const nightsA = nightsBetween(splitSuggestion.segmentA.start, splitSuggestion.segmentA.end)
        const nightsB = nightsBetween(splitSuggestion.segmentB.start, splitSuggestion.segmentB.end)
        const { amountA, amountB } = splitTotalAmount(Number(formData.total_amount) || 0, nightsA, nightsB)
        result = await createSplitReservation(
          shared as any,
          { car_id: Number(formData.car_id), pickup_date: splitSuggestion.segmentA.start, return_date: splitSuggestion.segmentA.end, total_amount: amountA },
          { car_id: Number(altCarId), pickup_date: splitSuggestion.segmentB.start, return_date: splitSuggestion.segmentB.end, total_amount: amountB },
          { allowOverlap }
        )
      } else {
        result = isEditing
          ? await updateReservation(reservation.id, dataToSubmit, { allowOverlap })
          : await createReservation(dataToSubmit as any, { allowOverlap })
      }
      if (result.conflict && !allowOverlap) {
        setConflict(result.conflict)
```

This replaces only the `try { ... if (result.conflict...` opening of the existing block — the rest of the `try`/`catch` (success handling, `onClose()`, error display) stays exactly as it is today, since `result` has the same `{ error, conflict? }` shape either way.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors. (The `as any` casts match the existing code's own `dataToSubmit as any` cast at line 327 — `dataToSubmit` is built as a plain object literal without a named type, so this stays consistent with the file's existing convention rather than introducing a stricter boundary just for this path.)

- [ ] **Step 3: Manual browser check — happy path**

Using the same conflicting car/date range from Task 5's Step 6:
1. Open "New Booking", fill in a test customer, pick the conflicting car/dates, enter a total amount (e.g. 500).
2. Confirm the split panel shows a price split that sums to 500.
3. Pick an alternate car, set status to "Pending", save.
4. Expected: modal closes, no error. In the bookings table, two new rows appear for the same customer with the same booking code and adjacent date ranges (per Task 7 below, they'll also show a "1/2"/"2/2" badge once that task lands).

- [ ] **Step 4: Manual verification in Supabase**

Run via `mcp__claude_ai_Supabase__execute_sql` (project_id `brwzjwbpguiignrxvjdc`):

```sql
select id, booking_code, booking_group_id, car_id, pickup_date, return_date, total_amount, status
from reservations
where booking_group_id is not null
order by id desc
limit 2;
```

Expected: 2 rows, same `booking_code` and `booking_group_id`, different `car_id`, adjacent non-overlapping date ranges, `total_amount` values summing to the entered total.

- [ ] **Step 5: Manual check — confirmed status creates 2 calendar events**

Repeat the flow with status set to "Confirmed" instead of "Pending" (requires a tenant with Google Calendar connected — check `dashboard/integrations/google-calendar` first). After saving, re-run the query from Step 4 and confirm both rows now have a non-null `google_calendar_event_id`, and check the connected Google Calendar for two distinct events.

- [ ] **Step 6: Commit**

```bash
git add app/\(dashboard\)/dashboard/bookings/BookingModal.tsx
git commit -m "feat(bookings): submit split reservations through createSplitReservation"
```

---

### Task 7: Linked-segment badge in the bookings list

**Files:**
- Modify: `app/(dashboard)/dashboard/bookings/BookingsTable.tsx:36-53` (add a memo), `:276` (render next to the booking code)

**Interfaces:**
- Consumes: `reservations` prop (existing), `Reservation.booking_group_id` (Task 1).
- Produces: nothing consumed elsewhere — this is a display-only leaf.

- [ ] **Step 1: Compute group position**

Right after the existing `carMap` memo (line 51-53):

```typescript
  const groupBadges = useMemo(() => {
    const byGroup = new Map<string, number[]>()
    for (const r of reservations) {
      if (!r.booking_group_id) continue
      const ids = byGroup.get(r.booking_group_id) ?? []
      ids.push(r.id)
      byGroup.set(r.booking_group_id, ids)
    }
    const badges = new Map<number, string>()
    for (const ids of byGroup.values()) {
      const sorted = [...ids].sort((a, b) => a - b)
      sorted.forEach((id, i) => badges.set(id, `${i + 1}/${sorted.length}`))
    }
    return badges
  }, [reservations])
```

- [ ] **Step 2: Render the badge**

At line 276, next to the existing booking-code span:

```tsx
                      <span className="font-mono text-xs text-white/70 bg-white/5 px-2 py-0.5 rounded">{r.booking_code}</span>
                      {groupBadges.has(r.id) && (
                        <span
                          className="font-mono text-[10px] text-sky-300 bg-sky-500/10 border border-sky-500/30 px-1.5 py-0.5 rounded"
                          title="Part of a reservation split across two cars"
                        >
                          {groupBadges.get(r.id)}
                        </span>
                      )}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Manual browser check**

Reload the bookings list after Task 6's test split booking. Confirm both rows show the "1/2" and "2/2" badges next to the shared booking code, and that a normal (non-split) reservation shows no badge.

- [ ] **Step 5: Commit**

```bash
git add app/\(dashboard\)/dashboard/bookings/BookingsTable.tsx
git commit -m "feat(bookings): show a linked-segment badge for split reservations"
```

---

### Task 8: Full end-to-end verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full unit test suite**

Run: `npx jest`
Expected: all tests pass, including the pre-existing `__tests__/lib/overlap.test.ts` (untouched) and the new `__tests__/lib/split.test.ts`.

- [ ] **Step 2: Run a full typecheck and build**

Run: `npx tsc --noEmit && npm run build`
Expected: both succeed with no new errors or warnings introduced by this feature.

- [ ] **Step 3: Re-verify the full split flow once more end-to-end**

Repeat Task 6 Steps 3-5 once more for a *second*, independent scenario — a different car and a conflict positioned near the *end* of the requested range instead of the middle (e.g. requested days 1-10, existing conflicting booking on days 8-10) — to confirm `computeSplitSuggestion`'s boundary math holds for that shape too (segment A should end up being days 1-7, segment B days 8-10).

- [ ] **Step 4: Confirm no regression on normal (non-split) bookings**

Create one ordinary single-car reservation with no conflicts through the same modal. Confirm it saves as a single row with `booking_group_id = null` and no badge in the table, and that editing an existing reservation's dates into a conflict still shows the old plain "Book anyway" banner (not a split suggestion), per the Scope constraint that edits never split.

- [ ] **Step 5: Update the Dev Log**

Per this project's `CLAUDE.md`, log the completed feature in the Notion Dev Log — Changelog page with today's date, the files touched, and status "shipped", using `mcp__claude_ai_Notion__notion-update-page`.
