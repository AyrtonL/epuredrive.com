# Go-Live Testing Plan — éPure Drive
**Date:** 2026-04-13  
**Status:** Active  
**Scope:** 3 features deployed to production

---

## Feature 1: Google Analytics

### Happy Path
- [ ] Navigate to `https://epuredrive.com` in an incognito window
- [ ] Open DevTools → Network → filter by `google-analytics` or `gtag`
- [ ] Confirm a request fires to `https://www.google-analytics.com/g/collect` on page load
- [ ] Navigate to a second page (e.g. `/sites/[slug]/[carId]`) and confirm another `collect` event fires

### Edge Cases
- [ ] Confirm no GA request fires on localhost if `NEXT_PUBLIC_GA_MEASUREMENT_ID` is not set (component renders null safely)
- [ ] GA should **not** block page render — confirm page loads even if GA is blocked by an ad blocker (no JS errors)

### Regression
- [ ] Root layout still renders correctly — hero, nav, footer all visible on homepage

---

## Feature 2: Availability Calendar Visual

**URL pattern:** `https://epuredrive.com/sites/[slug]/[carId]`  
Use a vehicle that has at least one active reservation (status = `confirmed` or `active`).

### Happy Path
- [ ] Navigate to a fleet vehicle page for a car with existing bookings
- [ ] Scroll to the `BookingWidget`
- [ ] Confirm the "Unavailable periods" section appears above the location select
- [ ] Confirm each booked range renders as an amber pill in the format `Jan 15 – Jan 18`
- [ ] Confirm the section is visually distinct and readable on the dark background

### Past Date Blocking
- [ ] Click the **Pickup Date** input
- [ ] Confirm today's date is selectable but yesterday is not (native `min` attribute blocks past dates)
- [ ] Repeat for **Return Date** input

### Edge Cases
- [ ] Navigate to a vehicle with **no** bookings — confirm the "Unavailable periods" section is **not** rendered
- [ ] Select dates that don't overlap any booked range — confirm no conflict error appears
- [ ] Select dates that overlap a booked range — confirm conflict error ("These dates are not available") still appears below the pills

### Regression
- [ ] Total price still calculates correctly for a clean date range
- [ ] Booking form submits successfully for available dates
- [ ] WhatsApp / Stripe flow still launches after valid date selection

---

## Feature 3: Invite Member

**URL:** `https://[tenant-dashboard]/dashboard/settings/roles`  
Login as a tenant admin.

### Happy Path — Send Invite
- [ ] Navigate to Settings → Roles
- [ ] Click "Invite Member" button
- [ ] Confirm modal opens with: email input, role selector (admin / manager / staff / finance), Submit and Cancel buttons
- [ ] Enter a real email address you control + select a role
- [ ] Click Submit
- [ ] Confirm success message appears: "Invitation sent to [email]"
- [ ] Confirm the invited email inbox receives a Supabase invite email with a valid link

### Happy Path — Accept Invite
- [ ] Click the magic link in the invite email
- [ ] Confirm you land on the Supabase password-set page (or are redirected to dashboard if email link auto-confirms)
- [ ] Set a password and confirm
- [ ] Confirm redirect to dashboard
- [ ] Confirm no infinite redirect — profile row was auto-created with correct `tenant_id` and `role`
- [ ] Navigate to Settings → Roles to confirm the new user appears in the members list (if listing is implemented)

### Error States
- [ ] Send invite to an email that already has a pending invite → confirm error: "An invitation has already been sent to this address"
- [ ] Attempt to submit with no email → confirm HTML5 required validation fires
- [ ] Attempt to submit with no role selected → confirm role required validation fires (or role defaults to first option)
- [ ] Close modal with Cancel → confirm modal closes, no invite sent

### Regression
- [ ] Existing users can still log in normally
- [ ] Admin can still navigate all settings pages without redirect issues
- [ ] `requireTenantId()` still returns the correct `tenantId` for pre-existing users (no regression from profile upsert logic)

---

## Cross-Feature Regression Checks

- [ ] Homepage loads without JS errors in console
- [ ] Booking widget on fleet page loads `bookedRanges` from `/api/availability` (Network tab — 200 response)
- [ ] Dashboard `/dashboard` loads for existing admin user without errors
- [ ] Cookie consent banner still appears on first visit (regression from previous sprint)

---

## Known Limitations (Non-Blocking)

| Item | Severity | Notes |
|------|----------|-------|
| GA doesn't track client-side navigation (App Router) | LOW | Only fires on hard navigations. Standard Next.js App Router behavior. |
| Upsert errors in `requireTenantId` are silent | LOW | Profile creation failure won't surface to user. Monitor Supabase logs. |
| Native date input can't disable individual booked dates | DESIGN | Intentional — pills inform user, conflict validation catches selection. |

---

## How to Monitor Post-Deploy

- **Google Analytics:** GA4 Realtime report → confirm events flowing
- **Invite flow:** Supabase Dashboard → Authentication → Users → verify invited users appear
- **Availability:** Supabase Dashboard → `reservations` table → query by tenant and date range
- **Errors:** Netlify Functions logs → watch for 500s on `/api/availability` and Server Action calls
