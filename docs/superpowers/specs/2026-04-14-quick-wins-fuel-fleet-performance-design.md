# Design Spec: Quick Wins — Fuel & Odometer Tracking + Fleet Performance Reports

**Date:** 2026-04-14
**Status:** Approved
**Scope:** Surface existing fuel/odometer data with discrepancy detection + expand reports with per-car utilization breakdown

---

## Overview

The `reservations` table already stores `odometer_out`, `odometer_in`, `fuel_out`, and `fuel_in`. These fields are collected in the Booking Modal but never surfaced anywhere useful. This spec adds:

1. **FuelSummary** — a component that detects fuel discrepancies, shows a suggested charge, and lets staff apply it to `amount_outstanding` with one click.
2. **FleetPerformanceTab** — a new tab in the Reports page showing per-car utilization %, idle days, miles driven, and revenue.
3. **Fuel Charge Rate setting** — a configurable `fuel_charge_per_level` on the tenant, set in Settings → Payments.

No new pages, no new routes, no auth changes, one DB migration.

---

## Architecture

### New files (2)

| File | Purpose |
|---|---|
| `components/dashboard/FuelSummary.tsx` | Fuel discrepancy widget rendered inside BookingModal |
| `app/(dashboard)/dashboard/finance/reports/FleetPerformanceTab.tsx` | Per-car performance table rendered as a tab in ReportsClient |

### Modified files (4)

| File | Change |
|---|---|
| `app/(dashboard)/dashboard/bookings/BookingModal.tsx` | Import and render `<FuelSummary>` below the Vehicle State section |
| `app/(dashboard)/dashboard/finance/reports/ReportsClient.tsx` | Add tab switcher (Finance / Fleet Performance), render `<FleetPerformanceTab>` when active |
| `app/(dashboard)/dashboard/settings/payments/page.tsx` | Add "Rental Fees" section with fuel charge rate input |
| `lib/supabase/types.ts` | Add `fuel_charge_per_level?: number \| null` to `Tenant` interface |

### DB migration (1)

```sql
ALTER TABLE tenants
  ADD COLUMN fuel_charge_per_level numeric(10,2) DEFAULT NULL;
```

Nullable. If null, `FuelSummary` defaults to $20/level.

---

## Component: FuelSummary

**Location:** `components/dashboard/FuelSummary.tsx`

**Props:**
```ts
interface FuelSummaryProps {
  fuelOut: string | null        // e.g. "Full", "3/4", "1/2", "1/4", "Empty"
  fuelIn: string | null
  chargePerLevel: number        // from tenant.fuel_charge_per_level ?? 20
  amountOutstanding: number | null
  onApplyCharge: (newAmount: number) => void  // updates formData in parent
}
```

**Fuel level order (index = value):**
```
Full=4, 3/4=3, 1/2=2, 1/4=1, Empty=0
```

**Discrepancy calculation:**
```
levels_missing = level(fuel_out) - level(fuel_in)
suggested_charge = levels_missing * chargePerLevel
```

**Emoji mapping:**
- Full → 🟢
- 3/4 → 🟡
- 1/2 → 🟠
- 1/4 → 🔴
- Empty → ⚫

**Rendering rules:**
- Only renders when both `fuelOut` and `fuelIn` are non-null
- If `levels_missing <= 0`: green "Fuel returned full — no charge needed" banner
- If `levels_missing > 0`: yellow warning card showing:
  - Out level emoji → In level emoji
  - Suggested charge amount
  - "Apply to Outstanding" button — adds `suggested_charge` to current `amount_outstanding` and calls `onApplyCharge`

**Placement in BookingModal:** Below the closing `</div>` of the "Vehicle State (optional)" section, before the "Damage Report" section.

---

## Component: FleetPerformanceTab

**Location:** `app/(dashboard)/dashboard/finance/reports/FleetPerformanceTab.tsx`

**Props:**
```ts
interface FleetPerformanceTabProps {
  reservations: Reservation[]   // all reservations for tenant (unfiltered — tab applies own date filter from parent)
  cars: ReportCar[]
  dateFrom: string
  dateTo: string
}
```

**Per-car calculations:**
- **Utilization %:** `rented_days / total_days_in_range * 100` — where `rented_days` counts overlap of non-cancelled reservations with the date range
- **Idle days:** `total_days_in_range - rented_days`
- **Miles driven:** sum of `(odometer_in - odometer_out)` for completed reservations in range where both values are non-null
- **Revenue:** sum of `total_amount` for non-cancelled reservations in range

**Color thresholds for utilization badge:**
- ≥ 70% → green (`#4ade80`)
- 40–69% → yellow (`#facc15`)
- < 40% → red (`#f87171`)

**Summary cards (top of tab):**
1. Fleet Utilization — fleet-wide average utilization %
2. Total Miles Driven — sum across all cars in range
3. Best Performer — car with highest utilization % and its %

**Table columns:** Vehicle (make + model + year + color), Utilization (badge + progress bar), Idle Days, Miles, Revenue

**Sort order:** Descending by utilization %.

**Date filter:** Tab receives `dateFrom` and `dateTo` from `ReportsClient` — the same date picker used by the Finance tab. Both tabs share a single date range state.

---

## Tab switcher in ReportsClient

Add state:
```ts
const [activeTab, setActiveTab] = useState<'finance' | 'fleet'>('finance')
```

Render tab pills above the existing content. When `activeTab === 'fleet'`, render `<FleetPerformanceTab>` instead of the existing finance content. The date range presets and date inputs remain visible in both tabs.

---

## Settings: Rental Fees

**Location:** `app/(dashboard)/dashboard/settings/payments/page.tsx`

Add a new section below the existing Stripe Connect card, titled **"Rental Fees"**, containing:

- **Fuel Charge Per Level** — number input, prefixed with `$`, placeholder `20.00`
- Saved to `tenants.fuel_charge_per_level` via a new `updateRentalFees` server action in `settings/payments/actions.ts` (the existing `actions.ts` in that folder only handles Stripe Connect — add a new exported function that does a Supabase `update` on the `tenants` table, same pattern as `BrandSettings.tsx`)
- Displayed with the same glass card styling as other settings sections

The value is read in `BookingModal` by including `fuel_charge_per_level` in the tenant query in `bookings/page.tsx`, then passed down as a prop to `<FuelSummary>`.

**Modified files update:** Also add `app/(dashboard)/dashboard/settings/payments/actions.ts` to the modified files list — add `updateRentalFees` function.

---

## Data Flow

```
BookingModal
  → reads tenant.fuel_charge_per_level (via page.tsx query)
  → passes to <FuelSummary chargePerLevel={...} />
  → FuelSummary computes discrepancy
  → onApplyCharge updates formData.amount_outstanding in BookingModal state
  → saved on form submit via updateReservation()

ReportsClient
  → tab state: 'finance' | 'fleet'
  → passes reservations + cars + dateFrom + dateTo to <FleetPerformanceTab>
  → FleetPerformanceTab computes per-car stats client-side (no extra DB query)
```

---

## Error handling

- `FuelSummary` renders nothing if either fuel value is missing — no error state needed
- `FleetPerformanceTab` shows an empty state ("No data for this date range") if no reservations match
- Miles column shows `—` for cars with no odometer data in range
- `fuel_charge_per_level` null → fall back to 20 in `FuelSummary`

---

## What is NOT in scope

- Fuel/odometer columns in the bookings table (not needed — data visible in modal)
- Mileage-based pricing (separate feature)
- PDF export of fleet performance (future)
- Per-car utilization on the main dashboard (future)
