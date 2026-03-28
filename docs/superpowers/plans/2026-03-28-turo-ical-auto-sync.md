# Turo iCal Auto-Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a Netlify Scheduled Function that automatically syncs all tenant iCal feeds (Turo, Airbnb, etc.) into the `reservations` table every 30 minutes, eliminating the need to click "Sync All" manually.

**Architecture:** A single new file `netlify/functions/sync-ical-cron.js` is scheduled via `netlify.toml`. On each run it reads all rows from `turo_feeds`, fetches each iCal URL directly (no CORS proxy needed server-side), parses the VEVENT blocks, deletes old ical reservations for that feed, and inserts fresh ones.

**Tech Stack:** Node.js 18+ (native fetch), Supabase REST API, Netlify Scheduled Functions (no npm packages required)

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Modify | `netlify.toml` | Add cron schedule config for the new function |
| Create | `netlify/functions/sync-ical-cron.js` | Scheduled function: fetch all feeds → parse iCal → upsert reservations |

---

## Task 1: Register the cron schedule in netlify.toml

**Files:**
- Modify: `netlify.toml`

- [ ] **Step 1: Add the schedule block at the end of netlify.toml**

Open `netlify.toml` and append these lines at the very end of the file:

```toml
[functions.sync-ical-cron]
  schedule = "*/30 * * * *"
```

This tells Netlify to invoke `netlify/functions/sync-ical-cron.js` every 30 minutes. No `@netlify/functions` npm package is needed — the schedule is purely config-driven.

- [ ] **Step 2: Verify the file looks correct**

Run:
```bash
cat netlify.toml
```
Expected: the last 2 lines are the `[functions.sync-ical-cron]` block.

- [ ] **Step 3: Commit**

```bash
git add netlify.toml
git commit -m "feat: register sync-ical-cron scheduled function (*/30)"
```

---

## Task 2: Create the scheduled sync function

**Files:**
- Create: `netlify/functions/sync-ical-cron.js`

This task creates the entire function. It has three logical sections:
1. Supabase REST helpers (mirrors the pattern used in `superadmin-stats.js`)
2. `parseIcal()` — a direct port of the same function in `admin/js/dashboard.js` with `tenant_id` added
3. `exports.handler` — the main sync loop

- [ ] **Step 1: Create the file with all three sections**

Create `netlify/functions/sync-ical-cron.js` with the following content:

```js
// Netlify Scheduled Function — sync-ical-cron
// Runs every 30 min (configured in netlify.toml).
// Reads all turo_feeds rows, fetches each iCal URL, and upserts into reservations.
// Env vars required:
//   SUPABASE_SERVICE_ROLE_KEY — service_role key from Supabase → Settings → API

const SUPABASE_URL = 'https://brwzjwbpguiignrxvjdc.supabase.co';

// ── Supabase REST helpers ─────────────────────────────────────────────────────

function sbHeaders(serviceKey) {
  return {
    'apikey':        serviceKey,
    'Authorization': `Bearer ${serviceKey}`,
    'Content-Type':  'application/json',
  };
}

async function sbGet(path, serviceKey) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: sbHeaders(serviceKey),
  });
  if (!res.ok) throw new Error(`Supabase GET ${path} → ${res.status}: ${await res.text()}`);
  return res.json();
}

async function sbDelete(path, serviceKey) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method:  'DELETE',
    headers: sbHeaders(serviceKey),
  });
  if (!res.ok) throw new Error(`Supabase DELETE ${path} → ${res.status}: ${await res.text()}`);
}

async function sbInsert(table, rows, serviceKey) {
  if (!rows.length) return;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method:  'POST',
    headers: { ...sbHeaders(serviceKey), 'Prefer': 'return=minimal' },
    body:    JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`Supabase INSERT ${table} → ${res.status}: ${await res.text()}`);
}

async function sbPatch(path, data, serviceKey) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method:  'PATCH',
    headers: { ...sbHeaders(serviceKey), 'Prefer': 'return=minimal' },
    body:    JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Supabase PATCH ${path} → ${res.status}: ${await res.text()}`);
}

// ── iCal parser ───────────────────────────────────────────────────────────────
// Ported from admin/js/dashboard.js:parseIcal()
// Added: tenantId parameter so reservations are correctly tenant-scoped.

