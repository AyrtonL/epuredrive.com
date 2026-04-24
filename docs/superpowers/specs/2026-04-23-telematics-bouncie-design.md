# Telematics (Bouncie) — Design Spec

**Date:** 2026-04-23
**Status:** Approved design — ready for implementation plan
**Project:** éPure Drive Rental App
**Target release:** Single-release (all phases at once)

---

## 1. Goals

Add a new top-level **Telematics** menu to the dashboard, powered by **Bouncie** (OBD-II dongle telematics provider). Deliver these four capabilities:

- **A. Auto mileage / odometer sync** — eliminate manual odometer entry; `cars.mileage` auto-updates from device.
- **B. Live tracking / fleet map** — real-time vehicle location with side-drawer details.
- **D. Geofence + driving-behavior alerts** — polygon zones, speed-exceeded, hard-braking, hard-accel.
- **E. Predictive maintenance signals** — OBD DTCs (diagnostic trouble codes), low battery voltage, offline alerts.

Explicit non-goal for this release: **C. per-reservation trip history with full detail** (we match trips to reservations, but detailed per-booking driver log is out of scope).

## 2. Provider decision

**Bouncie** (OBD-II dongle, ~$77/device + ~$8/mo per device, cost absorbed by tenant). Selected over Smartcar (insufficient driver-behavior + DTC coverage) and Samsara/Geotab (enterprise cost + complexity unjustified for small rental fleets).

**Architecture hedge:** a light adapter pattern (`TelematicsProvider` interface) so future providers plug in without rewriting dashboard pages.

## 3. High-level architecture

```
BROWSER (Next.js client, dark-theme dashboard)
  Sidebar → "Telematics" group (5 pages) + Integrations/Bouncie config
      │ server actions / RSC
      ▼
NEXT.JS SERVER (App Router)
  lib/telematics/provider.ts       — TelematicsProvider interface + DTOs
  lib/telematics/bouncie/          — Bouncie adapter
  lib/telematics/ingest.ts         — tenant-scoped writes (service role)
  lib/telematics/sync.ts           — pull backfill (cron)
  lib/telematics/alerts.ts         — event → severity → bell + email
  app/api/telematics/oauth/...     — OAuth start/callback
  app/api/telematics/webhook/bouncie — webhook receiver (HMAC-verified)
  app/(dashboard)/dashboard/telematics/** — 5 pages
  app/(dashboard)/dashboard/integrations/bouncie — config page
      │ supabase-js (RLS for user, service-role for webhook)
      ▼
SUPABASE POSTGRES
  6 new tables (see §4) + additive columns on cars + new feature_flag row
      ▲
      │ push (webhook HMAC) + pull (cron every 5 min)
BOUNCIE API (OAuth2 + REST + webhooks)
```

**Two ingestion paths:**
1. **Push (happy path)** — Bouncie webhook → HMAC verify → parse → write DB. Processed synchronously in <1s; migrate to queue if p95 exceeds 2s in production.
2. **Pull (safety net)** — Netlify scheduled function every 5 min polls `GET /v1/vehicles` to reconcile missed events (network drops, deploys, Bouncie outages).

**Multi-tenant routing:** every webhook event is routed by `imei` → `telematics_devices.tenant_id`. Service-role writes always resolve `tenant_id` first before writing any row.

## 4. Database schema

### 4.1 New tables

All new tables include `tenant_id uuid NOT NULL` with RLS policy `tenant_id = (select tenant_id from user_tenants where user_id = auth.uid())` for select/insert/update/delete — matching the existing project convention. Webhook writes use `service_role` key (bypasses RLS) and must always resolve `tenant_id` explicitly before writing.

