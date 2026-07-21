# Consignment Owners Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the consignment owner a first-class entity so one owner can hold multiple cars, with payouts based on earned/completed revenue.

**Architecture:** Add a `consignment_owners` table; each `consignments` row (still one per car) links to an owner via `owner_id`. A pure helper module groups cars by owner and computes payouts using the shared `lib/finance/revenue.ts` policy. The consignments page becomes owner-centric: one card per owner with a combined payout plus a per-car breakdown.

**Tech Stack:** Next.js (App Router) server components + server actions, Supabase (Postgres, RLS), TypeScript, Jest (ts-jest), Tailwind.

## Global Constraints

- All data access is tenant-scoped via `requireTenantId()` and `.eq('tenant_id', tenantId)`. Never query across tenants.
- Revenue MUST come from `lib/finance/revenue.ts` (`isEarned`, `revenueBucket`, `overlapsRange`). Do not re-derive revenue inline.
- Payout basis: owner payout = split of **net completed** revenue `(completedGross − directExpenses) × owner%`. Active rentals are shown as an informational "in progress" figure only, never added to payout.
- Supabase project id: `brwzjwbpguiignrxvjdc`. RLS pattern to mirror: policy `USING ((tenant_id = current_tenant_id()) OR (tenant_id IS NULL))` + a `is_superuser()` ALL policy.
- Immutable updates only (spread, no mutation). Files stay focused (<800 lines).
- Money math: `net = max(0, earnedGross − expenses)`. Expenses filtered by `transaction_date`; reservations filtered by `overlapsRange`.

---

## File Structure

- **Create** `supabase/migrations/20260721020000_consignment_owners.sql` — new table, `owner_id` FK, backfill, RLS.
- **Modify** `lib/supabase/types.ts` — add `ConsignmentOwner`; add `owner_id` + fix `id` to `string` on `Consignment`.
- **Create** `lib/consignments/payouts.ts` — pure grouping + payout math.
- **Create** `__tests__/lib/consignment-payouts.test.ts` — unit tests for the above.
- **Modify** `app/(dashboard)/dashboard/clients/consignments/actions.ts` — owner CRUD + updated consignment actions.
- **Create** `app/(dashboard)/dashboard/clients/consignments/OwnerModal.tsx` — create/edit owner.
- **Modify** `app/(dashboard)/dashboard/clients/consignments/ConsignmentModal.tsx` — take `owner_id`, exclude already-consigned cars.
- **Modify** `app/(dashboard)/dashboard/clients/consignments/ConsignmentsManager.tsx` — owner-centric rendering.
- **Modify** `app/(dashboard)/dashboard/clients/consignments/page.tsx` — fetch owners.

---

## Task 1: Database migration (owners table + backfill + RLS)

**Files:**
- Create: `supabase/migrations/20260721020000_consignment_owners.sql`

**Interfaces:**
- Produces: table `consignment_owners(id uuid, tenant_id uuid, name text, email text, phone text, default_percentage numeric, notes text, created_at timestamptz)`; column `consignments.owner_id uuid` FK → `consignment_owners(id)` ON DELETE RESTRICT; every existing `consignments` row has non-null `owner_id` after backfill.

- [ ] **Step 1: Write the migration SQL**

```sql
-- Consignment owners: one owner, multiple cars.
-- 1. Owner identity table
-- 2. consignments.owner_id FK (one row still = one car)
-- 3. Backfill existing rows, grouping by (tenant_id, owner_name, email)
-- Legacy owner_name/email/phone columns are kept for now (dropped in a later
-- migration once the app no longer reads them).

CREATE TABLE IF NOT EXISTS consignment_owners (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid,
  name               text NOT NULL,
  email              text,
  phone              text,
  default_percentage numeric,
  notes              text,
  created_at         timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consignment_owners_tenant
  ON consignment_owners (tenant_id);

ALTER TABLE consignments
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES consignment_owners(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_consignments_owner
  ON consignments (owner_id);

-- Backfill: one owner per distinct (tenant_id, owner_name, coalesce(email,'')).
WITH grouped AS (
  SELECT
    tenant_id,
    owner_name,
    owner_email,
    (array_agg(owner_phone) FILTER (WHERE owner_phone IS NOT NULL))[1] AS phone,
    (array_agg(owner_percentage))[1] AS pct
  FROM consignments
  WHERE owner_id IS NULL AND owner_name IS NOT NULL
  GROUP BY tenant_id, owner_name, owner_email
),
inserted AS (
  INSERT INTO consignment_owners (tenant_id, name, email, phone, default_percentage)
  SELECT tenant_id, owner_name, owner_email, phone, pct
  FROM grouped
  RETURNING id, tenant_id, name, email
)
UPDATE consignments c
SET owner_id = i.id
FROM inserted i
WHERE c.owner_id IS NULL
  AND c.owner_name = i.name
  AND c.tenant_id IS NOT DISTINCT FROM i.tenant_id
  AND c.owner_email IS NOT DISTINCT FROM i.email;

-- RLS mirrors consignments.
ALTER TABLE consignment_owners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS consignment_owners_tenant ON consignment_owners;
CREATE POLICY consignment_owners_tenant ON consignment_owners
  FOR ALL
  USING ((tenant_id = current_tenant_id()) OR (tenant_id IS NULL))
  WITH CHECK ((tenant_id = current_tenant_id()) OR (tenant_id IS NULL));

DROP POLICY IF EXISTS superuser_consignment_owners_all ON consignment_owners;
CREATE POLICY superuser_consignment_owners_all ON consignment_owners
  FOR ALL
  USING (is_superuser());
```

