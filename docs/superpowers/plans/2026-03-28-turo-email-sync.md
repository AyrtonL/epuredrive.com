# Turo Gmail Email Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically sync Turo booking confirmation emails from Gmail into the `reservations` table every 15 minutes using Gmail OAuth, with a self-service Connect/Disconnect UI in the Calendar Sync dashboard tab.

**Architecture:** Each tenant connects their Gmail account once via Google OAuth. A Netlify Scheduled Function (`poll-turo-emails.js`) runs every 15 min, searches each connected Gmail for emails from `noreply@mail.turo.com`, parses booking details using regex, and upserts into `reservations`. Two helper functions handle the OAuth start redirect and callback token exchange.

**Tech Stack:** Node.js 18+ native fetch, Gmail REST API v1, Google OAuth 2.0, Supabase REST API, Netlify Scheduled Functions (no npm packages)

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Supabase MCP | migration | Create `turo_email_syncs` table + RLS |
| Modify | `netlify.toml` | Add schedule + CSP headers for Google APIs |
| Create | `netlify/functions/gmail-oauth-start.js` | Redirect to Google OAuth consent screen |
| Create | `netlify/functions/gmail-oauth-callback.js` | Exchange code → tokens, upsert into `turo_email_syncs` |
| Create | `netlify/functions/poll-turo-emails.js` | Scheduled: search Gmail, parse emails, upsert reservations |
| Modify | `admin/dashboard.html` | Add Gmail Sync section to Turo tab |
| Modify | `admin/js/dashboard.js` | Add `loadGmailSync`, `renderGmailSync`, `connectGmail`, `disconnectGmail` |

---

## Task 1: Database migration — turo_email_syncs table

**Files:**
- Supabase MCP migration

- [ ] **Step 1: Run the migration via Supabase MCP**

Use `mcp__claude_ai_Supabase__execute_sql` with the project ref for `brwzjwbpguiignrxvjdc`:

```sql
-- Create table
CREATE TABLE IF NOT EXISTS turo_email_syncs (
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
CREATE UNIQUE INDEX IF NOT EXISTS turo_email_syncs_tenant_id_key
  ON turo_email_syncs(tenant_id);

-- RLS: enable and restrict to own tenant
ALTER TABLE turo_email_syncs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant reads own gmail sync"
  ON turo_email_syncs FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant deletes own gmail sync"
  ON turo_email_syncs FOR DELETE
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
```

- [ ] **Step 2: Verify the table was created**

Run via Supabase MCP:
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'turo_email_syncs'
ORDER BY ordinal_position;
```
Expected: 8 rows — id, tenant_id, gmail_address, access_token, refresh_token, last_checked, active, created_at.

- [ ] **Step 3: Commit a note about the migration**

```bash
cd "/Users/ayrtonpaullohigorry/IA Projects/Aplicacion Rental"
git commit --allow-empty -m "feat: create turo_email_syncs table (migration applied via Supabase MCP)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 2: netlify.toml — add schedule + CSP update

**Files:**
- Modify: `netlify.toml`

The CSP `connect-src` must include Google OAuth and Gmail API endpoints, or the dashboard's fetch calls to `/.netlify/functions/gmail-oauth-start` would be blocked. The Netlify functions themselves are same-origin so they're fine, but the browser fetch to check Gmail sync status needs `https://accounts.google.com` in frame-src is not needed since we redirect.

- [ ] **Step 1: Add the schedule block for poll-turo-emails**

Open `netlify.toml` and append at the end (after the existing `[functions.sync-ical-cron]` block):

```toml
[functions.poll-turo-emails]
  schedule = "*/15 * * * *"
```

- [ ] **Step 2: Add Google OAuth to CSP connect-src**

In the long `Content-Security-Policy` header value, find `connect-src` and add `https://oauth2.googleapis.com https://www.googleapis.com` to it.

The current connect-src ends with `https://assets.apollo.io`. Change it to:
```
connect-src 'self' https://formspree.io https://brwzjwbpguiignrxvjdc.supabase.co https://api.allorigins.win https://api.stripe.com https://vpic.nhtsa.dot.gov https://assets.apollo.io https://oauth2.googleapis.com https://www.googleapis.com;
```

