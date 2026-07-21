# Consignment Owners — one owner, multiple cars

**Date:** 2026-07-21
**Status:** Approved design

## Problem

The `consignments` table is one row per car, with the owner's identity
(`owner_name`, `owner_email`, `owner_phone`) duplicated on every row. To give one
owner several cars, the user re-types all their details per car. There is already a
real case in production: **Jorge Pauliac** owns cars **26 & 27** as two separate
rows. Editing that owner means editing every row, and the UI lists cars flat with no
owner grouping or combined payout.

## Goal

Make the owner a first-class entity, entered once, that many cars link to. The page
becomes owner-centric: each card is one owner, showing a combined payout and a
per-car breakdown.

## Data model

### New table: `consignment_owners`

The owner identity, entered once.

| column | type | notes |
|---|---|---|
| `id` | uuid PK (default `gen_random_uuid()`) | |
| `tenant_id` | uuid | scoped per tenant |
| `name` | text NOT NULL | |
| `email` | text NULL | |
| `phone` | text NULL | |
| `default_percentage` | numeric NULL | prefill for new cars (e.g. 70) |
| `notes` | text NULL | owner-level notes |
| `created_at` | timestamptz default `now()` | |

Index on `tenant_id`. RLS mirrors the existing `consignments` policies (tenant-scoped).

### Changed table: `consignments` (stays one row per car)

- **Add** `owner_id uuid` → FK to `consignment_owners(id)` (`ON DELETE RESTRICT`).
- **Keep** per-car `owner_percentage`, `contract_start`, `contract_end`, `notes`.
- **Retire** `owner_name` / `owner_email` / `owner_phone`: owner identity now comes
  from the linked owner. Keep the columns during migration for a safe backfill, stop
  reading/writing them in app code, and drop them in a later migration once verified.

## Backfill (inside the migration)

1. Insert one `consignment_owners` row per distinct `(tenant_id, owner_name,
   coalesce(owner_email,''))` group found in `consignments`, using `owner_name`,
   `owner_email`, `owner_phone` and the most common (or first) `owner_percentage` as
   `default_percentage`.
2. Set each `consignments.owner_id` to the matching new owner row.
3. Verify no `consignments` row is left with a null `owner_id` before the app switches
   to reading `owner_id`.

Expected result: Jorge Pauliac becomes one owner row; cars 26 & 27 both point to it.

## UI — owner-centric page

`ConsignmentsManager` renders **one card per owner**:

- Header: owner name, email · phone, edit/delete owner controls.
- **Combined owner payout** across all their cars for the selected period, plus a
  combined éPure share.
- Per-car breakdown rows: car label · split % · contract dates · gross revenue ·
  direct expenses · owner share · éPure share. Each row has edit/remove controls.
- **"+ Add car"** inside the card: pick a vehicle (excluding cars already consigned
  to avoid duplicates), split prefilled from the owner's `default_percentage`,
  editable contract dates/notes.

Top-level **"+ New Owner"** opens an owner modal (name/email/phone/default split/notes).

The period filter (from/to dates) behaves exactly as today; per-car revenue and
expense math is unchanged — the owner card just sums each car's owner share.

### Components

- `ConsignmentsManager.tsx` — groups cars by owner, renders owner cards, hosts modals.
- `OwnerModal.tsx` — create/edit a `consignment_owner`.
- `ConsignmentModal.tsx` — create/edit a per-car consignment; now takes an `owner_id`
  (owner is fixed by which card you clicked "Add car" from) instead of free-text owner
  fields. Vehicle dropdown excludes cars already linked to a consignment.

## Server actions (`actions.ts`)

- `createOwner(data)` / `updateOwner(id, data)` / `deleteOwner(id)` — tenant-scoped.
  `deleteOwner` **blocks** when the owner still has linked cars, returning a clear
  message ("Remove or reassign this owner's cars first."). No cascade.
- `createConsignment` / `updateConsignment` now accept `owner_id` (uuid) plus the
  per-car fields; they no longer write `owner_name`/`owner_email`/`owner_phone`.
- `deleteConsignment` unchanged in behavior (removes one car line).

## Types (`lib/supabase/types.ts`)

- New `ConsignmentOwner` interface.
- `Consignment`: add `owner_id: string | null`; change `id` from `number` to `string`
  (the DB column is uuid — current `number` typing is wrong and worked only by
  coincidence). Update `car_id` handling accordingly (stays integer). Mark
  `owner_name`/`owner_email`/`owner_phone` as deprecated (kept until the drop
  migration).

## Error handling

- All actions validate `tenant_id` via `requireTenantId()` as today.
- Required fields validated client-side (owner name; car + split for a consignment).
- `deleteOwner` guard returns a user-facing error instead of throwing.
- Adding a car already consigned is prevented by filtering the vehicle dropdown; the
  server also relies on existing per-car rows so no duplicate owner data is created.

## Testing

- Unit: owner-grouping and combined-payout helpers (pure functions over
  consignments + reservations + expenses), covering multi-car owners, period
  filtering, and zero-car owners.
- Manual/DB verification: run the migration on a branch, confirm Jorge Pauliac
  collapses to one owner with cars 26 & 27 linked, `owner_id` non-null on all rows,
  and the UI shows one card with the combined payout matching the sum of the two
  previous cards.

## Out of scope

- Dropping the legacy `owner_name`/`owner_email`/`owner_phone` columns (separate
  follow-up migration after verification).
- Reassigning a car from one owner to another via drag/drop (edit the car line and
  change its owner can be a later enhancement; for now a car belongs to the owner it
  was created under).
