# iCloud Email Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the existing Turo email auto-sync to support iCloud Mail via IMAP app-specific password, in addition to the existing Gmail OAuth flow.

**Architecture:** Add `provider` and `app_specific_password` columns to `turo_email_syncs`. A new `icloud-connect.js` Netlify function validates IMAP credentials and upserts the row. The existing `poll-turo-emails.js` is refactored to extract shared email processing logic and add an iCloud IMAP polling branch. The dashboard UI gains a provider selector (Gmail / iCloud) when not connected.

**Tech Stack:** Node.js 18+, `imapflow` npm package (IMAP client), Supabase REST API, Netlify Functions, vanilla JS dashboard.

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Create | `package.json` | Add `imapflow` dependency so Netlify bundles it |
| DB migration | via Supabase MCP | Add `provider` + `app_specific_password` columns |
| Create | `netlify/functions/icloud-connect.js` | POST handler: validates IMAP, upserts turo_email_syncs |
| Modify | `netlify/functions/poll-turo-emails.js` | Extract `processEmail()` + `pollGmail()`, add `pollIcloud()`, branch in handler |
| Modify | `admin/dashboard.html` | Provider selector (Gmail/iCloud) + iCloud form in `#tab-turo` |
| Modify | `admin/js/dashboard.js` | Update `loadGmailSync`, `renderGmailSync`, add `connectIcloud`, update `disconnectGmail` |

---

## Task 1: DB migration + package.json

**Files:**
- DB migration via Supabase MCP (project ID: `brwzjwbpguiignrxvjdc`)
- Create: `package.json`

- [ ] **Step 1: Apply DB migration**

Run via Supabase MCP (`mcp__claude_ai_Supabase__execute_sql`, project_id: `brwzjwbpguiignrxvjdc`):

```sql
ALTER TABLE turo_email_syncs
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'gmail',
  ADD COLUMN IF NOT EXISTS app_specific_password text;
```

Expected: no error. Existing Gmail rows automatically get `provider = 'gmail'` and `app_specific_password = NULL`.

- [ ] **Step 2: Verify migration**