- [ ] **Step 3: Verify**

Run:
```bash
grep "poll-turo-emails" netlify.toml
grep "googleapis.com" netlify.toml
```
Expected: both grep commands return one match each.

- [ ] **Step 4: Commit**

```bash
git add netlify.toml
git commit -m "feat: register poll-turo-emails schedule + add Google APIs to CSP

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 3: gmail-oauth-start.js — OAuth redirect function

**Files:**
- Create: `netlify/functions/gmail-oauth-start.js`

This function receives `?tenant_id=XXX` from the dashboard and redirects the browser to Google's OAuth consent screen. The `client_id` stays server-side.

- [ ] **Step 1: Create the file**

```js
// Netlify Function — gmail-oauth-start
// Redirects the browser to Google OAuth consent screen.
// Called by the dashboard "Connect Gmail" button.
// Env vars required:
//   GOOGLE_CLIENT_ID — from Google Cloud Console → OAuth 2.0 credentials

const REDIRECT_URI = 'https://epuredrive.com/.netlify/functions/gmail-oauth-callback';
const SCOPE        = 'https://www.googleapis.com/auth/gmail.readonly';

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const tenantId = event.queryStringParameters?.tenant_id;
  if (!tenantId) {
    return { statusCode: 400, body: 'tenant_id is required' };
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return { statusCode: 500, body: 'Server misconfigured: missing GOOGLE_CLIENT_ID' };
  }

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id',     clientId);
  url.searchParams.set('redirect_uri',  REDIRECT_URI);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope',         SCOPE);
  url.searchParams.set('access_type',   'offline');
  url.searchParams.set('prompt',        'consent'); // force refresh_token on every connect
  url.searchParams.set('state',         tenantId);

  return {
    statusCode: 302,
    headers: { Location: url.toString() },
    body: '',
  };
};
```

- [ ] **Step 2: Verify the file exists**

```bash
ls -la "/Users/ayrtonpaullohigorry/IA Projects/Aplicacion Rental/netlify/functions/gmail-oauth-start.js"
```
Expected: file exists.

- [ ] **Step 3: Commit**

```bash
cd "/Users/ayrtonpaullohigorry/IA Projects/Aplicacion Rental"
git add netlify/functions/gmail-oauth-start.js
git commit -m "feat: add gmail-oauth-start — redirects to Google OAuth consent

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 4: gmail-oauth-callback.js — token exchange function

**Files:**
- Create: `netlify/functions/gmail-oauth-callback.js`

Receives the OAuth redirect from Google, exchanges the `code` for tokens, fetches the Gmail address, and upserts into `turo_email_syncs`.

- [ ] **Step 1: Create the file**