function parseIcal(icsText, tenantId, carId, sourceName = 'Calendar') {
  const events = [];
  const today  = new Date().toISOString().slice(0, 10);

  // RFC 5545: unfold continuation lines (CRLF/LF + whitespace)
  const unfolded = icsText.replace(/\r?\n[ \t]/g, '');
  const vevents  = unfolded.split(/BEGIN:VEVENT/i).slice(1);

  // Map sourceName to DB source values
  const src = /turo/i.test(sourceName)   ? 'turo'
            : /airbnb/i.test(sourceName) ? 'ical'
            : 'ical';

  // Convert iCal date string (with or without time) → YYYY-MM-DD
  const toDate = (s) => {
    const raw = s.replace(/[TZ\-]/g, '').slice(0, 8);
    return `${raw.slice(0,4)}-${raw.slice(4,6)}-${raw.slice(6,8)}`;
  };

  // Subtract one day from a YYYY-MM-DD string
  const prevDay = (d) => {
    const dt = new Date(d + 'T12:00:00');
    dt.setDate(dt.getDate() - 1);
    return dt.toISOString().slice(0, 10);
  };

  vevents.forEach(block => {
    // Get property value, ignoring TYPE/TZID params (e.g. DTSTART;VALUE=DATE:...)
    const get = (key) => {
      const m = block.match(new RegExp(`^${key}(?:;[^:]*)?:(.+)`, 'im'));
      return m ? m[1].trim() : null;
    };

    const dtstart = get('DTSTART');
    const dtend   = get('DTEND');
    if (!dtstart) return;

    const start    = toDate(dtstart);
    const isAllDay = !dtstart.includes('T');
    let   end      = dtend ? toDate(dtend) : start;

    // iCal all-day DTEND is exclusive — Turo: DTEND=20260323 means returned on 3/22
    if (isAllDay && end > start) end = prevDay(end);

    if (end < today) return; // skip past events

    const rawDesc = (get('DESCRIPTION') || '')
      .replace(/\\n/g, '\n').replace(/\\N/g, '\n')
      .replace(/\\,/g, ',').replace(/\\;/g, ';');

    const fromDesc = (...keys) => {
      for (const k of keys) {
        const m = rawDesc.match(new RegExp(k + '\\s*:?\\s*([^\\n]+)', 'i'));
        if (m) return m[1].trim();
      }
      return null;
    };

    const phone = fromDesc('Pickup Phone', 'Dropoff Phone', 'Telephone', 'Phone', 'Tel');
    const email = fromDesc('Email');
    const resId = fromDesc('Reservation Number', 'Reservation #', 'Reservation ID', 'Trip ID', 'Confirmation');

    let guestName = fromDesc('Guest', 'Guests', 'Renter', 'Traveler', 'Visitor');
    if (!guestName) {
      const raw = (get('SUMMARY') || '').trim();
      guestName = raw
        .replace(/\s*[-–]\s*(Turo|Airbnb|VRBO|Booking\.com)\b.*/i, '')
        .replace(/\b(Turo|Airbnb|VRBO)\b\s*(Reservation|Booking|Trip|Guest)?\s*/gi, '')
        .replace(/^(Reserved|Reservation|Booking|Blocked|Busy)$/i, '')
        .trim();
    }
    if (!guestName) guestName = `${sourceName} Guest`;

    const notes = resId
      ? `${sourceName} #${resId}`
      : `Imported from [${sourceName}]`;

    events.push({
      tenant_id:      tenantId,
      car_id:         carId,
      customer_name:  guestName,
      customer_email: email || '',
      customer_phone: phone || '',
      pickup_date:    start,
      return_date:    end,
      status:         'confirmed',
      source:         src,
      notes:          notes,
    });
  });

  return events;
}

// ── Main handler ──────────────────────────────────────────────────────────────