| Table | Purpose | Key fields |
|---|---|---|
| `telematics_connections` | One row per tenant — OAuth tokens + connection status | `tenant_id` (unique), `provider` text NOT NULL, `access_token` text, `refresh_token` text, `token_expires_at` timestamptz, `scope` text, `account_email` text, `connected_at` timestamptz default now(), `last_sync_at` timestamptz, `status` text CHECK IN ('active','expired','disconnected','error'), `error_message` text |
| `telematics_devices` | Bouncie dongles, linked to cars | `tenant_id`, `connection_id` (fk), `imei` text NOT NULL, `vin` text, `nickname` text, `car_id` int fk nullable, `last_seen_at` timestamptz, `battery_voltage` numeric(4,2), `online` bool, `created_at` timestamptz default now(). UNIQUE (tenant_id, imei) |
| `telematics_positions` | GPS ping history (rolling 90 days) | `id` bigserial, `tenant_id`, `device_id` fk NOT NULL, `car_id` fk (denormalized), `recorded_at` timestamptz NOT NULL, `lat` numeric(10,7), `lon` numeric(10,7), `speed_mph` numeric(5,1), `heading` smallint, `odometer_mi` numeric, `ignition` bool |
| `telematics_trips` | Trip summaries computed by Bouncie | `id` uuid, `tenant_id`, `device_id` fk NOT NULL, `car_id` fk, `reservation_id` int fk nullable (auto-matched), `started_at` timestamptz NOT NULL, `ended_at` timestamptz, `start_lat/lon`, `end_lat/lon`, `distance_mi` numeric, `duration_s` int, `max_speed_mph` numeric(5,1), `hard_braking_count` int default 0, `hard_accel_count` int default 0, `fuel_consumed_gal` numeric, `bouncie_trip_id` text. UNIQUE (tenant_id, bouncie_trip_id) |
| `telematics_events` | Alerts and events (includes DTCs) | `id` uuid, `tenant_id`, `device_id` fk, `car_id` fk, `event_type` text NOT NULL, `severity` text CHECK IN ('info','warning','critical'), `occurred_at` timestamptz NOT NULL, `payload` jsonb, `acknowledged_at` timestamptz, `acknowledged_by` uuid |
| `telematics_geofences` | Polygon zones per tenant | `id` uuid, `tenant_id`, `name` text NOT NULL, `kind` text CHECK IN ('allowed','forbidden'), `polygon` jsonb (GeoJSON polygon coordinates), `applies_to` text CHECK IN ('all','specific'), `car_ids` int[], `speed_limit_mph` int, `active` bool default true, `created_at` timestamptz default now() |

`event_type` enum values: `ignition_on`, `ignition_off`, `trip_start`, `trip_end`, `geofence_enter`, `geofence_exit`, `speed_exceeded`, `hard_braking`, `hard_accel`, `dtc_new`, `dtc_cleared`, `battery_low`, `offline`, `online`, `connection_expired`.

### 4.2 Additive changes to existing tables

**`cars`** — for fast "where is the car" lookups without joining positions:
- `telematics_device_id uuid` fk → `telematics_devices`, nullable
- `last_seen_at timestamptz`
- `last_lat numeric(10,7)`
- `last_lon numeric(10,7)`
- Existing `cars.mileage` column is auto-updated from positions when `telematics_device_id` is set (monotonic max; never decreases).

**Feature flags** (existing two-table system in `lib/supabase/feature-flags.ts`):
- INSERT into `feature_flags` a row with `key='bouncie_telematics'`, `enabled=false` (global default off).
- Pro/Max tenants get an override row in `tenant_feature_flags` (`flag_key='bouncie_telematics'`, `enabled=true`) written by the Stripe webhook on plan activation. Downgrade to Starter deletes the override (or sets it to false) so the global default takes over.

No columns added to `reservations` (per decision — keep MVP surface small).

### 4.3 Indexes

- `telematics_positions (tenant_id, device_id, recorded_at DESC)` — critical for trip route queries.
- `telematics_events (tenant_id, acknowledged_at NULLS FIRST, occurred_at DESC)` — drives the Alerts feed.
- `telematics_trips (tenant_id, started_at DESC)`.
- All foreign keys indexed.
- Partial index on `telematics_devices (tenant_id) WHERE car_id IS NULL` for the Devices page "Unlinked" filter.

### 4.4 Retention

