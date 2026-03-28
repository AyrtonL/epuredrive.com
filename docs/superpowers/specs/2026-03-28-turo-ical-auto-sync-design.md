# Turo iCal Auto-Sync — Design Spec

**Date:** 2026-03-28
**Status:** Approved

## Overview

Automate the existing manual "Sync All" iCal sync so that Turo bookings appear in the dashboard every 30 minutes without any user action. A Netlify Scheduled Function replaces the need to click the sync button.

## Architecture

```
Netlify Scheduler (every 30 min)
  → netlify/functions/sync-ical-cron.js
      → Supabase: SELECT * FROM turo_feeds (all tenants)
      → For each feed:
          → GET iCal URL (direct fetch, no proxy needed server-side)
          → parseIcal() → array of reservation objects
          → Supabase: DELETE reservations WHERE car_id = feed.car_id
                                           AND source = 'ical'
                                           AND notes ILIKE '%[feed.source_name]%'
          → Supabase: INSERT new reservations
          → Supabase: UPDATE turo_feeds SET last_synced = now() WHERE id = feed.id
```

## New File

**`netlify/functions/sync-ical-cron.js`**

- Netlify scheduled function with `schedule: "*/30 * * * *"`
- Uses `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` env vars (already set in Netlify)
- No new npm dependencies — uses native `fetch` (Node 18+) and a self-contained iCal parser ported from `admin/js/dashboard.js:parseIcal()`
- Processes all feeds across all tenants in a single run

## Data Mapping

Each iCal VEVENT maps to a `reservations` row:

| Field | Value |
|---|---|
| `tenant_id` | from `turo_feeds.tenant_id` |
| `car_id` | from `turo_feeds.car_id` |
| `customer_name` | SUMMARY field (cleaned: strip "Turo Reservation", platform suffixes) |
| `pickup_date` | DTSTART (converted to YYYY-MM-DD) |
| `return_date` | DTEND minus 1 day (Turo iCal DTEND is exclusive) |
| `source` | `'ical'` |
| `notes` | `[SourceName] UID:<event-uid>` |
| `status` | `'confirmed'` |

## Deduplication Strategy

Delete-then-insert per feed on every sync. This is correct because Turo iCal always returns the full calendar (not incremental diffs). Each sync fully replaces that feed's events.

Manually-created reservations (`source IS NULL` or `source = 'manual'`) are never touched.

## Error Handling

- Errors are per-feed: one failing feed does not stop others from syncing
- Failed feeds do not update `last_synced` — stale timestamp in the dashboard signals a problem
- All errors are logged to Netlify function logs (visible in Netlify dashboard → Functions → sync-ical-cron)
- No active alerting in this version

## What Does NOT Change

- `turo_feeds` DB schema — no migration needed
- `reservations` DB schema — no migration needed
- Dashboard UI — "Sync All" button continues to work for immediate manual syncs
- `netlify/functions/fetch-ical.js` — still used by the browser-side manual sync; not used by the cron (server-side has no CORS restrictions)

## Out of Scope

- Per-tenant sync frequency settings
- Email/push alerts on sync failures
- Webhook-based sync (Turo does not offer webhooks)
