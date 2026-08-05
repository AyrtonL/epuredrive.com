# Card Payment Surcharge — Design

**Date:** 2026-08-04
**Status:** Approved

## Problem

There is no way to charge customers a surcharge for paying by credit/debit card, and no explicit record of how a reservation was actually paid:

- `reservations` has no `payment_method` column — there's no way to distinguish a card-paid booking from a cash/offline one after the fact.
- Price/total calculation is duplicated in at least four places (`components/sites/BookingWidget.tsx`, `app/api/checkout/route.ts`, `app/api/square/checkout/route.ts`, and manual entry in `app/(dashboard)/dashboard/bookings/BookingModal.tsx`), each reimplementing `days × daily_rate + extras (+ deposit)`. Adding a surcharge naively would mean a fifth divergent implementation.
- `reservations.surcharge` already exists as a free-entry admin field (shown on the rental agreement), but it is never populated automatically and is not tied to payment method.
- There is no per-tenant configurable rate for anything like this — the closest precedent, `tax_settings`, exists in the DB but is untracked in migrations and unused at checkout time; the closer working precedent is a single scalar column on `tenants` (e.g. `fuel_charge_per_level`).

## Goals

- Let a customer choose "Tarjeta" or "Efectivo" when booking online, and let staff choose the same when creating/editing a reservation manually.
- When "Tarjeta" is selected, add a 6%-by-default surcharge (configurable per tenant) on top of rental + extras + security deposit, shown as an explicit, visible line — never silently folded into the total.
- Persist the chosen payment method on the reservation.
- Compute the surcharge amount server-side from validated data for online (Stripe/Square) payments — never trust a client-supplied surcharge amount.
- Avoid a fifth divergent total-calculation implementation by introducing one small shared pure function for the surcharge math.

## Non-Goals

- A full shared `lib/pricing.ts` consolidating *all* total calculation (rental + extras + deposit) across the four existing call sites. That duplication predates this feature and is out of scope; only the new surcharge math is centralized.
- Applying the surcharge to the existing `tax_settings` mechanism or wiring `tax_settings` into checkout — that table is unused today and stays that way.
- Changing the offline/no-payment booking-request flow (`app/api/booking/request/route.ts`) beyond tagging it with `payment_method: 'cash'`.
- A general "payment method" concept beyond card vs. cash (e.g. bank transfer, check) — only the two values requested.

## Design

### 1. Schema

Two new nullable/defaulted columns, added via dedicated migrations following the existing `fuel_charge_per_level` pattern (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, with a `COMMENT ON COLUMN`):

```sql
-- tenants
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS card_surcharge_rate numeric(5,4) DEFAULT 0.06;
COMMENT ON COLUMN tenants.card_surcharge_rate IS 'Decimal rate (0.06 = 6%) added to card payments. NULL treated as 0.06 default.';

-- reservations
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS payment_method text;
COMMENT ON COLUMN reservations.payment_method IS 'How the reservation was/will be paid: card or cash. NULL for legacy rows predating this feature.';
```

No `CHECK` constraint on `payment_method` — kept loose (nullable free text) consistent with how `payment_processor` and other string-enum-like columns are already handled in this codebase (validated in application code, not the DB).

### 2. Shared surcharge helper — `lib/pricing/cardSurcharge.ts`

```ts
export function calculateCardSurcharge(subtotalCents: number, rate: number | null): number {
  const effectiveRate = rate ?? 0.06
  return Math.round(subtotalCents * effectiveRate)
}
```

Pure function, no I/O. Used by both the client-side estimate (`BookingWidget.tsx`) and every server-side authoritative calculation (`checkout/route.ts`, `square/checkout/route.ts`, `BookingModal.tsx` auto-fill). `subtotalCents` passed in already includes rental + extras + security deposit, per the approved "base de cálculo" decision.

### 3. Frontend — `components/sites/BookingWidget.tsx`