Netlify scheduled function daily: `DELETE FROM telematics_positions WHERE recorded_at < now() - interval '90 days'`. Trips and events retained indefinitely (low volume).

## 5. Bouncie integration layer

### 5.1 Adapter interface

```
lib/telematics/
  provider.ts      — TelematicsProvider interface + neutral DTOs
  types.ts         — event-type enum, severity enum
  registry.ts      — getProvider(name) singleton lookup
  bouncie/
    index.ts       — BouncieProvider implements TelematicsProvider
    api.ts         — REST client (fetch wrapper + retry)
    webhook-parser.ts — Bouncie payload → ProviderEvent[]
    types.ts       — raw Bouncie types (internal)
  ingest.ts        — tenant-scoped DB writes
  sync.ts          — backfill / reconciliation
  alerts.ts        — event → severity → notifications dispatch
```

Interface shape:

```typescript
export interface TelematicsProvider {
  name: 'bouncie'

  // OAuth
  buildAuthorizationUrl(state: string, redirectUri: string): string
  exchangeCodeForToken(code: string, redirectUri: string): Promise<OAuthTokens>
  refreshAccessToken(refreshToken: string): Promise<OAuthTokens>
  revokeToken(accessToken: string): Promise<void>

  // Pull
  listVehicles(accessToken: string): Promise<ProviderVehicle[]>
  listTrips(accessToken: string, imei: string, since: Date): Promise<ProviderTrip[]>

  // Webhook
  verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean
  parseWebhookPayload(rawBody: string): ProviderEvent[]
}
```

All DTOs (`ProviderVehicle`, `ProviderTrip`, `ProviderEvent`, `OAuthTokens`) are provider-neutral. Dashboard pages never import anything from `bouncie/`.

### 5.2 OAuth flow (tenant connects Bouncie)

```
/dashboard/integrations/bouncie → "Connect Bouncie"
  → server action: check isFeatureEnabled(tenantId, 'bouncie_telematics')  ← gating at API level
  → generate signed-cookie nonce `state`, build authorization URL
  → 302 to Bouncie authorize
  → user approves → Bouncie redirects to /api/telematics/oauth/callback?code=&state=
  → verify feature flag again (defense in depth)
  → verify state matches cookie
  → provider.exchangeCodeForToken(code, redirectUri)
  → upsert telematics_connections (tenant_id)
  → provider.listVehicles() → upsert telematics_devices (car_id=null initially)
  → redirect to /dashboard/telematics/devices
```

**Gating at API level (NOT only in middleware):** both `/api/telematics/oauth/start` and `/api/telematics/oauth/callback` call `isFeatureEnabled(tenantId, 'bouncie_telematics')` and return 403/redirect-to-billing if false. Middleware gating `/dashboard/*` is insufficient because API routes are excluded from the middleware matcher.