exports.handler = async () => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    console.error('[sync-ical-cron] SUPABASE_SERVICE_ROLE_KEY not set');
    return { statusCode: 500, body: 'Missing SUPABASE_SERVICE_ROLE_KEY' };
  }

  // Load all feeds across all tenants (service role bypasses RLS)
  let feeds;
  try {
    feeds = await sbGet(
      'turo_feeds?select=id,tenant_id,car_id,ical_url,source_name',
      serviceKey
    );
  } catch (err) {
    console.error('[sync-ical-cron] Failed to load feeds:', err.message);
    return { statusCode: 500, body: err.message };
  }

  if (!feeds.length) {
    console.log('[sync-ical-cron] No feeds configured — nothing to sync');
    return { statusCode: 200, body: JSON.stringify({ totalImported: 0, errors: 0 }) };
  }

  let totalImported = 0;
  let errors = 0;

  for (const feed of feeds) {
    try {
      // 1. Fetch the iCal file directly (no CORS proxy needed server-side)
      const icalRes = await fetch(feed.ical_url, {
        headers: { 'User-Agent': 'epuredrive-ical-sync/1.0' },
        redirect: 'follow',
      });
      if (!icalRes.ok) throw new Error(`iCal fetch returned ${icalRes.status}`);
      const icsText = await icalRes.text();

      const sourceName = feed.source_name || 'Calendar';

      // 2. Parse events from iCal
      const events = parseIcal(icsText, feed.tenant_id, feed.car_id, sourceName);

      // 3. Delete old ical reservations for this feed.
      //    Turo events use source='turo'; others use source='ical'.
      //    We identify turo feeds by their source value to avoid deleting manual entries.
      const isTuro = /turo/i.test(sourceName);
      if (isTuro) {
        // Delete all turo-sourced reservations for this car + tenant
        await sbDelete(
          `reservations?car_id=eq.${feed.car_id}&tenant_id=eq.${feed.tenant_id}&source=eq.turo`,
          serviceKey
        );
      } else {
        // Delete ical reservations whose notes reference this source by name (bracket pattern)
        const encodedSource = encodeURIComponent(`*[${sourceName}]*`);
        await sbDelete(
          `reservations?car_id=eq.${feed.car_id}&tenant_id=eq.${feed.tenant_id}&source=eq.ical&notes=ilike.${encodedSource}`,
          serviceKey
        );
      }

      // 4. Insert fresh events
      if (events.length) {
        await sbInsert('reservations', events, serviceKey);
        totalImported += events.length;
      }

      // 5. Update last_synced timestamp
      await sbPatch(
        `turo_feeds?id=eq.${feed.id}`,
        { last_synced: new Date().toISOString() },
        serviceKey
      );

      console.log(`[sync-ical-cron] Feed ${feed.id} (${sourceName}): imported ${events.length} events`);
    } catch (err) {
      // Per-feed error — log and continue with remaining feeds
      console.error(`[sync-ical-cron] Feed ${feed.id} failed: ${err.message}`);
      errors++;
    }
  }

  console.log(`[sync-ical-cron] Finished: ${totalImported} imported, ${errors} error(s)`);
  return {
    statusCode: 200,
    body: JSON.stringify({ totalImported, errors }),
  };
};
```

- [ ] **Step 2: Verify the file was created**

Run:
```bash
ls -la netlify/functions/sync-ical-cron.js
```
Expected: file exists with a non-zero size.

- [ ] **Step 3: Smoke-test the function locally with Netlify CLI**

Run:
```bash
netlify functions:invoke sync-ical-cron --no-identity
```
Expected output (if no feeds are configured yet): `{"totalImported":0,"errors":0}`

If feeds exist, expected: `{"totalImported": N, "errors": 0}` and Netlify function logs show per-feed import counts.

If `SUPABASE_SERVICE_ROLE_KEY` is not in your local `.env`, run with:
```bash
SUPABASE_SERVICE_ROLE_KEY=<your-key> netlify functions:invoke sync-ical-cron --no-identity
```

- [ ] **Step 4: Verify in Supabase that reservations were synced**

Open Supabase dashboard → Table Editor → `reservations`. Filter by `source = turo`. Confirm rows exist with correct `tenant_id`, `car_id`, `pickup_date`, `return_date`.

Alternatively run via Supabase MCP:
```sql
SELECT id, tenant_id, car_id, customer_name, pickup_date, return_date, source, notes
FROM reservations
WHERE source IN ('turo', 'ical')
ORDER BY pickup_date
LIMIT 20;
```
Expected: rows matching your Turo bookings with future pickup dates.

Also confirm `last_synced` updated in `turo_feeds`:
```sql
SELECT id, source_name, last_synced FROM turo_feeds;
```
Expected: `last_synced` is within the last few minutes.

- [ ] **Step 5: Commit**

```bash
git add netlify/functions/sync-ical-cron.js
git commit -m "feat: add sync-ical-cron scheduled function — auto-syncs Turo/iCal feeds every 30 min"
```

---

## Task 3: Deploy and verify on Netlify

**Files:** (none — just deployment verification)

- [ ] **Step 1: Push to main to trigger deploy**

```bash
git push origin main
```

- [ ] **Step 2: Confirm the scheduled function is registered in Netlify**

Go to Netlify dashboard → your site → **Functions** tab. Look for `sync-ical-cron` in the list. It should show a clock icon indicating it's a scheduled function.

If it does NOT appear: double-check that `netlify.toml` has the `[functions.sync-ical-cron]` block and that the deploy succeeded.

- [ ] **Step 3: Trigger a manual test run from Netlify**

In Netlify dashboard → Functions → `sync-ical-cron` → click **Trigger** (or wait up to 30 min for the first automatic run). Check the function logs for output like:
```
[sync-ical-cron] Feed abc123 (Turo): imported 3 events
[sync-ical-cron] Finished: 3 imported, 0 error(s)
```

- [ ] **Step 4: Final DB verification**

Run the same SQL from Task 2 Step 4 to confirm bookings appear in production:
```sql
SELECT id, tenant_id, car_id, customer_name, pickup_date, return_date, source
FROM reservations
WHERE source IN ('turo', 'ical')
ORDER BY pickup_date
LIMIT 20;
```

---

## Self-Review

**Spec coverage:**
- ✅ Netlify Scheduled Function every 30 min → Task 1 (netlify.toml) + Task 2
- ✅ Reads all `turo_feeds` across all tenants → `sbGet('turo_feeds?select=...')` in handler
- ✅ Fetches each iCal URL → `fetch(feed.ical_url, ...)` in sync loop
- ✅ parseIcal ported from dashboard.js with tenant_id added → Task 2 Step 1
- ✅ Delete-then-insert deduplication → separate delete paths for turo vs ical sources
- ✅ Updates `last_synced` → `sbPatch('turo_feeds?id=eq.${feed.id}', ...)`
- ✅ Per-feed error isolation → try/catch per feed, errors counter
- ✅ No schema changes → function only reads/writes existing tables
- ✅ Manual "Sync All" button unaffected → no changes to dashboard.js

**Placeholder scan:** No TBDs, todos, or vague steps. All code blocks are complete.

**Type consistency:** `parseIcal()` returns objects with `tenant_id` field added vs the browser version — used correctly in `sbInsert('reservations', events, ...)`.