Run via Supabase MCP:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'turo_email_syncs'
ORDER BY ordinal_position;
```

Expected: rows for `provider` (text, not nullable, default 'gmail') and `app_specific_password` (text, nullable, no default).

- [ ] **Step 3: Create package.json at project root**

Create `/Users/ayrtonpaullohigorry/IA Projects/Aplicacion Rental/package.json`:

```json
{
  "name": "epuredrive",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "imapflow": "^1.0.0"
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "feat: add imapflow dependency + iCloud IMAP DB columns"
```

---

## Task 2: Create `icloud-connect.js`

**Files:**
- Create: `netlify/functions/icloud-connect.js`

- [ ] **Step 1: Create the function**

Create `netlify/functions/icloud-connect.js` with the following content:

```js
// Netlify Function — icloud-connect
// Validates iCloud IMAP credentials and saves connection to turo_email_syncs.
// POST body: { tenant_id, email, password }
// Env vars required:
//   SUPABASE_SERVICE_ROLE_KEY

const { ImapFlow } = require('imapflow');

const SUPABASE_URL = 'https://brwzjwbpguiignrxvjdc.supabase.co';

function sbHeaders(serviceKey) {
  return {
    'apikey':        serviceKey,
    'Authorization': `Bearer ${serviceKey}`,
    'Content-Type':  'application/json',
  };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { tenant_id, email, password } = body;

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!tenant_id || !UUID_RE.test(tenant_id) || !email || !password) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing or invalid parameters' }) };
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server misconfigured' }) };
  }

  // 1. Validate credentials via IMAP test-login
  const client = new ImapFlow({
    host:   'imap.mail.me.com',
    port:   993,
    secure: true,
    auth:   { user: email, pass: password },
    logger: false,
  });

  try {
    await client.connect();
    await client.logout();
  } catch (err) {
    console.warn('[icloud-connect] IMAP auth failed:', err.message);
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid credentials. Check your iCloud email and app-specific password.' }),
    };
  }

  // 2. Upsert into turo_email_syncs
  const lastChecked = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const upsertRes = await fetch(
    `${SUPABASE_URL}/rest/v1/turo_email_syncs?on_conflict=tenant_id`,
    {
      method:  'POST',
      headers: { ...sbHeaders(serviceKey), 'Prefer': 'resolution=merge-duplicates' },
      body:    JSON.stringify({
        tenant_id,
        provider:              'icloud',
        gmail_address:         email,
        app_specific_password: password,
        access_token:          '',
        refresh_token:         '',
        active:                true,
        last_checked:          lastChecked,
      }),
    }
  );

  if (!upsertRes.ok) {
    console.error('[icloud-connect] Supabase upsert failed:', await upsertRes.text());
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to save connection' }) };
  }

  console.log(`[icloud-connect] Connected iCloud ${email} for tenant ${tenant_id}`);
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true, email }),
  };
};
```

- [ ] **Step 2: Commit**

```bash
git add netlify/functions/icloud-connect.js
git commit -m "feat: add icloud-connect function — validates IMAP credentials and upserts connection"
```

---

## Task 3: Refactor `poll-turo-emails.js` for iCloud

**Files:**
- Modify: `netlify/functions/poll-turo-emails.js`

The current file has all email processing inline in the main handler loop. This task:
1. Adds `getImapBody(rawEmail)` — parses raw RFC 2822 email to extract plain text
2. Extracts `processEmail(parsed, sync, serviceKey)` — shared cancel/upsert/dedup logic
3. Extracts `pollGmail(sync, serviceKey)` — wraps existing Gmail loop
4. Adds `pollIcloud(sync, serviceKey)` — new IMAP-based loop
5. Updates the main handler to branch on `sync.provider`

- [ ] **Step 1: Add `getImapBody` after `getMessageBody` (around line 121)**

Open `netlify/functions/poll-turo-emails.js`. After the closing `}` of `getMessageBody` (line 121), add:

```js
// ── IMAP raw email body extractor ────────────────────────────────────────────
// Parses a raw RFC 2822 message string and returns the best plain-text body.

