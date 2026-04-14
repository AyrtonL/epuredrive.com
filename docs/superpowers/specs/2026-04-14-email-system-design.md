# Email System Design — éPure Drive
**Date:** 2026-04-14  
**Status:** Approved  
**Scope:** Full email system covering 17 new email templates across platform, rental ops, and support

---

## Overview

éPure Drive is a multi-tenant SaaS rental platform. Emails fall into three domains:

1. **Platform** — éPure Drive communicates with operators (tenant owners/team)
2. **Rental ops** — Operators communicate with their end customers via éPure Drive
3. **Support** — Inbound contact from the marketing site and operator dashboard to Ayrton

All emails use Resend (`lib/email/resend.ts` → `sendEmail()`). Templates are HTML strings using the existing dark-themed `baseLayout()` pattern.

---

## File Structure

```
lib/email/
  resend.ts                  (unchanged — core sendEmail function)
  index.ts                   (re-exports sendEmail + all template functions)
  templates/
    platform.ts              (welcome, onboarding, subscription, payments, invite)
    rentals.ts               (all booking/agreement flows — moved from templates.ts)
    support.ts               (contact form, dashboard support)
  templates.ts               (barrel re-export for backwards compatibility)
```

### Migration
The existing `lib/email/templates.ts` contents move into `lib/email/templates/rentals.ts` without modification. The original `templates.ts` becomes a barrel that re-exports everything — no existing import paths break.

---

## Section 1 — Platform Emails (`platform.ts`)

### 1. `welcomeEmail`
- **Trigger:** Tenant successfully created
- **Recipient:** Operator (user who signed up)
- **Wired in:** `POST /api/tenant/create` — fire after successful tenant + profile insert
- **Content:**
  - Headline: "Welcome to éPure Drive"
  - Body: "Your account and dashboard are ready."
  - Plan recommendation block: brief pitch for Starter/Pro/Max with pricing link
  - CTA: "Go to Dashboard" → `https://epuredrive.com/dashboard`

### 2. `onboardingEmail`
- **Trigger:** Same tenant creation (both emails fire in parallel)
- **Recipient:** Operator
- **Wired in:** `POST /api/tenant/create`
- **Content:**
  - Headline: "Get set up in 3 steps"
  - Step 1: Add your first vehicle → `/dashboard/fleet`
  - Step 2: Customize your rental site → `/dashboard/settings`
  - Step 3: Set up payments → `/dashboard/settings/payments`
  - CTA: "Start Setup" → `/dashboard`

### 3. `subscriptionActivatedEmail`
- **Trigger:** `checkout.session.completed` Stripe event
- **Recipient:** Operator (looked up via `stripe_customer_id` → `profiles` → auth email)
- **Wired in:** `app/api/stripe/webhook/route.ts`
- **Content:**
  - Headline: "Your [Plan] plan is now active"
  - Plan name, 3 key features unlocked on this plan
  - Next billing date (from Stripe session metadata or subscription object)
  - CTA: "Go to Dashboard"

### 4. `subscriptionChangedEmail`
- **Trigger:** `customer.subscription.updated` Stripe event (any plan change — upgrade OR downgrade) AND admin-triggered plan change via `POST /api/superadmin/update`
- **Recipient:** Operator
- **Wired in:** `app/api/stripe/webhook/route.ts` + `app/api/superadmin/update/route.ts`
- **Content:**
  - Upgrade headline: "You've upgraded to [Plan]" — what's new / unlocked
  - Downgrade headline: "Your plan has changed to [Plan]" — what changed, what's no longer available
  - CTA: "View your plan" → `/dashboard/settings/billing`
- **Note:** Template receives `previousPlan` and `newPlan` params and renders the appropriate variant. Both upgrade and downgrade fire this same template function.

### 5. `subscriptionCancelledEmail`
- **Trigger:** `customer.subscription.deleted` Stripe event
- **Recipient:** Operator
- **Wired in:** `app/api/stripe/webhook/route.ts`
- **Content:**
  - Headline: "Your plan has been cancelled"
  - What they lose (features no longer available)
  - CTA: "Resubscribe" → `/dashboard/settings/billing`

### 6. `paymentReceiptEmail`
- **Trigger:** `invoice.payment_succeeded` Stripe event (new — add to webhook handler)
- **Recipient:** Operator
- **Wired in:** `app/api/stripe/webhook/route.ts`
- **Content:**
  - Headline: "Payment received — éPure Drive"
  - Amount, plan name, billing date, last 4 digits of card
  - Note: "Stripe also sends an official receipt to your email"

### 7. `paymentFailedEmail`
- **Trigger:** `invoice.payment_failed` Stripe event (new — add to webhook handler)
- **Recipient:** Operator
- **Wired in:** `app/api/stripe/webhook/route.ts`
- **Content:**
  - Headline: "Payment failed — action required"
  - Amount, failure reason (from Stripe event)
  - CTA: "Update payment method" → Stripe billing portal or `/dashboard/settings/billing`

### 8. `teamInviteEmail`
- **Trigger:** Operator invites a team member
- **Recipient:** Invited person (new team member)
- **Wired in:** `POST /api/team/invite` and `inviteTeamMember` server action in `settings/roles/actions.ts`
- **Content:**
  - Headline: "You've been invited to [Company Name] on éPure Drive"
  - Invited by, role assigned, company name
  - CTA: "Accept Invitation" → Supabase invite link (passed as param)
- **Note:** Supabase `auth.admin.inviteUserByEmail` always sends its own default invite email. We cannot suppress it via the API. Our branded email fires in parallel immediately after the invite call — so the invitee receives two emails. The Supabase one handles the magic link delivery; ours provides the branded context. To avoid duplication long-term, the Supabase invite email template can be customized in the Supabase dashboard (Auth → Email Templates) to be a minimal placeholder, leaving the branding to our Resend email. That customization is out of scope here.