```js
// Netlify Function — gmail-oauth-callback
// Receives Google OAuth redirect, exchanges code for tokens, saves to turo_email_syncs.
// Env vars required:
//   GOOGLE_CLIENT_ID
//   GOOGLE_CLIENT_SECRET
//   SUPABASE_SERVICE_ROLE_KEY

const SUPABASE_URL  = 'https://brwzjwbpguiignrxvjdc.supabase.co';
const TOKEN_URL     = 'https://oauth2.googleapis.com/token';
const REDIRECT_URI  = 'https://epuredrive.com/.netlify/functions/gmail-oauth-callback';
const DASHBOARD_URL = '/admin/dashboard.html?gmail=connected#turo';
const ERROR_URL     = '/admin/dashboard.html?gmail=error#turo';

function sbHeaders(serviceKey) {
  return {
    'apikey':        serviceKey,
    'Authorization': `Bearer ${serviceKey}`,
    'Content-Type':  'application/json',
  };
}

exports.handler = async (event) => {
  const { code, state: tenantId, error } = event.queryStringParameters || {};

  if (error || !code || !tenantId) {
    console.error('[gmail-oauth-callback] Missing params or Google error:', error);
    return { statusCode: 302, headers: { Location: ERROR_URL }, body: '' };
  }

  const clientId     = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const serviceKey   = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!clientId || !clientSecret || !serviceKey) {
    console.error('[gmail-oauth-callback] Missing env vars');
    return { statusCode: 302, headers: { Location: ERROR_URL }, body: '' };
  }

  // 1. Exchange code for access_token + refresh_token
  const tokenRes = await fetch(TOKEN_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      code,
      client_id:     clientId,
      client_secret: clientSecret,
      redirect_uri:  REDIRECT_URI,
      grant_type:    'authorization_code',
    }).toString(),
  });

  const tokens = await tokenRes.json();
  if (!tokenRes.ok || !tokens.access_token || !tokens.refresh_token) {
    console.error('[gmail-oauth-callback] Token exchange failed:', tokens);
    return { statusCode: 302, headers: { Location: ERROR_URL }, body: '' };
  }

  // 2. Fetch Gmail address to display in UI
  const profileRes = await fetch('https://www.googleapis.com/gmail/v1/users/me/profile', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const profile     = await profileRes.json();
  const gmailAddress = profile.emailAddress || 'unknown@gmail.com';

  // 3. Upsert into turo_email_syncs (one row per tenant, update if exists)
  const upsertRes = await fetch(
    `${SUPABASE_URL}/rest/v1/turo_email_syncs?on_conflict=tenant_id`,
    {
      method:  'POST',
      headers: { ...sbHeaders(serviceKey), 'Prefer': 'resolution=merge-duplicates' },
      body:    JSON.stringify({
        tenant_id:     tenantId,
        gmail_address: gmailAddress,
        access_token:  tokens.access_token,
        refresh_token: tokens.refresh_token,
        active:        true,
        last_checked:  new Date().toISOString(),
      }),
    }
  );

  if (!upsertRes.ok) {
    console.error('[gmail-oauth-callback] Supabase upsert failed:', await upsertRes.text());
    return { statusCode: 302, headers: { Location: ERROR_URL }, body: '' };
  }

  console.log(`[gmail-oauth-callback] Connected Gmail ${gmailAddress} for tenant ${tenantId}`);
  return { statusCode: 302, headers: { Location: DASHBOARD_URL }, body: '' };
};
```

- [ ] **Step 2: Verify the file exists**

```bash
ls -la "/Users/ayrtonpaullohigorry/IA Projects/Aplicacion Rental/netlify/functions/gmail-oauth-callback.js"
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/ayrtonpaullohigorry/IA Projects/Aplicacion Rental"
git add netlify/functions/gmail-oauth-callback.js
git commit -m "feat: add gmail-oauth-callback — token exchange + upsert turo_email_syncs

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 5: poll-turo-emails.js — scheduled Gmail poller

**Files:**
- Create: `netlify/functions/poll-turo-emails.js`

This is the main sync engine. Runs every 15 min, reads all active Gmail connections, searches for new Turo emails since `last_checked`, parses booking details, and upserts into `reservations`.

- [ ] **Step 1: Create the file**

```js
// Netlify Scheduled Function — poll-turo-emails
// Runs every 15 min (configured in netlify.toml).
// For each connected Gmail account, searches for new Turo emails and upserts reservations.
// Env vars required:
//   GOOGLE_CLIENT_ID
//   GOOGLE_CLIENT_SECRET
//   SUPABASE_SERVICE_ROLE_KEY

const SUPABASE_URL    = 'https://brwzjwbpguiignrxvjdc.supabase.co';
const GMAIL_BASE      = 'https://gmail.googleapis.com/gmail/v1/users/me';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

// ── Supabase REST helpers ─────────────────────────────────────────────────────

function sbHeaders(serviceKey) {
  return {
    'apikey':        serviceKey,
    'Authorization': `Bearer ${serviceKey}`,
    'Content-Type':  'application/json',
  };
}

async function sbGet(path, serviceKey) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: sbHeaders(serviceKey) });
  if (!res.ok) throw new Error(`Supabase GET ${path} → ${res.status}: ${await res.text()}`);
  return res.json();
}