function getImapBody(rawEmail) {
  const raw = typeof rawEmail === 'string' ? rawEmail : rawEmail.toString('utf-8');

  // Look for a MIME boundary
  const boundaryMatch = raw.match(/Content-Type:\s*multipart\/[^;]+;\s*boundary="([^"]+)"/i)
                     || raw.match(/Content-Type:\s*multipart\/[^;]+;\s*boundary=([^\s;]+)/i);

  if (boundaryMatch) {
    const boundary = boundaryMatch[1];
    const escaped  = boundary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts    = raw.split(new RegExp(`--${escaped}`));

    let plainText = null;
    let htmlText  = null;

    for (const part of parts) {
      const headerEnd = part.indexOf('\r\n\r\n');
      if (headerEnd < 0) continue;
      const headers = part.slice(0, headerEnd);
      let   body    = part.slice(headerEnd + 4);

      // Decode transfer encoding
      if (/Content-Transfer-Encoding:\s*quoted-printable/i.test(headers)) {
        body = body
          .replace(/=\r?\n/g, '')
          .replace(/=([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
      } else if (/Content-Transfer-Encoding:\s*base64/i.test(headers)) {
        body = Buffer.from(body.replace(/\s/g, ''), 'base64').toString('utf-8');
      }

      if (/Content-Type:\s*text\/plain/i.test(headers) && !plainText) {
        plainText = body.trim();
      } else if (/Content-Type:\s*text\/html/i.test(headers) && !htmlText) {
        htmlText = body
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      }
    }

    return plainText || htmlText || '';
  }

  // Non-MIME: body is everything after the first blank line
  const bodyStart = raw.indexOf('\r\n\r\n');
  return bodyStart >= 0 ? raw.slice(bodyStart + 4).trim() : raw.trim();
}
```

- [ ] **Step 2: Add `processEmail` after `findCarId` (after line 215)**

After the closing `}` of `findCarId`, add:

```js
// ── Shared email processing (cancel / upsert / dedup) ────────────────────────
// Used by both pollGmail and pollIcloud. Returns true if a reservation was touched.

async function processEmail(parsed, sync, serviceKey) {
  if (parsed.type === 'cancel') {
    let cancelMatches = [];
    if (parsed.customer_name && parsed.pickup_date) {
      cancelMatches = await sbGet(
        `reservations?tenant_id=eq.${sync.tenant_id}&customer_name=eq.${encodeURIComponent(parsed.customer_name)}&pickup_date=eq.${parsed.pickup_date}&source=eq.turo&select=id`,
        serviceKey
      );
    }
    for (const r of cancelMatches) {
      await sbPatch(`reservations?id=eq.${r.id}`, { status: 'cancelled' }, serviceKey);
    }
    if (!cancelMatches.length) {
      console.warn(`[poll-turo-emails] Cancel ${parsed.messageId}: no matching reservation found`);
    }
    return true;
  }

  const existing = await sbGet(
    `reservations?tenant_id=eq.${sync.tenant_id}&notes=like.Turo %23${parsed.messageId}%&select=id`,
    serviceKey
  );

  const carId            = await findCarId(sync.tenant_id, parsed.vehicle_name, serviceKey);
  const notesWithVehicle = carId
    ? parsed.notes
    : `${parsed.notes} [vehicle: ${parsed.vehicle_name || 'unknown'}]`;

  const reservationData = {
    tenant_id:     sync.tenant_id,
    car_id:        carId,
    customer_name: parsed.customer_name,
    pickup_date:   parsed.pickup_date,
    return_date:   parsed.return_date,
    total_amount:  parsed.total_amount,
    status:        parsed.status,
    source:        parsed.source,
    notes:         notesWithVehicle,
  };

  if (existing.length > 0) {
    await sbPatch(
      `reservations?id=eq.${existing[0].id}`,
      { pickup_date: parsed.pickup_date, return_date: parsed.return_date,
        total_amount: parsed.total_amount, status: parsed.status },
      serviceKey
    );
  } else {
    await sbInsert('reservations', reservationData, serviceKey);
  }

  return true;
}
```

- [ ] **Step 3: Add `pollGmail` and `pollIcloud` before `exports.handler`**

Right before the `// ── Main handler` comment, add these two functions:

```js
// ── Provider-specific pollers ─────────────────────────────────────────────────

async function pollGmail(sync, serviceKey) {
  const checkedAt      = sync.last_checked
    ? new Date(sync.last_checked)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const afterTimestamp = Math.floor(checkedAt.getTime() / 1000);
  const query          = `from:noreply@mail.turo.com after:${afterTimestamp}`;

  const messages = [];
  let pageToken  = undefined;
  do {
    const qs         = `/messages?q=${encodeURIComponent(query)}&maxResults=50${pageToken ? `&pageToken=${pageToken}` : ''}`;
    const pageResult = await gmailFetch(qs, sync, serviceKey);
    if (pageResult.messages) messages.push(...pageResult.messages);
    pageToken = pageResult.nextPageToken;
  } while (pageToken);

  if (!messages.length) return 0;

  let synced = 0;
  for (const msg of messages) {
    try {
      const full    = await gmailFetch(`/messages/${msg.id}?format=full`, sync, serviceKey);
      const subject = full.payload?.headers?.find(h => h.name.toLowerCase() === 'subject')?.value || '';
      const body    = getMessageBody(full.payload);
      const parsed  = parseTuroEmail(body, subject, msg.id);
      if (!parsed) continue;
      await processEmail(parsed, sync, serviceKey);
      synced++;
    } catch (msgErr) {
      console.error(`[poll-turo-emails] Gmail message ${msg.id} failed:`, msgErr.message);
    }
  }
  return synced;
}

async function pollIcloud(sync, serviceKey) {
  const { ImapFlow } = require('imapflow');

  const client = new ImapFlow({
    host:   'imap.mail.me.com',
    port:   993,
    secure: true,
    auth:   { user: sync.gmail_address, pass: sync.app_specific_password },
    logger: false,
  });

  await client.connect();

  try {
    const lock = await client.getMailboxLock('INBOX');
    try {
      const checkedAt = sync.last_checked
        ? new Date(sync.last_checked)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const uids = await client.search(
        { from: 'noreply@mail.turo.com', since: checkedAt },
        { uid: true }
      );

      let synced = 0;
      for (const uid of uids) {
        try {
          const msg     = await client.fetchOne(String(uid), { source: true }, { uid: true });
          const raw     = msg.source.toString('utf-8');
          const subject = raw.match(/^Subject:\s*(.+)$/mi)?.[1]?.trim() || '';
          const body    = getImapBody(raw);
          const parsed  = parseTuroEmail(body, subject, `icloud-${uid}`);
          if (!parsed) continue;
          await processEmail(parsed, sync, serviceKey);
          synced++;
        } catch (msgErr) {
          console.error(`[poll-turo-emails] iCloud UID ${uid} failed:`, msgErr.message);
        }
      }
      return synced;
    } finally {
      lock.release();
    }
  } catch (err) {
    // Rethrow auth errors with a recognisable prefix so the handler can set active=false
    if (/authenticationfailed|invalid credentials|auth/i.test(err.message)) {
      throw new Error(`403: iCloud auth failed — ${err.message}`);
    }
    throw err;
  } finally {
    await client.logout().catch(() => {});
  }
}
```

- [ ] **Step 4: Replace the main handler loop body**

The current `exports.handler` has the Gmail polling logic inline. Replace the entire `for (const sync of syncs)` block with the branching version below. Keep everything before and after the loop unchanged.

Replace this block (lines 242–347):
```js
  for (const sync of syncs) {
    try {
      const checkedAt      = sync.last_checked
      ...
      errors++;
    }
  }
```

With:
```js
  for (const sync of syncs) {
    try {
      const synced = sync.provider === 'icloud'
        ? await pollIcloud(sync, serviceKey)
        : await pollGmail(sync, serviceKey);

      await sbPatch(
        `turo_email_syncs?id=eq.${sync.id}`,
        { last_checked: new Date().toISOString() },
        serviceKey
      );

      totalSynced += synced;
      console.log(`[poll-turo-emails] Tenant ${sync.tenant_id} (${sync.gmail_address}) [${sync.provider || 'gmail'}]: ${synced} emails processed`);
    } catch (err) {
      console.error(`[poll-turo-emails] Sync ${sync.id} failed: ${err.message}`);
      if (/token refresh failed|403|access.?denied|insufficient.?permission|authenticationfailed/i.test(err.message)) {
        await sbPatch(`turo_email_syncs?id=eq.${sync.id}`, { active: false }, serviceKey).catch(() => {});
      }
      errors++;
    }
  }
```

Also update the env-var guard at the top of `exports.handler` — iCloud syncs don't need Google credentials, so only fail if ALL syncs need them. Simplest fix: remove the Google env check from the guard (Google vars are still checked inside `pollGmail` via `refreshAccessToken`). Replace:

```js
  if (!serviceKey || !process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.error('[poll-turo-emails] Missing required env vars');
    return { statusCode: 500, body: 'Missing env vars' };
  }
```

With:

```js
  if (!serviceKey) {
    console.error('[poll-turo-emails] Missing SUPABASE_SERVICE_ROLE_KEY');
    return { statusCode: 500, body: 'Missing SUPABASE_SERVICE_ROLE_KEY' };
  }
```

- [ ] **Step 5: Verify the file compiles without syntax errors**

Run:
```bash
node --check netlify/functions/poll-turo-emails.js
```
Expected: no output (no syntax errors).

- [ ] **Step 6: Commit**

```bash
git add netlify/functions/poll-turo-emails.js
git commit -m "feat: add iCloud IMAP polling to poll-turo-emails — extract processEmail/pollGmail, add pollIcloud"
```

---

## Task 4: Dashboard HTML — provider selector + iCloud form

**Files:**
- Modify: `admin/dashboard.html` (lines 1127–1142, the `#tab-turo` section)

- [ ] **Step 1: Replace the Gmail Sync section in `#tab-turo`**

The current section (lines 1130–1139) shows only a Gmail-specific header and `#gmail-sync-status`. Replace the entire `<div class="table-section"...>` block with a provider-agnostic version that:
- Uses neutral header "Auto-Sync from Email"
- Keeps `#gmail-sync-status` for JS rendering (JS handles all state)

Replace:
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

With:
```html
        <!-- Email Sync -->
        <div class="table-section" style="padding:1.5rem;margin-bottom:1rem;">
          <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.75rem;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,12 2,6"/></svg>
            <h3 style="font-size:0.95rem;font-weight:600;">Auto-Sync from Email</h3>
          </div>
          <p style="font-size:0.78rem;color:var(--muted);line-height:1.5;margin-bottom:1rem;">
            Connect the email account that receives your Turo booking notifications. Bookings will sync automatically every 15 minutes.
          </p>
          <div id="gmail-sync-status"><!-- rendered by JS --></div>
        </div>
```

- [ ] **Step 2: Commit**

```bash
git add admin/dashboard.html
git commit -m "feat: rename Gmail Sync section to Email Sync (provider-agnostic)"
```

---

## Task 5: Dashboard JS — provider selector + iCloud connect

**Files:**
- Modify: `admin/js/dashboard.js`

Changes needed:
1. Add `let selectedProvider = 'gmail';` state variable near `let gmailSync`
2. `loadGmailSync()` — add `provider` to the select query
3. `renderGmailSync()` — show provider selector when not connected; iCloud form when iCloud tab active; update broken state message to be provider-aware
4. Add `selectProvider(p)` — switches the tab and re-renders the not-connected state
5. Add `connectIcloud()` — POSTs to `icloud-connect.js`
6. Update `disconnectGmail()` — rename to `disconnectEmailSync()`, update toast message

- [ ] **Step 1: Add `selectedProvider` state variable**

Find the line `let gmailSync = null;` in dashboard.js. Add the new variable directly after it:

```js
let gmailSync        = null;
let selectedProvider = 'gmail';
```

- [ ] **Step 2: Update `loadGmailSync` to include `provider`**

Find:
```js
  const { data } = await withTenant(sb.from('turo_email_syncs').select('id,gmail_address,last_checked,active').limit(1).maybeSingle());
```

Replace with:
```js
  const { data } = await withTenant(sb.from('turo_email_syncs').select('id,gmail_address,last_checked,active,provider').limit(1).maybeSingle());
```

- [ ] **Step 3: Replace `renderGmailSync` entirely**

Find the entire `function renderGmailSync() { ... }` block and replace it with:

```js
function renderGmailSync() {
  const el = document.getElementById('gmail-sync-status');
  if (!el) return;

  // ── Not connected ──────────────────────────────────────────────────────────
  if (!gmailSync) {
    el.innerHTML = `
      <div style="display:flex;gap:0;border:1px solid var(--border);border-radius:8px;width:fit-content;margin-bottom:1rem;overflow:hidden;">
        <button id="provider-tab-gmail" onclick="selectProvider('gmail')"
          style="padding:0.4rem 1.1rem;font-size:0.8rem;font-weight:600;border:none;cursor:pointer;
                 background:${selectedProvider==='gmail'?'var(--accent)':'transparent'};
                 color:${selectedProvider==='gmail'?'#fff':'var(--muted)'};transition:all .15s;">
          Gmail
        </button>
        <button id="provider-tab-icloud" onclick="selectProvider('icloud')"
          style="padding:0.4rem 1.1rem;font-size:0.8rem;font-weight:600;border:none;cursor:pointer;
                 background:${selectedProvider==='icloud'?'var(--accent)':'transparent'};
                 color:${selectedProvider==='icloud'?'#fff':'var(--muted)'};transition:all .15s;">
          iCloud
        </button>
      </div>
      ${selectedProvider === 'gmail' ? `
        <button class="btn btn-primary write-action" onclick="connectGmail()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            style="vertical-align:-2px;margin-right:5px;">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,12 2,6"/>
          </svg>
          Connect Gmail
        </button>
      ` : `
        <div style="display:flex;flex-direction:column;gap:0.6rem;max-width:420px;">
          <div class="form-group" style="margin:0;">
            <label style="font-size:0.8rem;">iCloud email</label>
            <input type="email" id="icloud-email" placeholder="you@icloud.com"
              style="width:100%;padding:0.4rem 0.6rem;font-size:0.85rem;" />
          </div>
          <div class="form-group" style="margin:0;">
            <label style="font-size:0.8rem;">App-specific password</label>
            <input type="password" id="icloud-password" placeholder="xxxx-xxxx-xxxx-xxxx"
              style="width:100%;padding:0.4rem 0.6rem;font-size:0.85rem;" />
          </div>
          <button class="btn btn-primary write-action" onclick="connectIcloud()">Connect iCloud</button>
          <p style="font-size:0.75rem;color:var(--muted);margin:0;">
            Generate your app-specific password at
            <a href="https://appleid.apple.com" target="_blank" rel="noopener"
              style="color:var(--accent);">appleid.apple.com</a>
            → Account Security → App-Specific Passwords.
          </p>
        </div>
      `}`;
    return;
  }

  // ── Broken connection ──────────────────────────────────────────────────────
  if (!gmailSync.active) {
    const providerLabel = gmailSync.provider === 'icloud' ? 'iCloud' : 'Gmail';
    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap;">
        <span style="color:#f87171;font-size:0.85rem;">⚠ ${providerLabel} disconnected — credentials expired or revoked.</span>
        <button class="btn btn-outline" style="font-size:0.8rem;" onclick="${gmailSync.provider === 'icloud' ? "selectProvider('icloud');disconnectEmailSync(true)" : 'connectGmail()'}">Reconnect</button>
      </div>`;
    return;
  }

  // ── Connected ──────────────────────────────────────────────────────────────
  const lastSynced  = gmailSync.last_checked
    ? new Date(gmailSync.last_checked).toLocaleString()
    : 'Never';
  const isUnknown   = gmailSync.gmail_address === 'unknown@gmail.com';
  const providerTag = gmailSync.provider === 'icloud'
    ? '<span style="font-size:0.75rem;color:var(--muted);background:var(--surface-2);padding:0.1rem 0.4rem;border-radius:4px;margin-left:0.3rem;">iCloud</span>'
    : '';

  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap;">
      <span style="color:#10B981;font-size:0.85rem;">✓ Connected: ${esc(gmailSync.gmail_address)}${providerTag}</span>
      <span style="color:var(--muted);font-size:0.78rem;">Last synced: ${lastSynced}</span>
      <button class="btn btn-outline" style="font-size:0.8rem;color:#f87171;border-color:#f87171;"
        onclick="disconnectEmailSync()">Disconnect</button>
    </div>
    ${isUnknown ? `<p style="font-size:0.78rem;color:#f59e0b;margin-top:0.5rem;">⚠ Email address not detected. Disconnect and reconnect to fix.</p>` : ''}`;
}
```

