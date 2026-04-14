# Quick Wins — Fuel Discrepancy Tracking + Fleet Performance Tab

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface existing fuel/odometer data with a discrepancy alert in the Booking Modal, and add a per-car Fleet Performance tab to the Reports page.

**Architecture:** Extract pure calculation logic into utility functions (easy to unit test), then build focused React components that consume them. Wire components into existing pages with minimal changes. One DB migration adds a configurable fuel charge rate per tenant.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase (PostgreSQL), Tailwind CSS, Jest + jsdom

**Spec:** `docs/superpowers/specs/2026-04-14-quick-wins-fuel-fleet-performance-design.md`

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Create | `lib/utils/fuel-utils.ts` | Pure functions: fuel level index, discrepancy calc |
| Create | `lib/utils/fleet-performance-utils.ts` | Pure functions: per-car stats calc |
| Create | `components/dashboard/FuelSummary.tsx` | Fuel discrepancy UI widget |
| Create | `app/(dashboard)/dashboard/finance/reports/FleetPerformanceTab.tsx` | Per-car performance table |
| Create | `supabase/migrations/20260414_add_fuel_charge_per_level.sql` | DB migration |
| Create | `__tests__/lib/fuel-utils.test.ts` | Unit tests for fuel utils |
| Create | `__tests__/lib/fleet-performance-utils.test.ts` | Unit tests for fleet utils |
| Modify | `lib/supabase/types.ts` | Add `fuel_charge_per_level` to `Tenant` |
| Modify | `app/(dashboard)/dashboard/bookings/page.tsx` | Fetch tenant `fuel_charge_per_level` |
| Modify | `app/(dashboard)/dashboard/bookings/BookingsTable.tsx` | Accept + pass `chargePerLevel` prop |
| Modify | `app/(dashboard)/dashboard/bookings/BookingModal.tsx` | Accept `chargePerLevel`, render `<FuelSummary>` |
| Modify | `app/(dashboard)/dashboard/settings/actions.ts` | Add `updateRentalFees` server action |
| Modify | `app/(dashboard)/dashboard/settings/payments/page.tsx` | Add Rental Fees section UI |
| Modify | `app/(dashboard)/dashboard/finance/reports/ReportsClient.tsx` | Add tab switcher + render `<FleetPerformanceTab>` |

---

## Task 1: DB Migration + Types

**Files:**
- Create: `supabase/migrations/20260414_add_fuel_charge_per_level.sql`
- Modify: `lib/supabase/types.ts`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/20260414_add_fuel_charge_per_level.sql
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS fuel_charge_per_level numeric(10,2) DEFAULT NULL;
```

- [ ] **Step 2: Run the migration against your Supabase project**

```bash
# Via Supabase MCP or dashboard SQL editor — run:
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS fuel_charge_per_level numeric(10,2) DEFAULT NULL;
```

Verify with:
```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'tenants' AND column_name = 'fuel_charge_per_level';
```
Expected: one row returned with `numeric` type.

- [ ] **Step 3: Add field to Tenant type**

In `lib/supabase/types.ts`, find the `Tenant` interface and add one line after `agreement_template_url`:

```ts
  agreement_template_url: string | null
  fuel_charge_per_level: number | null   // ← add this line
  experience_pillars: ExperiencePillar[] | null
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260414_add_fuel_charge_per_level.sql lib/supabase/types.ts
git commit -m "feat: add fuel_charge_per_level to tenants table and Tenant type"
```

---

## Task 2: Fuel Utility Functions + Tests

**Files:**
- Create: `lib/utils/fuel-utils.ts`
- Create: `__tests__/lib/fuel-utils.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/lib/fuel-utils.test.ts`:

```ts
import { getFuelLevel, getFuelDiscrepancy } from '@/lib/utils/fuel-utils'

describe('getFuelLevel', () => {
  it('returns 4 for Full', () => expect(getFuelLevel('Full')).toBe(4))
  it('returns 3 for 3/4', () => expect(getFuelLevel('3/4')).toBe(3))
  it('returns 2 for 1/2', () => expect(getFuelLevel('1/2')).toBe(2))
  it('returns 1 for 1/4', () => expect(getFuelLevel('1/4')).toBe(1))
  it('returns 0 for Empty', () => expect(getFuelLevel('Empty')).toBe(0))
  it('returns -1 for unknown value', () => expect(getFuelLevel('unknown')).toBe(-1))
})