async function sbPatch(path, data, serviceKey) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method:  'PATCH',
    headers: { ...sbHeaders(serviceKey), 'Prefer': 'return=minimal' },
    body:    JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Supabase PATCH ${path} → ${res.status}: ${await res.text()}`);
}

async function sbInsert(table, row, serviceKey) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method:  'POST',
    headers: { ...sbHeaders(serviceKey), 'Prefer': 'return=minimal' },
    body:    JSON.stringify(row),
  });
  if (!res.ok) throw new Error(`Supabase INSERT ${table} → ${res.status}: ${await res.text()}`);
}

// ── Gmail API helpers ─────────────────────────────────────────────────────────

// Refresh an expired access token and update DB
async function refreshAccessToken(sync, serviceKey) {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      refresh_token: sync.refresh_token,
      client_id:     process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      grant_type:    'refresh_token',
    }).toString(),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(`Token refresh failed: ${JSON.stringify(data)}`);
  }
  sync.access_token = data.access_token;
  await sbPatch(`turo_email_syncs?id=eq.${sync.id}`, { access_token: data.access_token }, serviceKey);
  return data.access_token;
}

// Gmail API call with automatic token refresh on 401
async function gmailFetch(path, sync, serviceKey, retried = false) {
  const res = await fetch(`${GMAIL_BASE}${path}`, {
    headers: { Authorization: `Bearer ${sync.access_token}` },
  });
  if (res.status === 401 && !retried) {
    await refreshAccessToken(sync, serviceKey);
    return gmailFetch(path, sync, serviceKey, true);
  }
  if (!res.ok) throw new Error(`Gmail API ${path} → ${res.status}: ${await res.text()}`);
  return res.json();
}

// ── Email parsing helpers ─────────────────────────────────────────────────────

// Extract text/plain body from Gmail message payload (handles multipart)
function getMessageBody(payload) {
  if (!payload) return '';
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64url').toString('utf-8');
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      const body = getMessageBody(part);
      if (body) return body;
    }
  }
  // Fallback: strip HTML tags if only HTML part available
  if (payload.mimeType === 'text/html' && payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64url').toString('utf-8')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ');
  }
  return '';
}

// Parse "Sunday, March 29, 2026, 8:00AM" → "2026-03-29"
function parseTuroDate(str) {
  const months = {
    January:'01', February:'02', March:'03',     April:'04',
    May:'05',     June:'06',     July:'07',       August:'08',
    September:'09', October:'10', November:'11',  December:'12',
  };
  const m = str.match(/(\w+)\s+(\d{1,2}),\s+(\d{4})/);
  if (!m) return null;
  return `${m[3]}-${months[m[1]] || '01'}-${String(m[2]).padStart(2, '0')}`;
}

// Parse a Turo email body + subject → reservation object or null
function parseTuroEmail(body, subject, messageId) {
  const fullText = subject + ' ' + body;

  const isCancelled = /cancel/i.test(subject);
  const isModified  = /modif|updated.*trip|trip.*updated/i.test(subject);
  const isConfirmed = /cha.?ching|trip.*booked|booked.*trip/i.test(fullText);

  if (!isConfirmed && !isCancelled && !isModified) return null;

  if (isCancelled) {
    return { type: 'cancel', messageId };
  }

  // Extract guest name
  const guestMatch = body.match(/Cha-?ching!\s*(.+?)'s trip with your/i)
                  || body.match(/(.+?)'s trip with your/i);
  if (!guestMatch) return null;

  // Extract vehicle name
  const vehicleMatch = body.match(/trip with your (.+?) is (?:booked|confirmed|modified)/i);

  // Extract dates: "Sunday, March 29, 2026, 8:00AM to Wednesday, April 1, 2026, 8:00PM"
  const datesMatch = body.match(
    /booked from ((?:\w+ ){1,2}\w+ \d{1,2},\s*\d{4}[^t]*?) to ((?:\w+ ){1,2}\w+ \d{1,2},\s*\d{4}[^.]*?)\./i
  );
  if (!datesMatch) return null;

  const pickupDate = parseTuroDate(datesMatch[1]);
  const returnDate = parseTuroDate(datesMatch[2]);
  if (!pickupDate || !returnDate) return null;

  // Extract earnings
  const amountMatch = body.match(/You[''\u2019]ll earn \$([0-9,]+(?:\.\d{2})?)/i);

  return {
    type:          isModified ? 'modify' : 'confirm',
    messageId,
    customer_name: guestMatch[1].trim(),
    vehicle_name:  vehicleMatch?.[1]?.trim() || '',
    pickup_date:   pickupDate,
    return_date:   returnDate,
    total_amount:  amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : null,
    notes:         `Turo #${messageId}`,
    source:        'turo',
    status:        'confirmed',
  };
}