---

## Section 2 — Support Emails (`support.ts`)

### 9. `enterpriseInquiryAdminEmail`
- **Trigger:** Marketing contact form submit
- **Recipient:** Ayrton (admin email from `ADMIN_NOTIFY_EMAIL` env var)
- **Wired in:** New `POST /api/contact` route
- **Content:** Name, email, company, message, inquiry type (Enterprise / General Info)

### 10. `enterpriseInquiryConfirmEmail`
- **Trigger:** Same submit (parallel)
- **Recipient:** Person who submitted the form
- **Content:** "We received your message. We'll be in touch within 1–2 business days." Ayrton's contact info as fallback.

### 11. `dashboardSupportAdminEmail`
- **Trigger:** Support button in operator dashboard
- **Recipient:** Ayrton (admin email)
- **Wired in:** New `POST /api/support` route
- **Content:** Tenant name, plan, operator email, subject, message. Pre-filled context (tenant ID, plan) pulled server-side.

### 12. `dashboardSupportConfirmEmail`
- **Trigger:** Same submit (parallel)
- **Recipient:** Operator who submitted
- **Content:** "We got your support request. Typical reply within 24 hours." Reference the message subject.

**New UI components needed:**
- Marketing page: Contact/Enterprise form section (`components/marketing/ContactSection.tsx`)
- Dashboard: Support modal (`components/dashboard/SupportModal.tsx`) — triggered from sidebar or settings

---

## Section 3 — Rental Ops Emails (`rentals.ts` — new additions)

Existing templates (`newBookingEmail`, `bookingCancelledEmail`, `agreementRequestEmail`, `agreementSignedCustomerEmail`, `agreementSignedOperatorEmail`, `newInquiryEmail`) move here unchanged.

### 13. `bookingConfirmedCustomerEmail`
- **Trigger:** Operator changes reservation status → `confirmed`
- **Recipient:** End customer (`reservation.customer_email`)
- **Wired in:** `updateReservation` in `app/(dashboard)/dashboard/bookings/actions.ts`
- **Content:**
  - Headline: "Your booking is confirmed!"
  - Car name, pickup date/time, return date/time, location, ref #
  - Tenant contact info (phone, email) for questions
  - CTA: none (customer doesn't have a portal)

### 14. `bookingCancelledCustomerEmail`
- **Trigger:** Operator changes status → `cancelled`
- **Recipient:** End customer
- **Wired in:** `updateReservation` in `bookings/actions.ts`
- **Content:**
  - Headline: "Your booking has been cancelled"
  - Which car, which dates
  - Tenant contact info
  - Soft: "Please reach out if you have questions"

### 15. `bookingRejectedCustomerEmail`
- **Trigger:** Operator changes status → `rejected`
- **Recipient:** End customer
- **Wired in:** `updateReservation` in `bookings/actions.ts`
- **Content:**
  - Headline: "We couldn't accommodate your request"
  - Soft message, no hard reason
  - CTA: "Browse available vehicles" → tenant's public site (`https://[slug].epuredrive.com`)

### 16. `maintenanceDueEmail`
- **Trigger:** Daily cron job
- **Recipient:** Operator (all profiles on the tenant)
- **Wired in:** New `POST /api/cron/maintenance-alerts` route (protected by `CRON_SECRET`)
- **Logic:** Query `maintenance_records` or `cars` for vehicles where `next_service_date` is within 7 days or overdue. Send one email per tenant grouping all due vehicles — not one email per vehicle.
- **Content:**
  - Headline: "Maintenance due for [N] vehicle(s)"
  - Table of vehicles: name, service type, due date, status (due soon / overdue)
  - CTA: "View in Dashboard" → `/dashboard/maintenance`

---

## New API Routes

| Route | Purpose |
|---|---|
| `POST /api/contact` | Marketing contact/enterprise form |
| `POST /api/support` | Dashboard support request |
| `POST /api/cron/maintenance-alerts` | Daily maintenance due email (CRON_SECRET protected) |

---

## Stripe Webhook Updates

Add two new event types to `app/api/stripe/webhook/route.ts`:
- `invoice.payment_succeeded` → `paymentReceiptEmail`
- `invoice.payment_failed` → `paymentFailedEmail`

Update `customer.subscription.updated` handler to send `subscriptionChangedEmail` (previously no email fired on this event).

To look up the operator email from a Stripe invoice event: use `invoice.customer` to query `tenants.stripe_customer_id`, then get operator emails via `profiles` → `auth.admin.getUserById`.

## Admin-Triggered Plan Changes

When Ayrton manually moves a tenant to a different plan via `POST /api/superadmin/update`, send `subscriptionChangedEmail` or `subscriptionActivatedEmail` depending on whether it's a new plan or a change. The route receives `tenantId` and `plan` — look up operator emails via `profiles` and fire the appropriate email. Also send `subscriptionActivatedEmail` when moving from `free` or `suspended` to a paid plan.

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `RESEND_API_KEY` | Already set |
| `RESEND_FROM_EMAIL` | Already set (`notifications@epuredrive.com`) |
| `ADMIN_NOTIFY_EMAIL` | New — Ayrton's email for contact/support notifications |
| `CRON_SECRET` | New — shared secret to protect cron routes |

---

## Email Count Summary

| Domain | Count |
|---|---|
| Platform (operator-facing) | 8 |
| Support (inbound to Ayrton) | 4 |
| Rental ops (customer-facing, new) | 4 (+ 6 existing moved) |
| **Total new templates** | **17** (subscriptionChangedEmail counts as 1 covering upgrade + downgrade) |
| **Total templates in system** | **23** |