- [ ] **Step 4: Add `selectProvider`, `connectIcloud`, and rename `disconnectGmail`**

Find `function connectGmail() {` and add `selectProvider` and `connectIcloud` right before it. Also rename `disconnectGmail` to `disconnectEmailSync`.

Add before `function connectGmail()`:

```js
function selectProvider(p) {
  selectedProvider = p;
  renderGmailSync();
}

async function connectIcloud() {
  const tenantId = currentTenantId;
  if (!tenantId) { showToast('Not logged in', 'error'); return; }

  const email    = document.getElementById('icloud-email')?.value?.trim();
  const password = document.getElementById('icloud-password')?.value?.trim();
  if (!email || !password) { showToast('Enter iCloud email and password', 'error'); return; }

  const btn = document.querySelector('#gmail-sync-status .btn-primary');
  if (btn) { btn.disabled = true; btn.textContent = 'Connecting…'; }

  try {
    const res  = await fetch('/.netlify/functions/icloud-connect', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ tenant_id: tenantId, email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Connection failed', 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'Connect iCloud'; }
      return;
    }
    await loadGmailSync();
    renderGmailSync();
    showToast('iCloud connected', 'success');
  } catch {
    showToast('Network error — try again', 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Connect iCloud'; }
  }
}
```

Rename `disconnectGmail` → `disconnectEmailSync` and update its message:

