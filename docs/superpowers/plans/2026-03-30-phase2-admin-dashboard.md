# Phase 2 — Admin Dashboard Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `admin/dashboard.html` with a full Next.js dashboard under `app/dashboard/*`, grouped into 6 sidebar sections: Overview, Operations, Finance, Clients, Team, Integrations.

**Architecture:** All dashboard pages are Server Components that fetch from Supabase server-side and pass data to Client Components for interactivity. Server Actions handle mutations. The sidebar is a Client Component (needs `usePathname()`), receiving `role` and `email` as props from the Server Component layout.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, `@supabase/ssr`, Supabase Server Actions

---

## Key Constants

- Supabase URL: `https://brwzjwbpguiignrxvjdc.supabase.co`
- Supabase anon key: `sb_publishable_krEuIpNhJVcADIUyBXYy9g_fiXrXzV9`
- éPure Drive tenant ID: `8be5b928-ca59-4b29-a34b-75b18c9273db`

## DB Tables Used

| Table | Purpose |
|---|---|
| `reservations` | Bookings |
| `cars` | Fleet |
| `car_services` | Maintenance |
| `transactions` | Expenses/Finance |
| `consignments` | Consigned cars |
| `consignment_expenses` | Consignment costs |
| `customers` | Customer records |
| `profiles` | User roles |
| `turo_feeds` | Turo iCal feeds |
| `turo_email_syncs` | Gmail Turo sync |
| `blocked_dates` | Calendar blocks |

## File Map

| File | Action | Purpose |
|---|---|---|
| `lib/supabase/types.ts` | Modify | Add Reservation, Customer, Consignment, Transaction, CarService, Profile types |
| `components/dashboard/Sidebar.tsx` | Create | Grouped collapsible nav, uses `usePathname()` |
| `components/dashboard/PageHeader.tsx` | Create | Page title + action button slot |
| `components/dashboard/StatCard.tsx` | Create | Metric card |
| `components/dashboard/EmptyState.tsx` | Create | Empty table state |
| `app/dashboard/layout.tsx` | Modify | Wire Sidebar, pass role + email |
| `app/dashboard/page.tsx` | Modify | Overview with real stats |
| `app/dashboard/bookings/page.tsx` | Create | Reservations table (Server Component) |
| `app/dashboard/bookings/BookingsTable.tsx` | Create | Interactive table (Client Component) |
| `app/dashboard/bookings/actions.ts` | Create | Server Actions: create/update/delete reservation |
| `app/dashboard/fleet/page.tsx` | Replace | Full car list (Server Component) |
| `app/dashboard/fleet/CarsTable.tsx` | Create | Interactive car list (Client Component) |
| `app/dashboard/fleet/[carId]/page.tsx` | Create | Car edit form (Server Component) |
| `app/dashboard/fleet/[carId]/CarEditForm.tsx` | Create | Car edit form (Client Component) |
| `app/dashboard/fleet/actions.ts` | Create | Server Actions: update/delete car |
| `app/dashboard/maintenance/page.tsx` | Create | Maintenance records (Server Component) |
| `app/dashboard/maintenance/MaintenanceTable.tsx` | Create | Interactive table (Client Component) |
| `app/dashboard/maintenance/actions.ts` | Create | Server Actions: create/update/delete service |
| `app/dashboard/finance/expenses/page.tsx` | Create | Expenses table |
| `app/dashboard/finance/reports/page.tsx` | Create | Revenue report |
| `app/dashboard/finance/roi/page.tsx` | Create | ROI per car |
| `app/dashboard/clients/customers/page.tsx` | Create | Customers table |
| `app/dashboard/clients/consignments/page.tsx` | Create | Consignments table |
| `app/dashboard/team/page.tsx` | Create | Team members + roles |
| `app/dashboard/integrations/turo/page.tsx` | Create | Turo iCal feeds |
| `__tests__/dashboard-actions.test.ts` | Create | Server Action unit tests |

---

## Task 1: Extend TypeScript Types

**Files:**
- Modify: `lib/supabase/types.ts`

- [ ] **Step 1: Add new types to `lib/supabase/types.ts`**

Open `lib/supabase/types.ts` and append after the existing `Car` interface:

```typescript
export interface Reservation {
  id: number
  car_id: number | null
  customer_name: string | null
  customer_email: string | null
  customer_phone: string | null
  pickup_date: string | null
  pickup_time: string | null
  return_date: string | null
  return_time: string | null
  pickup_location: string | null
  total_amount: number | null
  status: string | null
  source: string | null
  notes: string | null
  tenant_id: string | null
  created_at?: string
}

export interface Customer {
  id: number
  name: string
  email: string | null
  phone: string | null
  tenant_id: string | null
  created_at?: string
}

export interface Consignment {
  id: number
  car_id: number | null
  owner_name: string | null
  owner_email: string | null
  owner_phone: string | null
  owner_percentage: number | null
  contract_start: string | null
  contract_end: string | null
  notes: string | null
  tenant_id: string | null
}

export interface Transaction {
  id: number
  transaction_date: string | null
  category: string | null
  amount: number | null
  description: string | null
  car_id: number | null
  tenant_id: string | null
}

export interface CarService {
  id: number
  car_id: number | null
  service_date: string | null
  description: string | null
  amount: number | null
  tenant_id: string | null
}

export interface Profile {
  id: string
  full_name: string | null
  role: string | null
  tenant_id: string | null
  created_at?: string
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/supabase/types.ts
git commit -m "feat: add dashboard TypeScript types"
```

---

## Task 2: Shared Dashboard Components

**Files:**
- Create: `components/dashboard/PageHeader.tsx`
- Create: `components/dashboard/StatCard.tsx`
- Create: `components/dashboard/EmptyState.tsx`

- [ ] **Step 1: Create `components/dashboard/PageHeader.tsx`**

```typescript
// components/dashboard/PageHeader.tsx
interface Props {
  title: string
  description?: string
  action?: React.ReactNode
}

export default function PageHeader({ title, description, action }: Props) {
  return (
    <div className="flex items-start justify-between mb-8">
      <div>
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        {description && <p className="text-white/40 text-sm mt-1">{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
```

- [ ] **Step 2: Create `components/dashboard/StatCard.tsx`**

```typescript
// components/dashboard/StatCard.tsx
interface Props {
  label: string
  value: string | number
  sub?: string
}

export default function StatCard({ label, value, sub }: Props) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
      <div className="text-3xl font-bold text-white">{value}</div>
      <div className="text-sm text-white/40 mt-1">{label}</div>
      {sub && <div className="text-xs text-white/30 mt-0.5">{sub}</div>}
    </div>
  )
}
```

