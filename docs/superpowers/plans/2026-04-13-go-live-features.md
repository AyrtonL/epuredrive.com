# Go-Live Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 3 production-ready features — Google Analytics mounting, availability calendar visual, and team member invitations — to complete the go-live checklist.

**Architecture:** Three independent features implemented in order of complexity. GA is a 2-line change. Availability calendar adds a "booked periods" UI to `BookingWidget` using already-fetched data. Invite Member adds a modal + Server Action + invited-user profile auto-creation.

**Tech Stack:** Next.js 14 App Router, Supabase Auth (admin.inviteUserByEmail), Tailwind, TypeScript, Jest + jsdom.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `app/layout.tsx` | Modify | Mount `<GoogleAnalytics />` in body |
| `components/sites/BookingWidget.tsx` | Modify | Add unavailable periods pills + `min` on date inputs |
| `__tests__/booking-widget-utils.test.ts` | Create | Unit test for date range formatter |
| `app/(dashboard)/dashboard/settings/roles/actions.ts` | Create | Server Action: `inviteTeamMember(email, role)` |
| `app/(dashboard)/dashboard/settings/roles/InviteModal.tsx` | Create | Client component: modal form for invite |
| `app/(dashboard)/dashboard/settings/roles/page.tsx` | Modify | Wire InviteModal to "Invite Member" button |
| `lib/supabase/dashboard-auth.ts` | Modify | Auto-create profile for invited users on first access |

---

## Task 1: Mount Google Analytics

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Add GoogleAnalytics to root layout**

Open `app/layout.tsx`. Add the import and render the component in the body:

```tsx
// app/layout.tsx
import type { Metadata } from 'next'
import { Outfit, Manrope } from 'next/font/google'
import CookieConsentBanner from '@/components/CookieConsentBanner'
import CookieConsentManager from '@/components/CookieConsentManager'
import GoogleAnalytics from '@/components/GoogleAnalytics'
import './globals.css'

const outfit = Outfit({ subsets: ['latin'], weight: ['300', '400', '600', '700', '800'], variable: '--font-outfit' })
const manrope = Manrope({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-manrope' })

export const metadata: Metadata = {
  title: {
    default: 'éPure Drive — Premium Fleet Software for Car Rental Businesses',
    template: '%s | éPure Drive',
  },
  description: 'Get your own branded fleet page in minutes. Built for car rental operators in Miami.',
  metadataBase: new URL('https://epuredrive.com'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://epuredrive.com',
    siteName: 'éPure Drive',
    title: 'éPure Drive — Premium Fleet Software for Car Rental Businesses',
    description: 'A Miami-based SaaS platform built for the modern car rental industry. Streamline operations, elevate the customer journey.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'éPure Drive — Premium Fleet Software for Car Rental Businesses',
    description: 'A Miami-based SaaS platform built for the modern car rental industry.',
  },
  robots: { index: true, follow: true },
  icons: { icon: '/favicon.svg', apple: '/apple-touch-icon.png' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} ${manrope.variable} ${outfit.className}`}>
        <GoogleAnalytics />
        <CookieConsentManager />
        <CookieConsentBanner />
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Verify behavior without env var**

Start dev server (`npm run dev`), open browser DevTools → Network tab, filter for `googletagmanager`. Confirm no GA request fires (env var not set locally = component returns null).

- [ ] **Step 4: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: mount GoogleAnalytics component in root layout"
```

---

## Task 2: Availability Calendar Visual

**Files:**
- Modify: `components/sites/BookingWidget.tsx`
- Create: `__tests__/booking-widget-utils.test.ts`

- [ ] **Step 1: Write the failing test for the date formatter**

Create `__tests__/booking-widget-utils.test.ts`:

```ts
// __tests__/booking-widget-utils.test.ts