**Error-path hygiene in callback:**
  - Any failure (invalid state, token exchange error, user not auth'd, feature flag off) redirects to a single generic URL `/dashboard/integrations/bouncie?error=auth_failed`. Do NOT expose distinct error codes to the client (prevents CSRF-probe fingerprinting).
  - The `bouncie_oauth_state` cookie is deleted unconditionally at the start of the callback (both success and failure) so the nonce is single-use.
  - Detailed failure reason is logged server-side only.

**Disconnect** — button in Integrations/Bouncie:
  - `provider.revokeToken(access_token)`
  - `UPDATE telematics_connections SET status='disconnected', access_token=null, refresh_token=null`
  - Devices and historical data preserved (so mileage history isn't lost).

**Token refresh** — before every outbound Bouncie API call: if `token_expires_at < now() + 60s`, call `refreshAccessToken`, store new tokens. If refresh fails, set `status='expired'` and emit `connection_expired` event. **Never log the raw HTTP response body** from the token endpoint — it contains the bearer tokens.

### 5.3 Webhook handler — `POST /api/telematics/webhook/bouncie`

1. **Body size guard** — reject `content-length > 1 MiB` with 413 before reading.
2. Read `rawBody` as text (HMAC requires byte-exact input).
3. `provider.verifyWebhookSignature(rawBody, req.headers.get('x-bouncie-signature'))` — on failure return 401.
4. `provider.parseWebhookPayload(rawBody)` → `ProviderEvent[]`. Cap at 100 events per batch; drop overflow with a warn log.
5. **Timestamp freshness** — reject each event whose `occurred_at` is more than 300 s from server clock in either direction (replay-attack defense, matches the Stripe webhook 5-min window already used in this codebase).
6. For each event:
   - **Device lookup MUST JOIN `telematics_connections` with status='active'** — this prevents a malicious or stale IMEI from routing data to the wrong tenant even if UNIQUE(tenant_id, imei) would theoretically allow two tenants to register the same IMEI:
     ```sql
     SELECT td.id, td.tenant_id, td.car_id
     FROM telematics_devices td
     JOIN telematics_connections tc ON tc.id = td.connection_id
     WHERE td.imei = $1 AND tc.status = 'active'
     LIMIT 1
     ```
   - If no device matched, log and ack 200 (tenant hasn't linked yet, or connection inactive).
   - Dispatch by `event.type`:
     - `location_update` → INSERT `telematics_positions` + UPDATE `cars.{mileage, last_lat, last_lon, last_seen_at}` (mileage monotonic max, enforced by DB trigger).
     - `trip_end` → INSERT `telematics_trips` (dedup on `bouncie_trip_id`); attempt reservation match by `tenant_id + car_id + started_at` inside pickup/return window → set `reservation_id`.
     - `geofence_enter/exit`, `speed_exceeded`, `hard_braking`, `hard_accel`, `battery_low`, `dtc_new/cleared`, `offline/online` → INSERT `telematics_events` → `alerts.dispatch(event)`.
7. **Log safety** — any caught exception is logged as `{ imei, event_type, message }` only; never spread the raw error object (which may include tokens from a failed refresh). Helper: `safeErrorMessage(err)` strips URLs and bearer tokens.
8. Return 200 within ~1s. If p95 exceeds 2s in production, migrate heavy work to a Supabase Edge Function queue.

### 5.4 Pull backfill (cron every 5 min)

`netlify/functions/telematics-sync.ts`:
- For each `telematics_connections WHERE status='active'`:
  - Refresh token if within 60s of expiry; on failure mark `expired` and emit `connection_expired`.
  - `provider.listVehicles()` → reconcile positions/mileage (idempotent; `last_seen_at` as high-water mark).
  - `UPDATE telematics_connections SET last_sync_at = now()`.

### 5.5 Secrets

`.env.local` and Netlify env vars:
```
BOUNCIE_CLIENT_ID=...
BOUNCIE_CLIENT_SECRET=...
BOUNCIE_WEBHOOK_SECRET=...
BOUNCIE_REDIRECT_URI=https://app.epuredrive.com/api/telematics/oauth/callback
```

Tokens stored in `telematics_connections`; Supabase at-rest encryption is sufficient (no pgcrypto column encryption for MVP).

## 6. UI — pages and components

All pages follow the existing dashboard conventions: dark theme, `PageHeader`, `StatCard`, `glass` sidebar, Tailwind, server components with `'use client'` islands for interactivity.

**Map library:** `react-leaflet` + OpenStreetMap tiles (free, no API key). `leaflet-draw` for polygon editing. `@turf/boolean-point-in-polygon` for geofence evaluation.

**Realtime model:** polling every 15s on Live Map and Alerts (no Supabase realtime for MVP — simpler; migrate later if needed).

### 6.1 Sidebar entry

New `NAV` group added to `components/dashboard/Sidebar.tsx`:

```typescript
{
  label: 'Telematics',
  children: [
    { label: 'Live Map',   href: '/dashboard/telematics' },
    { label: 'Trips',      href: '/dashboard/telematics/trips' },
    { label: 'Alerts',     href: '/dashboard/telematics/alerts' },
    { label: 'Geofences',  href: '/dashboard/telematics/geofences' },
    { label: 'Devices',    href: '/dashboard/telematics/devices' },
  ],
}
```

Plus new item under Integrations: `{ label: 'Bouncie', href: '/dashboard/integrations/bouncie' }`.

Both the group and the Bouncie item are hidden when `featureFlags['bouncie_telematics']` is false (same pattern as `turo_sync`, `quickbooks_sync`). Middleware redirects `/dashboard/telematics/*` to `/dashboard/settings/billing` when flag is false.

### 6.2 Live Map — `/dashboard/telematics`

- Top: `PageHeader` + KPI row (online count, unacked alerts, miles today, avg speed today).
- Main: fullscreen Leaflet map with vehicle markers colored by status (moving/idle/offline).
- Marker click → right-side drawer: plate, active reservation link (if any), last-seen, mileage, last 3 events, "Go to car details" button.
- Right sidebar: searchable car list with status filter; click flies map to car.
- Polling: refetch `cars.last_lat/lon/last_seen_at` every 15s.

### 6.3 Trips — `/dashboard/telematics/trips`

- Filters: date range (default last 7d), car multi-select, min distance.
- Table: Date/Time · Car · Start→End addresses · Distance · Duration · Max speed · Events badge · Reservation badge (clickable link if matched) · Actions.
- Row click → modal with map route (polyline of positions between `started_at` and `ended_at`) + event timeline.
- Export CSV button.

### 6.4 Alerts — `/dashboard/telematics/alerts`

- Filters: status (Unacked/Acked/All), severity, type, car, date range.
- List grouped by day, color-coded by severity.
- Row: icon + type label · car + plate · time · location (mini-map on hover) · Ack button · View-on-map button · Go-to-car.
- Bulk ack for selected rows.
- Polling: refetch every 15s; animate `NotificationBell` on new unacked.

### 6.5 Geofences — `/dashboard/telematics/geofences`

- Left panel: list of geofences (name, kind, applies-to summary, active toggle).
- Right: Leaflet map with `leaflet-draw` tools; selected geofence polygon is editable.
- Form: name, kind (allowed/forbidden), applies-to (all / specific cars with picker), speed_limit_mph (optional), active.
- Save server action **MUST validate** the submitted polygon with a Zod schema before upserting:
  ```
  polygon: {
    type: 'Polygon',
    coordinates: [[[lon, lat], ...]]   // at least 1 ring, each ring ≤ 100 vertices
  }
  ```
  Reject malformed input with 400; a 10k-vertex polygon would DoS every `location_update` event (O(n) point-in-polygon per active geofence per tenant). This cap is also enforced client-side in `leaflet-draw` as a UI hint, but server-side is authoritative.
- Upsert into `telematics_geofences` with GeoJSON polygon.

### 6.6 Devices — `/dashboard/telematics/devices`

- Filters: All / Linked / Unlinked. "Refresh from Bouncie" button.
- Table row: device (nickname + IMEI) · status (online + battery voltage) · linked car (change dropdown) · VIN · actions (Edit nickname, Unlink).
- VIN auto-link suggestion: if `telematics_devices.vin` matches any `cars.vin` in tenant, show "Auto-link to [car]" banner.

### 6.7 Integrations/Bouncie — `/dashboard/integrations/bouncie`

- **Not connected**: card with "Connect Bouncie" CTA starting OAuth flow.
- **Connected**: account email, connected_at, last_sync_at, devices count (total + linked), status badge.
- Actions: "Sync now" (triggers pull sync), "Disconnect" (revokes token).
- Sticky banner if `status='expired'` → "Re-authenticate" CTA.

### 6.8 Shared components

In `components/telematics/`:
`FleetMap.tsx`, `VehicleMarker.tsx`, `VehicleDrawer.tsx`, `KpiRow.tsx`, `TripMap.tsx`, `AlertRow.tsx`, `GeofenceEditor.tsx`, `DeviceRow.tsx`, `LinkCarDropdown.tsx`.

## 7. Mileage auto-sync — interaction with existing features

When `cars.telematics_device_id` is set:
- Every `location_update` webhook updates `cars.mileage` to `max(cars.mileage, odometer_mi)` — monotonic; never decreases.
- `reservations.odometer_in/out` forms propose auto-fill from current mileage on pickup/return; staff may override.
- `FleetMileagePanel` (existing in maintenance) shows an "auto" vs "manual" badge next to mileage.
- Existing maintenance triggers (service-due-at-X-miles) are unchanged — they read `cars.mileage` regardless of source.

## 8. Alerts pipeline & notifications

`lib/telematics/alerts.ts`:

```
dispatch(event, { tenant_id, car_id })
  → INSERT telematics_events (always)
  → severity = rulesFor(event.type, event.payload)
  → if severity='critical' → INSERT notifications + send email
  → if severity='warning'  → INSERT notifications; email only if tenant opt-in
  → if severity='info'     → only event row
```

Severity matrix (MVP):

| Event | Severity | Bell | Email |
|---|---|---|---|
| `geofence_exit` (forbidden zone) | critical | ✓ | ✓ |
| `geofence_exit` (allowed zone, moving outside) | warning | ✓ | opt-in |
| `speed_exceeded` | warning | ✓ | opt-in |
| `hard_braking` | info | — | — |
| `hard_accel` | info | — | — |
| `dtc_new` | warning | ✓ | opt-in |
| `dtc_cleared` | info | — | — |
| `battery_low` (<12V) | warning | ✓ | opt-in |
| `offline` (>6h) | warning | ✓ | — |
| `connection_expired` (OAuth refresh failed) | critical | ✓ | ✓ |

**Authoritative geofence kind — MUST come from DB, not webhook payload.** When classifying a `geofence_exit` or `geofence_enter` event, resolve `kind` (`allowed` vs `forbidden`) by looking up `telematics_geofences.id = event.payload.geofence_id` for the tenant. Do NOT trust `event.payload.geofence_kind` or any other payload field, because the webhook payload is attacker-influenceable (e.g., via replay with a modified body that happens to match a different signature vector). The DB row is tenant-controlled and authoritative.

Email opt-ins managed in `/dashboard/settings/notifications` (existing page — new "Telematics" section added).

## 9. Plan gating & feature flag

Uses the existing two-table feature-flag system (`feature_flags` global defaults + `tenant_feature_flags` per-tenant overrides; override-wins precedence — see `lib/supabase/feature-flags.ts`).

- INSERT global default row `feature_flags(key='bouncie_telematics', enabled=false)`.
- Stripe webhook (`app/api/stripe/webhook/route.ts`) on Pro/Max plan activation: upsert `tenant_feature_flags(tenant_id, flag_key='bouncie_telematics', enabled=true)`. On downgrade to Starter: delete the override row (or set enabled=false) so the global default takes over.
- `Sidebar.tsx` already consumes `featureFlags` prop; hide the Telematics group and Integrations/Bouncie item when `featureFlags['bouncie_telematics']` is false (matching the pattern used for `turo_sync` and `quickbooks_sync`).
- `middleware.ts` blocks `/dashboard/telematics/*` and `/dashboard/integrations/bouncie` when the flag resolves false → redirect to `/dashboard/settings/billing` with flash message "Upgrade to Pro to enable Telematics."

## 10. Testing

**Unit (Jest)**
- `BouncieProvider.verifyWebhookSignature` — valid and invalid HMAC fixtures.
- `BouncieProvider.parseWebhookPayload` — fixtures for each `event_type`.
- `BouncieProvider.exchangeCodeForToken` / `refreshAccessToken` — mocked fetch.
- `alerts.dispatch` severity rules per event type.
- Geofence point-in-polygon edge cases (on edge, exactly on vertex, polygon with hole).
- Token refresh boundary (expires_at < now+60s).

**Integration**
- Webhook endpoint end-to-end against a Supabase test schema: POST payload → assert rows in `telematics_positions/events/trips`, `cars.mileage` updated, notifications created.
- OAuth callback round-trip with mocked Bouncie authorize + token endpoints.
- Pull sync idempotency — run twice, no duplicate positions.

**E2E (Playwright)**
- Pro tenant: open `/dashboard/integrations/bouncie` → mock OAuth → redirected to `/dashboard/telematics/devices` → link a device to a car → verify marker appears on Live Map.
- Starter tenant: `/dashboard/telematics` returns redirect to billing with correct flash message; Telematics group not present in sidebar.

**Coverage target:** 80%+ in `lib/telematics/` and `app/api/telematics/`.

## 11. Out of scope (explicit non-goals for this release)

- Per-renter driver scoring (requires associating drives to `customer_id`; future phase if requested).
- Detailed per-reservation driving log view — we do reservation matching for trips, but not a dedicated UI.
- Remote lock/unlock (Bouncie doesn't support it well).
- SMS notifications (bell + email only).
- Multi-provider simultaneously active for one tenant (one provider per tenant; architecture allows adding Smartcar, Samsara, etc. later as separate adapters).
- Smartcar, Samsara, Tesla API adapters (Bouncie only for this release).
- Telematics-specific exportable reports beyond the Trips CSV export.
- Supabase realtime / WebSocket UI updates (polling only for MVP).

## 12. File layout (new and modified)

**New**
```
lib/telematics/
  provider.ts
  types.ts
  registry.ts
  ingest.ts
  sync.ts
  alerts.ts
  bouncie/
    index.ts
    api.ts
    webhook-parser.ts
    types.ts

app/api/telematics/
  oauth/start/route.ts
  oauth/callback/route.ts
  webhook/bouncie/route.ts

app/(dashboard)/dashboard/telematics/
  layout.tsx
  page.tsx              ← Live Map
  trips/page.tsx
  alerts/page.tsx
  geofences/page.tsx
  devices/page.tsx

app/(dashboard)/dashboard/integrations/bouncie/
  page.tsx
  actions.ts

components/telematics/
  FleetMap.tsx
  VehicleMarker.tsx
  VehicleDrawer.tsx
  KpiRow.tsx
  TripMap.tsx
  TripDetailModal.tsx
  AlertRow.tsx
  GeofenceEditor.tsx
  GeofenceList.tsx
  DeviceRow.tsx
  LinkCarDropdown.tsx

netlify/functions/
  telematics-sync.ts         ← every 5 min (pull reconcile)
  telematics-positions-prune.ts ← daily (90d retention delete)

supabase/migrations/
  YYYYMMDDhhmmss_telematics_initial.sql

__tests__/telematics/
  bouncie-webhook-parser.test.ts
  bouncie-hmac.test.ts
  alerts-dispatch.test.ts
  geofence-eval.test.ts

e2e/
  telematics-connect.spec.ts
  telematics-gating.spec.ts
```

**Modified**
- `components/dashboard/Sidebar.tsx` — add Telematics group + Bouncie under Integrations + flag hiding.
- `middleware.ts` — gate `/dashboard/telematics/*` and `/dashboard/integrations/bouncie` by `bouncie_telematics` flag.
- `lib/supabase/types.ts` — add `Car` telematics fields; add new interfaces `TelematicsDevice`, `TelematicsPosition`, `TelematicsTrip`, `TelematicsEvent`, `TelematicsGeofence`, `TelematicsConnection`.
- `app/api/stripe/webhook/route.ts` — flip `bouncie_telematics` flag on Pro/Max plan activation.
- `app/(dashboard)/dashboard/maintenance/FleetMileagePanel.tsx` — show "auto" badge when `cars.telematics_device_id` is set.
- `app/(dashboard)/dashboard/settings/notifications/*` — add Telematics opt-in section.
- `.env.local` + Netlify env vars — add Bouncie secrets.

## 13. Security hardening (applied pre-implementation)

Consolidated security requirements — the implementation plan enforces these as explicit test cases and code comments. All items here were surfaced by a pre-implementation security audit on 2026-04-23 and MUST be honored.

### 13.1 Webhook hardening
- **HMAC verification before any parsing** (Bouncie-shared secret from `BOUNCIE_WEBHOOK_SECRET`, SHA-256, constant-time `timingSafeEqual`, strict hex-length regex `^[0-9a-f]{64}$` pre-check).
- **Timestamp freshness check** — reject events older than 300 s or in the future (matches the project's existing Stripe webhook policy).
- **Body size cap** — reject `content-length > 1 MiB` with 413.
- **Batch cap** — drop events beyond the first 100 in a single payload.
- **Device lookup JOINS `telematics_connections` with status='active'** to prevent cross-tenant IMEI routing.
- **Error logging sanitized** — never log raw error objects from Bouncie API calls (may contain tokens). Use `safeErrorMessage(err)` helper.

### 13.2 OAuth hardening
- Both `/api/telematics/oauth/start` and `/api/telematics/oauth/callback` check `isFeatureEnabled(tenantId, 'bouncie_telematics')` and reject at API level — middleware gating is insufficient because API routes are not under `/dashboard/*`.
- State nonce = `crypto.randomBytes(16).toString('hex')`, stored in `httpOnly + secure + sameSite=lax` cookie with 600 s TTL.
- Callback error path always deletes the state cookie and redirects with a single generic `?error=auth_failed` — never exposes specific error codes to the client.
- Token endpoint response bodies are never logged (would include bearer tokens).

### 13.3 Geofence input validation
- Server action validates polygon with Zod before upsert.
- Polygon schema: `{ type: 'Polygon', coordinates: [[[lon, lat], ...]] }`, minimum 1 ring, each ring ≤ 100 vertices.
- Invalid input → 400, no DB write.

### 13.4 Authoritative severity resolution
- Geofence severity (critical for `forbidden` zones) is resolved from `telematics_geofences.kind` in the DB at alert-dispatch time, NOT from the webhook payload.

### 13.5 Tenant-scoped actions
- `syncNowAction` in `/dashboard/integrations/bouncie/actions.ts` MUST sync only the calling user's tenant connection. It never invokes the cron handler directly (which iterates all tenants).

### 13.6 RLS posture
- `telematics_positions` and `telematics_trips` expose **only SELECT** policies to user-auth clients. All writes are service-role (webhook + cron). A comment in the migration file explicitly warns against adding INSERT policies in future PRs — doing so would be a security regression.

### 13.7 Data retention & deletion
- 90-day position prune is automated (daily Netlify cron).
- Tenant account deletion must trigger a **hard delete** of the `telematics_connections` row (not merely `status='disconnected'`) to cascade-delete all downstream PII (`telematics_devices`, `telematics_positions`, `telematics_trips`, `telematics_events`).
- Telematics data is PII under GDPR/CCPA — if a tenant or an end-customer invokes a deletion right, the cascade chain above MUST be exercised.

### 13.8 Secret rotation runbook
- `BOUNCIE_WEBHOOK_SECRET` rotation: (1) generate new secret, (2) set `BOUNCIE_WEBHOOK_SECRET_PREV` in env to old value, (3) `verifyWebhookSignature` accepts either secret during the transition, (4) update Bouncie's webhook config, (5) remove `BOUNCIE_WEBHOOK_SECRET_PREV` after 24 h.
- OAuth app credentials (`BOUNCIE_CLIENT_ID` / `BOUNCIE_CLIENT_SECRET`): rotation requires Bouncie app re-issue; notify tenants that re-authentication is required.

### 13.9 At-rest token storage
- OAuth tokens in `telematics_connections` are encrypted at rest by Supabase's default encryption. Column-level pgcrypto encryption is a tracked Post-MVP backlog item — not blocking MVP ship.

## 14. Open questions / follow-ups (post-implementation)

- Is there a reliable Bouncie sandbox environment for integration tests? If not, we need fixture-based tests.
- What's the billing model if a tenant's Bouncie subscription lapses on Bouncie's side (we can't detect it directly — API returns 401)? Current plan: mark connection `status='expired'`, surface in UI; tenant resolves on Bouncie's side + reconnects.
- Geofence polygon complexity limits — cap at e.g. 100 vertices per polygon to keep point-in-polygon checks fast at high event volume.