- [ ] **Step 3: Create `components/dashboard/EmptyState.tsx`**

```typescript
// components/dashboard/EmptyState.tsx
interface Props {
  message: string
  action?: React.ReactNode
}

export default function EmptyState({ message, action }: Props) {
  return (
    <div className="text-center py-20 text-white/30">
      <p className="text-base mb-4">{message}</p>
      {action}
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/
git commit -m "feat: add shared dashboard components (PageHeader, StatCard, EmptyState)"
```

---

## Task 3: Sidebar Component

**Files:**
- Create: `components/dashboard/Sidebar.tsx`

- [ ] **Step 1: Create `components/dashboard/Sidebar.tsx`**

```typescript
// components/dashboard/Sidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

interface NavItem {
  label: string
  href: string
}

interface NavGroup {
  label: string
  children: NavItem[]
}

type NavEntry = { label: string; href: string } | NavGroup

const NAV: NavEntry[] = [
  { label: 'Overview', href: '/dashboard' },
  {
    label: 'Operations',
    children: [
      { label: 'Bookings', href: '/dashboard/bookings' },
      { label: 'Fleet', href: '/dashboard/fleet' },
      { label: 'Maintenance', href: '/dashboard/maintenance' },
    ],
  },
  {
    label: 'Finance',
    children: [
      { label: 'Expenses', href: '/dashboard/finance/expenses' },
      { label: 'Reports', href: '/dashboard/finance/reports' },
      { label: 'ROI', href: '/dashboard/finance/roi' },
    ],
  },
  {
    label: 'Clients',
    children: [
      { label: 'Customers', href: '/dashboard/clients/customers' },
      { label: 'Consignments', href: '/dashboard/clients/consignments' },
    ],
  },
  { label: 'Team', href: '/dashboard/team' },
  {
    label: 'Integrations',
    children: [{ label: 'Turo', href: '/dashboard/integrations/turo' }],
  },
]

interface Props {
  email: string
  role: string | null
}

function isGroup(entry: NavEntry): entry is NavGroup {
  return 'children' in entry
}

function isActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard'
  return pathname.startsWith(href)
}

export default function Sidebar({ email, role }: Props) {
  const pathname = usePathname()
  // Groups that contain the active route start open
  const initialOpen = NAV.filter(isGroup).reduce<Record<string, boolean>>(
    (acc, group) => {
      acc[group.label] = group.children.some((c) => isActive(pathname, c.href))
      return acc
    },
    {}
  )
  const [open, setOpen] = useState<Record<string, boolean>>(initialOpen)

  const toggle = (label: string) =>
    setOpen((prev) => ({ ...prev, [label]: !prev[label] }))

  // Role-based visibility
  const hidden: string[] = []
  if (role === 'staff') hidden.push('Finance', 'Clients')
  if (role === 'finance') hidden.push('Maintenance', 'Integrations', 'Team')

  return (
    <aside className="w-56 bg-[#111] border-r border-white/10 flex flex-col shrink-0 h-full">
      <div className="h-16 flex items-center px-5 border-b border-white/10">
        <img src="/assets/logo.png" alt="éPure Drive" className="h-7" />
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map((entry) => {
          if (isGroup(entry)) {
            if (hidden.includes(entry.label)) return null
            const isOpen = open[entry.label] ?? false
            return (
              <div key={entry.label}>
                <button
                  onClick={() => toggle(entry.label)}
                  className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <span>{entry.label}</span>
                  <span className="text-xs">{isOpen ? '▾' : '▸'}</span>
                </button>
                {isOpen && (
                  <div className="ml-3 mt-0.5 space-y-0.5">
                    {entry.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                          isActive(pathname, child.href)
                            ? 'bg-white/10 text-white font-medium'
                            : 'text-white/50 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          }

          return (
            <Link
              key={entry.href}
              href={entry.href}
              className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive(pathname, entry.href)
                  ? 'bg-white/10 text-white font-medium'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              {entry.label}
            </Link>
          )
        })}
      </nav>

      <div className="px-5 py-4 border-t border-white/10">
        <p className="text-xs text-white/30 truncate">{email}</p>
        {role && <p className="text-xs text-white/20 mt-0.5 capitalize">{role}</p>}
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/dashboard/Sidebar.tsx
git commit -m "feat: add dashboard Sidebar with grouped collapsible nav"
```

---

## Task 4: Update Dashboard Layout

**Files:**
- Modify: `app/dashboard/layout.tsx`

- [ ] **Step 1: Replace `app/dashboard/layout.tsx`**

```typescript
// app/dashboard/layout.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/dashboard/Sidebar'
import { Outfit } from 'next/font/google'
import '../globals.css'

const outfit = Outfit({ subsets: ['latin'], weight: ['400', '600', '700'] })

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return (
    <html lang="en">
      <body className={`${outfit.className} bg-[#0d0d0d] text-white min-h-screen`}>
        <div className="flex h-screen overflow-hidden">
          <Sidebar email={user.email ?? ''} role={profile?.role ?? null} />
          <main className="flex-1 overflow-y-auto p-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Verify the layout renders correctly**

```bash
npm run dev
```

Navigate to `http://localhost:3000/dashboard`. Expected: sidebar with grouped nav, Overview link active.

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/layout.tsx
git commit -m "feat: wire Sidebar into dashboard layout"
```

---

## Task 5: Bookings Page

**Files:**
- Create: `app/dashboard/bookings/page.tsx`
- Create: `app/dashboard/bookings/BookingsTable.tsx`
- Create: `app/dashboard/bookings/actions.ts`

- [ ] **Step 1: Create Server Actions in `app/dashboard/bookings/actions.ts`**

```typescript
// app/dashboard/bookings/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Reservation } from '@/lib/supabase/types'

async function getTenantId(): Promise<string> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user!.id)
    .single()
  return profile!.tenant_id
}

export async function createReservation(
  data: Omit<Reservation, 'id' | 'tenant_id' | 'created_at'>
): Promise<{ error: string | null }> {
  const supabase = createClient()
  const tenantId = await getTenantId()
  const { error } = await supabase
    .from('reservations')
    .insert({ ...data, tenant_id: tenantId })
  revalidatePath('/dashboard/bookings')
  return { error: error?.message ?? null }
}