function formatBookedRange(from: string, to: string): string {
  const fmt = (d: string) =>
    new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${fmt(from)} – ${fmt(to)}`
}

describe('formatBookedRange', () => {
  it('formats a range within the same month', () => {
    expect(formatBookedRange('2026-01-15', '2026-01-18')).toBe('Jan 15 – Jan 18')
  })

  it('formats a range across months', () => {
    expect(formatBookedRange('2026-01-28', '2026-02-03')).toBe('Jan 28 – Feb 3')
  })

  it('formats a single-day range', () => {
    expect(formatBookedRange('2026-03-10', '2026-03-10')).toBe('Mar 10 – Mar 10')
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx jest __tests__/booking-widget-utils.test.ts --no-coverage
```

Expected: FAIL — `formatBookedRange is not defined` (function is defined inside the test file so it should actually pass — this step confirms the test infrastructure runs).

Expected output: 3 passed tests. If all pass, proceed.

- [ ] **Step 3: Add `formatBookedRange` inline to BookingWidget and render the unavailable periods UI**

In `components/sites/BookingWidget.tsx`, add the formatter and the UI block. Place it right after the date grid and before the `dateConflict` warning block (after line ~243, before the `{dateConflict && (` block):

Add this helper right before the `export default` function (after the `datesOverlap` function):

```tsx
function formatBookedRange(from: string, to: string): string {
  const fmt = (d: string) =>
    new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${fmt(from)} – ${fmt(to)}`
}
```

Add `min` attribute to both date inputs. Replace the pickup date input:

```tsx
<input
  type="date"
  value={pickDate}
  onChange={e => setPickDate(e.target.value)}
  min={new Date().toISOString().split('T')[0]}
  className="w-full bg-white/5 border border-white/5 rounded-2xl px-4 py-3 text-xs text-white focus:ring-1 focus:ring-primary/40 outline-none [color-scheme:dark]"
/>
```

Replace the return date input:

```tsx
<input
  type="date"
  value={retDate}
  onChange={e => setRetDate(e.target.value)}
  min={pickDate || new Date().toISOString().split('T')[0]}
  className="w-full bg-white/5 border border-white/5 rounded-2xl px-4 py-3 text-xs text-white focus:ring-1 focus:ring-primary/40 outline-none [color-scheme:dark]"