- [ ] **Step 2: Apply the migration**

Use the Supabase MCP `apply_migration` tool with name `consignment_owners` and the SQL above (project id `brwzjwbpguiignrxvjdc`).
Expected: success, no error.

- [ ] **Step 3: Verify the backfill**

Run via Supabase MCP `execute_sql`:
```sql
select o.name, o.default_percentage, count(c.id) cars, array_agg(c.car_id) car_ids
from consignment_owners o join consignments c on c.owner_id = o.id
group by o.id, o.name, o.default_percentage;
select count(*) as orphans from consignments where owner_id is null;
```
Expected: Jorge Pauliac → 1 owner row, `cars = 2`, `car_ids = {26,27}`; `orphans = 0`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260721020000_consignment_owners.sql
git commit -m "feat(consignments): add consignment_owners table + owner_id backfill"
```

---

## Task 2: Types

**Files:**
- Modify: `lib/supabase/types.ts:155-166`

**Interfaces:**
- Produces: `ConsignmentOwner` interface; `Consignment` with `id: string`, `owner_id: string | null`.
- Consumes: nothing.

- [ ] **Step 1: Replace the `Consignment` interface and add `ConsignmentOwner`**

Replace lines 155-166 (the current `Consignment` interface) with:

```typescript
export interface ConsignmentOwner {
  id: string
  tenant_id: string | null
  name: string
  email: string | null
  phone: string | null
  default_percentage: number | null
  notes: string | null
  created_at?: string | null
}