describe('getFuelDiscrepancy', () => {
  it('returns 0 charge when fuel returned full', () => {
    const result = getFuelDiscrepancy('Full', 'Full', 20)
    expect(result).toEqual({ levelsMissing: 0, suggestedCharge: 0 })
  })

  it('calculates 2 levels missing with $20/level = $40', () => {
    const result = getFuelDiscrepancy('Full', '1/2', 20)
    expect(result).toEqual({ levelsMissing: 2, suggestedCharge: 40 })
  })

  it('calculates 1 level missing with $30/level = $30', () => {
    const result = getFuelDiscrepancy('3/4', '1/2', 30)
    expect(result).toEqual({ levelsMissing: 1, suggestedCharge: 30 })
  })

  it('returns 0 when fuel returned higher (overfill)', () => {
    const result = getFuelDiscrepancy('1/2', 'Full', 20)
    expect(result).toEqual({ levelsMissing: 0, suggestedCharge: 0 })
  })

  it('returns 0 charge when fuelOut is null', () => {
    const result = getFuelDiscrepancy(null, 'Full', 20)
    expect(result).toEqual({ levelsMissing: 0, suggestedCharge: 0 })
  })

  it('returns 0 charge when fuelIn is null', () => {
    const result = getFuelDiscrepancy('Full', null, 20)
    expect(result).toEqual({ levelsMissing: 0, suggestedCharge: 0 })
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx jest __tests__/lib/fuel-utils.test.ts --no-coverage
```
Expected: FAIL — "Cannot find module '@/lib/utils/fuel-utils'"

- [ ] **Step 3: Create the utility**

Create `lib/utils/fuel-utils.ts`:

```ts
const FUEL_LEVELS: Record<string, number> = {
  Full: 4,
  '3/4': 3,
  '1/2': 2,
  '1/4': 1,
  Empty: 0,
}

export function getFuelLevel(fuel: string): number {
  return FUEL_LEVELS[fuel] ?? -1
}

export function getFuelDiscrepancy(
  fuelOut: string | null,
  fuelIn: string | null,
  chargePerLevel: number
): { levelsMissing: number; suggestedCharge: number } {
  if (!fuelOut || !fuelIn) return { levelsMissing: 0, suggestedCharge: 0 }
  const levelsMissing = Math.max(0, getFuelLevel(fuelOut) - getFuelLevel(fuelIn))
  return { levelsMissing, suggestedCharge: levelsMissing * chargePerLevel }
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx jest __tests__/lib/fuel-utils.test.ts --no-coverage
```
Expected: PASS — 9 tests passing

- [ ] **Step 5: Commit**

```bash
git add lib/utils/fuel-utils.ts __tests__/lib/fuel-utils.test.ts
git commit -m "feat: add fuel utility functions with tests"
```

---

## Task 3: Fleet Performance Utility Functions + Tests

**Files:**
- Create: `lib/utils/fleet-performance-utils.ts`
- Create: `__tests__/lib/fleet-performance-utils.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/lib/fleet-performance-utils.test.ts`:

```ts
import { calcCarStats, calcFleetSummary } from '@/lib/utils/fleet-performance-utils'
import type { Reservation } from '@/lib/supabase/types'

const makeRes = (overrides: Partial<Reservation> = {}): Reservation => ({
  id: 1,
  car_id: 1,
  status: 'completed',
  pickup_date: '2026-04-01',
  return_date: '2026-04-05',
  total_amount: 500,
  odometer_out: 1000,
  odometer_in: 1200,
  customer_name: null, customer_email: null, customer_phone: null,
  pickup_time: null, return_time: null, pickup_location: null, return_location: null,
  source: null, notes: null, tenant_id: null, license_number: null, license_state: null,
  license_country: null, insurance_provider: null, insurance_policy_number: null,
  agreement_token: null, agreement_sent_at: null, agreement_signed_at: null,
  agreement_signed_ip: null, agreement_pdf_url: null, agreement_signature_url: null,
  customer_dob: null, customer_address: null, security_deposit: null,
  surcharge: null, amount_outstanding: null, fuel_out: null, fuel_in: null,
  damage_checkin: null, damage_checkout: null,
  ...overrides,
})

describe('calcCarStats', () => {
  const dateFrom = '2026-04-01'
  const dateTo = '2026-04-30'
  const totalDays = 30

  it('calculates utilization for a single reservation spanning 4 days', () => {
    const result = calcCarStats(1, [makeRes()], dateFrom, dateTo)
    expect(result.utilization).toBe(Math.round((4 / totalDays) * 100))
  })

  it('calculates miles as odometer_in minus odometer_out', () => {
    const result = calcCarStats(1, [makeRes()], dateFrom, dateTo)
    expect(result.miles).toBe(200)
  })

  it('calculates revenue from total_amount', () => {
    const result = calcCarStats(1, [makeRes()], dateFrom, dateTo)
    expect(result.revenue).toBe(500)
  })

  it('excludes cancelled reservations from utilization and revenue', () => {
    const result = calcCarStats(1, [makeRes({ status: 'cancelled' })], dateFrom, dateTo)
    expect(result.utilization).toBe(0)
    expect(result.revenue).toBe(0)
  })

  it('excludes reservations for other cars', () => {
    const result = calcCarStats(1, [makeRes({ car_id: 2 })], dateFrom, dateTo)
    expect(result.utilization).toBe(0)
  })

  it('returns 0 miles when odometer data is missing', () => {
    const result = calcCarStats(1, [makeRes({ odometer_out: null as any, odometer_in: null as any })], dateFrom, dateTo)
    expect(result.miles).toBe(0)
  })

  it('calculates idle days as totalDays minus rented days', () => {
    const result = calcCarStats(1, [makeRes()], dateFrom, dateTo)
    expect(result.idleDays).toBe(totalDays - 4)
  })
})

describe('calcFleetSummary', () => {
  it('returns best performer by utilization', () => {
    const car1Stats = { utilization: 80, idleDays: 6, miles: 500, revenue: 2000 }
    const car2Stats = { utilization: 40, idleDays: 18, miles: 200, revenue: 800 }
    const result = calcFleetSummary([
      { carId: 1, name: 'BMW 530i', ...car1Stats },
      { carId: 2, name: 'Mercedes C300', ...car2Stats },
    ])
    expect(result.bestPerformer?.name).toBe('BMW 530i')
  })

  it('calculates average utilization', () => {
    const result = calcFleetSummary([
      { carId: 1, name: 'A', utilization: 80, idleDays: 6, miles: 0, revenue: 0 },
      { carId: 2, name: 'B', utilization: 40, idleDays: 18, miles: 0, revenue: 0 },
    ])
    expect(result.avgUtilization).toBe(60)
  })

  it('sums total miles', () => {
    const result = calcFleetSummary([
      { carId: 1, name: 'A', utilization: 50, idleDays: 15, miles: 300, revenue: 0 },
      { carId: 2, name: 'B', utilization: 50, idleDays: 15, miles: 200, revenue: 0 },
    ])
    expect(result.totalMiles).toBe(500)
  })

  it('returns null bestPerformer for empty array', () => {
    const result = calcFleetSummary([])
    expect(result.bestPerformer).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx jest __tests__/lib/fleet-performance-utils.test.ts --no-coverage
```
Expected: FAIL — "Cannot find module"

- [ ] **Step 3: Create the utility**

Create `lib/utils/fleet-performance-utils.ts`:

```ts
import type { Reservation } from '@/lib/supabase/types'

export interface CarStats {
  carId: number
  name: string
  utilization: number  // percentage 0-100
  idleDays: number
  miles: number
  revenue: number
}

export interface FleetSummary {
  avgUtilization: number
  totalMiles: number
  bestPerformer: CarStats | null
}

export function calcCarStats(
  carId: number,
  reservations: Reservation[],
  dateFrom: string,
  dateTo: string
): Omit<CarStats, 'carId' | 'name'> {
  const start = new Date(dateFrom)
  const end = new Date(dateTo)
  const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1)

  const carRes = reservations.filter(r => r.car_id === carId && r.status !== 'cancelled')

  let rentedDays = 0
  let miles = 0
  let revenue = 0

  for (const r of carRes) {
    if (!r.pickup_date) continue
    const p = new Date(r.pickup_date)
    const rt = new Date(r.return_date || r.pickup_date)
    const overlapStart = Math.max(start.getTime(), p.getTime())
    const overlapEnd = Math.min(end.getTime(), rt.getTime())
    if (overlapEnd > overlapStart) {
      rentedDays += Math.ceil((overlapEnd - overlapStart) / 86400000)
    }
    if (r.odometer_out != null && r.odometer_in != null) {
      miles += Math.max(0, r.odometer_in - r.odometer_out)
    }
    revenue += Number(r.total_amount) || 0
  }

  const utilization = Math.min(100, Math.round((rentedDays / totalDays) * 100))
  return { utilization, idleDays: totalDays - rentedDays, miles, revenue }
}

export function calcFleetSummary(cars: CarStats[]): FleetSummary {
  if (cars.length === 0) return { avgUtilization: 0, totalMiles: 0, bestPerformer: null }

  const avgUtilization = Math.round(cars.reduce((s, c) => s + c.utilization, 0) / cars.length)
  const totalMiles = cars.reduce((s, c) => s + c.miles, 0)
  const bestPerformer = cars.reduce((best, c) => c.utilization > best.utilization ? c : best, cars[0])

  return { avgUtilization, totalMiles, bestPerformer }
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx jest __tests__/lib/fleet-performance-utils.test.ts --no-coverage
```
Expected: PASS — all tests passing

- [ ] **Step 5: Commit**

```bash
git add lib/utils/fleet-performance-utils.ts __tests__/lib/fleet-performance-utils.test.ts
git commit -m "feat: add fleet performance utility functions with tests"
```

---

## Task 4: FuelSummary Component

**Files:**
- Create: `components/dashboard/FuelSummary.tsx`

- [ ] **Step 1: Create the component**

Create `components/dashboard/FuelSummary.tsx`:

```tsx
'use client'

import { getFuelDiscrepancy } from '@/lib/utils/fuel-utils'

const FUEL_EMOJI: Record<string, string> = {
  Full: '🟢',
  '3/4': '🟡',
  '1/2': '🟠',
  '1/4': '🔴',
  Empty: '⚫',
}

interface FuelSummaryProps {
  fuelOut: string | null
  fuelIn: string | null
  chargePerLevel: number
  amountOutstanding: number | null
  onApplyCharge: (newAmount: number) => void
}

export default function FuelSummary({
  fuelOut,
  fuelIn,
  chargePerLevel,
  amountOutstanding,
  onApplyCharge,
}: FuelSummaryProps) {
  if (!fuelOut || !fuelIn) return null

  const { levelsMissing, suggestedCharge } = getFuelDiscrepancy(fuelOut, fuelIn, chargePerLevel)

  if (levelsMissing <= 0) {
    return (
      <div className="md:col-span-2 mt-2">
        <div className="flex items-center gap-3 bg-emerald-500/7 border border-emerald-500/20 rounded-2xl px-5 py-3.5">
          <span>✅</span>
          <div>
            <p className="text-sm font-semibold text-white/80">Fuel returned full — no charge needed</p>
            <p className="text-xs text-white/35 mt-0.5">
              Out: {fuelOut} &nbsp;→&nbsp; In: {fuelIn}
            </p>
          </div>
        </div>
      </div>
    )
  }

  const currentOutstanding = amountOutstanding ?? 0
  const newOutstanding = currentOutstanding + suggestedCharge

  return (
    <div className="md:col-span-2 mt-2">
      <div className="bg-yellow-500/8 border border-yellow-500/25 rounded-2xl p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <span>⛽</span>
          <span className="text-sm font-bold text-yellow-400 uppercase tracking-wider">
            Fuel Discrepancy Detected
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center">
            <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Out</p>
            <div className="text-2xl">{FUEL_EMOJI[fuelOut] ?? '❓'}</div>
            <p className="text-sm font-semibold text-white mt-1">{fuelOut}</p>
          </div>
          <div className="flex items-center justify-center text-white/30 text-xl">→</div>
          <div className="text-center">
            <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">In</p>
            <div className="text-2xl">{FUEL_EMOJI[fuelIn] ?? '❓'}</div>
            <p className="text-sm font-semibold text-yellow-400 mt-1">{fuelIn}</p>
          </div>
        </div>
        <div className="bg-black/20 rounded-xl p-3.5 flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] text-white/40 uppercase tracking-widest">Suggested Charge</p>
            <p className="text-xl font-bold text-white mt-0.5">
              ${suggestedCharge.toFixed(2)}
            </p>
            <p className="text-[11px] text-white/35 mt-0.5">
              {levelsMissing} level{levelsMissing > 1 ? 's' : ''} × ${chargePerLevel}/level
            </p>
          </div>
          <button
            type="button"
            onClick={() => onApplyCharge(newOutstanding)}
            className="bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/40 text-yellow-400 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors whitespace-nowrap"
          >
            Apply to Outstanding
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/FuelSummary.tsx
git commit -m "feat: add FuelSummary component with discrepancy detection"
```

---

## Task 5: Wire FuelSummary into BookingModal

**Files:**
- Modify: `app/(dashboard)/dashboard/bookings/page.tsx`
- Modify: `app/(dashboard)/dashboard/bookings/BookingsTable.tsx`
- Modify: `app/(dashboard)/dashboard/bookings/BookingModal.tsx`

- [ ] **Step 1: Fetch tenant in bookings page**

In `app/(dashboard)/dashboard/bookings/page.tsx`, update the parallel fetches to also query the tenant:

Replace:
```ts
const [{ data: reservations }, { data: cars }] = await Promise.all([
  supabase
    .from('reservations')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('pickup_date', { ascending: false }),
  supabase
    .from('cars')
    .select('id, make, model, model_full')
    .eq('tenant_id', tenantId),
])
```

With:
```ts
const [{ data: reservations }, { data: cars }, { data: tenant }] = await Promise.all([
  supabase
    .from('reservations')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('pickup_date', { ascending: false }),
  supabase
    .from('cars')
    .select('id, make, model, model_full')
    .eq('tenant_id', tenantId),
  supabase
    .from('tenants')
    .select('fuel_charge_per_level')
    .eq('id', tenantId)
    .single(),
])
```

Then pass it to `BookingsTable`. Replace the `<BookingsTable>` render:
```tsx
<BookingsTable
  reservations={rows}
  cars={carRows}
  chargePerLevel={tenant?.fuel_charge_per_level ?? 20}
/>
```

- [ ] **Step 2: Add prop to BookingsTable**

In `app/(dashboard)/dashboard/bookings/BookingsTable.tsx`, find the Props interface (around line 18) and add `chargePerLevel`:

```ts
interface Props {
  reservations: Reservation[]
  cars: Car[]                    // existing
  chargePerLevel: number         // ← add this
}
```

Then update the function signature to destructure it:
```ts
export default function BookingsTable({ reservations, cars, chargePerLevel }: Props) {
```

Then pass it to `<BookingModal>` (around line 333):
```tsx
<BookingModal
  isOpen={modalOpen}
  onClose={() => setModalOpen(false)}
  reservation={editingRes}
  cars={cars}
  chargePerLevel={chargePerLevel}
/>
```

- [ ] **Step 3: Add prop + render FuelSummary in BookingModal**

In `app/(dashboard)/dashboard/bookings/BookingModal.tsx`:

**a) Add import at top of file** (after existing imports):
```ts
import FuelSummary from '@/components/dashboard/FuelSummary'
```

**b) Add `chargePerLevel` to Props interface** (around line 9):
```ts
interface Props {
  isOpen: boolean
  onClose: () => void
  reservation?: Reservation | null
  cars: Car[]
  chargePerLevel: number   // ← add this
}
```

**c) Destructure in function signature** (around line 16):
```ts
export default function BookingModal({ isOpen, onClose, reservation, cars, chargePerLevel }: Props) {
```

**d) Render FuelSummary** — find the line that reads `{/* Damage Report */}` (around line 514) and insert the component just before it:
```tsx
            <FuelSummary
              fuelOut={formData.fuel_out ?? null}
              fuelIn={formData.fuel_in ?? null}
              chargePerLevel={chargePerLevel}
              amountOutstanding={formData.amount_outstanding ?? null}
              onApplyCharge={(newAmount) => setFormData({ ...formData, amount_outstanding: newAmount })}
            />

            {/* Damage Report */}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add app/\(dashboard\)/dashboard/bookings/page.tsx \
        app/\(dashboard\)/dashboard/bookings/BookingsTable.tsx \
        app/\(dashboard\)/dashboard/bookings/BookingModal.tsx
git commit -m "feat: wire FuelSummary into BookingModal with tenant charge rate"
```

---

## Task 6: Rental Fees Setting

**Files:**
- Modify: `app/(dashboard)/dashboard/settings/actions.ts`
- Modify: `app/(dashboard)/dashboard/settings/payments/page.tsx`

- [ ] **Step 1: Add updateRentalFees server action**

In `app/(dashboard)/dashboard/settings/actions.ts`, add this function at the end of the file (before the last closing line if any, otherwise just append):

```ts
export async function updateRentalFees(data: {
  fuel_charge_per_level: number | null
}): Promise<{ error: string | null }> {
  const supabase = createClient()
  const tenantId = await getTenantId()
  const { error } = await supabase.from('tenants').update(data).eq('id', tenantId)
  revalidatePath('/dashboard/settings/payments')
  return { error: error?.message ?? null }
}
```

- [ ] **Step 2: Add Rental Fees UI to the payments settings page**

In `app/(dashboard)/dashboard/settings/payments/page.tsx`:

**a) Add import for the new action and make it a client component with state** — The payments page is currently a Server Component. Convert the Rental Fees section into a small `RentalFeesForm` client component to keep the page as a Server Component.

Create inline at the top of the same file (or as a new file `RentalFeesForm.tsx` in the same folder):

Add this import to `payments/page.tsx`:
```ts
import RentalFeesForm from './RentalFeesForm'
```

Create `app/(dashboard)/dashboard/settings/payments/RentalFeesForm.tsx`:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { updateRentalFees } from '@/app/(dashboard)/dashboard/settings/actions'

interface Props {
  initialValue: number | null
}

export default function RentalFeesForm({ initialValue }: Props) {
  const [value, setValue] = useState<string>(initialValue != null ? String(initialValue) : '')
  const [isPending, startTransition] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = value === '' ? null : parseFloat(value)
    startTransition(async () => {
      const result = await updateRentalFees({ fuel_charge_per_level: parsed })
      setMsg(result.error ? `Error: ${result.error}` : 'Saved')
      setTimeout(() => setMsg(null), 3000)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">
          Fuel Charge Per Level
        </label>
        <div className="flex items-center gap-2 max-w-xs">
          <span className="text-white/40 text-sm">$</span>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="20.00"
            value={value}
            onChange={e => setValue(e.target.value)}
            className="w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white"
          />
        </div>
        <p className="text-[11px] text-white/30">
          Charged per fuel level missing at return (e.g. Full → 1/2 = 2 levels). Leave blank to use $20 default.
        </p>
      </div>
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={isPending}
          className="bg-white/10 hover:bg-white/15 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors disabled:opacity-50"
        >
          {isPending ? 'Saving...' : 'Save'}
        </button>
        {msg && (
          <span className={`text-sm ${msg.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'}`}>
            {msg}
          </span>
        )}
      </div>
    </form>
  )
}
```

**b) Add the section to `payments/page.tsx`**

In `payments/page.tsx`, fetch `fuel_charge_per_level` from the tenant and render `<RentalFeesForm>` below the Stripe Connect card.

After `await requireTenantId()`, add:
```ts
const { supabase, tenantId } = await requireTenantId()
const { data: tenant } = await supabase
  .from('tenants')
  .select('fuel_charge_per_level')
  .eq('id', tenantId)
  .single()
```

Then add this card to the return JSX, after the existing Stripe Connect card closing `</div>`:

```tsx
{/* Rental Fees */}
<div className="glass border border-white/10 rounded-3xl p-8 lg:p-10">
  <div className="flex items-center gap-3 mb-6">
    <div className="p-2.5 rounded-xl bg-yellow-500/10 text-yellow-400">
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
    <div>
      <h3 className="text-white font-black italic tracking-tight uppercase">Rental Fees</h3>
      <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Fuel & Charges</p>
    </div>
  </div>
  <RentalFeesForm initialValue={tenant?.fuel_charge_per_level ?? null} />
</div>
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add app/\(dashboard\)/dashboard/settings/actions.ts \
        app/\(dashboard\)/dashboard/settings/payments/page.tsx \
        app/\(dashboard\)/dashboard/settings/payments/RentalFeesForm.tsx
git commit -m "feat: add Rental Fees setting with configurable fuel charge per level"
```

---

## Task 7: FleetPerformanceTab Component

**Files:**
- Create: `app/(dashboard)/dashboard/finance/reports/FleetPerformanceTab.tsx`

- [ ] **Step 1: Create the component**

Create `app/(dashboard)/dashboard/finance/reports/FleetPerformanceTab.tsx`:

```tsx
'use client'

import { useMemo } from 'react'
import type { Reservation } from '@/lib/supabase/types'
import { calcCarStats, calcFleetSummary, type CarStats } from '@/lib/utils/fleet-performance-utils'

interface ReportCar {
  id: number
  make: string
  model: string
  model_full: string | null
}

interface Props {
  reservations: Reservation[]
  cars: ReportCar[]
  dateFrom: string
  dateTo: string
}

function utilizationColor(pct: number) {
  if (pct >= 70) return { badge: 'bg-emerald-500/15 text-emerald-400', bar: '#4ade80' }
  if (pct >= 40) return { badge: 'bg-yellow-500/12 text-yellow-400', bar: '#facc15' }
  return { badge: 'bg-red-500/12 text-red-400', bar: '#f87171' }
}

export default function FleetPerformanceTab({ reservations, cars, dateFrom, dateTo }: Props) {
  const carStats: CarStats[] = useMemo(() => {
    return cars
      .map(car => {
        const name = car.model_full || `${car.make} ${car.model}`
        return { carId: car.id, name, ...calcCarStats(car.id, reservations, dateFrom, dateTo) }
      })
      .sort((a, b) => b.utilization - a.utilization)
  }, [cars, reservations, dateFrom, dateTo])

  const summary = useMemo(() => calcFleetSummary(carStats), [carStats])

  if (carStats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-white/30 gap-3">
        <span className="text-4xl">🚗</span>
        <p className="text-sm">No data for this date range.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass border border-white/10 rounded-2xl p-5">
          <p className="text-[11px] text-white/35 uppercase tracking-widest mb-1.5">Fleet Utilization</p>
          <p className="text-3xl font-black text-white">{summary.avgUtilization}%</p>
          <p className="text-[11px] text-white/30 mt-1">avg across all vehicles</p>
        </div>
        <div className="glass border border-white/10 rounded-2xl p-5">
          <p className="text-[11px] text-white/35 uppercase tracking-widest mb-1.5">Total Miles Driven</p>
          <p className="text-3xl font-black text-white">{summary.totalMiles.toLocaleString()}</p>
          <p className="text-[11px] text-white/30 mt-1">across all rentals in range</p>
        </div>
        <div className="glass border border-white/10 rounded-2xl p-5">
          <p className="text-[11px] text-white/35 uppercase tracking-widest mb-1.5">Best Performer</p>
          {summary.bestPerformer ? (
            <>
              <p className="text-lg font-black text-emerald-400 leading-tight">{summary.bestPerformer.name}</p>
              <p className="text-[11px] text-white/30 mt-1">{summary.bestPerformer.utilization}% utilization</p>
            </>
          ) : (
            <p className="text-white/30 text-sm">—</p>
          )}
        </div>
      </div>

      {/* Per-car table */}
      <div className="glass border border-white/10 rounded-2xl overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] px-5 py-3 border-b border-white/[0.06]">
          {['Vehicle', 'Utilization', 'Idle Days', 'Miles', 'Revenue'].map(h => (
            <p key={h} className="text-[10px] font-bold text-white/30 uppercase tracking-widest last:text-right">{h}</p>
          ))}
        </div>

        {carStats.map((car, i) => {
          const { badge, bar } = utilizationColor(car.utilization)
          return (
            <div
              key={car.carId}
              className={`grid grid-cols-[2fr_1fr_1fr_1fr_1fr] px-5 py-3.5 items-center ${i < carStats.length - 1 ? 'border-b border-white/[0.04]' : ''}`}
            >
              <div>
                <p className="text-sm font-semibold text-white">{car.name}</p>
              </div>
              <div>
                <span className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded-md ${badge}`}>
                  {car.utilization}%
                </span>
                <div className="mt-1.5 h-1 bg-white/8 rounded-full w-4/5">
                  <div className="h-1 rounded-full" style={{ width: `${car.utilization}%`, backgroundColor: bar }} />
                </div>
              </div>
              <p className="text-sm text-white/60">{car.idleDays}</p>
              <p className="text-sm text-white/60">
                {car.miles > 0 ? car.miles.toLocaleString() : '—'}
              </p>
              <p className="text-sm font-semibold text-white text-right">
                ${car.revenue.toLocaleString(undefined, { minimumFractionDigits: 0 })}
              </p>
            </div>
          )
        })}
      </div>

      <p className="text-[11px] text-white/25 text-right">
        Utilization = rented days ÷ days in range · Miles = sum of odometer readings per completed rental
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add app/\(dashboard\)/dashboard/finance/reports/FleetPerformanceTab.tsx
git commit -m "feat: add FleetPerformanceTab component with per-car utilization table"
```

---

## Task 8: Wire Tab Switcher into ReportsClient

**Files:**
- Modify: `app/(dashboard)/dashboard/finance/reports/ReportsClient.tsx`

- [ ] **Step 1: Add tab state and import**

In `ReportsClient.tsx`, add the import at the top (after existing imports):
```ts
import FleetPerformanceTab from './FleetPerformanceTab'
```

Add tab state inside the component, after the existing `useState` calls:
```ts
const [activeTab, setActiveTab] = useState<'finance' | 'fleet'>('finance')
```

- [ ] **Step 2: Add tab pill switcher to the JSX**

Find the first `return (` in `ReportsClient.tsx`. Inside the outermost wrapping `<div>`, add the tab switcher right below the date range presets row (or as the first element after the opening div). Add this before the finance content:

```tsx
{/* Tab switcher */}
<div className="flex gap-1 bg-white/5 rounded-xl p-1 w-fit">
  <button
    onClick={() => setActiveTab('finance')}
    className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
      activeTab === 'finance' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'
    }`}
  >
    Finance
  </button>
  <button
    onClick={() => setActiveTab('fleet')}
    className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
      activeTab === 'fleet' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'
    }`}
  >
    Fleet Performance
  </button>
</div>
```

- [ ] **Step 3: Conditionally render FleetPerformanceTab**

Find the section in the JSX where the main finance content starts (stat cards, charts, by-car table). Wrap the entire finance content block in `{activeTab === 'finance' && ( ... )}` and add the fleet tab below it:

```tsx
{activeTab === 'finance' && (
  // ... all existing finance JSX content ...
)}

{activeTab === 'fleet' && (
  <FleetPerformanceTab
    reservations={reservations}
    cars={cars}
    dateFrom={dateFrom}
    dateTo={dateTo}
  />
)}
```

- [ ] **Step 4: Run all tests**

```bash
npx jest --no-coverage
```
Expected: all tests pass

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add app/\(dashboard\)/dashboard/finance/reports/ReportsClient.tsx
git commit -m "feat: add Fleet Performance tab to Reports page"
```

---

## Task 9: Manual Smoke Test

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Test FuelSummary in Booking Modal**
  1. Open `/dashboard/bookings`
  2. Edit any booking that has `Fuel Out` set
  3. Set `Fuel In` to a lower level (e.g. Out = Full, In = 1/2)
  4. Verify the yellow discrepancy card appears with "2 levels × $20/level = $40.00"
  5. Click "Apply to Outstanding" — verify the `Amount Outstanding` field updates
  6. Set `Fuel In` = `Fuel Out` — verify the green "no charge needed" banner appears

- [ ] **Step 3: Test Rental Fees setting**
  1. Open `/dashboard/settings/payments`
  2. Verify the "Rental Fees" card appears at the bottom
  3. Enter a value (e.g. 25) and click Save
  4. Reload the page — verify the value persists
  5. Go back to a booking, set fuel discrepancy — verify "25/level" appears

- [ ] **Step 4: Test Fleet Performance tab**
  1. Open `/dashboard/finance/reports`
  2. Verify "Finance" and "Fleet Performance" tab pills appear
  3. Click "Fleet Performance"
  4. Verify the 3 summary cards appear (Fleet Utilization, Total Miles, Best Performer)
  5. Verify the per-car table shows all fleet cars sorted by utilization
  6. Change the date range — verify the table updates
  7. Switch back to "Finance" — verify the existing reports still work

- [ ] **Step 5: Final commit if any fixes were made**

```bash
git add -p
git commit -m "fix: smoke test corrections"
```