// Find car_id in tenant's fleet by vehicle name from email (e.g. "Porsche Cayenne 2021")
async function findCarId(tenantId, vehicleName, serviceKey) {
  if (!vehicleName) return null;
  const yearMatch      = vehicleName.match(/\b(\d{4})\b/);
  const year           = yearMatch?.[1];
  const nameWithoutYear = vehicleName.replace(/\b\d{4}\b/, '').trim().toLowerCase();

  const cars = await sbGet(
    `cars?tenant_id=eq.${tenantId}&select=id,make,model,model_full,year`,
    serviceKey
  );

  // Exact match (make + model/model_full + year)
  for (const car of cars) {
    const carName = `${car.make} ${car.model_full || car.model}`.toLowerCase();
    if (carName.includes(nameWithoutYear) && (!year || String(car.year) === year)) {
      return car.id;
    }
  }

  // Partial match (all words of vehicleName appear in car name)
  const parts = nameWithoutYear.split(/\s+/).filter(Boolean);
  for (const car of cars) {
    const carName = `${car.make} ${car.model_full || car.model}`.toLowerCase();
    if (parts.every(p => carName.includes(p))) return car.id;
  }

  return null;
}

// ── Main handler ──────────────────────────────────────────────────────────────

exports.handler = async () => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey || !process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.error('[poll-turo-emails] Missing required env vars');
    return { statusCode: 500, body: 'Missing env vars' };
  }

  // Load all active Gmail connections across all tenants
  let syncs;
  try {
    syncs = await sbGet('turo_email_syncs?active=eq.true&select=*', serviceKey);
  } catch (err) {
    console.error('[poll-turo-emails] Failed to load syncs:', err.message);
    return { statusCode: 500, body: err.message };
  }

  if (!syncs.length) {
    console.log('[poll-turo-emails] No active Gmail connections');
    return { statusCode: 200, body: JSON.stringify({ synced: 0, errors: 0 }) };
  }

  let totalSynced = 0;
  let errors      = 0;

  for (const sync of syncs) {
    try {
      // Build Gmail search query: Turo emails after last_checked
      const afterTimestamp = Math.floor(new Date(sync.last_checked).getTime() / 1000);
      const query = `from:noreply@mail.turo.com after:${afterTimestamp}`;

      // Search for matching messages
      const searchResult = await gmailFetch(
        `/messages?q=${encodeURIComponent(query)}&maxResults=50`,
        sync, serviceKey
      );

      const messages = searchResult.messages || [];
      if (!messages.length) {
        await sbPatch(`turo_email_syncs?id=eq.${sync.id}`, { last_checked: new Date().toISOString() }, serviceKey);
        continue;
      }

      for (const msg of messages) {
        try {
          // Fetch full message body
          const full    = await gmailFetch(`/messages/${msg.id}?format=full`, sync, serviceKey);
          const subject = full.payload?.headers?.find(h => h.name.toLowerCase() === 'subject')?.value || '';
          const body    = getMessageBody(full.payload);

          const parsed = parseTuroEmail(body, subject, msg.id);
          if (!parsed) continue;

          if (parsed.type === 'cancel') {
            // Cancel: find reservation by message ID in notes and update status
            const existing = await sbGet(
              `reservations?tenant_id=eq.${sync.tenant_id}&notes=like.*${msg.id}*&select=id`,
              serviceKey
            );
            for (const r of existing) {
              await sbPatch(`reservations?id=eq.${r.id}`, { status: 'cancelled' }, serviceKey);
            }
            totalSynced++;
            continue;
          }

          // Check for duplicate (deduplication by Gmail message ID in notes)
          const existing = await sbGet(
            `reservations?tenant_id=eq.${sync.tenant_id}&notes=eq.Turo %23${msg.id}&select=id`,
            serviceKey
          );

          // Find matching car in tenant's fleet
          const carId = await findCarId(sync.tenant_id, parsed.vehicle_name, serviceKey);

          const notesWithVehicle = carId
            ? parsed.notes
            : `${parsed.notes} [vehicle: ${parsed.vehicle_name || 'unknown'}]`;

          const reservationData = {
            tenant_id:      sync.tenant_id,
            car_id:         carId,
            customer_name:  parsed.customer_name,
            pickup_date:    parsed.pickup_date,
            return_date:    parsed.return_date,
            total_amount:   parsed.total_amount,
            status:         parsed.status,
            source:         parsed.source,
            notes:          notesWithVehicle,
          };

          if (existing.length > 0) {
            // Update existing reservation (modification email or re-sync)
            await sbPatch(
              `reservations?id=eq.${existing[0].id}`,
              { pickup_date: parsed.pickup_date, return_date: parsed.return_date,
                total_amount: parsed.total_amount, status: parsed.status },
              serviceKey
            );
          } else {
            await sbInsert('reservations', reservationData, serviceKey);
          }

          totalSynced++;
        } catch (msgErr) {
          console.error(`[poll-turo-emails] Message ${msg.id} failed:`, msgErr.message);
        }
      }

      // Update last_checked after processing all messages for this sync
      await sbPatch(
        `turo_email_syncs?id=eq.${sync.id}`,
        { last_checked: new Date().toISOString() },
        serviceKey
      );

      console.log(`[poll-turo-emails] Tenant ${sync.tenant_id} (${sync.gmail_address}): ${messages.length} emails, ${totalSynced} synced`);
    } catch (err) {
      console.error(`[poll-turo-emails] Sync ${sync.id} failed: ${err.message}`);
      // Mark inactive if token is revoked (refresh failed)
      if (/token refresh failed/i.test(err.message)) {
        await sbPatch(`turo_email_syncs?id=eq.${sync.id}`, { active: false }, serviceKey).catch(() => {});
      }
      errors++;
    }
  }

  console.log(`[poll-turo-emails] Done: ${totalSynced} synced, ${errors} error(s)`);
  return { statusCode: 200, body: JSON.stringify({ totalSynced, errors }) };
};
```

- [ ] **Step 2: Verify the file exists**

```bash
ls -la "/Users/ayrtonpaullohigorry/IA Projects/Aplicacion Rental/netlify/functions/poll-turo-emails.js"
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/ayrtonpaullohigorry/IA Projects/Aplicacion Rental"
git add netlify/functions/poll-turo-emails.js
git commit -m "feat: add poll-turo-emails scheduled function — Gmail sync every 15 min

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 6: Dashboard UI — Connect Gmail section