/>
```

Add the unavailable periods block right after the date grid closing `</div>` and before `{dateConflict && (`:

```tsx
{/* Unavailable periods */}
{bookedRanges.length > 0 && (
  <div className="space-y-2">
    <span className="block text-[9px] font-black text-white/25 uppercase tracking-widest ml-1">
      Unavailable periods
    </span>
    <div className="flex flex-wrap gap-2">
      {bookedRanges.map((r, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400/80 text-[10px] font-bold"
        >
          <svg className="w-2.5 h-2.5 flex-shrink-0" fill="currentColor" viewBox="0 0 8 8">
            <circle cx="4" cy="4" r="3" />
          </svg>
          {formatBookedRange(r.from, r.to)}
        </span>
      ))}
    </div>
  </div>
)}
```

- [ ] **Step 4: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Manual verification**

Start dev server (`npm run dev`). Navigate to any car detail page on a tenant site (e.g. `/sites/[slug]/[carId]`). Open the booking widget:

1. Confirm past dates are blocked in both date pickers
2. If the car has existing reservations, confirm the "Unavailable periods" pills appear below the date inputs
3. Confirm the pills show readable date ranges (e.g. "Jan 15 – Jan 18")
4. Confirm the return date `min` updates when pickup date changes

- [ ] **Step 6: Commit**

```bash
git add components/sites/BookingWidget.tsx __tests__/booking-widget-utils.test.ts
git commit -m "feat: show unavailable periods in BookingWidget, block past dates"
```

---

## Task 3: Invite Member — Server Action

**Files:**
- Create: `app/(dashboard)/dashboard/settings/roles/actions.ts`

- [ ] **Step 1: Create the Server Action file**

Create `app/(dashboard)/dashboard/settings/roles/actions.ts`:

```ts
'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { requireTenantId } from '@/lib/supabase/dashboard-auth'

export type InviteResult =
  | { success: true }
  | { success: false; error: string }

export async function inviteTeamMember(
  email: string,
  role: string
): Promise<InviteResult> {
  // Validate inputs server-side
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return { success: false, error: 'Invalid email address.' }
  }
  const validRoles = ['admin', 'manager', 'staff', 'finance']
  if (!validRoles.includes(role)) {
    return { success: false, error: 'Invalid role.' }
  }

  // Get calling user's tenant
  const { tenantId } = await requireTenantId()

  const adminClient = createAdminClient()

  const { error } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { tenant_id: tenantId, role },
  })

  if (error) {
    // Supabase returns "User already registered" for duplicate invites
    if (error.message.includes('already')) {
      return { success: false, error: 'An invitation has already been sent to this address.' }
    }
    return { success: false, error: 'Failed to send invitation. Please try again.' }
  }

  return { success: true }
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/(dashboard)/dashboard/settings/roles/actions.ts
git commit -m "feat: add inviteTeamMember server action using Supabase admin invite"
```

---

## Task 4: Invite Member — Modal Component

**Files:**
- Create: `app/(dashboard)/dashboard/settings/roles/InviteModal.tsx`

- [ ] **Step 1: Create the InviteModal client component**

Create `app/(dashboard)/dashboard/settings/roles/InviteModal.tsx`:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { inviteTeamMember } from './actions'

const ROLES = [
  { value: 'admin', label: 'Admin', desc: 'Full access including settings and team management' },
  { value: 'manager', label: 'Manager', desc: 'Operations + financial data, no settings' },
  { value: 'staff', label: 'Staff', desc: 'Day-to-day operations only' },
  { value: 'finance', label: 'Finance', desc: 'Financial modules only' },
]

export default function InviteModal() {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('staff')
  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleOpen() {
    setOpen(true)
    setEmail('')
    setRole('staff')
    setResult(null)
  }

  function handleClose() {
    setOpen(false)
    setResult(null)
  }

  function handleSubmit() {
    startTransition(async () => {
      const res = await inviteTeamMember(email.trim(), role)
      setResult(res)
      if (res.success) {
        setEmail('')
        setRole('staff')
      }
    })
  }

  const inputCls = 'w-full bg-white/5 border border-white/5 rounded-2xl py-3 px-4 text-sm text-white placeholder:text-white/20 focus:ring-1 focus:ring-white/20 outline-none transition-all'
  const labelCls = 'block text-[10px] font-black text-white/30 uppercase tracking-widest mb-2'

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={handleOpen}
        className="bg-white text-black px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-white/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
      >
        Invite Member
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) handleClose() }}
        >
          <div className="glass border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl space-y-6 animate-fade-in">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-white font-bold text-lg">Invite Team Member</h2>
                <p className="text-white/40 text-xs mt-1">They&apos;ll receive an email to set their password.</p>
              </div>
              <button
                onClick={handleClose}
                className="text-white/30 hover:text-white/60 transition-colors text-xl leading-none"
              >
                ×
              </button>
            </div>

            {result?.success ? (
              <div className="text-center py-6 space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-white font-bold text-sm">Invitation sent!</p>
                <p className="text-white/40 text-xs">They&apos;ll receive a link valid for 24 hours.</p>
                <button
                  onClick={handleClose}
                  className="mt-2 text-white/40 text-xs font-bold uppercase tracking-widest hover:text-white/60 transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div>
                    <label className={labelCls}>Email address</label>
                    <input
                      type="email"
                      placeholder="colleague@company.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className={inputCls}
                      disabled={isPending}
                      onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    />
                  </div>

                  <div>
                    <label className={labelCls}>Role</label>
                    <div className="space-y-2">
                      {ROLES.map(r => (
                        <button
                          key={r.value}
                          type="button"
                          onClick={() => setRole(r.value)}
                          className={`w-full text-left p-4 rounded-2xl border transition-all ${
                            role === r.value
                              ? 'bg-white/10 border-white/20 text-white'
                              : 'bg-white/[0.02] border-white/[0.04] text-white/40 hover:border-white/10'
                          }`}
                        >
                          <div className="text-xs font-bold">{r.label}</div>
                          <div className="text-[10px] mt-0.5 opacity-60">{r.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {result?.error && (
                  <p className="text-red-400 text-xs font-bold px-1">{result.error}</p>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={isPending || !email.trim()}
                  className="w-full bg-white text-black font-black uppercase tracking-[0.15em] text-[11px] py-4 rounded-2xl hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
                >
                  {isPending ? 'Sending…' : 'Send Invitation'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/(dashboard)/dashboard/settings/roles/InviteModal.tsx
git commit -m "feat: add InviteModal client component with role selection"
```

