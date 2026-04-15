# Tenant Onboarding SOP

**Status:** Active · **Owner:** éPure Ops · **Last updated:** 2026-04-15

Standard Operating Procedure for onboarding a new rental business (Tenant) onto the éPure Drive platform — from first signup to a fully live branded fleet page.

---

## Goals

1. Get a new tenant from signup to a **live, branded public fleet page** within **24 hours**.
2. Make sure the tenant can independently: add vehicles, accept bookings, send rental agreements, process payments.
3. Collect feedback and pain points from the first 14 days to improve the product.

---

## Prerequisites

Before you start onboarding, confirm the following are production-ready:

- [ ] Stripe live mode connected (`STRIPE_SECRET_KEY` set in Netlify env vars)
- [ ] Supabase production project healthy (no advisories)
- [ ] Resend domain verified (`epuredrive.com`)
- [ ] Netlify wildcard DNS live (`*.epuredrive.com`)
- [ ] `info@epuredrive.com` inbox monitored

---

## 10-Step Onboarding Flow

| # | Step | Actor | Trigger / SLA | Deliverable |
|---|---|---|---|---|
| 1 | **Sign up** | Tenant | Tenant creates account at [epuredrive.com](https://epuredrive.com) | Row in `tenants` table, slug assigned |
| 2 | **Welcome email (automated)** | System | Immediately after signup | Transactional email via Resend (`welcome.ts`) |
| 3 | **Kickoff call scheduled** | Ops | Within 2 business hours of signup | Calendly slot booked (30 min) |
| 4 | **Branding setup** | Tenant + Ops | On kickoff call | Logo, colors, tagline, WhatsApp #, pickup location, How It Works steps saved in Settings |
| 5 | **First vehicle added** | Tenant | Same call or within 24h | At least 1 car live in `cars` table with photos, rates, availability |
| 6 | **Custom subdomain verified** | Ops | Within 24h of signup | `<slug>.epuredrive.com` resolves and shows the tenant's branded fleet page |
| 7 | **Rental agreement template** | Tenant + Ops | Within 48h | Digital agreement template configured; tested with a fake booking |
| 8 | **Stripe Connect / payouts** | Tenant | Within 72h | Stripe account linked so tenants can collect payments |
| 9 | **Go-live announcement** | Ops | After step 8 | Internal Slack/Notion entry + optional tenant marketing assets |
| 10 | **14-day check-in** | Ops | Day 14 | Feedback call, usage audit, issue triage |

---

## Detailed Steps

### 1. Sign up

**Who:** Tenant self-serves.

**What happens:**
- Tenant lands on pricing page, picks a plan, clicks "Start free trial" or "Subscribe".
- Stripe Checkout handles billing (or free-tier signup bypasses checkout).
- On success, a row is inserted into `tenants` with a slug derived from the business name.
- User is redirected to `/dashboard/onboarding` (if applicable) or `/dashboard`.

**What to watch:**
- Confirm the webhook set the correct `plan` (Free / Pro / Max / Enterprise).
- Confirm the tenant's slug is unique and URL-safe.
- Log the signup in the **Dev Log** on Notion.

---

### 2. Welcome email (automated)

**Trigger:** `tenant.created` event (or direct call after signup action).

**Template:** `lib/email/templates/welcome.ts`

**Contents:**
- Greeting by first name.
- Link to dashboard.
- Link to kickoff call booking (Calendly).
- Link to knowledge base / docs.
- Reply-to: `info@epuredrive.com`.

**Check:**
- Email actually delivered (check Resend dashboard → Logs).
- Links in the email are correct for the new tenant subdomain.

---

### 3. Kickoff call scheduled

**Who:** Ops reaches out within 2 business hours of signup if the tenant hasn't already self-booked.

**Channel:** WhatsApp preferred, fallback to email.

**Message template (WhatsApp):**
> Hi {first_name}, this is Ayrton from éPure Drive. Welcome! I'd love to jump on a 30-minute call to get your fleet page live today. Book a slot here: {calendly_link}. If that doesn't work, just reply with a few times that suit you.

---

### 4. Branding setup

**On the call, walk the tenant through:**

1. **Logo upload** — PNG or SVG, transparent background.
2. **Primary color** — picked from their existing brand.
3. **Tagline** — 1 sentence.
4. **Description** — 2–3 sentences.
5. **Business hours**.
6. **WhatsApp number** — for customer contact button.
7. **Pickup location(s)** — with map query for Google Maps link.
8. **Experience pillars** — 3 cards highlighting what makes them unique.
9. **How It Works** — pick a template (Simple, Concierge, Corporate, Pickup & Go) and customize.

**Page to use:** [/dashboard/settings](https://epuredrive.com/dashboard/settings)

**Goal:** Everything saved before the call ends.

---

### 5. First vehicle added

**On the call or in the first 24h after:**

1. Add at least 1 vehicle via [/dashboard/fleet](https://epuredrive.com/dashboard/fleet).
2. Upload 4–8 photos.
3. Set daily rate, deposit, availability.
4. Mark as "Active" / public.

**Quality check:**
- Photos are well-lit and the car is clean.
- Rate is competitive vs. local market.
- Description is more than 1 line.

---

### 6. Custom subdomain verified

**Ops check:**

```bash
curl -I https://<slug>.epuredrive.com
```

- Should return 200 with the tenant's branded page.
- Logo and colors should match what was uploaded in step 4.
- The first vehicle from step 5 should be visible.

**If the subdomain isn't resolving:**
- Check Netlify wildcard DNS.
- Check `next.config.js` / middleware for tenant resolution.
- Check `tenants.slug` in Supabase.

---

### 7. Rental agreement template

**Walk the tenant through:**

1. [/dashboard/settings/agreement](https://epuredrive.com/dashboard/settings/agreement)
2. Fill in their business name, address, rental terms, insurance language, deposit policy, prohibited uses.
3. Preview the generated PDF.
4. Create a fake booking → click "Send agreement" → verify the customer-facing link works.

**Critical reminder:** éPure is a software provider. The **tenant is responsible** for the legal content of their own rental agreement. Our job is to make sure the template saves, renders, and delivers — not to draft legal text.

---

### 8. Stripe Connect / payouts

**If the tenant wants to collect card payments via the platform:**

1. [/dashboard/settings/payments](https://epuredrive.com/dashboard/settings/payments)
2. Click "Connect Stripe account".
3. Complete Stripe onboarding (tax info, bank account, ID verification).
4. Verify the account shows "Enabled" on return.
5. Test a $1 authorization against a real card, then void it.

**If Stripe Connect is not part of the tenant's plan:** skip this step; they can collect payments out of band and just use éPure for fleet + bookings + agreements.

---

### 9. Go-live announcement

**Internal:**
- Add to **Dev Log** on Notion (type: "Tenant onboarded").
- Update **Active Projects** on Notion with the new tenant name and plan.
- Add to the tenant list in Supabase (status: `live`).

**Optional — tenant-facing assets:**
- Share a "social media kit": OG image, 3 Instagram story templates, a tweet draft.
- Offer a 15-minute recording walkthrough of their fleet page to share with their customers.

---

### 10. 14-day check-in

**Email / WhatsApp + optional call:**

- Ask how the first 14 days went.
- Pull their usage data (bookings received, vehicles live, page visits if available).
- Ask: "What's the one thing we could fix that would save you the most time?"
- Log feedback in Notion → Feedback DB.
- If a bug or pain point surfaced, create a Linear/Notion issue immediately.

---

## Common Issues & How to Fix

| Issue | Root cause | Fix |
|---|---|---|
| Subdomain doesn't resolve | Slug change didn't sync Netlify | Re-save settings; check `syncNetlifyDomainAlias` logs |
| Welcome email not delivered | Resend suppression list or invalid address | Check Resend → Logs, remove from suppression list |
| Tenant's logo looks pixelated on fleet page | Logo uploaded as small raster | Ask for SVG or 2x PNG |
| Stripe Connect stuck in "pending" | Tenant didn't complete KYC | Email tenant with the exact Stripe dashboard link |
| How It Works section shows defaults | Tenant hasn't saved custom steps | Walk them through [/dashboard/settings](https://epuredrive.com/dashboard/settings) |

---

## Escalation

- **Payment / billing blockers:** `info@epuredrive.com` → Ayrton
- **Legal / contract questions:** outside counsel (not us)
- **Urgent production outage:** Netlify status + Supabase status + Resend status, in that order

---

## Revision log

- 2026-04-15 — Initial SOP created.