**Files:**
- Modify: `admin/dashboard.html` (around line 1127 — `tab-turo` div)
- Modify: `admin/js/dashboard.js`

### HTML changes

- [ ] **Step 1: Add the Gmail Sync section to the Turo tab in dashboard.html**

In `admin/dashboard.html`, find the line:
```html
      <div class="tab-content" id="tab-turo">
```

Immediately after that opening tag (before the `<!-- Add new calendar feed -->` comment), insert:

```html
        <!-- Gmail Sync -->
        <div class="table-section" style="padding:1.5rem;margin-bottom:1rem;">
          <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.75rem;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,12 2,6"/></svg>
            <h3 style="font-size:0.95rem;font-weight:600;">Auto-Sync from Gmail</h3>
          </div>
          <p style="font-size:0.78rem;color:var(--muted);line-height:1.5;margin-bottom:1rem;">
            Connect the Gmail account that receives your Turo booking notifications. Bookings will sync automatically every 15 minutes.
          </p>
          <div id="gmail-sync-status"><!-- rendered by JS --></div>
        </div>
```

- [ ] **Step 2: Verify the HTML was inserted correctly**

Run:
```bash
grep -n "gmail-sync-status" "/Users/ayrtonpaullohigorry/IA Projects/Aplicacion Rental/admin/dashboard.html"
```
Expected: one match inside `tab-turo`.