export interface Consignment {
  id: string
  car_id: number | null
  owner_id: string | null
  // Legacy owner fields — kept until the drop migration; do not read in new code.
  owner_name: string | null
  owner_email: string | null
  owner_phone: string | null
  owner_percentage: number | null
  contract_start: string | null
  contract_end: string | null
  notes: string | null
  tenant_id: string | null
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: errors ONLY in the consignments files we are about to change (`actions.ts`, `ConsignmentModal.tsx`, `ConsignmentsManager.tsx`) due to the `id: number → string` change. No errors elsewhere. Note them; later tasks fix them.

- [ ] **Step 3: Commit**

```bash
git add lib/supabase/types.ts
git commit -m "feat(consignments): add ConsignmentOwner type; fix Consignment id to uuid"
```

---

## Task 3: Payout helper module (TDD)

**Files:**
- Create: `lib/consignments/payouts.ts`
- Test: `__tests__/lib/consignment-payouts.test.ts`

**Interfaces:**
- Consumes: `isEarned`, `revenueBucket`, `overlapsRange` from `@/lib/finance/revenue`; types `Consignment`, `ConsignmentOwner`, `Reservation`, `Transaction`.
- Produces:
  - `computeCarPayout(con: Consignment, reservations, expenses, from: string, to: string): CarPayout`
  - `groupOwnerPayouts(input: PayoutInput): OwnerGroup[]`
  - types `CarPayout`, `OwnerGroup`, `PayoutInput` (see code).

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/consignment-payouts.test.ts`:

```typescript
import { computeCarPayout, groupOwnerPayouts } from '@/lib/consignments/payouts'
import type { Consignment, ConsignmentOwner, Reservation, Transaction } from '@/lib/supabase/types'

function res(p: Partial<Reservation>): Reservation {
  return {
    id: 1, booking_code: 'B', car_id: 26, customer_name: 'C',
    pickup_date: '2026-06-10', return_date: '2026-06-12',
    total_amount: 1000, status: 'completed', ...p,
  } as Reservation
}
function con(p: Partial<Consignment>): Consignment {
  return {
    id: 'c1', car_id: 26, owner_id: 'o1',
    owner_name: null, owner_email: null, owner_phone: null,
    owner_percentage: 70, contract_start: null, contract_end: null,
    notes: null, tenant_id: 't1', ...p,
  } as Consignment
}
function owner(p: Partial<ConsignmentOwner>): ConsignmentOwner {
  return {
    id: 'o1', tenant_id: 't1', name: 'Jorge', email: null, phone: null,
    default_percentage: 70, notes: null, ...p,
  } as ConsignmentOwner
}
function tx(p: Partial<Transaction>): Transaction {
  return { id: 1, transaction_date: '2026-06-11', type: 'expense',
    category: 'fuel', amount: 100, description: null, car_id: 26 } as Transaction
}

const WIDE_FROM = '0001-01-01'
const WIDE_TO = '9999-12-31'

describe('computeCarPayout', () => {
  it('counts only completed revenue, nets out expenses, splits by pct', () => {
    const c = con({ owner_percentage: 70 })
    const out = computeCarPayout(
      c,
      [res({ total_amount: 1000, status: 'completed' })],
      [tx({ amount: 100 })],
      WIDE_FROM, WIDE_TO
    )
    expect(out.earnedGross).toBe(1000)
    expect(out.expenses).toBe(100)
    expect(out.net).toBe(900)
    expect(out.ownerShare).toBe(630)   // 900 * 0.70
    expect(out.epureShare).toBe(270)   // 900 * 0.30
  })

  it('excludes active/confirmed/cancelled from earned but reports active separately', () => {
    const c = con({ owner_percentage: 50 })
    const out = computeCarPayout(
      c,
      [
        res({ total_amount: 1000, status: 'completed' }),
        res({ id: 2, total_amount: 500, status: 'active' }),
        res({ id: 3, total_amount: 400, status: 'confirmed' }),
        res({ id: 4, total_amount: 999, status: 'cancelled' }),
      ],
      [],
      WIDE_FROM, WIDE_TO
    )
    expect(out.earnedGross).toBe(1000)
    expect(out.activeGross).toBe(500)
    expect(out.ownerShare).toBe(500)          // 1000 * 0.50
    expect(out.activeOwnerShare).toBe(250)    // 500 * 0.50 (informational)
  })

  it('net never goes below zero', () => {
    const out = computeCarPayout(
      con({ owner_percentage: 70 }),
      [res({ total_amount: 100, status: 'completed' })],
      [tx({ amount: 500 })],
      WIDE_FROM, WIDE_TO
    )
    expect(out.net).toBe(0)
    expect(out.ownerShare).toBe(0)
  })

  it('respects the period window via overlapsRange', () => {
    const out = computeCarPayout(
      con(),
      [res({ pickup_date: '2026-01-01', return_date: '2026-01-03', status: 'completed', total_amount: 1000 })],
      [],
      '2026-06-01', '2026-06-30'
    )
    expect(out.earnedGross).toBe(0) // outside window
  })
})

describe('groupOwnerPayouts', () => {
  it('groups multiple cars under one owner and sums the payout', () => {
    const groups = groupOwnerPayouts({
      owners: [owner({ id: 'o1' })],
      consignments: [
        con({ id: 'c1', car_id: 26, owner_id: 'o1', owner_percentage: 70 }),
        con({ id: 'c2', car_id: 27, owner_id: 'o1', owner_percentage: 70 }),
      ],
      reservations: [
        res({ car_id: 26, total_amount: 1000, status: 'completed' }),
        res({ id: 2, car_id: 27, total_amount: 2000, status: 'completed' }),
      ],
      expenses: [],
    })
    expect(groups).toHaveLength(1)
    expect(groups[0].cars).toHaveLength(2)
    expect(groups[0].totalOwnerShare).toBe(2100) // (1000+2000)*0.70
  })

  it('includes owners with zero cars', () => {
    const groups = groupOwnerPayouts({
      owners: [owner({ id: 'o9', name: 'Empty' })],
      consignments: [], reservations: [], expenses: [],
    })
    expect(groups).toHaveLength(1)
    expect(groups[0].cars).toHaveLength(0)
    expect(groups[0].totalOwnerShare).toBe(0)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest consignment-payouts -v`
Expected: FAIL — `Cannot find module '@/lib/consignments/payouts'`.

- [ ] **Step 3: Write the implementation**

Create `lib/consignments/payouts.ts`:

```typescript
// lib/consignments/payouts.ts
//
// Pure payout math for consignments. Groups cars by owner and computes each
// owner's share of NET COMPLETED revenue, per the app-wide revenue policy.
// Active rentals are reported separately as "in progress", never in the payout.

import type { Consignment, ConsignmentOwner, Reservation, Transaction } from '@/lib/supabase/types'
import { isEarned, revenueBucket, overlapsRange } from '@/lib/finance/revenue'

const WIDE_FROM = '0001-01-01'
const WIDE_TO = '9999-12-31'

export interface CarPayout {
  consignment: Consignment
  ownerPct: number
  earnedGross: number
  activeGross: number
  expenses: number
  net: number
  ownerShare: number
  epureShare: number
  activeOwnerShare: number
}

export interface OwnerGroup {
  owner: ConsignmentOwner
  cars: CarPayout[]
  totalEarnedGross: number
  totalExpenses: number
  totalOwnerShare: number
  totalEpureShare: number
  totalActiveOwnerShare: number
}

export interface PayoutInput {
  owners: readonly ConsignmentOwner[]
  consignments: readonly Consignment[]
  reservations: readonly Reservation[]
  expenses: readonly Transaction[]
  from?: string
  to?: string
}

const num = (v: unknown): number => Number(v) || 0

export function computeCarPayout(
  consignment: Consignment,
  reservations: readonly Reservation[],
  expenses: readonly Transaction[],
  from: string,
  to: string
): CarPayout {
  const ownerPct = consignment.owner_percentage ?? 70
  const carId = consignment.car_id

  const forCar = reservations.filter(
    (r) => r.car_id === carId && revenueBucket(r.status) !== 'excluded' && overlapsRange(r, from, to)
  )
  const earnedGross = forCar
    .filter(isEarned)
    .reduce((s, r) => s + num(r.total_amount), 0)
  const activeGross = forCar
    .filter((r) => revenueBucket(r.status) === 'active')
    .reduce((s, r) => s + num(r.total_amount), 0)

  const carExpenses = expenses
    .filter((e) => {
      if (e.car_id !== carId) return false
      const d = e.transaction_date ?? ''
      return d >= from && d <= to
    })
    .reduce((s, e) => s + num(e.amount), 0)

  const net = Math.max(0, earnedGross - carExpenses)
  return {
    consignment,
    ownerPct,
    earnedGross,
    activeGross,
    expenses: carExpenses,
    net,
    ownerShare: (net * ownerPct) / 100,
    epureShare: (net * (100 - ownerPct)) / 100,
    activeOwnerShare: (activeGross * ownerPct) / 100,
  }
}

export function groupOwnerPayouts(input: PayoutInput): OwnerGroup[] {
  const from = input.from && input.from.length ? input.from : WIDE_FROM
  const to = input.to && input.to.length ? input.to : WIDE_TO

  const byOwner = new Map<string, Consignment[]>()
  for (const c of input.consignments) {
    if (!c.owner_id) continue
    const list = byOwner.get(c.owner_id) ?? []
    list.push(c)
    byOwner.set(c.owner_id, list)
  }

  return input.owners.map((owner) => {
    const cars = (byOwner.get(owner.id) ?? []).map((c) =>
      computeCarPayout(c, input.reservations, input.expenses, from, to)
    )
    return {
      owner,
      cars,
      totalEarnedGross: cars.reduce((s, c) => s + c.earnedGross, 0),
      totalExpenses: cars.reduce((s, c) => s + c.expenses, 0),
      totalOwnerShare: cars.reduce((s, c) => s + c.ownerShare, 0),
      totalEpureShare: cars.reduce((s, c) => s + c.epureShare, 0),
      totalActiveOwnerShare: cars.reduce((s, c) => s + c.activeOwnerShare, 0),
    }
  })
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest consignment-payouts -v`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add lib/consignments/payouts.ts __tests__/lib/consignment-payouts.test.ts
git commit -m "feat(consignments): earned-revenue payout helpers + tests"
```

---

## Task 4: Server actions (owner CRUD + updated consignment actions)

**Files:**
- Modify: `app/(dashboard)/dashboard/clients/consignments/actions.ts`

**Interfaces:**
- Consumes: `ConsignmentOwner`, `Consignment` types.
- Produces:
  - `createOwner(data: OwnerInput): Promise<{ error: string | null }>`
  - `updateOwner(id: string, data: Partial<OwnerInput>): Promise<{ error: string | null }>`
  - `deleteOwner(id: string): Promise<{ error: string | null }>` (blocks if cars linked)
  - `createConsignment(data: ConsignmentInput): Promise<{ error: string | null }>`
  - `updateConsignment(id: string, data: Partial<ConsignmentInput>): Promise<{ error: string | null }>`
  - `deleteConsignment(id: string): Promise<{ error: string | null }>`
  - types `OwnerInput`, `ConsignmentInput`.

- [ ] **Step 1: Replace the file contents**

Replace all of `actions.ts` with:

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireTenantId } from '@/lib/supabase/dashboard-auth'

const PATH = '/dashboard/clients/consignments'

export interface OwnerInput {
  name: string
  email: string | null
  phone: string | null
  default_percentage: number | null
  notes: string | null
}

export interface ConsignmentInput {
  owner_id: string
  car_id: number
  owner_percentage: number
  contract_start: string | null
  contract_end: string | null
  notes: string | null
}

async function tenant(): Promise<string> {
  const { tenantId } = await requireTenantId()
  return tenantId
}

export async function createOwner(data: OwnerInput): Promise<{ error: string | null }> {
  const supabase = createClient()
  const tenantId = await tenant()
  const { error } = await supabase.from('consignment_owners').insert({ ...data, tenant_id: tenantId })
  revalidatePath(PATH)
  return { error: error?.message ?? null }
}

export async function updateOwner(id: string, data: Partial<OwnerInput>): Promise<{ error: string | null }> {
  const supabase = createClient()
  const tenantId = await tenant()
  const { error } = await supabase.from('consignment_owners').update(data).eq('id', id).eq('tenant_id', tenantId)
  revalidatePath(PATH)
  return { error: error?.message ?? null }
}

export async function deleteOwner(id: string): Promise<{ error: string | null }> {
  const supabase = createClient()
  const tenantId = await tenant()
  const { count } = await supabase
    .from('consignments')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', id)
    .eq('tenant_id', tenantId)
  if ((count ?? 0) > 0) {
    return { error: "Remove or reassign this owner's cars first." }
  }
  const { error } = await supabase.from('consignment_owners').delete().eq('id', id).eq('tenant_id', tenantId)
  revalidatePath(PATH)
  return { error: error?.message ?? null }
}

export async function createConsignment(data: ConsignmentInput): Promise<{ error: string | null }> {
  const supabase = createClient()
  const tenantId = await tenant()
  const { error } = await supabase.from('consignments').insert({ ...data, tenant_id: tenantId })
  revalidatePath(PATH)
  return { error: error?.message ?? null }
}

export async function updateConsignment(id: string, data: Partial<ConsignmentInput>): Promise<{ error: string | null }> {
  const supabase = createClient()
  const tenantId = await tenant()
  const { error } = await supabase.from('consignments').update(data).eq('id', id).eq('tenant_id', tenantId)
  revalidatePath(PATH)
  return { error: error?.message ?? null }
}

export async function deleteConsignment(id: string): Promise<{ error: string | null }> {
  const supabase = createClient()
  const tenantId = await tenant()
  const { error } = await supabase.from('consignments').delete().eq('id', id).eq('tenant_id', tenantId)
  revalidatePath(PATH)
  return { error: error?.message ?? null }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: `actions.ts` has no errors now. Remaining errors are only in `ConsignmentModal.tsx` / `ConsignmentsManager.tsx` (fixed in Tasks 6-7).

- [ ] **Step 3: Commit**

```bash
git add app/\(dashboard\)/dashboard/clients/consignments/actions.ts
git commit -m "feat(consignments): owner CRUD actions + owner_id-based consignment actions"
```

---

## Task 5: OwnerModal component

**Files:**
- Create: `app/(dashboard)/dashboard/clients/consignments/OwnerModal.tsx`

**Interfaces:**
- Consumes: `createOwner`, `updateOwner`, `OwnerInput` from `./actions`; `ConsignmentOwner` type; `ModalPortal`.
- Produces: default export `OwnerModal` with props `{ isOpen, onClose, owner?: ConsignmentOwner | null }`.

- [ ] **Step 1: Write the component**

Create `app/(dashboard)/dashboard/clients/consignments/OwnerModal.tsx`:

```typescript
'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { ConsignmentOwner } from '@/lib/supabase/types'
import { createOwner, updateOwner, type OwnerInput } from './actions'
import ModalPortal from '@/components/ui/ModalPortal'

interface Props {
  isOpen: boolean
  onClose: () => void
  owner?: ConsignmentOwner | null
}

const inputCls =
  'w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white'
const labelCls = 'text-[11px] font-bold text-white/50 uppercase tracking-widest'

export default function OwnerModal({ isOpen, onClose, owner }: Props) {
  const [isPending, startTransition] = useTransition()
  const [errorStr, setErrorStr] = useState<string | null>(null)
  const router = useRouter()
  const [form, setForm] = useState<Partial<ConsignmentOwner>>({})

  useEffect(() => {
    setForm(owner ?? { default_percentage: 70 })
    setErrorStr(null)
  }, [owner, isOpen])

  if (!isOpen) return null
  const isEditing = !!owner

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name) {
      setErrorStr('Owner name is required.')
      return
    }
    const data: OwnerInput = {
      name: form.name,
      email: form.email || null,
      phone: form.phone || null,
      default_percentage: Number(form.default_percentage) || 70,
      notes: form.notes || null,
    }
    startTransition(async () => {
      const result = isEditing && owner?.id
        ? await updateOwner(owner.id, data)
        : await createOwner(data)
      if (result.error) setErrorStr(result.error)
      else { router.refresh(); onClose() }
    })
  }

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
        <div className="glass w-full max-w-lg rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-fade-in-up my-auto">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
            <h3 className="text-lg font-bold text-white">{isEditing ? 'Edit Owner' : 'New Owner'}</h3>
            <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">✕</button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {errorStr && <div className="p-3 bg-red-500/20 text-red-300 rounded-xl text-sm border border-red-500/30">{errorStr}</div>}

            <div className="space-y-1">
              <label className={labelCls}>Owner Name</label>
              <input type="text" required placeholder="John Smith" value={form.name || ''}
                onChange={e => setForm({ ...form, name: e.target.value })} className={inputCls} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className={labelCls}>Email</label>
                <input type="email" value={form.email || ''}
                  onChange={e => setForm({ ...form, email: e.target.value })} className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Phone</label>
                <input type="text" value={form.phone || ''}
                  onChange={e => setForm({ ...form, phone: e.target.value })} className={inputCls} />
              </div>
            </div>

            <div className="space-y-1">
              <label className={labelCls}>Default Split % (owner&apos;s share on new cars)</label>
              <input type="number" min="0" max="100" step="1" value={form.default_percentage ?? 70}
                onChange={e => setForm({ ...form, default_percentage: Number(e.target.value) })} className={inputCls} />
            </div>

            <div className="space-y-1">
              <label className={labelCls}>Notes</label>
              <textarea rows={2} value={form.notes || ''}
                onChange={e => setForm({ ...form, notes: e.target.value })} className={`${inputCls} resize-none`} />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
              <button type="button" onClick={onClose} className="bg-white/5 hover:bg-white/10 text-white/80 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all">Cancel</button>
              <button type="submit" disabled={isPending} className="bg-white text-black hover:bg-white/90 px-6 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50">
                {isPending ? 'Saving...' : 'Save Owner'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors in `OwnerModal.tsx`.

- [ ] **Step 3: Commit**

```bash
git add app/\(dashboard\)/dashboard/clients/consignments/OwnerModal.tsx
git commit -m "feat(consignments): OwnerModal for create/edit owner"
```

---

## Task 6: ConsignmentModal — owner-scoped, exclude consigned cars

**Files:**
- Modify: `app/(dashboard)/dashboard/clients/consignments/ConsignmentModal.tsx`

**Interfaces:**
- Consumes: `createConsignment`, `updateConsignment`, `ConsignmentInput` from `./actions`; `Consignment`, `Car` types.
- Produces: default export `ConsignmentModal` with props `{ isOpen, onClose, ownerId: string, consignment?: Consignment | null, cars: Car[] }`. `cars` is the already-filtered list of selectable vehicles (caller excludes ones already consigned, except the one being edited).

- [ ] **Step 1: Replace the file contents**

Replace all of `ConsignmentModal.tsx` with:

```typescript
'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Consignment, Car } from '@/lib/supabase/types'
import { createConsignment, updateConsignment, type ConsignmentInput } from './actions'
import ModalPortal from '@/components/ui/ModalPortal'

interface Props {
  isOpen: boolean
  onClose: () => void
  ownerId: string
  consignment?: Consignment | null
  cars: Car[]
  defaultPercentage?: number | null
}

const inputCls =
  'w-full bg-white/5 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-white/20 text-white'
const labelCls = 'text-[11px] font-bold text-white/50 uppercase tracking-widest'

export default function ConsignmentModal({ isOpen, onClose, ownerId, consignment, cars, defaultPercentage }: Props) {
  const [isPending, startTransition] = useTransition()
  const [errorStr, setErrorStr] = useState<string | null>(null)
  const router = useRouter()
  const [form, setForm] = useState<Partial<Consignment>>({})

  useEffect(() => {
    setForm(consignment ?? { owner_percentage: defaultPercentage ?? 70 })
    setErrorStr(null)
  }, [consignment, isOpen, defaultPercentage])

  if (!isOpen) return null
  const isEditing = !!consignment

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.car_id) {
      setErrorStr('Please select a vehicle.')
      return
    }
    const data: ConsignmentInput = {
      owner_id: ownerId,
      car_id: Number(form.car_id),
      owner_percentage: Number(form.owner_percentage) || 70,
      contract_start: form.contract_start || null,
      contract_end: form.contract_end || null,
      notes: form.notes || null,
    }
    startTransition(async () => {
      const result = isEditing && consignment?.id
        ? await updateConsignment(consignment.id, data)
        : await createConsignment(data)
      if (result.error) setErrorStr(result.error)
      else { router.refresh(); onClose() }
    })
  }

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
        <div className="glass w-full max-w-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-fade-in-up my-auto">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
            <h3 className="text-lg font-bold text-white">{isEditing ? 'Edit Car' : 'Add Car'}</h3>
            <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">✕</button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
            {errorStr && <div className="p-3 bg-red-500/20 text-red-300 rounded-xl text-sm border border-red-500/30">{errorStr}</div>}

            <div className="space-y-1">
              <label className={labelCls}>Vehicle</label>
              <select required value={form.car_id || ''} onChange={e => setForm({ ...form, car_id: Number(e.target.value) })}
                className={inputCls}>
                <option value="" disabled className="bg-[#0d0d0d]">Select vehicle...</option>
                {cars.map(c => <option key={c.id} value={c.id} className="bg-[#0d0d0d]">{c.make} {c.model_full || c.model}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className={labelCls}>Owner Split % (e.g. 70 = owner gets 70%)</label>
              <input type="number" min="0" max="100" step="1" required value={form.owner_percentage ?? 70}
                onChange={e => setForm({ ...form, owner_percentage: Number(e.target.value) })} className={inputCls} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className={labelCls}>Contract Start</label>
                <input type="date" value={form.contract_start || ''} onChange={e => setForm({ ...form, contract_start: e.target.value })}
                  className={`${inputCls} [color-scheme:dark]`} />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Contract End</label>
                <input type="date" value={form.contract_end || ''} onChange={e => setForm({ ...form, contract_end: e.target.value })}
                  className={`${inputCls} [color-scheme:dark]`} />
              </div>
            </div>

            <div className="space-y-1">
              <label className={labelCls}>Notes</label>
              <textarea rows={2} value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })}
                className={`${inputCls} resize-none`} />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
              <button type="button" onClick={onClose} className="bg-white/5 hover:bg-white/10 text-white/80 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all">Cancel</button>
              <button type="submit" disabled={isPending} className="bg-white text-black hover:bg-white/90 px-6 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50">
                {isPending ? 'Saving...' : 'Save Car'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors in `ConsignmentModal.tsx`. Only `ConsignmentsManager.tsx` remains (Task 7).

- [ ] **Step 3: Commit**

```bash
git add app/\(dashboard\)/dashboard/clients/consignments/ConsignmentModal.tsx
git commit -m "feat(consignments): ConsignmentModal is owner-scoped, per-car add/edit"
```

---

## Task 7: Owner-centric page + manager

**Files:**
- Modify: `app/(dashboard)/dashboard/clients/consignments/page.tsx`
- Modify: `app/(dashboard)/dashboard/clients/consignments/ConsignmentsManager.tsx`

**Interfaces:**
- Consumes: `groupOwnerPayouts`, `OwnerGroup` from `@/lib/consignments/payouts`; `deleteOwner`, `deleteConsignment` from `./actions`; `OwnerModal`, `ConsignmentModal`; types `Consignment`, `ConsignmentOwner`, `Car`, `Reservation`, `Transaction`.

- [ ] **Step 1: Update `page.tsx` to fetch owners**

Replace all of `page.tsx` with:

```typescript
import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import PageHeader from '@/components/dashboard/PageHeader'
import ConsignmentsManager from './ConsignmentsManager'
import type { Consignment, ConsignmentOwner, Car, Reservation, Transaction } from '@/lib/supabase/types'

export default async function ConsignmentsPage() {
  const { supabase, tenantId } = await requireTenantId()

  const [{ data: owners }, { data: consignments }, { data: cars }, { data: reservations }, { data: transactions }] = await Promise.all([
    supabase.from('consignment_owners').select('*').eq('tenant_id', tenantId).order('name'),
    supabase.from('consignments').select('*').eq('tenant_id', tenantId),
    supabase.from('cars').select('id, make, model, model_full').eq('tenant_id', tenantId),
    supabase.from('reservations').select('*').eq('tenant_id', tenantId),
    supabase.from('transactions').select('*').eq('tenant_id', tenantId),
  ])

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader title="Consignments" description="Manage revenue splits for third-party vehicle owners." />
      <ConsignmentsManager
        owners={(owners as ConsignmentOwner[]) ?? []}
        consignments={(consignments as Consignment[]) ?? []}
        cars={(cars as Car[]) ?? []}
        reservations={(reservations as Reservation[]) ?? []}
        expenses={(transactions as Transaction[]) ?? []}
      />
    </div>
  )
}
```

- [ ] **Step 2: Rewrite `ConsignmentsManager.tsx` as owner-centric**

Replace all of `ConsignmentsManager.tsx` with:

```typescript
'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { Consignment, ConsignmentOwner, Car, Reservation, Transaction } from '@/lib/supabase/types'
import { deleteOwner, deleteConsignment } from './actions'
import { groupOwnerPayouts } from '@/lib/consignments/payouts'
import OwnerModal from './OwnerModal'
import ConsignmentModal from './ConsignmentModal'

interface Props {
  owners: ConsignmentOwner[]
  consignments: Consignment[]
  cars: Car[]
  reservations: Reservation[]
  expenses: Transaction[]
}

const money = (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`

export default function ConsignmentsManager({ owners, consignments, cars, reservations, expenses }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const [ownerModalOpen, setOwnerModalOpen] = useState(false)
  const [editingOwner, setEditingOwner] = useState<ConsignmentOwner | null>(null)

  const [carModalOpen, setCarModalOpen] = useState(false)
  const [carOwnerId, setCarOwnerId] = useState<string>('')
  const [carDefaultPct, setCarDefaultPct] = useState<number | null>(70)
  const [editingCar, setEditingCar] = useState<Consignment | null>(null)

  const carMap = useMemo(
    () => Object.fromEntries(cars.map(c => [c.id, `${c.make} ${c.model_full || c.model}`])),
    [cars]
  )

  const groups = useMemo(
    () => groupOwnerPayouts({ owners, consignments, reservations, expenses, from: fromDate, to: toDate }),
    [owners, consignments, reservations, expenses, fromDate, toDate]
  )

  // Cars already consigned (to exclude from the Add-Car dropdown).
  const consignedCarIds = useMemo(() => new Set(consignments.map(c => c.car_id)), [consignments])

  function openNewOwner() { setEditingOwner(null); setOwnerModalOpen(true) }
  function openEditOwner(o: ConsignmentOwner) { setEditingOwner(o); setOwnerModalOpen(true) }

  function openAddCar(o: ConsignmentOwner) {
    setCarOwnerId(o.id); setCarDefaultPct(o.default_percentage ?? 70); setEditingCar(null); setCarModalOpen(true)
  }
  function openEditCar(o: ConsignmentOwner, c: Consignment) {
    setCarOwnerId(o.id); setCarDefaultPct(o.default_percentage ?? 70); setEditingCar(c); setCarModalOpen(true)
  }

  function handleDeleteOwner(o: ConsignmentOwner) {
    if (!confirm(`Delete owner ${o.name}? This cannot be undone.`)) return
    startTransition(async () => {
      const { error } = await deleteOwner(o.id)
      if (error) alert(error)
      else router.refresh()
    })
  }

  function handleDeleteCar(id: string) {
    if (!confirm('Remove this car from the consignment? This cannot be undone.')) return
    startTransition(async () => { await deleteConsignment(id); router.refresh() })
  }

  // For the car modal: allow the currently-edited car plus any not-yet-consigned car.
  const selectableCars = useMemo(() => {
    const editingId = editingCar?.car_id
    return cars.filter(c => !consignedCarIds.has(c.id) || c.id === editingId)
  }, [cars, consignedCarIds, editingCar])

  return (
    <div>
      {/* Period filter + New Owner */}
      <div className="flex flex-wrap gap-4 mb-6 items-center justify-between">
        <div className="flex gap-3 items-center flex-wrap">
          <span className="text-xs text-white/40 uppercase tracking-widest font-bold">Period:</span>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-white/20" />
          <span className="text-white/30">→</span>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-white/20" />
          {(fromDate || toDate) && (
            <button onClick={() => { setFromDate(''); setToDate('') }} className="text-xs text-white/40 hover:text-white transition-colors">Clear</button>
          )}
        </div>
        <button onClick={openNewOwner}
          className="bg-white text-black hover:bg-white/90 px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-white/10">
          + New Owner
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="text-white/30 text-sm py-12 text-center bg-white/5 rounded-2xl border border-white/5">
          No owners yet. Click &quot;New Owner&quot; to add a vehicle owner.
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(g => (
            <div key={g.owner.id} className="glass border border-white/10 rounded-3xl overflow-hidden">
              {/* Owner header */}
              <div className="px-6 pt-5 pb-4 border-b border-white/10 flex items-start justify-between gap-4">
                <div>
                  <div className="text-white font-bold text-base">{g.owner.name}</div>
                  <div className="text-white/40 text-xs mt-1">
                    {g.owner.email || ''}{g.owner.phone ? ` · ${g.owner.phone}` : ''}
                    {g.owner.default_percentage != null ? ` · default ${g.owner.default_percentage}%` : ''}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => openAddCar(g.owner)}
                    className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-full text-xs font-semibold transition-colors">+ Add car</button>
                  <button onClick={() => openEditOwner(g.owner)}
                    className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors text-xs">✎</button>
                  <button onClick={() => handleDeleteOwner(g.owner)}
                    className="w-8 h-8 bg-red-500/10 hover:bg-red-500/20 rounded-full flex items-center justify-center text-red-400 transition-colors text-xs">✕</button>
                </div>
              </div>

              {/* Combined payout */}
              <div className="px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-4 border-b border-white/10">
                {[
                  ['Combined Owner Payout', money(g.totalOwnerShare), 'text-emerald-400'],
                  ["éPure's Share", money(g.totalEpureShare), 'text-blue-400'],
                  ['Completed Revenue', money(g.totalEarnedGross), 'text-white/60'],
                  ['In Progress (active)', money(g.totalActiveOwnerShare), 'text-amber-400/70'],
                ].map(([label, value, cls]) => (
                  <div key={label as string}>
                    <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1">{label}</div>
                    <div className={`text-lg font-black tracking-tighter ${cls}`}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Per-car breakdown */}
              {g.cars.length === 0 ? (
                <div className="px-6 py-6 text-white/30 text-sm text-center">
                  No cars yet. Click &quot;+ Add car&quot; to consign a vehicle to {g.owner.name}.
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {g.cars.map(cp => {
                    const con = cp.consignment
                    const contract = con.contract_start && con.contract_end
                      ? `${con.contract_start} → ${con.contract_end}`
                      : con.contract_start ? `From ${con.contract_start}` : 'No contract dates'
                    return (
                      <div key={con.id} className="px-6 py-4 flex flex-wrap items-center justify-between gap-4 group">
                        <div className="min-w-[180px]">
                          <div className="text-white/90 font-medium text-sm">
                            {con.car_id != null ? carMap[con.car_id] ?? `Car #${con.car_id}` : '—'}
                          </div>
                          <div className="text-white/30 text-xs mt-0.5">📅 {contract}</div>
                        </div>
                        <div className="flex items-center gap-6 text-right flex-wrap">
                          <div>
                            <div className="text-[9px] text-white/30 uppercase tracking-widest">Split</div>
                            <div className="text-sm font-bold text-emerald-300">{cp.ownerPct}%</div>
                          </div>
                          <div>
                            <div className="text-[9px] text-white/30 uppercase tracking-widest">Completed</div>
                            <div className="text-sm font-bold text-white/70">{money(cp.earnedGross)}</div>
                          </div>
                          <div>
                            <div className="text-[9px] text-white/30 uppercase tracking-widest">Expenses</div>
                            <div className="text-sm font-bold text-red-400/60">-{money(cp.expenses)}</div>
                          </div>
                          <div>
                            <div className="text-[9px] text-white/30 uppercase tracking-widest">Owner Share</div>
                            <div className="text-sm font-black text-emerald-400">{money(cp.ownerShare)}</div>
                          </div>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEditCar(g.owner, con)}
                              className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors text-xs">✎</button>
                            <button onClick={() => handleDeleteCar(con.id)}
                              className="w-8 h-8 bg-red-500/10 hover:bg-red-500/20 rounded-full flex items-center justify-center text-red-400 transition-colors text-xs">✕</button>
                          </div>
                        </div>
                        {con.notes && <div className="w-full mt-2 p-3 bg-white/5 rounded-xl text-xs text-white/40 italic">{con.notes}</div>}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <OwnerModal isOpen={ownerModalOpen} onClose={() => setOwnerModalOpen(false)} owner={editingOwner} />
      <ConsignmentModal
        isOpen={carModalOpen}
        onClose={() => setCarModalOpen(false)}
        ownerId={carOwnerId}
        defaultPercentage={carDefaultPct}
        consignment={editingCar}
        cars={selectableCars}
      />
    </div>
  )
}
```

- [ ] **Step 3: Typecheck the whole project**

Run: `npx tsc --noEmit`
Expected: no errors anywhere.

- [ ] **Step 4: Run the full test suite**

Run: `npx jest`
Expected: all tests pass (including the new `consignment-payouts` suite).

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add app/\(dashboard\)/dashboard/clients/consignments/page.tsx app/\(dashboard\)/dashboard/clients/consignments/ConsignmentsManager.tsx
git commit -m "feat(consignments): owner-centric page with combined payout + per-car breakdown"
```

---

## Task 8: Manual verification + push

**Files:** none (verification only).

- [ ] **Step 1: Verify against production data**

Via Supabase MCP `execute_sql`, confirm the payout matches the UI for Jorge Pauliac:
```sql
select c.car_id, c.owner_percentage,
  (select coalesce(sum(total_amount),0) from reservations r
    where r.car_id = c.car_id and r.status = 'completed') as completed_gross
from consignments c
join consignment_owners o on o.id = c.owner_id
where o.name = 'Jorge Pauliac';
```
Confirm the manager's "Combined Owner Payout" equals `Σ (completed_gross − expenses) × pct/100` across cars 26 & 27.

- [ ] **Step 2: Visual check (optional but recommended)**

Run the app (`npm run dev`) and open `/dashboard/clients/consignments`. Confirm: one Jorge Pauliac card with two car rows, "+ Add car" prefills 70%, editing owner name updates once, deleting the owner while cars exist is blocked with the message.

- [ ] **Step 3: Push to main**

```bash
git push origin main
```

- [ ] **Step 4: Log to Notion**

Add a Dev Log entry (per CLAUDE.md): date, files changed, status "shipped" — consignment owners feature (one owner → multiple cars, earned-revenue payouts).

---

## Self-Review Notes

- **Spec coverage:** owners table (T1), owner_id + backfill (T1), types (T2), earned/active payout math (T3), owner CRUD + delete-guard (T4), OwnerModal (T5), owner-scoped ConsignmentModal + exclude-consigned-cars (T6), owner-centric UI + combined payout + show-active (T7), verification (T8). All spec sections covered.
- **Legacy columns:** `owner_name/email/phone` are intentionally left on `consignments` and not read by new code; a later drop migration is out of scope (noted in the spec).
- **Type consistency:** `id: string` (uuid), `owner_id: string`, `car_id: number` used consistently across T2–T7; action signatures (`ConsignmentInput`, `OwnerInput`) match modal call sites.