export async function updateReservation(
  id: number,
  data: Partial<Omit<Reservation, 'id' | 'tenant_id'>>
): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase
    .from('reservations')
    .update(data)
    .eq('id', id)
  revalidatePath('/dashboard/bookings')
  return { error: error?.message ?? null }
}

export async function deleteReservation(id: number): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase
    .from('reservations')
    .delete()
    .eq('id', id)
  revalidatePath('/dashboard/bookings')
  return { error: error?.message ?? null }
}
```

- [ ] **Step 2: Create `app/dashboard/bookings/BookingsTable.tsx`**

```typescript
// app/dashboard/bookings/BookingsTable.tsx
'use client'

import { useState, useTransition } from 'react'
import type { Reservation, Car } from '@/lib/supabase/types'
import { updateReservation, deleteReservation } from './actions'

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'bg-green-500/20 text-green-400',
  pending: 'bg-yellow-500/20 text-yellow-400',
  completed: 'bg-white/10 text-white/40',
  cancelled: 'bg-red-500/20 text-red-400',
}

interface Props {
  reservations: Reservation[]
  cars: Car[]
}

export default function BookingsTable({ reservations, cars }: Props) {
  const [filter, setFilter] = useState('')
  const [, startTransition] = useTransition()

  const carMap = Object.fromEntries(cars.map((c) => [c.id, `${c.make} ${c.model_full || c.model}`]))

  const filtered = reservations.filter((r) => {
    const q = filter.toLowerCase()
    return (
      !q ||
      r.customer_name?.toLowerCase().includes(q) ||
      r.customer_email?.toLowerCase().includes(q) ||
      carMap[r.car_id ?? -1]?.toLowerCase().includes(q)
    )
  })

  function handleStatusChange(id: number, status: string) {
    startTransition(async () => {
      await updateReservation(id, { status })
    })
  }

  function handleDelete(id: number) {
    if (!confirm('Delete this reservation?')) return
    startTransition(async () => {
      await deleteReservation(id)
    })
  }

  return (
    <div>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name, email, or car…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full max-w-sm bg-white/5 border border-white/10 text-white placeholder:text-white/30 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-white/30"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-white/30 text-sm py-12 text-center">No bookings found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-white/40 border-b border-white/10">
                <th className="pb-3 pr-4 font-medium">Customer</th>
                <th className="pb-3 pr-4 font-medium">Car</th>
                <th className="pb-3 pr-4 font-medium">Pickup</th>
                <th className="pb-3 pr-4 font-medium">Return</th>
                <th className="pb-3 pr-4 font-medium">Total</th>
                <th className="pb-3 pr-4 font-medium">Status</th>
                <th className="pb-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-white/5 transition-colors">
                  <td className="py-3 pr-4">
                    <div className="font-medium text-white">{r.customer_name || '—'}</div>
                    <div className="text-white/40 text-xs">{r.customer_email}</div>
                  </td>
                  <td className="py-3 pr-4 text-white/70">
                    {r.car_id ? carMap[r.car_id] ?? `Car #${r.car_id}` : '—'}
                  </td>
                  <td className="py-3 pr-4 text-white/70">
                    {r.pickup_date ? new Date(r.pickup_date).toLocaleDateString() : '—'}
                  </td>
                  <td className="py-3 pr-4 text-white/70">
                    {r.return_date ? new Date(r.return_date).toLocaleDateString() : '—'}
                  </td>
                  <td className="py-3 pr-4 text-white font-medium">
                    {r.total_amount != null ? `$${Number(r.total_amount).toFixed(2)}` : '—'}
                  </td>
                  <td className="py-3 pr-4">
                    <select
                      value={r.status ?? ''}
                      onChange={(e) => handleStatusChange(r.id, e.target.value)}
                      className={`text-xs font-semibold rounded-full px-2 py-1 border-0 bg-transparent ${
                        STATUS_COLORS[r.status ?? ''] ?? 'text-white/40'
                      } cursor-pointer`}
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td className="py-3">
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="text-white/20 hover:text-red-400 transition-colors text-xs"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create `app/dashboard/bookings/page.tsx`**

```typescript
// app/dashboard/bookings/page.tsx
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/dashboard/PageHeader'
import StatCard from '@/components/dashboard/StatCard'
import BookingsTable from './BookingsTable'
import type { Reservation, Car } from '@/lib/supabase/types'

export default async function BookingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user!.id)
    .single()

  const tenantId = profile!.tenant_id

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

  const rows = (reservations as Reservation[]) ?? []
  const carRows = (cars as Car[]) ?? []

  const confirmed = rows.filter((r) => r.status === 'confirmed').length
  const pending = rows.filter((r) => r.status === 'pending').length
  const totalRevenue = rows
    .filter((r) => r.status === 'completed')
    .reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0)

  return (
    <div className="max-w-6xl">
      <PageHeader title="Bookings" description="All reservations across your fleet." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total" value={rows.length} />
        <StatCard label="Confirmed" value={confirmed} />
        <StatCard label="Pending" value={pending} />
        <StatCard label="Completed revenue" value={`$${totalRevenue.toFixed(0)}`} />
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <BookingsTable reservations={rows} cars={carRows} />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Test the bookings page**

```bash
npm run dev
```

Navigate to `http://localhost:3000/dashboard/bookings`. Expected: stat cards + reservation table with search, status dropdown, delete button.

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/bookings/
git commit -m "feat: add dashboard bookings page with table and server actions"
```

---

## Task 6: Fleet Management Page

**Files:**
- Replace: `app/dashboard/fleet/page.tsx`
- Create: `app/dashboard/fleet/CarsTable.tsx`
- Create: `app/dashboard/fleet/[carId]/page.tsx`
- Create: `app/dashboard/fleet/[carId]/CarEditForm.tsx`
- Create: `app/dashboard/fleet/actions.ts`

- [ ] **Step 1: Create `app/dashboard/fleet/actions.ts`**

```typescript
// app/dashboard/fleet/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Car } from '@/lib/supabase/types'

export async function updateCar(
  id: number,
  data: Partial<Omit<Car, 'id' | 'tenant_id'>>
): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase.from('cars').update(data).eq('id', id)
  revalidatePath('/dashboard/fleet')
  revalidatePath(`/dashboard/fleet/${id}`)
  return { error: error?.message ?? null }
}

export async function deleteCar(id: number): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase.from('cars').delete().eq('id', id)
  revalidatePath('/dashboard/fleet')
  return { error: error?.message ?? null }
}
```

- [ ] **Step 2: Create `app/dashboard/fleet/CarsTable.tsx`**

```typescript
// app/dashboard/fleet/CarsTable.tsx
'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import type { Car } from '@/lib/supabase/types'
import { deleteCar } from './actions'