Find:
```js
async function disconnectGmail() {
  if (!gmailSync || !confirm('Disconnect Gmail? Auto-sync will stop.')) return;
  const { error } = await sb.from('turo_email_syncs').delete().eq('id', gmailSync.id);
  if (error) { showToast('Failed to disconnect Gmail', 'error'); return; }
  gmailSync = null;
  renderGmailSync();
  showToast('Gmail disconnected', 'info');
}
```

Replace with:
```js
async function disconnectEmailSync(skipConfirm = false) {
  if (!gmailSync) return;
  const label = gmailSync.provider === 'icloud' ? 'iCloud' : 'Gmail';
  if (!skipConfirm && !confirm(`Disconnect ${label}? Auto-sync will stop.`)) return;
  const { error } = await sb.from('turo_email_syncs').delete().eq('id', gmailSync.id);
  if (error) { showToast(`Failed to disconnect ${label}`, 'error'); return; }
  gmailSync = null;
  renderGmailSync();
  showToast(`${label} disconnected`, 'info');
}
```

- [ ] **Step 5: Commit**

```bash
git add admin/js/dashboard.js
git commit -m "feat: add iCloud provider selector + connectIcloud to dashboard"
```

---

## Task 6: Deploy and verify

- [ ] **Step 1: Push to main**

