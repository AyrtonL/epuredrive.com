# Turo Email Auto-Sync — Design Spec

**Date:** 2026-03-28
**Status:** Approved

## Overview

Automatically sync Turo booking confirmations into the `reservations` table by polling Gmail via OAuth every 15 minutes. Each tenant connects their Gmail account (the one that receives Turo emails) once via OAuth. A Netlify Scheduled Function reads new emails from `noreply@mail.turo.com`, parses booking details, and upserts reservations.

This replaces/complements the iCal sync — Turo confirmed they do not offer an iCal feed URL.

## Architecture

```
Dashboard UI
  → "Connect Gmail" button
      → Google OAuth (scope: gmail.readonly)
          → Netlify Function: gmail-oauth-callback.js
              → Exchange code for access_token + refresh_token
              → INSERT INTO turo_email_syncs

Netlify Scheduler (every 15 min)
  → poll-turo-emails.js
      → SELECT * FROM turo_email_syncs WHERE active = true
      → For each tenant connection:
          → Gmail API: search emails from:noreply@mail.turo.com after:last_checked
          → Refresh access_token if expired (401 → use refresh_token → UPDATE turo_email_syncs)
          → For each new email:
              → parseTuroEmail() → reservation object
              → Check duplicate: SELECT FROM reservations WHERE notes LIKE 'Turo #<id>%'
              → INSERT or UPDATE reservation
          → UPDATE turo_email_syncs SET last_checked = now()
```

## New Database Table

```sql
CREATE TABLE turo_email_syncs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  gmail_address text NOT NULL,
  access_token  text NOT NULL,
  refresh_token text NOT NULL,
  last_checked  timestamptz DEFAULT now(),
  active        boolean DEFAULT true,
  created_at    timestamptz DEFAULT now()
);

-- One connection per tenant
CREATE UNIQUE INDEX turo_email_syncs_tenant_id_key ON turo_email_syncs(tenant_id);
```

RLS: tenants can only read/delete their own row. The cron uses service role (bypasses RLS).

## New Netlify Functions

### `gmail-oauth-callback.js`
- Triggered by Google OAuth redirect: `GET /.netlify/functions/gmail-oauth-callback?code=XXX&state=TENANT_ID`
- Exchanges `code` for `access_token` + `refresh_token` using Google Token endpoint
- Upserts into `turo_email_syncs` (one row per tenant)
- Redirects to `/admin/dashboard.html#turo` with `?gmail=connected` param
- Env vars: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- Redirect URI registered in Google Cloud Console: `https://epuredrive.com/.netlify/functions/gmail-oauth-callback`

### `poll-turo-emails.js`
- Netlify Scheduled Function — schedule already in `netlify.toml` as `*/15 * * * *`
- Loads all active rows from `turo_email_syncs` (service role)
- For each connection: calls Gmail API to search for new Turo emails
- Per-tenant error isolation: one failure doesn't stop others
- Env vars: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`

## Email Parsing

**Sender filter:** `from:noreply@mail.turo.com`

**Email types handled:**

| Type | Subject pattern | Action |
|---|---|---|
| New booking | contains "trip" + "booked" | INSERT reservation |
| Cancellation | contains "cancelled" or "canceled" | UPDATE status = 'cancelled' |
| Modification | contains "modified" or "updated" | UPDATE pickup_date, return_date |

**Field extraction from booking confirmation body:**

| DB Field | Regex | Example match |
|---|---|---|
| `customer_name` | `Cha-ching! (.+?)'s trip with your` | `Tia-soa` |
| `car` (for matching) | `trip with your (.+?) is booked` | `Porsche Cayenne` |
| `pickup_date` | `booked from (.+?) to ` | `Sunday, March 29, 2026, 8:00AM` |
| `return_date` | `to (.+?)\.` after first date | `Wednesday, April 1, 2026, 8:00PM` |
| `total_amount` | `You'll earn \$([0-9.]+)` | `536.40` |
| `notes` | constructed as `Turo #<message_id>` | used for deduplication |
| `source` | hardcoded | `'turo'` |
| `status` | hardcoded | `'confirmed'` |

**Vehicle matching:** Parse vehicle name from email (e.g. "Porsche Cayenne 2021"). Match against tenant's `cars` table by `make + model + year` (case-insensitive). If matched → assign `car_id`. If no match → insert with `car_id = null`, include vehicle name in `notes` for manual assignment.

**Deduplication:** Before insert, check `reservations` for existing row with `notes LIKE 'Turo #<gmail_message_id>%'`. If exists: UPDATE dates/status. If not: INSERT.

## Token Refresh

Gmail access tokens expire after 1 hour. On 401 response from Gmail API:
1. POST to `https://oauth2.googleapis.com/token` with `refresh_token` + client credentials
2. Receive new `access_token`
3. UPDATE `turo_email_syncs SET access_token = new_token`
4. Retry the Gmail API call

If refresh also fails (token revoked): set `turo_email_syncs.active = false`, log error.

## Dashboard UI Changes

In `admin/js/dashboard.js` — Calendar Sync tab (tab id: `turo`):

**Not connected state:**
```
[Connect Gmail] button → initiates OAuth flow
```

**Connected state:**
```
✓ Connected: user@gmail.com
Last synced: 3 min ago
[Disconnect] button → DELETE from turo_email_syncs + revoke token
```

**Broken connection state (`active = false`):**
```
⚠ Gmail disconnected — [Reconnect] button
```

## New Env Vars Required (Netlify)

| Var | Description |
|---|---|
| `GOOGLE_CLIENT_ID` | From Google Cloud Console OAuth 2.0 credentials |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console OAuth 2.0 credentials |

## Tenant Setup (one-time)

1. Dashboard → Calendar Sync tab → click **"Connect Gmail"**
2. Select the Gmail account that receives Turo booking emails
3. Grant `gmail.readonly` permission
4. Done — polling starts within 15 minutes

Tenants using Apple Mail or other providers can either:
- **Option A**: Change their Turo notification email directly to Gmail
- **Option B**: Set up a forwarding rule in their current email → Gmail

## Out of Scope

- Writing back to Turo (blocking dates) — Turo has no API for this
- Non-Gmail providers (Outlook, Apple Mail direct) — Gmail OAuth only
- Push notifications to tenant when new booking arrives
- Parsing Turo earnings CSV (existing feature, unchanged)