### JS changes

- [ ] **Step 3: Add gmailSync state variable to dashboard.js**

In `admin/js/dashboard.js`, find the line:
```js
let turoFeeds       = {};   // { carId: { url, lastSynced } }
```

Add after it:
```js
let gmailSync       = null;  // { id, gmail_address, last_checked, active } or null
```

- [ ] **Step 4: Add Gmail sync functions to dashboard.js**

In `admin/js/dashboard.js`, find the `renderCalendarFeeds` function (around line 1058). Add the following four functions immediately before it:

```js
// ====================================================
//  GMAIL SYNC
// ====================================================
async function loadGmailSync() {
  const { data } = await withTenant(sb.from('turo_email_syncs').select('id,gmail_address,last_checked,active').limit(1).maybeSingle());
  gmailSync = data || null;
}

function renderGmailSync() {
  const el = document.getElementById('gmail-sync-status');
  if (!el) return;

  if (!gmailSync) {
    el.innerHTML = `
      <button class="btn btn-primary write-action" onclick="connectGmail()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px;margin-right:5px;"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,12 2,6"/></svg>
        Connect Gmail
      </button>`;
    return;
  }

  if (!gmailSync.active) {
    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap;">
        <span style="color:#f87171;font-size:0.85rem;">⚠ Gmail disconnected — token expired or revoked.</span>
        <button class="btn btn-outline" style="font-size:0.8rem;" onclick="connectGmail()">Reconnect</button>
      </div>`;
    return;
  }

  const lastSynced = gmailSync.last_checked
    ? new Date(gmailSync.last_checked).toLocaleString()
    : 'Never';

  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap;">
      <span style="color:#10B981;font-size:0.85rem;">✓ Connected: ${esc(gmailSync.gmail_address)}</span>
      <span style="color:var(--muted);font-size:0.78rem;">Last synced: ${lastSynced}</span>
      <button class="btn btn-outline" style="font-size:0.8rem;color:#f87171;border-color:#f87171;" onclick="disconnectGmail()">Disconnect</button>
    </div>`;
}

function connectGmail() {
  const tenantId = currentProfile?.tenant_id;
  if (!tenantId) { showToast('Not logged in', 'error'); return; }
  window.location.href = `/.netlify/functions/gmail-oauth-start?tenant_id=${tenantId}`;
}

async function disconnectGmail() {
  if (!gmailSync || !confirm('Disconnect Gmail? Auto-sync will stop.')) return;
  await sb.from('turo_email_syncs').delete().eq('id', gmailSync.id);
  gmailSync = null;
  renderGmailSync();
  showToast('Gmail disconnected', 'info');
}
```

- [ ] **Step 5: Load Gmail sync when the Turo tab opens**

In `admin/js/dashboard.js`, find the `switchTab` function section that handles the `turo` tab. Look for:
```js
  if (tab === 'turo') renderCalendarFeeds();
```

Change it to:
```js
  if (tab === 'turo') { renderCalendarFeeds(); loadGmailSync().then(renderGmailSync); }
```

- [ ] **Step 6: Handle ?gmail=connected param on dashboard load**

In `admin/js/dashboard.js`, find the section near the bottom where the page initializes (look for `checkAuth()` or `window.addEventListener('DOMContentLoaded'`). Add this check after auth is confirmed and `currentProfile` is set:

Find the line in `checkAuth` or the main init flow that shows the dashboard (look for something like `document.getElementById('app').style.display`). After the dashboard is shown, add:

```js
  // Show Gmail connected/error toast from OAuth redirect
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('gmail') === 'connected') {
    showToast('Gmail connected successfully!', 'success');
    history.replaceState({}, '', window.location.pathname + window.location.hash);
  } else if (urlParams.get('gmail') === 'error') {
    showToast('Gmail connection failed. Please try again.', 'error');
    history.replaceState({}, '', window.location.pathname + window.location.hash);
  }
```

- [ ] **Step 7: Verify the functions exist in dashboard.js**

```bash
grep -n "connectGmail\|disconnectGmail\|loadGmailSync\|renderGmailSync" "/Users/ayrtonpaullohigorry/IA Projects/Aplicacion Rental/admin/js/dashboard.js"
```
Expected: 4+ matches including definitions and call sites.