```bash
git push origin main
```

- [ ] **Step 2: Wait for deploy (~1 min), then test Gmail path**

Open Dashboard → Sync Channels. If already connected via Gmail, connection should show as before with no regression.

- [ ] **Step 3: Test iCloud path**

If you have an iCloud email that receives Turo notifications:
1. Disconnect existing Gmail connection
2. Click iCloud tab
3. Enter iCloud email + app-specific password
4. Click "Connect iCloud"
5. Expected: "✓ Connected: you@icloud.com [iCloud]"

If you don't have an iCloud account, verify the form renders correctly and that a bad password returns the error toast "Invalid credentials. Check your iCloud email and app-specific password."

- [ ] **Step 4: Verify poller runs for iCloud**

```bash
curl -X POST https://epuredrive.com/.netlify/functions/poll-turo-emails
```

Expected: `{"totalSynced": N, "errors": 0}` — check Netlify function logs for `[icloud]` tag in the output line.

---

## Self-Review

**Spec coverage:**
- ✅ `provider` + `app_specific_password` DB columns → Task 1
- ✅ `icloud-connect.js` validates via IMAP test-login → Task 2
- ✅ IMAP polling via imapflow with `getImapBody` + `processEmail` shared logic → Task 3
- ✅ `last_checked` initialized to 30 days ago → Task 2 Step 1
- ✅ Auth failure sets `active = false` → Task 3 Step 4 error pattern
- ✅ Provider selector (Gmail / iCloud tabs) → Task 5
- ✅ iCloud form with email + password + link to appleid.apple.com → Task 5 Step 3
- ✅ Connected state shows provider tag → Task 5 Step 3
- ✅ Broken state message is provider-aware → Task 5 Step 3
- ✅ `disconnectEmailSync` handles both providers → Task 5 Step 4
- ✅ `package.json` with `imapflow` → Task 1 Step 3

**Placeholder scan:** No TBDs, no vague steps, all code blocks complete.

**Type consistency:** `processEmail(parsed, sync, serviceKey)` is defined in Task 3 Step 2 and called with those exact arguments in both `pollGmail` and `pollIcloud` (Task 3 Step 3). `disconnectEmailSync` is defined in Task 5 Step 4 and referenced in `renderGmailSync` (Task 5 Step 3) — consistent name used throughout.
