# iCloud Email Sync — Design Spec

**Date:** 2026-03-28
**Status:** Approved

## Overview

Extend the existing Turo email auto-sync to support iCloud Mail (in addition to Gmail). Tenants who receive Turo booking notifications on an iCloud email can connect via IMAP using an app-specific password. The existing Gmail OAuth flow is unchanged. Each tenant has exactly one active email connection (Gmail OR iCloud).

## Architecture

```
Dashboard UI
  → Provider selector: [Gmail] [iCloud]
      → Gmail selected: existing OAuth flow (no changes)
      → iCloud selected: inline form (email + app-specific password)
          → POST /.netlify/functions/icloud-connect
              → Validate credentials via IMAP test-login (imap.mail.me.com:993)
              → UPSERT turo_email_syncs (provider='icloud')
              → Return { ok: true, email } or { error: 'Invalid credentials' }

Netlify Scheduler (every 15 min) — poll-turo-emails.js
  → SELECT * FROM turo_email_syncs WHERE active = true
  → For each sync:
      → if provider = 'gmail'  → existing Gmail API flow (unchanged)
      → if provider = 'icloud' → ImapFlow connect to imap.mail.me.com:993
          → login with gmail_address + app_specific_password
          → search INBOX: FROM noreply@mail.turo.com SINCE last_checked
          → fetch plain-text body of each message
          → parseTuroEmail() → same function as Gmail
          → same dedup / upsert / cancel logic
          → close IMAP connection
          → UPDATE last_checked = now()
```

## Database Changes

```sql
ALTER TABLE turo_email_syncs
  ADD COLUMN provider text NOT NULL DEFAULT 'gmail',
  ADD COLUMN app_specific_password text;

-- access_token and refresh_token become nullable for iCloud rows
ALTER TABLE turo_email_syncs
  ALTER COLUMN access_token SET DEFAULT '',
  ALTER COLUMN refresh_token SET DEFAULT '';
```

**Column usage by provider:**

| Column | Gmail | iCloud |
|---|---|---|
| `provider` | `'gmail'` | `'icloud'` |
| `gmail_address` | OAuth email | iCloud email |
| `access_token` | OAuth access token | `''` (empty) |
| `refresh_token` | OAuth refresh token | `''` (empty) |
| `app_specific_password` | `null` | app-specific password |

The unique constraint on `tenant_id` stays — one connection per tenant.

## New Netlify Function: `icloud-connect.js`

**Endpoint:** `POST /.netlify/functions/icloud-connect`

**Request body:**
```json
{ "tenant_id": "<uuid>", "email": "user@icloud.com", "password": "<app-specific-password>" }
```

**Flow:**
1. Validate `tenant_id` is a valid UUID
2. Validate `email` and `password` are present
3. Attempt `ImapFlow` connection to `imap.mail.me.com:993` with provided credentials
4. If login fails → return `{ statusCode: 400, body: '{"error":"Invalid credentials"}' }`
5. If login succeeds → close connection → UPSERT into `turo_email_syncs`:
   ```json
   {
     "tenant_id": "<uuid>",
     "provider": "icloud",
     "gmail_address": "<email>",
     "app_specific_password": "<password>",
     "access_token": "",
     "refresh_token": "",
     "active": true,
     "last_checked": "<30 days ago>"
   }
   ```
6. Return `{ statusCode: 200, body: '{"ok":true,"email":"user@icloud.com"}' }`

**Env vars:** `SUPABASE_SERVICE_ROLE_KEY` (already set in Netlify)

## Changes to `poll-turo-emails.js`

Single branch added at the top of the per-tenant loop:

```js
if (sync.provider === 'icloud') {
  await pollIcloud(sync, serviceKey);
} else {
  await pollGmail(sync, serviceKey);  // existing logic, extracted to function
}
```

**`pollIcloud(sync, serviceKey)`:**
- Opens ImapFlow connection to `imap.mail.me.com:993`
- Searches `INBOX` for `FROM "noreply@mail.turo.com" SINCE <last_checked date>`
- Fetches `body[]` (plain text preferred, HTML fallback — same `getMessageBody` logic)
- Runs `parseTuroEmail(body, subject, uid)` — uses IMAP UID as message ID for dedup
- Same insert/update/cancel logic as Gmail
- On auth error (IMAP `authenticationfailed`): sets `active = false`
- Always closes IMAP connection in `finally` block

**npm dependency:** `imapflow` — add `package.json` to project root:
```json
{
  "dependencies": {
    "imapflow": "^1.0.0"
  }
}
```

## Changes to Dashboard JS + HTML

**`renderGmailSync()` → renamed to `renderEmailSync()`** (or kept as-is, just extended):

**Not connected state** (new provider selector):
```
[Gmail]  [iCloud]

Gmail selected (default):
  → "Connect Gmail" button → existing OAuth flow

iCloud selected:
  → iCloud email: [input]
  → App-specific password: [input type=password]
  → [Connect iCloud] button → POST /icloud-connect
  → ℹ️ "Generate your app-specific password at appleid.apple.com →
       Account Security → App-Specific Passwords"
```

**Connected state** (same for both providers — no change needed):
```
✓ Connected: user@icloud.com   Last synced: X min ago   [Disconnect]
```

**Broken state** (same for both providers — no change needed):
```
⚠ Email disconnected — [Reconnect]
```

`connectGmail()` stays unchanged. New `connectIcloud()` function posts to `icloud-connect.js` and calls `loadGmailSync().then(renderGmailSync)` on success.

## Error Handling

| Scenario | Behavior |
|---|---|
| Wrong app-specific password at connect time | `icloud-connect` returns 400, dashboard shows "Invalid credentials" |
| Password revoked during polling | IMAP auth error → `active = false` → dashboard shows "Reconnect" |
| IMAP network timeout | Caught per-sync, `errors++`, sync skipped, retried next run |
| imap.mail.me.com unreachable | Same as timeout — per-sync isolation, no cascade |

## User Setup (one-time)

1. Go to appleid.apple.com → Sign In → Account Security → **App-Specific Passwords**
2. Click **+** → name it "ePure Drive" → copy the generated password
3. Dashboard → Sync Channels → select **iCloud** → enter iCloud email + app-specific password → **Connect iCloud**
4. Done — polling starts within 15 minutes, backfills last 30 days

## Out of Scope

- Outlook / Hotmail support
- Apple OAuth XOAUTH2 for IMAP (requires Apple Developer account)
- Push notifications on new booking
- Multiple email connections per tenant