- Add a payment-method selector (two options: "Tarjeta" / "Efectivo") in the booking form, positioned before the price summary.
- Default: "Tarjeta" (matches current behavior, where the widget always leads to online payment).
- The existing `total` `useMemo` (currently rental + extras) is extended: when "Tarjeta" is selected, add `calculateCardSurcharge(subtotalCents, tenant.card_surcharge_rate)` as a distinct summary line ("Recargo por pago con tarjeta (6%)" — percentage shown reflects the tenant's actual configured rate, not a hardcoded "6%" string). When "Efectivo" is selected, no surcharge line appears and the total excludes it.
- On submit:
  - "Tarjeta" → existing Stripe/Square checkout call, now also passing the selected payment method so the server tags the reservation `payment_method: 'card'`.
  - "Efectivo" → routes through the existing no-payment `app/api/booking/request` flow (unchanged charge-wise), which now also sets `payment_method: 'cash'` on the created reservation.

### 4. Backend — online card checkout

**`app/api/checkout/route.ts`** (Stripe) and **`app/api/square/checkout/route.ts`** (Square), same treatment in both:

- After the existing server-side recomputation of rental + validated extras (+ security deposit where applicable), compute `surchargeCents = calculateCardSurcharge(subtotalCents, tenant.card_surcharge_rate)` using the tenant row already fetched for the request (extend the existing tenant `select()` to include `card_surcharge_rate`).
- Push the surcharge as its own line item: `{ price_data: { currency, product_data: { name: 'Recargo por pago con tarjeta' }, unit_amount: surchargeCents }, quantity: 1 }` — visible to the customer in the Stripe/Square checkout UI, consistent with how extras are already itemized.
- Stripe path: `application_fee_amount` (the platform's own cut) is computed from `totalCents` *after* the surcharge line item is included, since the surcharge is real revenue flowing through the same charge — no reason to exclude it from the platform fee base.
- The created reservation record gets `payment_method: 'card'`.

**Booking-request (cash) flow — `app/api/booking/request/route.ts`:**
- No pricing changes. Sets `payment_method: 'cash'` on the created reservation. No surcharge is calculated or stored.

### 5. Admin — `app/(dashboard)/dashboard/bookings/BookingModal.tsx`

- Add the same two-option selector ("Tarjeta" / "Efectivo") near the existing `surcharge` number field.
- On selecting "Tarjeta": auto-calculate `calculateCardSurcharge(currentTotalSubtotalCents, tenant.card_surcharge_rate)` and populate the `surcharge` field with that value. The field remains a normal editable number input afterward — staff can override it (e.g. to waive or adjust the fee), matching how the field behaves today.
- On selecting "Efectivo": no auto-fill; `surcharge` stays whatever it currently is (manual, as today).
- The selector's value is saved to `reservations.payment_method` alongside the rest of the form on save.
- Switching the selector after the field has been manually edited does **not** silently overwrite staff input a second time in the same session unless "Tarjeta" is (re-)selected — i.e., auto-fill only fires on the selection event itself, not on every render.

## Data Flow

1. **Online booking, card:** customer selects "Tarjeta" in `BookingWidget` → sees rental + extras + deposit + surcharge line, computed client-side for display only → submits → `checkout`/`square/checkout` route re-derives everything server-side (never trusts the client total), builds Stripe/Square line items including the surcharge, creates the session, and on success the reservation is created/updated with `payment_method: 'card'`.
2. **Online booking, cash:** customer selects "Efectivo" → no surcharge shown → submits → `app/api/booking/request` creates the reservation directly with `payment_method: 'cash'`, no charge.
3. **Manual admin booking:** staff opens `BookingModal`, picks "Tarjeta" or "Efectivo" → if card, `surcharge` field auto-populates (editable after) → save persists `payment_method` and whatever `surcharge` value is in the field at save time.

## Error Handling

- `card_surcharge_rate` is `NULL` on any tenant (pre-migration rows, or explicitly cleared): every call site treats `NULL` as `0.06` via `calculateCardSurcharge`'s default — no tenant silently gets a 0% surcharge by omission.
- Server-side checkout routes never accept a client-supplied surcharge amount; it is always recomputed from the tenant's stored rate and the server-validated subtotal, same trust boundary already used for extras pricing.
- `payment_method` is nullable — existing reservations created before this feature simply show as unset (no backfill migration; not user-facing data that needs a default).

## Testing

- Unit test `calculateCardSurcharge`: default rate (`null` → 6%), custom tenant rate, zero subtotal, rounding behavior (cents).
- Unit/integration test `checkout/route.ts` and `square/checkout/route.ts`: surcharge line item present and correctly sized when tenant has a custom rate, default rate, and when payment method is cash (request flow, not checkout — surcharge line item must not appear).
- Integration test `booking/request` flow: reservation created with `payment_method: 'cash'`, no surcharge.
- Manual verification in `BookingModal.tsx`: selecting "Tarjeta" auto-fills `surcharge`, manual edits after auto-fill persist on save, selecting "Efectivo" leaves the field untouched.
- Manual browser check of `BookingWidget.tsx`: surcharge line appears/disappears correctly when toggling the selector, matches the amount actually charged in the resulting Stripe/Square checkout session.