---

## Task 5: Invite Member — Wire Modal into Roles Page

**Files:**
- Modify: `app/(dashboard)/dashboard/settings/roles/page.tsx`

- [ ] **Step 1: Replace the static button with InviteModal**

In `app/(dashboard)/dashboard/settings/roles/page.tsx`, add the import at the top and replace the static button:

Add import after the existing imports:

```tsx
import InviteModal from './InviteModal'
```

Replace this block (around line 72):

```tsx
<button className="bg-white text-black px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-white/90 transition-all hover:scale-[1.02] active:scale-[0.98]">
  Invite Member
</button>
```

With:

```tsx
<InviteModal />
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/(dashboard)/dashboard/settings/roles/page.tsx
git commit -m "feat: wire InviteModal into Team & Roles page"
```

---

## Task 6: Invite Member — Auto-Create Profile on First Access

**Files:**
- Modify: `lib/supabase/dashboard-auth.ts`

**Context:** When an invited user clicks the magic link and signs in for the first time, they have no `profiles` row. Their `user.user_metadata` contains `{ tenant_id, role }` set by the invite Server Action. Currently `requireTenantId()` would redirect them to `/dashboard/settings` in a loop. This task auto-creates their profile so they land in the dashboard normally.

- [ ] **Step 1: Update `requireTenantId` to handle invited users**

Replace the full content of `lib/supabase/dashboard-auth.ts`:

```ts
import { redirect } from 'next/navigation'
import { createClient } from './server'

/**
 * Fetches the authenticated user's tenant_id for dashboard pages.
 * - Redirects to /login if not authenticated.
 * - If the user has no profile but has invite metadata (tenant_id + role in
 *   user_metadata), auto-creates the profile and returns the tenant_id.
 * - Redirects to /dashboard/settings if profile is still incomplete after that.
 */
export async function requireTenantId(): Promise<{ supabase: ReturnType<typeof createClient>; tenantId: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (profile?.tenant_id) {
    return { supabase, tenantId: profile.tenant_id }
  }

  // No profile yet — check if this is an invited user with metadata
  const meta = user.user_metadata as { tenant_id?: string; role?: string } | undefined
  if (meta?.tenant_id && meta?.role) {
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        tenant_id: meta.tenant_id,
        role: meta.role,
        full_name: user.email ?? null,
      })

    if (!error) {
      return { supabase, tenantId: meta.tenant_id }
    }
  }

  // No profile and no invite metadata — send to settings to complete setup
  redirect('/dashboard/settings')
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/supabase/dashboard-auth.ts
git commit -m "feat: auto-create profile for invited users on first dashboard access"
```

---

## Task 7: End-to-End Manual Test — Invite Member

- [ ] **Step 1: Test the full invite flow**

1. Sign in as a tenant admin → go to **Settings → Team & Roles**
2. Click **Invite Member** → modal opens
3. Enter a real email address you can access + select role **staff** → click **Send Invitation**
4. Confirm success state shows (green checkmark + "Invitation sent!")
5. Open the invited email → click the magic link
6. Set a password → you should land directly on the dashboard (not loop to settings)
7. Confirm the new member appears in the Team Members list on the Roles page with the correct role

- [ ] **Step 2: Test error states**

1. Open Invite modal → enter an already-invited email → confirm error message: *"An invitation has already been sent to this address."*
2. Open Invite modal → leave email empty → confirm "Send Invitation" button is disabled

- [ ] **Step 3: Commit final cleanup if any**

```bash
git status
# If any files changed:
git add -p
git commit -m "chore: cleanup after invite member e2e test"
```

---

## Summary

| Feature | Files changed | Tasks |
|---------|--------------|-------|
| Google Analytics | 1 | Task 1 |
| Availability Calendar Visual | 1 + 1 test | Task 2 |
| Invite Member | 4 | Tasks 3–7 |