- [ ] **Step 8: Commit**

```bash
cd "/Users/ayrtonpaullohigorry/IA Projects/Aplicacion Rental"
git add admin/dashboard.html admin/js/dashboard.js
git commit -m "feat: add Gmail Sync UI to Calendar Sync tab — connect/disconnect/status

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 7: Google Cloud Console setup (manual — one time)

This task requires browser access to Google Cloud Console. It cannot be automated.

- [ ] **Step 1: Create a Google Cloud project**

Go to [console.cloud.google.com](https://console.cloud.google.com) → New Project → name it "éPure Drive".

- [ ] **Step 2: Enable the Gmail API**

APIs & Services → Library → search "Gmail API" → Enable.

- [ ] **Step 3: Create OAuth 2.0 credentials**

APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID:
- Application type: **Web application**
- Name: `epuredrive-gmail-sync`
- Authorized redirect URIs: `https://epuredrive.com/.netlify/functions/gmail-oauth-callback`
- Click Create → copy the **Client ID** and **Client Secret**

- [ ] **Step 4: Configure OAuth consent screen**

APIs & Services → OAuth consent screen:
- User type: **External**
- App name: `éPure Drive`
- Scopes: add `https://www.googleapis.com/auth/gmail.readonly`
- Test users: add your own Gmail account (required while app is in "Testing" mode)

- [ ] **Step 5: Add env vars to Netlify**

Netlify dashboard → your site → Site configuration → Environment variables → Add:
- `GOOGLE_CLIENT_ID` = the Client ID from Step 3
- `GOOGLE_CLIENT_SECRET` = the Client Secret from Step 3

Then trigger a new deploy (or the vars will take effect on next deploy from `main`).

- [ ] **Step 6: Verify end-to-end**

1. Open dashboard → Calendar Sync tab
2. Click **Connect Gmail** — should redirect to Google
3. Select your Gmail account and grant permission
4. Should redirect back to dashboard with "Gmail connected successfully!" toast
5. Status section should show "✓ Connected: your@gmail.com"
6. Wait up to 15 min (or trigger `poll-turo-emails` manually in Netlify) — new Turo booking emails should appear as reservations

---

## Self-Review

**Spec coverage:**
- ✅ `turo_email_syncs` table → Task 1
- ✅ RLS policies → Task 1
- ✅ `gmail-oauth-start.js` → Task 3
- ✅ `gmail-oauth-callback.js` → Task 4 (exchanges code, gets gmail_address, upserts)
- ✅ `poll-turo-emails.js` scheduled every 15 min → netlify.toml Task 2, function Task 5
- ✅ Email type detection (confirmed/cancelled/modified) → `parseTuroEmail` in Task 5
- ✅ Field extraction (customer_name, dates, total_amount, notes) → `parseTuroEmail` in Task 5
- ✅ Vehicle matching by make+model+year → `findCarId` in Task 5
- ✅ `car_id = null` + vehicle name in notes when no match → Task 5 `notesWithVehicle`
- ✅ Deduplication by Gmail message ID → `notes=eq.Turo #${msg.id}` check in Task 5
- ✅ Token refresh on 401 → `refreshAccessToken` + `gmailFetch` retry in Task 5
- ✅ Mark `active=false` on revoked token → Task 5 catch block
- ✅ Dashboard UI: connect/disconnect/status/reconnect → Task 6
- ✅ `?gmail=connected` toast on redirect → Task 6 Step 6
- ✅ CSP updated for Google APIs → Task 2
- ✅ Google Cloud setup instructions → Task 7

**Placeholder scan:** No TBDs. All regex patterns, SQL, API paths, and code blocks are complete and specific.

**Type consistency:** `gmailSync` is loaded by `loadGmailSync()` and consumed by `renderGmailSync()`, `disconnectGmail()` — consistent null check pattern throughout. `parseTuroEmail` returns `{ type, messageId, customer_name, vehicle_name, pickup_date, return_date, total_amount, notes, source, status }` — all fields consumed correctly in the handler.