interface Props {
  cars: Car[]
}

export default function CarsTable({ cars }: Props) {
  const [filter, setFilter] = useState('')
  const [, startTransition] = useTransition()

  const filtered = cars.filter((c) => {
    const q = filter.toLowerCase()
    return (
      !q ||
      c.make.toLowerCase().includes(q) ||
      c.model.toLowerCase().includes(q) ||
      (c.model_full ?? '').toLowerCase().includes(q)
    )
  })

  function handleDelete(id: number) {
    if (!confirm('Delete this car? This cannot be undone.')) return
    startTransition(async () => {
      await deleteCar(id)
    })
  }

  return (
    <div>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search cars…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full max-w-sm bg-white/5 border border-white/10 text-white placeholder:text-white/30 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-white/30"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-white/40 border-b border-white/10">
              <th className="pb-3 pr-4 font-medium">Car</th>
              <th className="pb-3 pr-4 font-medium">Year</th>
              <th className="pb-3 pr-4 font-medium">Category</th>
              <th className="pb-3 pr-4 font-medium">Rate/day</th>
              <th className="pb-3 pr-4 font-medium">Status</th>
              <th className="pb-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map((c) => (
              <tr key={c.id} className="hover:bg-white/5 transition-colors">
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-3">
                    {c.image_url && (
                      <img
                        src={c.image_url.startsWith('http') ? c.image_url : `/${c.image_url}`}
                        alt=""
                        className="w-12 h-8 object-cover rounded-lg"
                      />
                    )}
                    <span className="font-medium text-white">
                      {c.make} {c.model_full || c.model}
                    </span>
                  </div>
                </td>
                <td className="py-3 pr-4 text-white/60">{c.year ?? '—'}</td>
                <td className="py-3 pr-4 text-white/60 capitalize">{c.category ?? '—'}</td>
                <td className="py-3 pr-4 text-white font-medium">
                  {c.daily_rate != null ? `$${Number(c.daily_rate).toFixed(0)}` : '—'}
                </td>
                <td className="py-3 pr-4">
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    c.status === 'active' ? 'bg-green-500/20 text-green-400' :
                    c.status === 'retired' ? 'bg-white/10 text-white/40' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {c.status ?? 'active'}
                  </span>
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/dashboard/fleet/${c.id}`}
                      className="text-xs text-white/50 hover:text-white transition-colors"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="text-xs text-white/20 hover:text-red-400 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Replace `app/dashboard/fleet/page.tsx`**

```typescript
// app/dashboard/fleet/page.tsx
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/dashboard/PageHeader'
import StatCard from '@/components/dashboard/StatCard'
import CarsTable from './CarsTable'
import EmptyState from '@/components/dashboard/EmptyState'
import type { Car } from '@/lib/supabase/types'

export default async function FleetPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user!.id)
    .single()

  const { data: cars } = await supabase
    .from('cars')
    .select('*')
    .eq('tenant_id', profile!.tenant_id)
    .order('id')

  const rows = (cars as Car[]) ?? []
  const active = rows.filter((c) => c.status !== 'retired').length
  const avgRate = rows.length > 0
    ? rows.reduce((s, c) => s + (Number(c.daily_rate) || 0), 0) / rows.length
    : 0

  return (
    <div className="max-w-6xl">
      <PageHeader title="Fleet" description="Manage your cars." />

      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="Total cars" value={rows.length} />
        <StatCard label="Active" value={active} />
        <StatCard label="Avg rate/day" value={`$${avgRate.toFixed(0)}`} />
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        {rows.length === 0 ? (
          <EmptyState message="No cars added yet." />
        ) : (
          <CarsTable cars={rows} />
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create `app/dashboard/fleet/[carId]/CarEditForm.tsx`**

```typescript
// app/dashboard/fleet/[carId]/CarEditForm.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Car } from '@/lib/supabase/types'
import { updateCar } from '../actions'

interface Props {
  car: Car
}

export default function CarEditForm({ car }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const data = {
      make: fd.get('make') as string,
      model: fd.get('model') as string,
      model_full: (fd.get('model_full') as string) || null,
      year: fd.get('year') ? Number(fd.get('year')) : null,
      daily_rate: fd.get('daily_rate') ? Number(fd.get('daily_rate')) : null,
      category: (fd.get('category') as string) || null,
      seats: fd.get('seats') ? Number(fd.get('seats')) : null,
      transmission: (fd.get('transmission') as string) || null,
      hp: (fd.get('hp') as string) || null,
      description: (fd.get('description') as string) || null,
      status: fd.get('status') as string,
    }

    startTransition(async () => {
      const result = await updateCar(car.id, data)
      if (result.error) {
        setError(result.error)
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl p-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {[
          { name: 'make', label: 'Make', defaultValue: car.make },
          { name: 'model', label: 'Model', defaultValue: car.model },
          { name: 'model_full', label: 'Full model name', defaultValue: car.model_full ?? '' },
          { name: 'year', label: 'Year', type: 'number', defaultValue: car.year ?? '' },
          { name: 'daily_rate', label: 'Daily rate ($)', type: 'number', defaultValue: car.daily_rate ?? '' },
          { name: 'seats', label: 'Seats', type: 'number', defaultValue: car.seats ?? '' },
          { name: 'transmission', label: 'Transmission', defaultValue: car.transmission ?? '' },
          { name: 'hp', label: 'Horsepower', defaultValue: car.hp ?? '' },
          { name: 'category', label: 'Category', defaultValue: car.category ?? '' },
        ].map((field) => (
          <div key={field.name}>
            <label className="block text-sm text-white/60 mb-1">{field.label}</label>
            <input
              name={field.name}
              type={field.type ?? 'text'}
              defaultValue={String(field.defaultValue)}
              className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-white/30"
            />
          </div>
        ))}

        <div>
          <label className="block text-sm text-white/60 mb-1">Status</label>
          <select
            name="status"
            defaultValue={car.status ?? 'active'}
            className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-white/30"
          >
            <option value="active">Active</option>
            <option value="maintenance">Maintenance</option>
            <option value="retired">Retired</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm text-white/60 mb-1">Description</label>
        <textarea
          name="description"
          defaultValue={car.description ?? ''}
          rows={4}
          className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-white/30"
        />
      </div>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          className="bg-white text-black font-semibold px-6 py-2.5 rounded-xl text-sm hover:bg-white/90 disabled:opacity-50 transition-colors"
        >
          {saved ? 'Saved ✓' : 'Save changes'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/dashboard/fleet')}
          className="text-sm text-white/40 hover:text-white transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
```

- [ ] **Step 5: Create `app/dashboard/fleet/[carId]/page.tsx`**

```typescript
// app/dashboard/fleet/[carId]/page.tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/dashboard/PageHeader'
import CarEditForm from './CarEditForm'
import type { Car } from '@/lib/supabase/types'

interface Props {
  params: { carId: string }
}

export default async function CarEditPage({ params }: Props) {
  const supabase = createClient()

  const { data: car } = await supabase
    .from('cars')
    .select('*')
    .eq('id', Number(params.carId))
    .single()

  if (!car) notFound()

  const c = car as Car

  return (
    <div className="max-w-3xl">
      <div className="mb-2">
        <Link href="/dashboard/fleet" className="text-sm text-white/40 hover:text-white transition-colors">
          ← Back to fleet
        </Link>
      </div>
      <PageHeader
        title={`${c.make} ${c.model_full || c.model}`}
        description={`Car ID: ${c.id}`}
      />
      <CarEditForm car={c} />
    </div>
  )
}
```

- [ ] **Step 6: Test fleet management**

Navigate to `http://localhost:3000/dashboard/fleet`. Expected: car list with Edit/Delete. Click Edit — car edit form with all fields pre-filled.

- [ ] **Step 7: Commit**

```bash
git add app/dashboard/fleet/
git commit -m "feat: add fleet management pages (list + car edit)"
```

---

## Task 7: Maintenance Page

**Files:**
- Create: `app/dashboard/maintenance/page.tsx`
- Create: `app/dashboard/maintenance/MaintenanceTable.tsx`
- Create: `app/dashboard/maintenance/actions.ts`

- [ ] **Step 1: Create `app/dashboard/maintenance/actions.ts`**

```typescript
// app/dashboard/maintenance/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { CarService } from '@/lib/supabase/types'

async function getTenantId(): Promise<string> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles').select('tenant_id').eq('id', user!.id).single()
  return profile!.tenant_id
}

export async function createService(
  data: Omit<CarService, 'id' | 'tenant_id'>
): Promise<{ error: string | null }> {
  const supabase = createClient()
  const tenantId = await getTenantId()
  const { error } = await supabase.from('car_services').insert({ ...data, tenant_id: tenantId })
  revalidatePath('/dashboard/maintenance')
  return { error: error?.message ?? null }
}

export async function deleteService(id: number): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase.from('car_services').delete().eq('id', id)
  revalidatePath('/dashboard/maintenance')
  return { error: error?.message ?? null }
}
```

- [ ] **Step 2: Create `app/dashboard/maintenance/MaintenanceTable.tsx`**

```typescript
// app/dashboard/maintenance/MaintenanceTable.tsx
'use client'

import { useState, useTransition } from 'react'
import type { CarService, Car } from '@/lib/supabase/types'
import { deleteService } from './actions'

interface Props {
  services: CarService[]
  cars: Car[]
}

export default function MaintenanceTable({ services, cars }: Props) {
  const [filter, setFilter] = useState('')
  const [, startTransition] = useTransition()
  const carMap = Object.fromEntries(cars.map((c) => [c.id, `${c.make} ${c.model_full || c.model}`]))

  const filtered = services.filter((s) => {
    const q = filter.toLowerCase()
    return !q || (s.description ?? '').toLowerCase().includes(q) || carMap[s.car_id ?? -1]?.toLowerCase().includes(q)
  })

  function handleDelete(id: number) {
    if (!confirm('Delete this service record?')) return
    startTransition(async () => { await deleteService(id) })
  }

  return (
    <div>
      <input
        type="text"
        placeholder="Search…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="mb-4 w-full max-w-sm bg-white/5 border border-white/10 text-white placeholder:text-white/30 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-white/30"
      />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-white/40 border-b border-white/10">
              <th className="pb-3 pr-4 font-medium">Car</th>
              <th className="pb-3 pr-4 font-medium">Date</th>
              <th className="pb-3 pr-4 font-medium">Description</th>
              <th className="pb-3 pr-4 font-medium">Cost</th>
              <th className="pb-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map((s) => (
              <tr key={s.id} className="hover:bg-white/5 transition-colors">
                <td className="py-3 pr-4 text-white/70">{s.car_id ? carMap[s.car_id] ?? `Car #${s.car_id}` : '—'}</td>
                <td className="py-3 pr-4 text-white/70">{s.service_date ? new Date(s.service_date).toLocaleDateString() : '—'}</td>
                <td className="py-3 pr-4 text-white/70">{s.description ?? '—'}</td>
                <td className="py-3 pr-4 text-white">{s.amount != null ? `$${Number(s.amount).toFixed(2)}` : '—'}</td>
                <td className="py-3">
                  <button onClick={() => handleDelete(s.id)} className="text-xs text-white/20 hover:text-red-400 transition-colors">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="text-white/30 text-sm py-12 text-center">No maintenance records.</p>}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `app/dashboard/maintenance/page.tsx`**

```typescript
// app/dashboard/maintenance/page.tsx
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/dashboard/PageHeader'
import StatCard from '@/components/dashboard/StatCard'
import MaintenanceTable from './MaintenanceTable'
import type { CarService, Car } from '@/lib/supabase/types'

export default async function MaintenancePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user!.id).single()
  const tenantId = profile!.tenant_id

  const [{ data: services }, { data: cars }] = await Promise.all([
    supabase.from('car_services').select('*').eq('tenant_id', tenantId).order('service_date', { ascending: false }),
    supabase.from('cars').select('id, make, model, model_full').eq('tenant_id', tenantId),
  ])

  const rows = (services as CarService[]) ?? []
  const carRows = (cars as Car[]) ?? []
  const totalCost = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0)

  return (
    <div className="max-w-6xl">
      <PageHeader title="Maintenance" description="Service and repair records." />
      <div className="grid grid-cols-2 gap-4 mb-8">
        <StatCard label="Total records" value={rows.length} />
        <StatCard label="Total cost" value={`$${totalCost.toFixed(0)}`} />
      </div>
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <MaintenanceTable services={rows} cars={carRows} />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/maintenance/
git commit -m "feat: add maintenance page"
```

---

## Task 8: Finance Pages

**Files:**
- Create: `app/dashboard/finance/expenses/page.tsx`
- Create: `app/dashboard/finance/reports/page.tsx`
- Create: `app/dashboard/finance/roi/page.tsx`

- [ ] **Step 1: Create `app/dashboard/finance/expenses/page.tsx`**

```typescript
// app/dashboard/finance/expenses/page.tsx
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/dashboard/PageHeader'
import StatCard from '@/components/dashboard/StatCard'
import EmptyState from '@/components/dashboard/EmptyState'
import type { Transaction } from '@/lib/supabase/types'

export default async function ExpensesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user!.id).single()

  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('tenant_id', profile!.tenant_id)
    .order('transaction_date', { ascending: false })

  const rows = (transactions as Transaction[]) ?? []
  const total = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0)

  const byCategory: Record<string, number> = {}
  rows.forEach((r) => {
    const cat = r.category ?? 'Other'
    byCategory[cat] = (byCategory[cat] ?? 0) + (Number(r.amount) || 0)
  })

  return (
    <div className="max-w-5xl">
      <PageHeader title="Expenses" />
      <div className="grid grid-cols-2 gap-4 mb-8">
        <StatCard label="Total expenses" value={`$${total.toFixed(0)}`} />
        <StatCard label="Records" value={rows.length} />
      </div>
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        {rows.length === 0 ? (
          <EmptyState message="No expense records." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-white/40 border-b border-white/10">
                  <th className="pb-3 pr-4 font-medium">Date</th>
                  <th className="pb-3 pr-4 font-medium">Category</th>
                  <th className="pb-3 pr-4 font-medium">Description</th>
                  <th className="pb-3 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 pr-4 text-white/60">{r.transaction_date ? new Date(r.transaction_date).toLocaleDateString() : '—'}</td>
                    <td className="py-3 pr-4 text-white/60 capitalize">{r.category ?? '—'}</td>
                    <td className="py-3 pr-4 text-white/60">{r.description ?? '—'}</td>
                    <td className="py-3 text-white font-medium">{r.amount != null ? `$${Number(r.amount).toFixed(2)}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `app/dashboard/finance/reports/page.tsx`**

```typescript
// app/dashboard/finance/reports/page.tsx
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/dashboard/PageHeader'
import StatCard from '@/components/dashboard/StatCard'
import EmptyState from '@/components/dashboard/EmptyState'
import type { Reservation } from '@/lib/supabase/types'

export default async function ReportsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user!.id).single()

  const { data: reservations } = await supabase
    .from('reservations')
    .select('pickup_date, total_amount, status')
    .eq('tenant_id', profile!.tenant_id)
    .not('total_amount', 'is', null)
    .order('pickup_date', { ascending: false })

  const rows = (reservations as Reservation[]) ?? []

  const totalRevenue = rows
    .filter((r) => r.status === 'completed')
    .reduce((s, r) => s + (Number(r.total_amount) || 0), 0)

  // Group revenue by month
  const byMonth: Record<string, number> = {}
  rows
    .filter((r) => r.status === 'completed' && r.pickup_date)
    .forEach((r) => {
      const month = r.pickup_date!.slice(0, 7) // YYYY-MM
      byMonth[month] = (byMonth[month] ?? 0) + (Number(r.total_amount) || 0)
    })

  const months = Object.entries(byMonth).sort(([a], [b]) => b.localeCompare(a)).slice(0, 6)

  return (
    <div className="max-w-5xl">
      <PageHeader title="Reports" description="Revenue overview." />
      <div className="grid grid-cols-2 gap-4 mb-8">
        <StatCard label="Total revenue (completed)" value={`$${totalRevenue.toFixed(0)}`} />
        <StatCard label="Completed bookings" value={rows.filter((r) => r.status === 'completed').length} />
      </div>
      {months.length === 0 ? (
        <EmptyState message="No completed reservations yet." />
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-white/60 mb-4 uppercase tracking-wider">Revenue by month</h2>
          <div className="space-y-3">
            {months.map(([month, amount]) => {
              const pct = totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0
              return (
                <div key={month}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white/70">{new Date(month + '-01').toLocaleDateString('en', { month: 'long', year: 'numeric' })}</span>
                    <span className="text-white font-medium">${amount.toFixed(0)}</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-white/40 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create `app/dashboard/finance/roi/page.tsx`**

```typescript
// app/dashboard/finance/roi/page.tsx
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/dashboard/PageHeader'
import EmptyState from '@/components/dashboard/EmptyState'
import type { Reservation, Car } from '@/lib/supabase/types'

export default async function ROIPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user!.id).single()
  const tenantId = profile!.tenant_id

  const [{ data: reservations }, { data: cars }] = await Promise.all([
    supabase.from('reservations').select('car_id, total_amount, status').eq('tenant_id', tenantId).eq('status', 'completed'),
    supabase.from('cars').select('id, make, model, model_full, daily_rate').eq('tenant_id', tenantId),
  ])

  const rows = (reservations as Reservation[]) ?? []
  const carRows = (cars as Car[]) ?? []

  // Revenue per car
  const revenueMap: Record<number, number> = {}
  rows.forEach((r) => {
    if (r.car_id != null) {
      revenueMap[r.car_id] = (revenueMap[r.car_id] ?? 0) + (Number(r.total_amount) || 0)
    }
  })

  const sorted = [...carRows].sort((a, b) => (revenueMap[b.id] ?? 0) - (revenueMap[a.id] ?? 0))

  return (
    <div className="max-w-5xl">
      <PageHeader title="ROI" description="Revenue per car (completed bookings)." />
      {sorted.length === 0 ? (
        <EmptyState message="No cars or completed bookings yet." />
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-white/40 border-b border-white/10">
                <th className="px-6 py-4 font-medium">Car</th>
                <th className="px-6 py-4 font-medium">Bookings</th>
                <th className="px-6 py-4 font-medium">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sorted.map((c) => {
                const bookings = rows.filter((r) => r.car_id === c.id).length
                const revenue = revenueMap[c.id] ?? 0
                return (
                  <tr key={c.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 text-white font-medium">{c.make} {c.model_full || c.model}</td>
                    <td className="px-6 py-4 text-white/60">{bookings}</td>
                    <td className="px-6 py-4 text-white font-bold">${revenue.toFixed(0)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/finance/
git commit -m "feat: add finance pages (expenses, reports, ROI)"
```

---

## Task 9: Clients Pages

**Files:**
- Create: `app/dashboard/clients/customers/page.tsx`
- Create: `app/dashboard/clients/consignments/page.tsx`

- [ ] **Step 1: Create `app/dashboard/clients/customers/page.tsx`**

```typescript
// app/dashboard/clients/customers/page.tsx
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/dashboard/PageHeader'
import EmptyState from '@/components/dashboard/EmptyState'
import type { Customer } from '@/lib/supabase/types'

export default async function CustomersPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user!.id).single()

  const { data: customers } = await supabase
    .from('customers')
    .select('*')
    .eq('tenant_id', profile!.tenant_id)
    .order('name')

  const rows = (customers as Customer[]) ?? []

  return (
    <div className="max-w-5xl">
      <PageHeader title="Customers" description={`${rows.length} total`} />
      {rows.length === 0 ? (
        <EmptyState message="No customers yet. They are auto-created from bookings." />
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-white/40 border-b border-white/10">
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Email</th>
                <th className="px-6 py-4 font-medium">Phone</th>
                <th className="px-6 py-4 font-medium">Since</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((c) => (
                <tr key={c.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 text-white font-medium">{c.name}</td>
                  <td className="px-6 py-4 text-white/60">{c.email ?? '—'}</td>
                  <td className="px-6 py-4 text-white/60">{c.phone ?? '—'}</td>
                  <td className="px-6 py-4 text-white/40 text-xs">{c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create `app/dashboard/clients/consignments/page.tsx`**

```typescript
// app/dashboard/clients/consignments/page.tsx
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/dashboard/PageHeader'
import EmptyState from '@/components/dashboard/EmptyState'
import type { Consignment, Car } from '@/lib/supabase/types'

export default async function ConsignmentsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user!.id).single()
  const tenantId = profile!.tenant_id

  const [{ data: consignments }, { data: cars }] = await Promise.all([
    supabase.from('consignments').select('*').eq('tenant_id', tenantId).order('car_id'),
    supabase.from('cars').select('id, make, model, model_full').eq('tenant_id', tenantId),
  ])

  const rows = (consignments as Consignment[]) ?? []
  const carRows = (cars as Car[]) ?? []
  const carMap = Object.fromEntries(carRows.map((c) => [c.id, `${c.make} ${c.model_full || c.model}`]))

  return (
    <div className="max-w-5xl">
      <PageHeader title="Consignments" description="Cars managed for third-party owners." />
      {rows.length === 0 ? (
        <EmptyState message="No consignments." />
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-white/40 border-b border-white/10">
                <th className="px-6 py-4 font-medium">Car</th>
                <th className="px-6 py-4 font-medium">Owner</th>
                <th className="px-6 py-4 font-medium">Contact</th>
                <th className="px-6 py-4 font-medium">Split</th>
                <th className="px-6 py-4 font-medium">Contract</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((c) => (
                <tr key={c.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 text-white font-medium">{c.car_id ? carMap[c.car_id] ?? `Car #${c.car_id}` : '—'}</td>
                  <td className="px-6 py-4 text-white/70">{c.owner_name ?? '—'}</td>
                  <td className="px-6 py-4 text-white/60 text-xs">
                    <div>{c.owner_email ?? '—'}</div>
                    <div>{c.owner_phone ?? ''}</div>
                  </td>
                  <td className="px-6 py-4 text-white/70">{c.owner_percentage != null ? `${c.owner_percentage}%` : '—'}</td>
                  <td className="px-6 py-4 text-white/40 text-xs">
                    {c.contract_start ? new Date(c.contract_start).toLocaleDateString() : '—'}
                    {c.contract_end ? ` → ${new Date(c.contract_end).toLocaleDateString()}` : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/clients/
git commit -m "feat: add clients pages (customers, consignments)"
```

---

## Task 10: Team Page

**Files:**
- Create: `app/dashboard/team/page.tsx`

- [ ] **Step 1: Create `app/dashboard/team/page.tsx`**

```typescript
// app/dashboard/team/page.tsx
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/dashboard/PageHeader'
import EmptyState from '@/components/dashboard/EmptyState'
import type { Profile } from '@/lib/supabase/types'

export default async function TeamPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user!.id).single()

  const { data: members } = await supabase
    .from('profiles')
    .select('id, full_name, role, created_at')
    .eq('tenant_id', profile!.tenant_id)
    .order('created_at')

  const rows = (members as Profile[]) ?? []

  const ROLE_COLORS: Record<string, string> = {
    admin: 'bg-white/10 text-white',
    staff: 'bg-blue-500/20 text-blue-400',
    finance: 'bg-yellow-500/20 text-yellow-400',
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title="Team" description="Members with dashboard access." />
      {rows.length === 0 ? (
        <EmptyState message="No team members." />
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-white/40 border-b border-white/10">
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Role</th>
                <th className="px-6 py-4 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((m) => (
                <tr key={m.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 text-white font-medium">{m.full_name ?? m.id.slice(0, 8)}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full capitalize ${ROLE_COLORS[m.role ?? ''] ?? 'bg-white/5 text-white/40'}`}>
                      {m.role ?? 'member'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-white/40 text-xs">
                    {m.created_at ? new Date(m.created_at).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/team/page.tsx
git commit -m "feat: add team page"
```

---

## Task 11: Turo Integration Page

**Files:**
- Create: `app/dashboard/integrations/turo/page.tsx`

- [ ] **Step 1: Create `app/dashboard/integrations/turo/page.tsx`**

```typescript
// app/dashboard/integrations/turo/page.tsx
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/dashboard/PageHeader'
import EmptyState from '@/components/dashboard/EmptyState'

interface TuroFeed {
  id: number
  car_id: number | null
  last_synced: string | null
  source_name?: string | null
  url?: string | null
}

export default async function TuroPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user!.id).single()
  const tenantId = profile!.tenant_id

  const [{ data: feeds }, { data: cars }] = await Promise.all([
    supabase.from('turo_feeds').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: true }),
    supabase.from('cars').select('id, make, model, model_full').eq('tenant_id', tenantId),
  ])

  const rows = (feeds as TuroFeed[]) ?? []
  const carMap = Object.fromEntries(
    ((cars as { id: number; make: string; model: string; model_full: string | null }[]) ?? []).map((c) => [c.id, `${c.make} ${c.model_full || c.model}`])
  )

  return (
    <div className="max-w-4xl">
      <PageHeader title="Turo Integration" description="iCal feeds synced from Turo." />
      {rows.length === 0 ? (
        <EmptyState message="No Turo feeds configured. Use the old dashboard to add them." />
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-white/40 border-b border-white/10">
                <th className="px-6 py-4 font-medium">Car</th>
                <th className="px-6 py-4 font-medium">Last synced</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((f) => (
                <tr key={f.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 text-white font-medium">
                    {f.car_id ? carMap[f.car_id] ?? `Car #${f.car_id}` : '—'}
                  </td>
                  <td className="px-6 py-4 text-white/50">
                    {f.last_synced ? new Date(f.last_synced).toLocaleString() : 'Never'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-6 text-sm text-white/30">
        To manage Turo feeds (add/remove/sync), use the{' '}
        <a href="/admin/dashboard.html" className="text-white/50 hover:text-white transition-colors underline">
          legacy dashboard ↗
        </a>{' '}
        until this page is fully migrated.
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/integrations/
git commit -m "feat: add Turo integration page"
```

---

## Task 12: Update Overview Page with Real Stats

**Files:**
- Modify: `app/dashboard/page.tsx`

- [ ] **Step 1: Replace `app/dashboard/page.tsx`**

```typescript
// app/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import PageHeader from '@/components/dashboard/PageHeader'
import StatCard from '@/components/dashboard/StatCard'
import type { Tenant } from '@/lib/supabase/types'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user!.id)
    .single()

  const tenantId = profile!.tenant_id

  const [{ data: tenant }, { count: carCount }, { data: recentBookings }] = await Promise.all([
    supabase.from('tenants').select('name, slug, brand_name, logo_url').eq('id', tenantId).single(),
    supabase.from('cars').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    supabase.from('reservations')
      .select('id, status, total_amount, customer_name, pickup_date')
      .eq('tenant_id', tenantId)
      .order('pickup_date', { ascending: false })
      .limit(5),
  ])

  const t = tenant as Tenant
  const displayName = t.brand_name || t.name
  const fleetUrl = `https://${t.slug}.epuredrive.com`

  const revenue = ((recentBookings ?? []) as { status: string; total_amount: number | null }[])
    .filter((r) => r.status === 'completed')
    .reduce((s, r) => s + (Number(r.total_amount) || 0), 0)

  return (
    <div className="max-w-4xl">
      <PageHeader title={`Welcome, ${displayName}`} description="Your fleet at a glance." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Cars listed" value={carCount ?? 0} />
        <StatCard label="Recent revenue" value={`$${revenue.toFixed(0)}`} sub="last 5 bookings" />
        <StatCard
          label="Your fleet URL"
          value=""
          sub={fleetUrl}
        />
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <Link href="/dashboard/bookings" className="block bg-white/5 border border-white/10 hover:border-white/20 rounded-2xl p-6 transition-all group">
          <div className="text-lg font-bold text-white mb-1">Bookings →</div>
          <p className="text-sm text-white/40">View and manage reservations.</p>
        </Link>
        <Link href="/dashboard/fleet" className="block bg-white/5 border border-white/10 hover:border-white/20 rounded-2xl p-6 transition-all group">
          <div className="text-lg font-bold text-white mb-1">Fleet →</div>
          <p className="text-sm text-white/40">Edit cars and availability.</p>
        </Link>
        <a href={fleetUrl} target="_blank" rel="noopener noreferrer" className="block bg-white/5 border border-white/10 hover:border-white/20 rounded-2xl p-6 transition-all group">
          <div className="text-lg font-bold text-white mb-1">View public page ↗</div>
          <p className="text-sm text-white/40 break-all">{fleetUrl}</p>
        </a>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat: update overview page with real booking stats"
```

---

## Task 13: Playwright E2E Tests

**Files:**
- Create: `e2e/dashboard.spec.ts`

- [ ] **Step 1: Ensure Playwright is installed**

```bash
npx playwright install --with-deps chromium
```

- [ ] **Step 2: Create `e2e/dashboard.spec.ts`**

```typescript
// e2e/dashboard.spec.ts
import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:3000'
const TEST_EMAIL = process.env.TEST_EMAIL ?? ''
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? ''

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login via the sign-in page
    await page.goto(`${BASE_URL}/login`)
    await page.fill('input[type="email"]', TEST_EMAIL)
    await page.fill('input[type="password"]', TEST_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL(`${BASE_URL}/dashboard`)
  })

  test('Overview page loads with stat cards', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Welcome')
    await expect(page.locator('text=Bookings →')).toBeVisible()
    await expect(page.locator('text=Fleet →')).toBeVisible()
  })

  test('Sidebar shows grouped navigation', async ({ page }) => {
    await expect(page.locator('text=Operations')).toBeVisible()
    await expect(page.locator('text=Finance')).toBeVisible()
    await expect(page.locator('text=Clients')).toBeVisible()
  })

  test('Bookings page renders table', async ({ page }) => {
    await page.click('text=Operations')
    await page.click('text=Bookings')
    await page.waitForURL(`${BASE_URL}/dashboard/bookings`)
    await expect(page.locator('h1')).toContainText('Bookings')
  })

  test('Fleet page renders car list', async ({ page }) => {
    await page.click('text=Operations')
    await page.click('text=Fleet')
    await page.waitForURL(`${BASE_URL}/dashboard/fleet`)
    await expect(page.locator('h1')).toContainText('Fleet')
  })
})
```

- [ ] **Step 3: Add test credentials to `.env.local` (never commit)**

```
TEST_EMAIL=your-test-account@example.com
TEST_PASSWORD=your-test-password
```

- [ ] **Step 4: Run E2E tests**

```bash
npm run dev &
npx playwright test e2e/dashboard.spec.ts
```

Expected: all 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add e2e/dashboard.spec.ts
git commit -m "test: add Playwright E2E tests for dashboard"
```

---

## Task 14: Final Verification

- [ ] **Step 1: Run `npm run build` and verify no errors**

```bash
npm run build
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 2: Walk through every sidebar section manually**

Navigate to each page: Overview → Bookings → Fleet → Fleet/[carId] → Maintenance → Expenses → Reports → ROI → Customers → Consignments → Team → Turo. Each page should load with its data and no console errors.

- [ ] **Step 3: Remove the "Full Dashboard ↗" link from the Overview page**

The link to `/admin/dashboard.html` can now be removed from `app/dashboard/page.tsx` since all sections are migrated. The file itself remains in place (safe to keep) but no longer linked from the new dashboard.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete Phase 2 admin dashboard migration"
```
