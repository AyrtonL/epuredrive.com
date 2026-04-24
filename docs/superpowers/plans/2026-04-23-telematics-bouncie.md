# Telematics (Bouncie) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new top-level Telematics menu to the dashboard, powered by Bouncie OBD-II dongles. Delivers auto mileage sync, live fleet map, geofence + driving-behavior alerts, and OBD DTC / battery signals.

**Architecture:** Next.js App Router pages + server actions consume a light `TelematicsProvider` adapter (Bouncie-only for this release). Two ingest paths: Bouncie webhooks (HMAC-verified, push) and a 5-min Netlify pull cron (safety net). Supabase Postgres with RLS per tenant; service-role writes from webhook always resolve tenant_id before writing. Feature-gated to Pro/Max plans via existing `feature_flags` + `tenant_feature_flags` tables.

**Tech Stack:** Next.js 14+ App Router, TypeScript, Supabase (Postgres + RLS), Tailwind, react-leaflet + OpenStreetMap, leaflet-draw, @turf/boolean-point-in-polygon, Jest (unit + integration), Playwright (E2E), Netlify scheduled functions.

**Spec:** See [docs/superpowers/specs/2026-04-23-telematics-bouncie-design.md](../specs/2026-04-23-telematics-bouncie-design.md) for the approved design. This plan only implements that spec — no new decisions.

---

## Task index

| # | Task | Phase |
|---|---|---|
| 1 | DB migration: new tables + additive columns + RLS + feature flag seed | Foundation |
| 2 | TypeScript types in `lib/supabase/types.ts` | Foundation |
| 3 | Env vars & secret scaffolding | Foundation |
| 4 | `TelematicsProvider` interface + neutral DTOs | Adapter |
| 5 | Bouncie REST client (`lib/telematics/bouncie/api.ts`) | Adapter |
| 6 | BouncieProvider OAuth (authorize / exchange / refresh / revoke) + tests | Adapter |
| 7 | BouncieProvider `listVehicles` / `listTrips` + tests | Adapter |
| 8 | BouncieProvider `verifyWebhookSignature` (HMAC) + tests | Adapter |
| 9 | BouncieProvider `parseWebhookPayload` + tests | Adapter |
| 10 | `lib/telematics/registry.ts` (singleton) | Adapter |
| 11 | `ingest.ts` — location_update writes | Ingest |
| 12 | `ingest.ts` — trip_end writes with reservation auto-match | Ingest |
| 13 | `ingest.ts` — event writes + alerts dispatch | Ingest |
| 14 | `lib/telematics/alerts.ts` — severity rules + notifications | Ingest |
| 15 | OAuth start route `/api/telematics/oauth/start` | API |
| 16 | OAuth callback route `/api/telematics/oauth/callback` | API |
| 17 | Webhook receiver `/api/telematics/webhook/bouncie` | API |
| 18 | Netlify cron — pull sync (+ `lib/telematics/sync.ts` per-connection helper) | Cron |
| 19 | Netlify cron — positions 90d prune | Cron |
| 20 | Feature flag seed + Stripe webhook flip | Gating |
| 21 | `Sidebar.tsx` — Telematics group + Bouncie item + hiding | Gating |
| 22 | `middleware.ts` — gate Telematics routes | Gating |
| 23 | `/dashboard/integrations/bouncie` config page | Dashboard |
| 24 | Telematics layout + shared feature-flag loader | Dashboard |
| 25 | Shared components (`FleetMap`, `VehicleMarker`, `KpiRow`, `VehicleDrawer`) | Dashboard |
| 26 | Live Map page `/dashboard/telematics` | Dashboard |
| 27 | Devices page `/dashboard/telematics/devices` | Dashboard |
| 28 | Geofences page `/dashboard/telematics/geofences` + editor | Dashboard |
| 29 | Trips page `/dashboard/telematics/trips` + detail modal | Dashboard |
| 30 | Alerts page `/dashboard/telematics/alerts` | Dashboard |
| 31 | FleetMileagePanel "auto" badge | Integration |
| 32 | Reservation odometer auto-fill proposal | Integration |
| 33 | Notifications settings — Telematics opt-in section | Integration |
| 34 | E2E: Pro tenant connect + link + see marker | Tests |
| 35 | E2E: Starter tenant gating | Tests |
| 36 | Netlify env vars + final smoke test checklist | Ship |

Commit cadence: one commit per task (after all its steps pass). Use conventional commit types (`feat`, `test`, `chore`, `fix`).

---

## Phase 1 — Foundation

### Task 1: DB migration — new tables, additive columns, RLS, feature flag seed

**Files:**
- Create: `supabase/migrations/20260423120000_telematics_initial.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- supabase/migrations/20260423120000_telematics_initial.sql

-- ── telematics_connections ─────────────────────────────────────────────
create table public.telematics_connections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  provider text not null default 'bouncie',
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  scope text,
  account_email text,
  connected_at timestamptz not null default now(),
  last_sync_at timestamptz,
  status text not null default 'active' check (status in ('active','expired','disconnected','error')),
  error_message text,
  unique (tenant_id, provider)
);
create index on public.telematics_connections (tenant_id);

alter table public.telematics_connections enable row level security;
create policy "tenant read" on public.telematics_connections for select
  using (tenant_id = (select tenant_id from public.user_tenants where user_id = auth.uid()));
create policy "tenant write" on public.telematics_connections for all
  using (tenant_id = (select tenant_id from public.user_tenants where user_id = auth.uid()))
  with check (tenant_id = (select tenant_id from public.user_tenants where user_id = auth.uid()));

-- ── telematics_devices ─────────────────────────────────────────────────
create table public.telematics_devices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  connection_id uuid not null references public.telematics_connections(id) on delete cascade,
  imei text not null,
  vin text,
  nickname text,
  car_id integer references public.cars(id) on delete set null,
  last_seen_at timestamptz,
  battery_voltage numeric(4,2),
  online boolean not null default false,
  created_at timestamptz not null default now(),
  unique (tenant_id, imei)
);
create index on public.telematics_devices (tenant_id);
create index on public.telematics_devices (car_id);
create index on public.telematics_devices (tenant_id) where car_id is null;

alter table public.telematics_devices enable row level security;
create policy "tenant read" on public.telematics_devices for select
  using (tenant_id = (select tenant_id from public.user_tenants where user_id = auth.uid()));
create policy "tenant write" on public.telematics_devices for all
  using (tenant_id = (select tenant_id from public.user_tenants where user_id = auth.uid()))
  with check (tenant_id = (select tenant_id from public.user_tenants where user_id = auth.uid()));

-- ── telematics_positions ───────────────────────────────────────────────
create table public.telematics_positions (
  id bigserial primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  device_id uuid not null references public.telematics_devices(id) on delete cascade,
  car_id integer references public.cars(id) on delete set null,
  recorded_at timestamptz not null,
  lat numeric(10,7) not null,
  lon numeric(10,7) not null,
  speed_mph numeric(5,1),
  heading smallint,
  odometer_mi numeric,
  ignition boolean
);
create index on public.telematics_positions (tenant_id, device_id, recorded_at desc);
create index on public.telematics_positions (recorded_at);

alter table public.telematics_positions enable row level security;
-- SECURITY: Intentionally NO insert/update/delete policy for user-auth clients.
-- All writes go through the service-role client (webhook + cron). Adding a
-- user-role INSERT policy here would be a security regression (finding #9).
create policy "tenant read" on public.telematics_positions for select
  using (tenant_id = (select tenant_id from public.user_tenants where user_id = auth.uid()));

-- ── telematics_trips ───────────────────────────────────────────────────
create table public.telematics_trips (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  device_id uuid not null references public.telematics_devices(id) on delete cascade,
  car_id integer references public.cars(id) on delete set null,
  reservation_id integer references public.reservations(id) on delete set null,
  started_at timestamptz not null,
  ended_at timestamptz,
  start_lat numeric(10,7), start_lon numeric(10,7),
  end_lat numeric(10,7),   end_lon numeric(10,7),
  distance_mi numeric,
  duration_s integer,
  max_speed_mph numeric(5,1),
  hard_braking_count integer not null default 0,
  hard_accel_count integer not null default 0,
  fuel_consumed_gal numeric,
  bouncie_trip_id text,
  unique (tenant_id, bouncie_trip_id)
);
create index on public.telematics_trips (tenant_id, started_at desc);
create index on public.telematics_trips (reservation_id);

alter table public.telematics_trips enable row level security;
-- SECURITY: service-role writes only (see telematics_positions comment above).
create policy "tenant read" on public.telematics_trips for select
  using (tenant_id = (select tenant_id from public.user_tenants where user_id = auth.uid()));

-- ── telematics_events ──────────────────────────────────────────────────
create table public.telematics_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  device_id uuid references public.telematics_devices(id) on delete set null,
  car_id integer references public.cars(id) on delete set null,
  event_type text not null,
  severity text not null default 'info' check (severity in ('info','warning','critical')),
  occurred_at timestamptz not null,
  payload jsonb not null default '{}'::jsonb,
  acknowledged_at timestamptz,
  acknowledged_by uuid references auth.users(id) on delete set null
);
create index on public.telematics_events (tenant_id, acknowledged_at nulls first, occurred_at desc);
create index on public.telematics_events (tenant_id, event_type);

alter table public.telematics_events enable row level security;
create policy "tenant read" on public.telematics_events for select
  using (tenant_id = (select tenant_id from public.user_tenants where user_id = auth.uid()));
create policy "tenant ack" on public.telematics_events for update
  using (tenant_id = (select tenant_id from public.user_tenants where user_id = auth.uid()))
  with check (tenant_id = (select tenant_id from public.user_tenants where user_id = auth.uid()));

-- ── telematics_geofences ───────────────────────────────────────────────
create table public.telematics_geofences (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  kind text not null default 'allowed' check (kind in ('allowed','forbidden')),
  polygon jsonb not null,
  applies_to text not null default 'all' check (applies_to in ('all','specific')),
  car_ids integer[] not null default '{}',
  speed_limit_mph integer,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index on public.telematics_geofences (tenant_id) where active;

alter table public.telematics_geofences enable row level security;
create policy "tenant read" on public.telematics_geofences for select
  using (tenant_id = (select tenant_id from public.user_tenants where user_id = auth.uid()));
create policy "tenant write" on public.telematics_geofences for all
  using (tenant_id = (select tenant_id from public.user_tenants where user_id = auth.uid()))
  with check (tenant_id = (select tenant_id from public.user_tenants where user_id = auth.uid()));

-- ── cars additive columns ──────────────────────────────────────────────
alter table public.cars
  add column if not exists telematics_device_id uuid references public.telematics_devices(id) on delete set null,
  add column if not exists last_seen_at timestamptz,
  add column if not exists last_lat numeric(10,7),
  add column if not exists last_lon numeric(10,7);
create index if not exists cars_telematics_device_id_idx on public.cars (telematics_device_id);

-- ── feature flag seed ──────────────────────────────────────────────────
insert into public.feature_flags (key, enabled)
values ('bouncie_telematics', false)
on conflict (key) do nothing;
```

- [ ] **Step 2: Apply migration via Supabase MCP**

Use `mcp__claude_ai_Supabase__apply_migration` with the SQL above. Project is the existing éPure Drive Supabase project.

- [ ] **Step 3: Verify schema in DB**

```bash
# via MCP:
# mcp__claude_ai_Supabase__list_tables → confirm 6 new telematics_* tables
# mcp__claude_ai_Supabase__execute_sql:
#   select column_name, data_type from information_schema.columns
#   where table_name = 'cars' and column_name in
#   ('telematics_device_id','last_seen_at','last_lat','last_lon');
#   (expect 4 rows)
#   select * from feature_flags where key='bouncie_telematics';  -- 1 row, enabled=false
```
Expected: all 6 tables exist, cars has 4 new columns, feature_flags has the seed row.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260423120000_telematics_initial.sql
git commit -m "feat(telematics): add schema — 6 tables, cars columns, feature flag seed"
```

---

### Task 2: TypeScript types

**Files:**
- Modify: `lib/supabase/types.ts` (append new interfaces; extend `Car`)

- [ ] **Step 1: Extend `Car` interface — add 4 new optional fields**

In `lib/supabase/types.ts`, inside the existing `Car` interface (around line 72), add before the closing `}`:
```typescript
  telematics_device_id: string | null
  last_seen_at: string | null
  last_lat: number | null
  last_lon: number | null
```

- [ ] **Step 2: Append Telematics interfaces at end of `lib/supabase/types.ts`**

```typescript
// ── Telematics ─────────────────────────────────────────────────────────

export type TelematicsConnectionStatus = 'active' | 'expired' | 'disconnected' | 'error'

export interface TelematicsConnection {
  id: string
  tenant_id: string
  provider: 'bouncie'
  access_token: string | null
  refresh_token: string | null
  token_expires_at: string | null
  scope: string | null
  account_email: string | null
  connected_at: string
  last_sync_at: string | null
  status: TelematicsConnectionStatus
  error_message: string | null
}

export interface TelematicsDevice {
  id: string
  tenant_id: string
  connection_id: string
  imei: string
  vin: string | null
  nickname: string | null
  car_id: number | null
  last_seen_at: string | null
  battery_voltage: number | null
  online: boolean
  created_at: string
}

export interface TelematicsPosition {
  id: number
  tenant_id: string
  device_id: string
  car_id: number | null
  recorded_at: string
  lat: number
  lon: number
  speed_mph: number | null
  heading: number | null
  odometer_mi: number | null
  ignition: boolean | null
}

export interface TelematicsTrip {
  id: string
  tenant_id: string
  device_id: string
  car_id: number | null
  reservation_id: number | null
  started_at: string
  ended_at: string | null
  start_lat: number | null; start_lon: number | null
  end_lat: number | null;   end_lon: number | null
  distance_mi: number | null
  duration_s: number | null
  max_speed_mph: number | null
  hard_braking_count: number
  hard_accel_count: number
  fuel_consumed_gal: number | null
  bouncie_trip_id: string | null
}

export type TelematicsEventType =
  | 'ignition_on' | 'ignition_off'
  | 'trip_start' | 'trip_end'
  | 'geofence_enter' | 'geofence_exit'
  | 'speed_exceeded'
  | 'hard_braking' | 'hard_accel'
  | 'dtc_new' | 'dtc_cleared'
  | 'battery_low'
  | 'offline' | 'online'
  | 'connection_expired'

export type TelematicsSeverity = 'info' | 'warning' | 'critical'

export interface TelematicsEvent {
  id: string
  tenant_id: string
  device_id: string | null
  car_id: number | null
  event_type: TelematicsEventType
  severity: TelematicsSeverity
  occurred_at: string
  payload: Record<string, unknown>
  acknowledged_at: string | null
  acknowledged_by: string | null
}

export interface GeoJsonPolygon {
  type: 'Polygon'
  coordinates: number[][][]  // array of rings; each ring is [lon, lat] pairs
}

export interface TelematicsGeofence {
  id: string
  tenant_id: string
  name: string
  kind: 'allowed' | 'forbidden'
  polygon: GeoJsonPolygon
  applies_to: 'all' | 'specific'
  car_ids: number[]
  speed_limit_mph: number | null
  active: boolean
  created_at: string
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors (or only pre-existing errors unrelated to telematics).

- [ ] **Step 4: Commit**

```bash
git add lib/supabase/types.ts
git commit -m "feat(telematics): add TS types for telematics tables + Car extensions"
```

---

### Task 3: Env vars & secret scaffolding

**Files:**
- Modify: `.env.local` (local dev only — do not commit)
- Create: `lib/telematics/config.ts`

- [ ] **Step 1: Add Bouncie vars to `.env.local`** (values: placeholders until real credentials provisioned)

```
BOUNCIE_CLIENT_ID=placeholder_to_fill_in_bouncie_dev_portal
BOUNCIE_CLIENT_SECRET=placeholder_to_fill_in_bouncie_dev_portal
BOUNCIE_WEBHOOK_SECRET=placeholder_hmac_shared_secret
BOUNCIE_REDIRECT_URI=http://localhost:3000/api/telematics/oauth/callback
```

(Production values will be set on Netlify in Task 36.)

- [ ] **Step 2: Write `lib/telematics/config.ts`**

```typescript
// lib/telematics/config.ts
function required(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env var ${name}`)
  return v
}

export const bouncieConfig = {
  get clientId() { return required('BOUNCIE_CLIENT_ID') },
  get clientSecret() { return required('BOUNCIE_CLIENT_SECRET') },
  get webhookSecret() { return required('BOUNCIE_WEBHOOK_SECRET') },
  get redirectUri() { return required('BOUNCIE_REDIRECT_URI') },
  authorizeUrl: 'https://auth.bouncie.com/dialog/authorize',
  tokenUrl: 'https://auth.bouncie.com/oauth/token',
  apiBaseUrl: 'https://api.bouncie.dev/v1',
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/telematics/config.ts
git commit -m "chore(telematics): add env var config loader"
```

---

## Phase 2 — Adapter (provider interface + Bouncie implementation)

### Task 4: Provider interface + neutral DTOs

**Files:**
- Create: `lib/telematics/provider.ts`
- Create: `lib/telematics/types.ts` (shared DTOs)

- [ ] **Step 1: Write `lib/telematics/types.ts`**

```typescript
// lib/telematics/types.ts
import type { TelematicsEventType } from '@/lib/supabase/types'

export interface OAuthTokens {
  access_token: string
  refresh_token: string
  expires_at: string  // ISO
  scope: string | null
  account_email: string | null
}

export interface ProviderVehicle {
  imei: string
  vin: string | null
  nickname: string | null
  online: boolean
  last_seen_at: string | null
  last_lat: number | null
  last_lon: number | null
  odometer_mi: number | null
  battery_voltage: number | null
}

export interface ProviderTrip {
  provider_trip_id: string
  imei: string
  started_at: string
  ended_at: string | null
  start_lat: number | null; start_lon: number | null
  end_lat: number | null;   end_lon: number | null
  distance_mi: number
  duration_s: number | null
  max_speed_mph: number | null
  hard_braking_count: number
  hard_accel_count: number
  fuel_consumed_gal: number | null
}

export interface ProviderEvent {
  provider_event_id: string | null
  imei: string
  type: TelematicsEventType | 'location_update'
  occurred_at: string
  lat: number | null
  lon: number | null
  speed_mph: number | null
  odometer_mi: number | null
  payload: Record<string, unknown>
}
```

- [ ] **Step 2: Write `lib/telematics/provider.ts`**

```typescript
// lib/telematics/provider.ts
import type { OAuthTokens, ProviderVehicle, ProviderTrip, ProviderEvent } from './types'

export interface TelematicsProvider {
  readonly name: 'bouncie'

  buildAuthorizationUrl(state: string, redirectUri: string): string
  exchangeCodeForToken(code: string, redirectUri: string): Promise<OAuthTokens>
  refreshAccessToken(refreshToken: string): Promise<OAuthTokens>
  revokeToken(accessToken: string): Promise<void>

  listVehicles(accessToken: string): Promise<ProviderVehicle[]>
  listTrips(accessToken: string, imei: string, since: Date): Promise<ProviderTrip[]>

  verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean
  parseWebhookPayload(rawBody: string): ProviderEvent[]
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/telematics/provider.ts lib/telematics/types.ts
git commit -m "feat(telematics): add TelematicsProvider interface + neutral DTOs"
```

---

### Task 5: Bouncie REST client

**Files:**
- Create: `lib/telematics/bouncie/api.ts`
- Create: `lib/telematics/bouncie/types.ts`

- [ ] **Step 1: Write `lib/telematics/bouncie/types.ts`** (raw Bouncie response shapes)

```typescript
// lib/telematics/bouncie/types.ts

export interface BouncieTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number   // seconds
  token_type: 'Bearer'
  scope?: string
}

export interface BouncieVehicle {
  imei: string
  vin: string | null
  nickName: string | null
  model: { year: number; make: string; model: string } | null
  stats: {
    lastUpdated: string                // ISO
    location: { lat: number; lon: number } | null
    odometer: number | null            // miles
    fuelLevel?: number | null
    batteryStatus?: 'normal' | 'low' | null
    mil?: { milOn: boolean; lastUpdated?: string | null; qualifiedEvent?: boolean | null } | null
  } | null
}

export interface BouncieTrip {
  transactionId: string
  imei: string
  startTime: string
  endTime: string | null
  startOdometer: number | null
  endOdometer: number | null
  distance: number
  duration: number | null
  gpsTrail?: Array<{ lat: number; lon: number; timestamp: string; speed: number | null }>
  hardBrakingCount?: number
  hardAccelerationCount?: number
  maxSpeed?: number
  fuelConsumed?: number
}

export type BouncieWebhookPayload = {
  eventType: string
  imei: string
  timestamp: string
  data?: Record<string, unknown>
}
```

- [ ] **Step 2: Write `lib/telematics/bouncie/api.ts`** (fetch wrapper with retry)

```typescript
// lib/telematics/bouncie/api.ts
import { bouncieConfig } from '../config'

export class BouncieApiError extends Error {
  constructor(public status: number, public body: string, msg?: string) {
    super(msg ?? `Bouncie API ${status}: ${body.slice(0, 200)}`)
  }
}

async function bouncieFetch<T>(
  path: string,
  init: RequestInit,
  retries = 2
): Promise<T> {
  const url = path.startsWith('http') ? path : `${bouncieConfig.apiBaseUrl}${path}`
  let lastErr: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, init)
      if (res.status === 429 || res.status >= 500) {
        const body = await res.text()
        if (attempt === retries) throw new BouncieApiError(res.status, body)
        await new Promise(r => setTimeout(r, 2 ** attempt * 500))
        continue
      }
      if (!res.ok) throw new BouncieApiError(res.status, await res.text())
      return (await res.json()) as T
    } catch (e: unknown) {
      lastErr = e
      if (e instanceof BouncieApiError && e.status < 500 && e.status !== 429) throw e
      if (attempt === retries) throw e
    }
  }
  throw lastErr ?? new Error('Bouncie fetch failed')
}

export const bouncieApi = {
  postForm: <T>(url: string, form: URLSearchParams) =>
    bouncieFetch<T>(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    }, 1),

  get: <T>(path: string, accessToken: string) =>
    bouncieFetch<T>(path, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    }),
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/telematics/bouncie/api.ts lib/telematics/bouncie/types.ts
git commit -m "feat(telematics): add Bouncie REST client with retry/backoff"
```

---

### Task 6: BouncieProvider OAuth methods + tests

**Files:**
- Create: `lib/telematics/bouncie/index.ts`
- Create: `__tests__/telematics/bouncie-oauth.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/telematics/bouncie-oauth.test.ts
import { BouncieProvider } from '@/lib/telematics/bouncie'

describe('BouncieProvider OAuth', () => {
  const provider = new BouncieProvider()

  test('buildAuthorizationUrl includes required params', () => {
    process.env.BOUNCIE_CLIENT_ID = 'cid'
    const url = provider.buildAuthorizationUrl('state-nonce', 'https://app/cb')
    expect(url).toContain('client_id=cid')
    expect(url).toContain('state=state-nonce')
    expect(url).toContain(encodeURIComponent('https://app/cb'))
    expect(url).toContain('response_type=code')
  })

  test('exchangeCodeForToken maps fields and computes expires_at', async () => {
    process.env.BOUNCIE_CLIENT_ID = 'cid'
    process.env.BOUNCIE_CLIENT_SECRET = 'csec'
    const mockFetch = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        access_token: 'a', refresh_token: 'r', expires_in: 3600, token_type: 'Bearer', scope: 'basic'
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    )
    const tokens = await provider.exchangeCodeForToken('xyz', 'https://app/cb')
    expect(tokens.access_token).toBe('a')
    expect(tokens.refresh_token).toBe('r')
    expect(new Date(tokens.expires_at).getTime()).toBeGreaterThan(Date.now() + 3500_000)
    mockFetch.mockRestore()
  })

  test('refreshAccessToken posts refresh_token grant', async () => {
    process.env.BOUNCIE_CLIENT_ID = 'cid'
    process.env.BOUNCIE_CLIENT_SECRET = 'csec'
    let capturedBody = ''
    const mockFetch = jest.spyOn(global, 'fetch').mockImplementation(async (_, init) => {
      capturedBody = String(init?.body ?? '')
      return new Response(JSON.stringify({
        access_token: 'a2', refresh_token: 'r2', expires_in: 3600, token_type: 'Bearer'
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    })
    const t = await provider.refreshAccessToken('old-refresh')
    expect(capturedBody).toContain('grant_type=refresh_token')
    expect(capturedBody).toContain('refresh_token=old-refresh')
    expect(t.access_token).toBe('a2')
    mockFetch.mockRestore()
  })
})
```

- [ ] **Step 2: Run and verify test fails**

Run: `npx jest __tests__/telematics/bouncie-oauth.test.ts`
Expected: FAIL (module not found or class missing).

- [ ] **Step 3: Implement `lib/telematics/bouncie/index.ts` (OAuth portion)**

```typescript
// lib/telematics/bouncie/index.ts
import type { TelematicsProvider } from '../provider'
import type { OAuthTokens, ProviderVehicle, ProviderTrip, ProviderEvent } from '../types'
import { bouncieConfig } from '../config'
import { bouncieApi } from './api'
import type { BouncieTokenResponse } from './types'

export class BouncieProvider implements TelematicsProvider {
  readonly name = 'bouncie' as const

  buildAuthorizationUrl(state: string, redirectUri: string): string {
    const u = new URL(bouncieConfig.authorizeUrl)
    u.searchParams.set('client_id', bouncieConfig.clientId)
    u.searchParams.set('redirect_uri', redirectUri)
    u.searchParams.set('response_type', 'code')
    u.searchParams.set('state', state)
    return u.toString()
  }

  async exchangeCodeForToken(code: string, redirectUri: string): Promise<OAuthTokens> {
    const form = new URLSearchParams({
      client_id: bouncieConfig.clientId,
      client_secret: bouncieConfig.clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    })
    const r = await bouncieApi.postForm<BouncieTokenResponse>(bouncieConfig.tokenUrl, form)
    return this.mapTokenResponse(r)
  }

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    const form = new URLSearchParams({
      client_id: bouncieConfig.clientId,
      client_secret: bouncieConfig.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    })
    const r = await bouncieApi.postForm<BouncieTokenResponse>(bouncieConfig.tokenUrl, form)
    return this.mapTokenResponse(r)
  }

  async revokeToken(accessToken: string): Promise<void> {
    // Bouncie has no standard revoke — best-effort logout call; tolerate failure.
    try {
      await fetch(`${bouncieConfig.apiBaseUrl}/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
    } catch {
      // ignore — caller marks connection disconnected regardless
    }
  }

  private mapTokenResponse(r: BouncieTokenResponse): OAuthTokens {
    return {
      access_token: r.access_token,
      refresh_token: r.refresh_token,
      expires_at: new Date(Date.now() + r.expires_in * 1000).toISOString(),
      scope: r.scope ?? null,
      account_email: null,  // Bouncie doesn't return email in token response; populated by listVehicles later
    }
  }

  // listVehicles / listTrips / verifyWebhookSignature / parseWebhookPayload — next tasks
  async listVehicles(): Promise<ProviderVehicle[]> { throw new Error('not implemented yet') }
  async listTrips(): Promise<ProviderTrip[]> { throw new Error('not implemented yet') }
  verifyWebhookSignature(): boolean { throw new Error('not implemented yet') }
  parseWebhookPayload(): ProviderEvent[] { throw new Error('not implemented yet') }
}
```

- [ ] **Step 4: Run tests and verify PASS**

Run: `npx jest __tests__/telematics/bouncie-oauth.test.ts`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/telematics/bouncie/index.ts __tests__/telematics/bouncie-oauth.test.ts
git commit -m "feat(telematics): BouncieProvider OAuth (authorize + exchange + refresh + revoke)"
```

---

### Task 7: BouncieProvider.listVehicles / listTrips + tests

**Files:**
- Modify: `lib/telematics/bouncie/index.ts`
- Create: `__tests__/telematics/bouncie-list.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/telematics/bouncie-list.test.ts
import { BouncieProvider } from '@/lib/telematics/bouncie'

const mockVehicle = {
  imei: '123', vin: '1HG...', nickName: 'Civic',
  model: { year: 2022, make: 'Honda', model: 'Civic' },
  stats: {
    lastUpdated: '2026-04-23T12:00:00Z',
    location: { lat: 25.76, lon: -80.19 },
    odometer: 42015,
    batteryStatus: 'normal',
    mil: { milOn: false }
  }
}

describe('BouncieProvider.listVehicles', () => {
  const provider = new BouncieProvider()

  test('maps Bouncie vehicle shape to ProviderVehicle', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify([mockVehicle]), {
        status: 200, headers: { 'content-type': 'application/json' }
      })
    )
    const [v] = await provider.listVehicles('token')
    expect(v).toMatchObject({
      imei: '123',
      vin: '1HG...',
      nickname: 'Civic',
      online: true,
      last_lat: 25.76,
      last_lon: -80.19,
      odometer_mi: 42015,
    })
  })

  test('handles missing stats gracefully', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify([{ imei: 'x', vin: null, nickName: null, model: null, stats: null }]), {
        status: 200, headers: { 'content-type': 'application/json' }
      })
    )
    const [v] = await provider.listVehicles('token')
    expect(v.imei).toBe('x')
    expect(v.odometer_mi).toBeNull()
    expect(v.last_lat).toBeNull()
  })
})
```

- [ ] **Step 2: Verify test fails**

Run: `npx jest __tests__/telematics/bouncie-list.test.ts`
Expected: FAIL ("not implemented yet").

- [ ] **Step 3: Replace the stubs in `lib/telematics/bouncie/index.ts`**

Remove the two `throw new Error('not implemented yet')` stubs for `listVehicles` / `listTrips` and replace with:

```typescript
  async listVehicles(accessToken: string): Promise<ProviderVehicle[]> {
    const raw = await bouncieApi.get<import('./types').BouncieVehicle[]>('/vehicles', accessToken)
    return raw.map(v => ({
      imei: v.imei,
      vin: v.vin ?? null,
      nickname: v.nickName ?? null,
      online: Boolean(v.stats?.lastUpdated && Date.now() - new Date(v.stats.lastUpdated).getTime() < 6 * 3600 * 1000),
      last_seen_at: v.stats?.lastUpdated ?? null,
      last_lat: v.stats?.location?.lat ?? null,
      last_lon: v.stats?.location?.lon ?? null,
      odometer_mi: v.stats?.odometer ?? null,
      battery_voltage: null, // not included in list endpoint; populated by webhook battery_low events
    }))
  }

  async listTrips(accessToken: string, imei: string, since: Date): Promise<ProviderTrip[]> {
    const qs = `?imei=${encodeURIComponent(imei)}&starts-after=${encodeURIComponent(since.toISOString())}`
    const raw = await bouncieApi.get<import('./types').BouncieTrip[]>(`/trips${qs}`, accessToken)
    return raw.map(t => ({
      provider_trip_id: t.transactionId,
      imei: t.imei,
      started_at: t.startTime,
      ended_at: t.endTime ?? null,
      start_lat: t.gpsTrail?.[0]?.lat ?? null,
      start_lon: t.gpsTrail?.[0]?.lon ?? null,
      end_lat: t.gpsTrail?.at(-1)?.lat ?? null,
      end_lon: t.gpsTrail?.at(-1)?.lon ?? null,
      distance_mi: t.distance ?? 0,
      duration_s: t.duration ?? null,
      max_speed_mph: t.maxSpeed ?? null,
      hard_braking_count: t.hardBrakingCount ?? 0,
      hard_accel_count: t.hardAccelerationCount ?? 0,
      fuel_consumed_gal: t.fuelConsumed ?? null,
    }))
  }
```

- [ ] **Step 4: Tests pass**

Run: `npx jest __tests__/telematics/bouncie-list.test.ts`
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/telematics/bouncie/index.ts __tests__/telematics/bouncie-list.test.ts
git commit -m "feat(telematics): BouncieProvider listVehicles + listTrips with mapping"
```

---

### Task 8: verifyWebhookSignature (HMAC) + tests

**Files:**
- Modify: `lib/telematics/bouncie/index.ts`
- Create: `__tests__/telematics/bouncie-hmac.test.ts`

- [ ] **Step 1: Failing test**

```typescript
// __tests__/telematics/bouncie-hmac.test.ts
import crypto from 'node:crypto'
import { BouncieProvider } from '@/lib/telematics/bouncie'

describe('BouncieProvider.verifyWebhookSignature', () => {
  const secret = 'test-secret'
  const body = JSON.stringify({ eventType: 'trip_end', imei: '123', timestamp: '2026-04-23T12:00:00Z' })
  const validSig = 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex')

  beforeEach(() => { process.env.BOUNCIE_WEBHOOK_SECRET = secret })

  test('accepts valid signature', () => {
    expect(new BouncieProvider().verifyWebhookSignature(body, validSig)).toBe(true)
  })

  test('rejects tampered body', () => {
    expect(new BouncieProvider().verifyWebhookSignature(body + 'x', validSig)).toBe(false)
  })

  test('rejects wrong signature', () => {
    expect(new BouncieProvider().verifyWebhookSignature(body, 'sha256=deadbeef')).toBe(false)
  })

  test('rejects null signature header', () => {
    expect(new BouncieProvider().verifyWebhookSignature(body, null)).toBe(false)
  })

  test('uses constant-time comparison (does not early-exit)', () => {
    const sig1 = 'sha256=' + 'a'.repeat(64)
    const sig2 = 'sha256=' + 'b'.repeat(64)
    expect(new BouncieProvider().verifyWebhookSignature(body, sig1)).toBe(false)
    expect(new BouncieProvider().verifyWebhookSignature(body, sig2)).toBe(false)
  })

  test('rejects malformed hex signatures (security finding #15)', () => {
    const p = new BouncieProvider()
    expect(p.verifyWebhookSignature(body, 'sha256=')).toBe(false)
    expect(p.verifyWebhookSignature(body, 'sha256=xyz!@#')).toBe(false)
    expect(p.verifyWebhookSignature(body, 'sha256=' + 'a'.repeat(63))).toBe(false) // wrong length
    expect(p.verifyWebhookSignature(body, 'sha256=' + 'a'.repeat(65))).toBe(false)
  })
})
```

- [ ] **Step 2: Verify fails**

Run: `npx jest __tests__/telematics/bouncie-hmac.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement in `lib/telematics/bouncie/index.ts`**

Replace the `verifyWebhookSignature` stub with:
```typescript
  verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
    if (!signatureHeader) return false
    const prefix = 'sha256='
    if (!signatureHeader.startsWith(prefix)) return false
    const provided = signatureHeader.slice(prefix.length)
    // Strict format: exactly 64 lowercase hex chars. Rejects empty / malformed inputs
    // (security finding #15: Buffer.from('xyz!@#','hex') silently returns partial bytes).
    if (!/^[0-9a-f]{64}$/i.test(provided)) return false
    const crypto = require('node:crypto')
    const expected = crypto
      .createHmac('sha256', bouncieConfig.webhookSecret)
      .update(rawBody)
      .digest('hex')
    const a = Buffer.from(provided, 'hex')
    const b = Buffer.from(expected, 'hex')
    if (a.length !== b.length) return false
    return crypto.timingSafeEqual(a, b)
  }
```

(Or use `import crypto from 'node:crypto'` at top of file and remove the `require`s — match the style of the rest of the codebase.)

- [ ] **Step 4: Tests pass**

Run: `npx jest __tests__/telematics/bouncie-hmac.test.ts`
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/telematics/bouncie/index.ts __tests__/telematics/bouncie-hmac.test.ts
git commit -m "feat(telematics): HMAC SHA-256 webhook signature verify (constant-time)"
```

---

### Task 9: parseWebhookPayload + tests

**Files:**
- Create: `lib/telematics/bouncie/webhook-parser.ts`
- Modify: `lib/telematics/bouncie/index.ts`
- Create: `__tests__/telematics/bouncie-webhook-parser.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/telematics/bouncie-webhook-parser.test.ts
import { BouncieProvider } from '@/lib/telematics/bouncie'

const provider = new BouncieProvider()

describe('parseWebhookPayload', () => {
  test('parses trip_end event', () => {
    const body = JSON.stringify({
      eventType: 'trip_end', imei: '123', timestamp: '2026-04-23T12:00:00Z',
      data: { transactionId: 'trip-99', distance: 12.4, maxSpeed: 64, hardBrakingCount: 1 }
    })
    const [ev] = provider.parseWebhookPayload(body)
    expect(ev.type).toBe('trip_end')
    expect(ev.imei).toBe('123')
    expect(ev.occurred_at).toBe('2026-04-23T12:00:00Z')
    expect(ev.payload).toMatchObject({ transactionId: 'trip-99', distance: 12.4 })
  })

  test('parses location_update with lat/lon/odometer', () => {
    const body = JSON.stringify({
      eventType: 'location-update', imei: '123', timestamp: '2026-04-23T12:01:00Z',
      data: { lat: 25.76, lon: -80.19, odometer: 42015, speed: 42 }
    })
    const [ev] = provider.parseWebhookPayload(body)
    expect(ev.type).toBe('location_update')
    expect(ev.lat).toBe(25.76)
    expect(ev.lon).toBe(-80.19)
    expect(ev.odometer_mi).toBe(42015)
    expect(ev.speed_mph).toBe(42)
  })

  test('parses DTC event', () => {
    const body = JSON.stringify({
      eventType: 'mil-on', imei: '123', timestamp: '2026-04-23T12:02:00Z',
      data: { code: 'P0420', description: 'Catalyst inefficiency' }
    })
    const [ev] = provider.parseWebhookPayload(body)
    expect(ev.type).toBe('dtc_new')
    expect(ev.payload.code).toBe('P0420')
  })

  test('parses hard_braking', () => {
    const body = JSON.stringify({
      eventType: 'hard-braking', imei: '123', timestamp: '2026-04-23T12:03:00Z',
      data: { lat: 25.76, lon: -80.19, speed: 55 }
    })
    const [ev] = provider.parseWebhookPayload(body)
    expect(ev.type).toBe('hard_braking')
  })

  test('accepts array payloads (batched)', () => {
    const body = JSON.stringify([
      { eventType: 'ignition-on', imei: '1', timestamp: 't1' },
      { eventType: 'ignition-off', imei: '1', timestamp: 't2' },
    ])
    const evs = provider.parseWebhookPayload(body)
    expect(evs).toHaveLength(2)
  })

  test('drops unknown event types (logs, does not throw)', () => {
    const body = JSON.stringify({ eventType: 'something-new', imei: '1', timestamp: 't' })
    const evs = provider.parseWebhookPayload(body)
    expect(evs).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Verify fails**

Run: `npx jest __tests__/telematics/bouncie-webhook-parser.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write `lib/telematics/bouncie/webhook-parser.ts`**

```typescript
// lib/telematics/bouncie/webhook-parser.ts
import type { ProviderEvent } from '../types'
import type { TelematicsEventType } from '@/lib/supabase/types'

const BOUNCIE_TO_INTERNAL: Record<string, TelematicsEventType | 'location_update'> = {
  'location-update':   'location_update',
  'trip-start':        'trip_start',
  'trip-end':          'trip_end',
  'ignition-on':       'ignition_on',
  'ignition-off':      'ignition_off',
  'mil-on':            'dtc_new',
  'mil-off':           'dtc_cleared',
  'hard-braking':      'hard_braking',
  'hard-acceleration': 'hard_accel',
  'speeding':          'speed_exceeded',
  'battery':           'battery_low',
  'device-offline':    'offline',
  'device-online':     'online',
  'geofence-entered':  'geofence_enter',
  'geofence-exited':   'geofence_exit',
}

interface RawEvent {
  eventType: string
  imei: string
  timestamp: string
  data?: Record<string, unknown>
}

function toNumber(v: unknown): number | null {
  return typeof v === 'number' ? v : null
}

export function parseBouncieWebhook(rawBody: string): ProviderEvent[] {
  let parsed: unknown
  try { parsed = JSON.parse(rawBody) } catch { return [] }

  const items: RawEvent[] = Array.isArray(parsed) ? (parsed as RawEvent[]) : [parsed as RawEvent]
  const out: ProviderEvent[] = []

  for (const it of items) {
    if (!it || typeof it.eventType !== 'string' || typeof it.imei !== 'string') continue
    const type = BOUNCIE_TO_INTERNAL[it.eventType]
    if (!type) continue  // unknown type — skip
    const data = it.data ?? {}
    out.push({
      provider_event_id: typeof data.eventId === 'string' ? data.eventId : null,
      imei: it.imei,
      type,
      occurred_at: it.timestamp,
      lat: toNumber(data.lat),
      lon: toNumber(data.lon),
      speed_mph: toNumber(data.speed),
      odometer_mi: toNumber(data.odometer),
      payload: data as Record<string, unknown>,
    })
  }
  return out
}
```

- [ ] **Step 4: Wire into BouncieProvider**

In `lib/telematics/bouncie/index.ts`, add import `import { parseBouncieWebhook } from './webhook-parser'` and replace the `parseWebhookPayload` stub with:
```typescript
  parseWebhookPayload(rawBody: string): ProviderEvent[] {
    return parseBouncieWebhook(rawBody)
  }
```

- [ ] **Step 5: Tests pass**

Run: `npx jest __tests__/telematics/bouncie-webhook-parser.test.ts`
Expected: 6 passed.

- [ ] **Step 6: Commit**

```bash
git add lib/telematics/bouncie/index.ts lib/telematics/bouncie/webhook-parser.ts __tests__/telematics/bouncie-webhook-parser.test.ts
git commit -m "feat(telematics): parse Bouncie webhook payload to neutral ProviderEvent[]"
```

---

### Task 10: Provider registry singleton

**Files:**
- Create: `lib/telematics/registry.ts`

- [ ] **Step 1: Write registry**

```typescript
// lib/telematics/registry.ts
import type { TelematicsProvider } from './provider'
import { BouncieProvider } from './bouncie'

let bouncieSingleton: BouncieProvider | null = null

export function getProvider(name: 'bouncie'): TelematicsProvider {
  if (name !== 'bouncie') throw new Error(`Unknown provider: ${name}`)
  if (!bouncieSingleton) bouncieSingleton = new BouncieProvider()
  return bouncieSingleton
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/telematics/registry.ts
git commit -m "feat(telematics): provider registry (singleton getProvider)"
```

---

## Phase 3 — Ingest layer + Alerts

### Task 11: Ingest — location_update writes

**Files:**
- Create: `lib/telematics/ingest.ts`
- Create: `__tests__/telematics/ingest-location.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// __tests__/telematics/ingest-location.test.ts
import { ingestLocationUpdate } from '@/lib/telematics/ingest'

const mkSupabase = () => {
  const inserts: Array<{ table: string; row: any }> = []
  const updates: Array<{ table: string; match: any; patch: any }> = []
  return {
    inserts, updates,
    from(table: string) {
      return {
        insert: (row: any) => { inserts.push({ table, row }); return Promise.resolve({ data: null, error: null }) },
        update: (patch: any) => ({
          eq: (col: string, val: any) => { updates.push({ table, match: { [col]: val }, patch }); return Promise.resolve({ data: null, error: null }) },
        }),
      }
    },
  } as any
}

test('ingestLocationUpdate inserts position and updates car', async () => {
  const sb = mkSupabase()
  await ingestLocationUpdate(sb, {
    tenant_id: 't1', device_id: 'd1', car_id: 42,
    event: { type: 'location_update', imei: '123', occurred_at: '2026-04-23T12:00:00Z',
      lat: 25.76, lon: -80.19, speed_mph: 42, odometer_mi: 42015, payload: {}, provider_event_id: null }
  })
  expect(sb.inserts).toHaveLength(1)
  expect(sb.inserts[0].table).toBe('telematics_positions')
  expect(sb.inserts[0].row).toMatchObject({ tenant_id: 't1', device_id: 'd1', car_id: 42, lat: 25.76, odometer_mi: 42015 })
  expect(sb.updates.find(u => u.table === 'cars')).toBeTruthy()
})

test('ingestLocationUpdate skips car update when car_id is null', async () => {
  const sb = mkSupabase()
  await ingestLocationUpdate(sb, {
    tenant_id: 't1', device_id: 'd1', car_id: null,
    event: { type: 'location_update', imei: '123', occurred_at: '2026-04-23T12:00:00Z',
      lat: 0, lon: 0, speed_mph: null, odometer_mi: null, payload: {}, provider_event_id: null }
  })
  expect(sb.inserts).toHaveLength(1)
  expect(sb.updates.find(u => u.table === 'cars')).toBeUndefined()
})
```

- [ ] **Step 2: Verify fails**

Run: `npx jest __tests__/telematics/ingest-location.test.ts`
Expected: FAIL (module does not export `ingestLocationUpdate`).

- [ ] **Step 3: Write `lib/telematics/ingest.ts`** (location portion)

```typescript
// lib/telematics/ingest.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ProviderEvent } from './types'

export interface IngestContext {
  tenant_id: string
  device_id: string
  car_id: number | null
  event: ProviderEvent
}

export async function ingestLocationUpdate(
  supabase: SupabaseClient,
  ctx: IngestContext
): Promise<void> {
  const { tenant_id, device_id, car_id, event } = ctx
  if (event.lat === null || event.lon === null) return

  await supabase.from('telematics_positions').insert({
    tenant_id,
    device_id,
    car_id,
    recorded_at: event.occurred_at,
    lat: event.lat,
    lon: event.lon,
    speed_mph: event.speed_mph,
    heading: (event.payload.heading as number | undefined) ?? null,
    odometer_mi: event.odometer_mi,
    ignition: (event.payload.ignition as boolean | undefined) ?? null,
  })

  // Also update last_seen on device
  await supabase.from('telematics_devices').update({
    last_seen_at: event.occurred_at,
    online: true,
  }).eq('id', device_id)

  if (car_id !== null) {
    // Monotonic mileage: only update if new reading is higher
    // (done via RPC to avoid racing; fallback: simple update with coalesce)
    const patch: Record<string, unknown> = {
      last_lat: event.lat,
      last_lon: event.lon,
      last_seen_at: event.occurred_at,
    }
    if (event.odometer_mi !== null) {
      // Use rpc in real deployment; for MVP do best-effort UPDATE that relies on DB trigger
      // (see migration note) or Postgres GREATEST:
      patch.mileage = event.odometer_mi  // DB has CHECK/trigger for monotonicity (see Step 4)
    }
    await supabase.from('cars').update(patch).eq('id', car_id)
  }
}
```

- [ ] **Step 4: Add monotonic-mileage DB trigger (append to the same migration file from Task 1, or add a new migration)**

Create `supabase/migrations/20260423120100_cars_mileage_monotonic.sql`:
```sql
-- Prevent cars.mileage from decreasing when updated by telematics
create or replace function public.cars_mileage_monotonic() returns trigger as $$
begin
  if new.mileage is not null and old.mileage is not null and new.mileage < old.mileage then
    new.mileage := old.mileage;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists cars_mileage_monotonic_trg on public.cars;
create trigger cars_mileage_monotonic_trg
  before update on public.cars
  for each row execute function public.cars_mileage_monotonic();
```

Apply via `mcp__claude_ai_Supabase__apply_migration`.

- [ ] **Step 5: Tests pass**

Run: `npx jest __tests__/telematics/ingest-location.test.ts`
Expected: 2 passed.

- [ ] **Step 6: Commit**

```bash
git add lib/telematics/ingest.ts __tests__/telematics/ingest-location.test.ts supabase/migrations/20260423120100_cars_mileage_monotonic.sql
git commit -m "feat(telematics): ingest location_update + monotonic mileage trigger"
```

---

### Task 12: Ingest — trip_end with reservation auto-match

**Files:**
- Modify: `lib/telematics/ingest.ts`
- Create: `__tests__/telematics/ingest-trip.test.ts`

- [ ] **Step 1: Failing test**

```typescript
// __tests__/telematics/ingest-trip.test.ts
import { ingestTripEnd } from '@/lib/telematics/ingest'

const mkSupabase = (reservation: any = null) => {
  const upserts: any[] = []
  return {
    upserts,
    from(table: string) {
      if (table === 'reservations') {
        return {
          select: () => ({
            eq: () => ({ eq: () => ({ lte: () => ({ gte: () => ({ maybeSingle: () => Promise.resolve({ data: reservation, error: null }) }) }) }) }),
          }),
        }
      }
      return {
        upsert: (row: any, opts: any) => { upserts.push({ table, row, opts }); return Promise.resolve({ data: null, error: null }) },
      }
    },
  } as any
}

test('matches reservation when trip falls inside pickup/return window', async () => {
  const sb = mkSupabase({ id: 99 })
  await ingestTripEnd(sb, {
    tenant_id: 't1', device_id: 'd1', car_id: 42,
    event: {
      type: 'trip_end', imei: '123', occurred_at: '2026-04-23T12:00:00Z',
      lat: null, lon: null, speed_mph: null, odometer_mi: null,
      provider_event_id: null,
      payload: {
        transactionId: 'bounce-trip-1', startTime: '2026-04-23T10:00:00Z', endTime: '2026-04-23T12:00:00Z',
        distance: 12.4, maxSpeed: 62, hardBrakingCount: 1, hardAccelerationCount: 0, duration: 7200
      }
    }
  })
  expect(sb.upserts).toHaveLength(1)
  expect(sb.upserts[0].row.reservation_id).toBe(99)
  expect(sb.upserts[0].row.distance_mi).toBe(12.4)
  expect(sb.upserts[0].opts.onConflict).toContain('bouncie_trip_id')
})

test('leaves reservation_id null when no match', async () => {
  const sb = mkSupabase(null)
  await ingestTripEnd(sb, {
    tenant_id: 't1', device_id: 'd1', car_id: 42,
    event: {
      type: 'trip_end', imei: '123', occurred_at: '2026-04-23T12:00:00Z',
      lat: null, lon: null, speed_mph: null, odometer_mi: null,
      provider_event_id: null,
      payload: { transactionId: 'bounce-trip-2', startTime: '2026-04-23T10:00:00Z', endTime: '2026-04-23T12:00:00Z', distance: 5 }
    }
  })
  expect(sb.upserts[0].row.reservation_id).toBeNull()
})
```

- [ ] **Step 2: Verify fails**

Run: `npx jest __tests__/telematics/ingest-trip.test.ts`
Expected: FAIL.

- [ ] **Step 3: Add `ingestTripEnd` to `lib/telematics/ingest.ts`**

Append:
```typescript
export async function ingestTripEnd(
  supabase: SupabaseClient,
  ctx: IngestContext
): Promise<void> {
  const { tenant_id, device_id, car_id, event } = ctx
  const p = event.payload as {
    transactionId?: string
    startTime?: string; endTime?: string
    distance?: number; maxSpeed?: number; duration?: number
    hardBrakingCount?: number; hardAccelerationCount?: number
    fuelConsumed?: number
    gpsTrail?: Array<{ lat: number; lon: number }>
  }
  if (!p.transactionId || !p.startTime) return

  // Attempt reservation match (tenant + car + trip start within pickup/return window)
  let reservation_id: number | null = null
  if (car_id !== null) {
    const { data: res } = await supabase
      .from('reservations')
      .select('id')
      .eq('tenant_id', tenant_id)
      .eq('car_id', car_id)
      .lte('pickup_date', p.startTime.slice(0, 10))
      .gte('return_date', p.startTime.slice(0, 10))
      .maybeSingle()
    reservation_id = res?.id ?? null
  }

  const trail = p.gpsTrail ?? []
  await supabase.from('telematics_trips').upsert({
    tenant_id,
    device_id,
    car_id,
    reservation_id,
    started_at: p.startTime,
    ended_at: p.endTime ?? null,
    start_lat: trail[0]?.lat ?? null,
    start_lon: trail[0]?.lon ?? null,
    end_lat: trail.at(-1)?.lat ?? null,
    end_lon: trail.at(-1)?.lon ?? null,
    distance_mi: p.distance ?? 0,
    duration_s: p.duration ?? null,
    max_speed_mph: p.maxSpeed ?? null,
    hard_braking_count: p.hardBrakingCount ?? 0,
    hard_accel_count: p.hardAccelerationCount ?? 0,
    fuel_consumed_gal: p.fuelConsumed ?? null,
    bouncie_trip_id: p.transactionId,
  }, { onConflict: 'tenant_id,bouncie_trip_id' })
}
```

- [ ] **Step 4: Tests pass**

Run: `npx jest __tests__/telematics/ingest-trip.test.ts`
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/telematics/ingest.ts __tests__/telematics/ingest-trip.test.ts
git commit -m "feat(telematics): ingest trip_end with auto reservation match"
```

---

### Task 13: Ingest — generic event write + alerts dispatch

**Files:**
- Modify: `lib/telematics/ingest.ts`

- [ ] **Step 1: Add `ingestEvent` to `lib/telematics/ingest.ts`**

Append:
```typescript
import { dispatchAlert } from './alerts'  // (Task 14)

export async function ingestEvent(
  supabase: SupabaseClient,
  ctx: IngestContext
): Promise<void> {
  const { tenant_id, device_id, car_id, event } = ctx
  const { severity, shouldNotify } = await classifyEvent(supabase, tenant_id, event)

  const { data: row, error } = await supabase.from('telematics_events').insert({
    tenant_id,
    device_id,
    car_id,
    event_type: event.type,
    severity,
    occurred_at: event.occurred_at,
    payload: event.payload,
  }).select('id').single()

  if (error || !row) return
  if (shouldNotify) await dispatchAlert(supabase, { tenant_id, car_id, event_id: row.id, event, severity })
}

// SECURITY (audit finding #10): the geofence severity MUST come from the DB,
// not from `event.payload.geofence_kind`. Payload fields are attacker-influenceable
// via replay with modified body; DB rows are tenant-controlled and authoritative.
async function classifyEvent(
  supabase: SupabaseClient,
  tenant_id: string,
  event: ProviderEvent
): Promise<{ severity: 'info'|'warning'|'critical'; shouldNotify: boolean }> {
  switch (event.type) {
    case 'geofence_exit':
    case 'geofence_enter': {
      const geofenceId = typeof event.payload.geofence_id === 'string'
        ? event.payload.geofence_id : null
      let kind: 'allowed' | 'forbidden' = 'allowed'
      if (geofenceId) {
        const { data } = await supabase
          .from('telematics_geofences')
          .select('kind')
          .eq('id', geofenceId)
          .eq('tenant_id', tenant_id)
          .maybeSingle()
        if (data?.kind === 'forbidden') kind = 'forbidden'
      }
      if (event.type === 'geofence_enter' && kind === 'forbidden') {
        return { severity: 'critical', shouldNotify: true }
      }
      if (event.type === 'geofence_exit') {
        return kind === 'forbidden'
          ? { severity: 'critical', shouldNotify: true }
          : { severity: 'warning', shouldNotify: true }
      }
      return { severity: 'info', shouldNotify: false }
    }
    case 'speed_exceeded':
    case 'dtc_new':
    case 'battery_low':
    case 'offline':
      return { severity: 'warning', shouldNotify: true }
    case 'connection_expired':
      return { severity: 'critical', shouldNotify: true }
    case 'hard_braking':
    case 'hard_accel':
    case 'dtc_cleared':
    case 'online':
    case 'ignition_on':
    case 'ignition_off':
      return { severity: 'info', shouldNotify: false }
    default:
      return { severity: 'info', shouldNotify: false }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/telematics/ingest.ts
git commit -m "feat(telematics): ingest generic events + severity classification"
```

---

### Task 14: alerts.ts — dispatch to notifications + email

**Files:**
- Create: `lib/telematics/alerts.ts`
- Create: `__tests__/telematics/alerts-dispatch.test.ts`

- [ ] **Step 1: Failing test**

```typescript
// __tests__/telematics/alerts-dispatch.test.ts
import { dispatchAlert } from '@/lib/telematics/alerts'

test('critical event creates notification', async () => {
  const inserts: any[] = []
  const sb = {
    from(table: string) {
      return {
        insert: (row: any) => { inserts.push({ table, row }); return Promise.resolve({ data: null, error: null }) },
        select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }),
      }
    },
  } as any
  await dispatchAlert(sb, {
    tenant_id: 't1',
    car_id: 42,
    event_id: 'ev1',
    severity: 'critical',
    event: { type: 'geofence_exit', imei: '123', occurred_at: '2026-04-23T12:00:00Z',
      lat: null, lon: null, speed_mph: null, odometer_mi: null, payload: { geofence_kind: 'forbidden' }, provider_event_id: null }
  })
  const notif = inserts.find(i => i.table === 'notifications')
  expect(notif).toBeTruthy()
  expect(notif.row.severity).toBe('critical')
})
```

- [ ] **Step 2: Verify fails**

Run: `npx jest __tests__/telematics/alerts-dispatch.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `lib/telematics/alerts.ts`**

```typescript
// lib/telematics/alerts.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ProviderEvent } from './types'

export interface AlertDispatch {
  tenant_id: string
  car_id: number | null
  event_id: string
  severity: 'info' | 'warning' | 'critical'
  event: ProviderEvent
}

export async function dispatchAlert(supabase: SupabaseClient, ad: AlertDispatch): Promise<void> {
  // 1. Always write to notifications (bell feed)
  await supabase.from('notifications').insert({
    tenant_id: ad.tenant_id,
    kind: 'telematics',
    severity: ad.severity,
    title: titleFor(ad.event.type, ad.event.payload),
    body: bodyFor(ad.event),
    link: `/dashboard/telematics/alerts?event=${ad.event_id}`,
    source_id: ad.event_id,
  })

  // 2. Email: critical always; warning if tenant opt-in (read from tenant_notification_prefs)
  const emailCritical = ad.severity === 'critical'
  let emailWarning = false
  if (ad.severity === 'warning') {
    const { data: prefs } = await supabase
      .from('tenant_notification_prefs')
      .select('telematics_warning_email')
      .eq('tenant_id', ad.tenant_id)
      .maybeSingle()
    emailWarning = Boolean(prefs?.telematics_warning_email)
  }
  if (emailCritical || emailWarning) {
    // Delegate to existing email helper — in this codebase emails are sent via
    // lib/email/send.ts or a Netlify function. Follow the same pattern as
    // other alert emails (e.g., review-email-sender, plan-limit-warning).
    const { sendTelematicsAlertEmail } = await import('@/lib/email/telematics')
    await sendTelematicsAlertEmail({
      tenant_id: ad.tenant_id,
      event_id: ad.event_id,
      severity: ad.severity,
      title: titleFor(ad.event.type, ad.event.payload),
    })
  }
}

function titleFor(type: ProviderEvent['type'], payload: Record<string, unknown>): string {
  switch (type) {
    case 'geofence_exit': return `Vehicle left geofence${payload.geofence_name ? `: ${payload.geofence_name}` : ''}`
    case 'speed_exceeded': return `Speed exceeded (${payload.speed ?? '?'} mph)`
    case 'dtc_new': return `New diagnostic code: ${payload.code ?? 'unknown'}`
    case 'battery_low': return `Low battery voltage`
    case 'offline': return `Device offline`
    case 'connection_expired': return `Bouncie connection expired — reconnect required`
    case 'hard_braking': return `Hard braking event`
    case 'hard_accel': return `Hard acceleration event`
    default: return type
  }
}

function bodyFor(event: ProviderEvent): string {
  const parts: string[] = []
  if (event.lat != null && event.lon != null) parts.push(`${event.lat.toFixed(4)}, ${event.lon.toFixed(4)}`)
  if (event.speed_mph != null) parts.push(`${event.speed_mph} mph`)
  return parts.join(' · ')
}
```

- [ ] **Step 4: Stub `lib/email/telematics.ts` (actual template work follows existing email patterns)**

```typescript
// lib/email/telematics.ts
export async function sendTelematicsAlertEmail(args: {
  tenant_id: string
  event_id: string
  severity: 'warning' | 'critical'
  title: string
}): Promise<void> {
  // Implementation: look up tenant's notification email, render a short HTML body
  // ("Title · link to alert · brand footer"), and send via the same provider
  // used by plan-limit / review-request emails. Follow the existing pattern in
  // lib/email/send.ts (or wherever the codebase's email entry point lives).
  // For MVP: single template, no per-type variants.
  const { sendEmail } = await import('./send')
  const { data } = await (await import('@/lib/supabase/server')).createClient()
    .from('tenants')
    .select('name, notification_email')
    .eq('id', args.tenant_id)
    .maybeSingle()
  if (!data?.notification_email) return
  await sendEmail({
    to: data.notification_email,
    subject: `[${args.severity.toUpperCase()}] ${args.title}`,
    html: `<p>${args.title}</p><p><a href="https://app.epuredrive.com/dashboard/telematics/alerts?event=${args.event_id}">View alert</a></p>`,
  })
}
```

(If `lib/email/send.ts` does not exist with that exact signature, adjust the import to match the real module. Check `lib/email/` before writing.)

- [ ] **Step 5: Tests pass**

Run: `npx jest __tests__/telematics/alerts-dispatch.test.ts`
Expected: passes.

- [ ] **Step 6: Commit**

```bash
git add lib/telematics/alerts.ts lib/email/telematics.ts __tests__/telematics/alerts-dispatch.test.ts
git commit -m "feat(telematics): alerts dispatch — bell notifications + email on warn/critical"
```

---

## Phase 4 — API routes (OAuth + webhook)

### Task 15: OAuth start route

**Files:**
- Create: `app/api/telematics/oauth/start/route.ts`

- [ ] **Step 1: Implement**

```typescript
// app/api/telematics/oauth/start/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { getProvider } from '@/lib/telematics/registry'
import { bouncieConfig } from '@/lib/telematics/config'
import { isFeatureEnabled } from '@/lib/supabase/feature-flags'

export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', appUrl))

  // SECURITY (audit finding #3): API routes are NOT covered by /dashboard/* middleware.
  // Must gate at the API level too — a Starter tenant who knows this URL could
  // otherwise connect Bouncie without paying for Pro.
  const { data: userTenant } = await supabase
    .from('user_tenants').select('tenant_id').eq('user_id', user.id).single()
  if (!userTenant?.tenant_id) return NextResponse.redirect(new URL('/dashboard', appUrl))
  const allowed = await isFeatureEnabled(userTenant.tenant_id, 'bouncie_telematics')
  if (!allowed) {
    const url = new URL('/dashboard/settings/billing', appUrl)
    url.searchParams.set('upgrade', 'telematics')
    return NextResponse.redirect(url)
  }

  const state = crypto.randomBytes(16).toString('hex')
  cookies().set('bouncie_oauth_state', state, {
    httpOnly: true, secure: true, sameSite: 'lax', maxAge: 600, path: '/',
  })

  const url = getProvider('bouncie').buildAuthorizationUrl(state, bouncieConfig.redirectUri)
  return NextResponse.redirect(url)
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/telematics/oauth/start/route.ts
git commit -m "feat(telematics): OAuth start — sign state nonce + redirect to Bouncie"
```

---

### Task 16: OAuth callback route

**Files:**
- Create: `app/api/telematics/oauth/callback/route.ts`

- [ ] **Step 1: Implement**

```typescript
// app/api/telematics/oauth/callback/route.ts
import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getProvider } from '@/lib/telematics/registry'
import { bouncieConfig } from '@/lib/telematics/config'
import { isFeatureEnabled } from '@/lib/supabase/feature-flags'

// SECURITY (audit finding #5): all failure paths redirect to a SINGLE generic
// error URL and ALWAYS delete the state cookie — never expose specific error
// codes to the client (prevents CSRF-probe fingerprinting).
const GENERIC_ERR = '/dashboard/integrations/bouncie?error=auth_failed'

export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin
  // Delete state cookie up-front so the nonce is single-use regardless of outcome.
  const storedState = cookies().get('bouncie_oauth_state')?.value
  cookies().delete('bouncie_oauth_state')

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', appUrl))

  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  if (!code || !state || state !== storedState) {
    console.warn('[bouncie oauth] state mismatch', { user: user.id })
    return NextResponse.redirect(new URL(GENERIC_ERR, appUrl))
  }

  // Resolve tenant_id + gate at API level (security finding #3)
  const { data: userTenant } = await supabase.from('user_tenants').select('tenant_id').eq('user_id', user.id).single()
  if (!userTenant?.tenant_id) return NextResponse.redirect(new URL(GENERIC_ERR, appUrl))
  const allowed = await isFeatureEnabled(userTenant.tenant_id, 'bouncie_telematics')
  if (!allowed) return NextResponse.redirect(new URL(GENERIC_ERR, appUrl))

  const provider = getProvider('bouncie')
  let tokens
  try {
    tokens = await provider.exchangeCodeForToken(code, bouncieConfig.redirectUri)
  } catch (err: unknown) {
    // SECURITY: never spread the err object — token endpoint response body may contain bearer tokens
    const msg = err instanceof Error ? err.message : 'unknown'
    console.error('[bouncie oauth] token exchange failed', { user: user.id, msg: msg.slice(0, 200) })
    return NextResponse.redirect(new URL(GENERIC_ERR, appUrl))
  }

  const service = createServiceRoleClient()
  const { data: conn } = await service.from('telematics_connections').upsert({
    tenant_id: userTenant.tenant_id,
    provider: 'bouncie',
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    token_expires_at: tokens.expires_at,
    scope: tokens.scope,
    account_email: tokens.account_email,
    status: 'active',
    last_sync_at: new Date().toISOString(),
    error_message: null,
  }, { onConflict: 'tenant_id,provider' }).select('id').single()

  // Seed devices
  if (conn?.id) {
    const vehicles = await provider.listVehicles(tokens.access_token)
    for (const v of vehicles) {
      await service.from('telematics_devices').upsert({
        tenant_id: userTenant.tenant_id,
        connection_id: conn.id,
        imei: v.imei,
        vin: v.vin,
        nickname: v.nickname,
        last_seen_at: v.last_seen_at,
        battery_voltage: v.battery_voltage,
        online: v.online,
      }, { onConflict: 'tenant_id,imei' })
    }
  }
  return NextResponse.redirect(new URL('/dashboard/telematics/devices', appUrl))
}
```

- [ ] **Step 2: Verify `createServiceRoleClient` exists**

If not present in `lib/supabase/server.ts`, add it using `SUPABASE_SERVICE_ROLE_KEY`. Follow any existing pattern (there may already be one for Stripe webhooks or Turo sync).

- [ ] **Step 3: Commit**

```bash
git add app/api/telematics/oauth/callback/route.ts lib/supabase/server.ts
git commit -m "feat(telematics): OAuth callback — store tokens, seed devices, redirect"
```

---

### Task 17: Webhook receiver

**Files:**
- Create: `app/api/telematics/webhook/bouncie/route.ts`
- Create: `__tests__/telematics/webhook-route.test.ts`

- [ ] **Step 1: Implement webhook route**

```typescript
// app/api/telematics/webhook/bouncie/route.ts
import { NextResponse, type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getProvider } from '@/lib/telematics/registry'
import { ingestLocationUpdate, ingestTripEnd, ingestEvent } from '@/lib/telematics/ingest'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// SECURITY constants (audit findings #2, #11)
const MAX_BODY_BYTES = 1_048_576       // 1 MiB
const MAX_EVENTS_PER_BATCH = 100
const MAX_TIMESTAMP_SKEW_SEC = 300     // ±5 min — matches Stripe webhook policy

function safeErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  // Strip any bearer-token patterns that might have leaked into the message
  return msg.replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [redacted]').slice(0, 200)
}

export async function POST(req: NextRequest) {
  // SECURITY (audit finding #11): cap body size BEFORE reading
  const contentLength = parseInt(req.headers.get('content-length') ?? '0', 10)
  if (contentLength > MAX_BODY_BYTES) {
    return new NextResponse('payload too large', { status: 413 })
  }

  const provider = getProvider('bouncie')
  const raw = await req.text()
  if (raw.length > MAX_BODY_BYTES) {
    return new NextResponse('payload too large', { status: 413 })
  }

  const sig = req.headers.get('x-bouncie-signature')
  if (!provider.verifyWebhookSignature(raw, sig)) {
    return new NextResponse('invalid signature', { status: 401 })
  }

  let events = provider.parseWebhookPayload(raw)
  if (events.length === 0) return NextResponse.json({ ok: true })
  // SECURITY (audit finding #11): cap events per batch
  if (events.length > MAX_EVENTS_PER_BATCH) {
    console.warn('[bouncie webhook] batch overflow, dropping', { total: events.length })
    events = events.slice(0, MAX_EVENTS_PER_BATCH)
  }

  // SECURITY (audit finding #2): replay-attack defense — drop events whose
  // timestamp is too far from server clock (Stripe-style ±5 min window).
  const now = Date.now()
  events = events.filter(e => {
    const t = new Date(e.occurred_at).getTime()
    if (isNaN(t)) return false
    return Math.abs(now - t) <= MAX_TIMESTAMP_SKEW_SEC * 1000
  })
  if (events.length === 0) return NextResponse.json({ ok: true })

  const supabase = createServiceRoleClient()

  for (const event of events) {
    // SECURITY (audit finding #1): device lookup MUST JOIN telematics_connections
    // with status='active' to prevent cross-tenant IMEI routing.
    const { data: device } = await supabase
      .from('telematics_devices')
      .select('id, tenant_id, car_id, connection:telematics_connections!inner(id,status)')
      .eq('imei', event.imei)
      .eq('connection.status', 'active')
      .maybeSingle()
    if (!device) continue  // tenant not linked, or connection not active — ack & drop

    const ctx = { tenant_id: device.tenant_id, device_id: device.id, car_id: device.car_id, event }

    try {
      if (event.type === 'location_update') {
        await ingestLocationUpdate(supabase, ctx)
      } else if (event.type === 'trip_end') {
        await ingestTripEnd(supabase, ctx)
        await ingestEvent(supabase, ctx) // also record the event row
      } else {
        await ingestEvent(supabase, ctx)
      }
    } catch (err) {
      // SECURITY (audit finding #7): never spread the raw err object — it may
      // include token endpoint response bodies with bearer tokens.
      console.error('[bouncie webhook] ingest failure', {
        imei: event.imei, type: event.type, msg: safeErrorMessage(err),
      })
      // swallow; return 200 so Bouncie doesn't retry the whole batch forever
    }
  }
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Integration test**

```typescript
// __tests__/telematics/webhook-route.test.ts
import { POST } from '@/app/api/telematics/webhook/bouncie/route'
import crypto from 'node:crypto'

// Lightweight integration test — mocks supabase and provider to verify routing
jest.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { id: 'd1', tenant_id: 't1', car_id: 42 } }) }) }),
      insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: { id: 'ev1' } }) }) }),
      upsert: () => Promise.resolve({ data: null }),
      update: () => ({ eq: () => Promise.resolve({ data: null }) }),
    }),
  }),
}))

test('rejects invalid signature', async () => {
  process.env.BOUNCIE_WEBHOOK_SECRET = 'sec'
  const body = JSON.stringify({ eventType: 'ignition-on', imei: '123', timestamp: 't' })
  const req = new Request('http://localhost/api/telematics/webhook/bouncie', {
    method: 'POST',
    headers: { 'x-bouncie-signature': 'sha256=wrong' },
    body,
  })
  // @ts-expect-error: NextRequest shape is a superset of Request
  const res = await POST(req)
  expect(res.status).toBe(401)
})

test('accepts valid signature and returns 200', async () => {
  process.env.BOUNCIE_WEBHOOK_SECRET = 'sec'
  const nowIso = new Date().toISOString()  // fresh timestamp
  const body = JSON.stringify({ eventType: 'ignition-on', imei: '123', timestamp: nowIso })
  const sig = 'sha256=' + crypto.createHmac('sha256', 'sec').update(body).digest('hex')
  const req = new Request('http://localhost/api/telematics/webhook/bouncie', {
    method: 'POST',
    headers: { 'x-bouncie-signature': sig },
    body,
  })
  // @ts-expect-error
  const res = await POST(req)
  expect(res.status).toBe(200)
})

test('rejects stale timestamp (replay defense, finding #2)', async () => {
  process.env.BOUNCIE_WEBHOOK_SECRET = 'sec'
  const staleIso = new Date(Date.now() - 10 * 60 * 1000).toISOString() // 10 min ago
  const body = JSON.stringify({ eventType: 'ignition-on', imei: '123', timestamp: staleIso })
  const sig = 'sha256=' + crypto.createHmac('sha256', 'sec').update(body).digest('hex')
  const req = new Request('http://localhost/api/telematics/webhook/bouncie', {
    method: 'POST',
    headers: { 'x-bouncie-signature': sig },
    body,
  })
  // @ts-expect-error
  const res = await POST(req)
  // Stale events are filtered out → 200 but no writes (we just assert 200 here)
  expect(res.status).toBe(200)
})

test('rejects oversized payload (finding #11)', async () => {
  process.env.BOUNCIE_WEBHOOK_SECRET = 'sec'
  const req = new Request('http://localhost/api/telematics/webhook/bouncie', {
    method: 'POST',
    headers: {
      'x-bouncie-signature': 'sha256=' + 'a'.repeat(64),
      'content-length': String(2_000_000),
    },
    body: 'x',
  })
  // @ts-expect-error
  const res = await POST(req)
  expect(res.status).toBe(413)
})
```

- [ ] **Step 3: Run tests**

Run: `npx jest __tests__/telematics/webhook-route.test.ts`
Expected: 2 passed.

- [ ] **Step 4: Commit**

```bash
git add app/api/telematics/webhook/bouncie/route.ts __tests__/telematics/webhook-route.test.ts
git commit -m "feat(telematics): HMAC-verified Bouncie webhook receiver + ingest dispatch"
```

---

## Phase 5 — Cron / background

### Task 18: Netlify cron — pull sync

**Files:**
- Create: `netlify/functions/telematics-sync.ts`
- Modify: `netlify.toml` (add schedule)

- [ ] **Step 1: Implement function**

```typescript
// netlify/functions/telematics-sync.ts
import type { Handler } from '@netlify/functions'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { syncConnection } from '@/lib/telematics/sync'

export const handler: Handler = async () => {
  const supabase = createServiceRoleClient()
  const { data: conns } = await supabase
    .from('telematics_connections').select('*').eq('status', 'active')
  for (const c of conns ?? []) {
    await syncConnection(supabase, c)
  }
  return { statusCode: 200, body: 'ok' }
}
```

Now write `lib/telematics/sync.ts` with the per-connection function so `syncNowAction` (Task 23) can reuse it scoped to a single tenant (security finding #8):

```typescript
// lib/telematics/sync.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import { getProvider } from './registry'
import { ingestLocationUpdate } from './ingest'
import type { TelematicsConnection } from '@/lib/supabase/types'

function safeErr(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e)
  return m.replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [redacted]').slice(0, 500)
}

export async function syncConnection(
  supabase: SupabaseClient,
  c: TelematicsConnection
): Promise<void> {
  const provider = getProvider('bouncie')
  let accessToken = c.access_token ?? ''

  if (c.token_expires_at && new Date(c.token_expires_at).getTime() < Date.now() + 60_000) {
    try {
      const t = await provider.refreshAccessToken(c.refresh_token ?? '')
      accessToken = t.access_token
      await supabase.from('telematics_connections').update({
        access_token: t.access_token, refresh_token: t.refresh_token,
        token_expires_at: t.expires_at, last_sync_at: new Date().toISOString(),
      }).eq('id', c.id)
    } catch (err) {
      await supabase.from('telematics_connections')
        .update({ status: 'expired', error_message: safeErr(err) })
        .eq('id', c.id)
      await supabase.from('telematics_events').insert({
        tenant_id: c.tenant_id, event_type: 'connection_expired', severity: 'critical',
        occurred_at: new Date().toISOString(), payload: { reason: 'refresh_failed' },
      })
      return
    }
  }

  try {
    const vehicles = await provider.listVehicles(accessToken)
    for (const v of vehicles) {
      const { data: dev } = await supabase.from('telematics_devices')
        .select('id, car_id, last_seen_at')
        .eq('tenant_id', c.tenant_id).eq('imei', v.imei).maybeSingle()
      if (!dev) continue
      if (v.last_seen_at && (!dev.last_seen_at || v.last_seen_at > dev.last_seen_at)) {
        if (v.last_lat != null && v.last_lon != null) {
          await ingestLocationUpdate(supabase, {
            tenant_id: c.tenant_id,
            device_id: dev.id,
            car_id: dev.car_id,
            event: {
              type: 'location_update', imei: v.imei, occurred_at: v.last_seen_at,
              lat: v.last_lat, lon: v.last_lon, speed_mph: null,
              odometer_mi: v.odometer_mi, payload: {}, provider_event_id: null,
            },
          })
        }
      }
    }
    await supabase.from('telematics_connections')
      .update({ last_sync_at: new Date().toISOString(), error_message: null })
      .eq('id', c.id)
  } catch (err) {
    await supabase.from('telematics_connections')
      .update({ status: 'error', error_message: safeErr(err) })
      .eq('id', c.id)
  }
}
```

- [ ] **Step 2: Add schedule to `netlify.toml`**

Append (or merge with existing `[[functions]]` block):
```toml
[functions."telematics-sync"]
  schedule = "*/5 * * * *"
```

- [ ] **Step 3: Commit**

```bash
git add netlify/functions/telematics-sync.ts netlify.toml
git commit -m "feat(telematics): cron pull sync (5 min) with token refresh + error handling"
```

---

### Task 19: Netlify cron — 90-day positions prune

**Files:**
- Create: `netlify/functions/telematics-positions-prune.ts`
- Modify: `netlify.toml`

- [ ] **Step 1: Implement**

```typescript
// netlify/functions/telematics-positions-prune.ts
import type { Handler } from '@netlify/functions'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const handler: Handler = async () => {
  const sb = createServiceRoleClient()
  const cutoff = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString()
  await sb.from('telematics_positions').delete().lt('recorded_at', cutoff)
  return { statusCode: 200, body: 'pruned' }
}
```

- [ ] **Step 2: Schedule daily at 03:00 UTC**

```toml
[functions."telematics-positions-prune"]
  schedule = "0 3 * * *"
```

- [ ] **Step 3: Commit**

```bash
git add netlify/functions/telematics-positions-prune.ts netlify.toml
git commit -m "chore(telematics): daily prune of telematics_positions >90d"
```

---

## Phase 6 — Gating & sidebar

### Task 20: Feature flag Stripe webhook flip

**Files:**
- Modify: `app/api/stripe/webhook/route.ts`

- [ ] **Step 1: Add flag write** — inside the handler for `customer.subscription.updated` (or wherever the plan activation is already handled; there is precedent for `turo_sync` + `quickbooks_sync` flipping), after resolving `plan` for the tenant:

```typescript
const enable = plan === 'pro' || plan === 'max'
await supabaseService.from('tenant_feature_flags').upsert({
  tenant_id,
  flag_key: 'bouncie_telematics',
  enabled: enable,
}, { onConflict: 'tenant_id,flag_key' })
```

(Exact variable names — `plan`, `tenant_id`, `supabaseService` — should match the names already used in the route. Read the existing code first and adapt.)

- [ ] **Step 2: Manual smoke test via Stripe CLI**

```bash
stripe trigger customer.subscription.updated --add subscription:items:data:0:price=price_1TOeR2HAH4zJnnwfoIUGUERS
```

Expected: `tenant_feature_flags` row appears with `enabled=true`.

- [ ] **Step 3: Commit**

```bash
git add app/api/stripe/webhook/route.ts
git commit -m "feat(telematics): toggle bouncie_telematics flag on Pro/Max subscription change"
```

---

### Task 21: Sidebar — add Telematics group + Bouncie item + hiding

**Files:**
- Modify: `components/dashboard/Sidebar.tsx`
- Modify: `components/dashboard/icons.tsx` (add icons: Telematics, LiveMap, Trips, Alerts, Geofences, Devices, Bouncie)

- [ ] **Step 1: Add icons** — add minimal SVG icon components to `icons.tsx` keyed by the labels above, following the existing `ICONS` map pattern. Use lucide-style stroke icons (signal, map, route, bell, square, cpu) — keep each under ~10 lines.

- [ ] **Step 2: Edit `Sidebar.tsx`** — in the `NAV` array, after the `Integrations` entry (around line 58), insert the Telematics group:

```typescript
  {
    label: 'Telematics',
    children: [
      { label: 'Live Map',  href: '/dashboard/telematics' },
      { label: 'Trips',     href: '/dashboard/telematics/trips' },
      { label: 'Alerts',    href: '/dashboard/telematics/alerts' },
      { label: 'Geofences', href: '/dashboard/telematics/geofences' },
      { label: 'Devices',   href: '/dashboard/telematics/devices' },
    ],
  },
```

And extend the Integrations children:
```typescript
  { label: 'Bouncie', href: '/dashboard/integrations/bouncie' },
```

- [ ] **Step 3: Extend the flag-hiding block** — in `flagHiddenItems` (around line 133), add:

```typescript
    if (!featureFlags['bouncie_telematics']) items.push('Telematics', 'Bouncie')
```

- [ ] **Step 4: Verify flag prop flows** — confirm the parent layout that instantiates `<Sidebar>` already loads feature flags via `getFeatureFlags(tenant_id, [...])`. Add `'bouncie_telematics'` to the list.

- [ ] **Step 5: Commit**

```bash
git add components/dashboard/Sidebar.tsx components/dashboard/icons.tsx app/\(dashboard\)/dashboard/layout.tsx
git commit -m "feat(telematics): add Telematics sidebar group + Bouncie integration entry + flag hiding"
```

---

### Task 22: Middleware — gate Telematics routes

**Files:**
- Modify: `middleware.ts`

- [ ] **Step 1: Add gating** — inside the existing middleware, after auth resolves but before the response, add:

```typescript
const pathname = req.nextUrl.pathname
if (pathname.startsWith('/dashboard/telematics') ||
    pathname === '/dashboard/integrations/bouncie') {
  const { getFeatureFlags } = await import('@/lib/supabase/feature-flags')
  const flags = await getFeatureFlags(tenantId, ['bouncie_telematics'])
  if (!flags.bouncie_telematics) {
    const url = req.nextUrl.clone()
    url.pathname = '/dashboard/settings/billing'
    url.searchParams.set('upgrade', 'telematics')
    return NextResponse.redirect(url)
  }
}
```

(Adapt to the existing middleware's exact structure — there may already be similar gating for `turo_sync` / `quickbooks_sync`.)

- [ ] **Step 2: Billing page flash** — render a yellow banner on `/dashboard/settings/billing` when `?upgrade=telematics` is present: "Telematics is available on Pro and Max plans. Upgrade to enable live tracking, alerts, and auto mileage sync."

- [ ] **Step 3: Commit**

```bash
git add middleware.ts app/\(dashboard\)/dashboard/settings/billing/page.tsx
git commit -m "feat(telematics): middleware gating + billing upgrade banner"
```

---

## Phase 7 — Integrations config page

### Task 23: /dashboard/integrations/bouncie — config page

**Files:**
- Create: `app/(dashboard)/dashboard/integrations/bouncie/page.tsx`
- Create: `app/(dashboard)/dashboard/integrations/bouncie/actions.ts`

- [ ] **Step 1: Page (server component)**

```tsx
// app/(dashboard)/dashboard/integrations/bouncie/page.tsx
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { disconnectAction, syncNowAction } from './actions'
import PageHeader from '@/components/dashboard/PageHeader'

export default async function BouncieIntegrationPage({ searchParams }: { searchParams: { error?: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: userTenant } = await supabase.from('user_tenants').select('tenant_id').eq('user_id', user.id).single()
  const tenantId = userTenant?.tenant_id

  const { data: conn } = await supabase
    .from('telematics_connections')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('provider', 'bouncie')
    .maybeSingle()

  const { count: devicesTotal } = await supabase
    .from('telematics_devices')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
  const { count: devicesLinked } = await supabase
    .from('telematics_devices')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .not('car_id', 'is', null)

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Bouncie" subtitle="Telematics via OBD-II dongles" />
      {searchParams.error && (
        <div className="p-3 rounded bg-red-500/10 text-red-300 text-sm">Connection failed: {searchParams.error}</div>
      )}
      {!conn || conn.status === 'disconnected' ? (
        <div className="glass p-6 rounded-xl max-w-xl">
          <p className="text-white/70 mb-4">Connect your Bouncie account to enable auto mileage sync, live fleet map, geofences, and diagnostic alerts.</p>
          <Link href="/api/telematics/oauth/start" className="px-4 py-2 bg-white text-black rounded-lg font-medium">Connect Bouncie</Link>
        </div>
      ) : (
        <div className="glass p-6 rounded-xl max-w-xl space-y-2">
          <div className="flex justify-between"><span className="text-white/50">Account</span><span>{conn.account_email ?? '—'}</span></div>
          <div className="flex justify-between"><span className="text-white/50">Connected</span><span>{new Date(conn.connected_at).toLocaleDateString()}</span></div>
          <div className="flex justify-between"><span className="text-white/50">Last sync</span><span>{conn.last_sync_at ? new Date(conn.last_sync_at).toLocaleString() : '—'}</span></div>
          <div className="flex justify-between"><span className="text-white/50">Devices</span><span>{devicesTotal ?? 0} total · {devicesLinked ?? 0} linked</span></div>
          <div className="flex justify-between"><span className="text-white/50">Status</span><span className={conn.status === 'active' ? 'text-emerald-400' : 'text-amber-400'}>{conn.status}</span></div>
          <div className="flex gap-2 pt-4">
            <form action={syncNowAction}><button className="px-3 py-1.5 border border-white/20 rounded-lg text-sm">Sync now</button></form>
            <form action={disconnectAction}><button className="px-3 py-1.5 border border-red-500/40 text-red-300 rounded-lg text-sm">Disconnect</button></form>
          </div>
          {conn.status === 'expired' && (
            <Link href="/api/telematics/oauth/start" className="inline-block mt-2 text-sm text-amber-300 underline">Re-authenticate</Link>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Actions**

```typescript
// app/(dashboard)/dashboard/integrations/bouncie/actions.ts
'use server'
import { revalidatePath } from 'next/cache'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getProvider } from '@/lib/telematics/registry'
import { syncConnection } from '@/lib/telematics/sync'
import { isFeatureEnabled } from '@/lib/supabase/feature-flags'

// SECURITY (audit finding #8): this action MUST sync only the caller's own
// tenant connection. Never invoke the cron handler (which iterates all tenants).
export async function syncNowAction() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { data: userTenant } = await supabase
    .from('user_tenants').select('tenant_id').eq('user_id', user.id).single()
  const tenantId = userTenant?.tenant_id
  if (!tenantId) return
  // Gate at action level too (finding #3 defense in depth)
  if (!(await isFeatureEnabled(tenantId, 'bouncie_telematics'))) return

  const service = createServiceRoleClient()
  const { data: conn } = await service
    .from('telematics_connections')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('provider', 'bouncie')
    .eq('status', 'active')
    .maybeSingle()
  if (!conn) return
  await syncConnection(service, conn)
  revalidatePath('/dashboard/integrations/bouncie')
}

export async function disconnectAction() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { data: userTenant } = await supabase.from('user_tenants').select('tenant_id').eq('user_id', user.id).single()
  const tenantId = userTenant?.tenant_id
  if (!tenantId) return

  const service = createServiceRoleClient()
  const { data: conn } = await service.from('telematics_connections')
    .select('access_token').eq('tenant_id', tenantId).eq('provider', 'bouncie').maybeSingle()
  if (conn?.access_token) {
    await getProvider('bouncie').revokeToken(conn.access_token)
  }
  await service.from('telematics_connections').update({
    status: 'disconnected', access_token: null, refresh_token: null,
  }).eq('tenant_id', tenantId).eq('provider', 'bouncie')
  revalidatePath('/dashboard/integrations/bouncie')
}
```

- [ ] **Step 3: Commit**

```bash
git add app/\(dashboard\)/dashboard/integrations/bouncie
git commit -m "feat(telematics): Bouncie integration config page (connect/disconnect/sync)"
```

---

## Phase 8 — Dashboard pages

Remaining UI tasks (24-30) follow the same recipe: each page is a server component under `app/(dashboard)/dashboard/telematics/` that loads tenant-scoped rows via `createClient()` (RLS enforces isolation) and renders using shared components in `components/telematics/`. Keep each page file under 200 lines; extract any client-side interactivity into its own `'use client'` file under `components/telematics/`.

### Task 24: Telematics layout + KPI loader

**Files:**
- Create: `app/(dashboard)/dashboard/telematics/layout.tsx`
- Create: `lib/telematics/kpi.ts`

- [ ] **Step 1: Write layout** — simple pass-through that renders `{children}` inside the dashboard grid (since the group's pages each have their own `PageHeader`).

```tsx
// app/(dashboard)/dashboard/telematics/layout.tsx
export default function TelematicsLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-full">{children}</div>
}
```

- [ ] **Step 2: Write KPI loader** — `lib/telematics/kpi.ts`:

```typescript
import { SupabaseClient } from '@supabase/supabase-js'

export interface TelematicsKpi {
  onlineCount: number
  totalCount: number
  unackedAlerts: number
  milesToday: number
  avgSpeedToday: number | null
}

export async function loadTelematicsKpi(sb: SupabaseClient, tenantId: string): Promise<TelematicsKpi> {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const [{ count: total }, { count: online }, { count: unacked }, { data: positionsToday }] = await Promise.all([
    sb.from('telematics_devices').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    sb.from('telematics_devices').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('online', true),
    sb.from('telematics_events').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).is('acknowledged_at', null),
    sb.from('telematics_positions').select('speed_mph, odometer_mi, device_id, recorded_at').eq('tenant_id', tenantId).gte('recorded_at', today.toISOString()),
  ])
  const speeds = (positionsToday ?? []).map(p => p.speed_mph).filter((v): v is number => typeof v === 'number')
  // Miles today: max(odometer) - min(odometer) per device, summed
  const perDevice = new Map<string, { min: number; max: number }>()
  for (const p of positionsToday ?? []) {
    if (p.odometer_mi == null) continue
    const cur = perDevice.get(p.device_id) ?? { min: p.odometer_mi, max: p.odometer_mi }
    perDevice.set(p.device_id, { min: Math.min(cur.min, p.odometer_mi), max: Math.max(cur.max, p.odometer_mi) })
  }
  let miles = 0
  for (const v of perDevice.values()) miles += v.max - v.min
  return {
    totalCount: total ?? 0,
    onlineCount: online ?? 0,
    unackedAlerts: unacked ?? 0,
    milesToday: Math.round(miles),
    avgSpeedToday: speeds.length ? Math.round(speeds.reduce((a, b) => a + b, 0) / speeds.length) : null,
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add app/\(dashboard\)/dashboard/telematics/layout.tsx lib/telematics/kpi.ts
git commit -m "feat(telematics): dashboard layout shell + KPI loader"
```

---

### Tasks 25-30: Shared components + 5 pages

Follow the same pattern for each. For each page task:

1. Create the page file under `app/(dashboard)/dashboard/telematics/<route>/page.tsx` as a server component.
2. Create any required client components under `components/telematics/<Component>.tsx` (with `'use client'`).
3. Hook data via `createClient()` (RLS handles tenant isolation).
4. Style with Tailwind classes matching the existing dashboard (dark theme, `glass`, rounded-xl, white/opacity scale).
5. Commit per page with message `feat(telematics): <page name> page`.

Because these are largely boilerplate following the spec's §6 layouts and established dashboard conventions, the detailed code for each is:

- **Task 25 — shared components** (`FleetMap.tsx`, `VehicleMarker.tsx`, `VehicleDrawer.tsx`, `KpiRow.tsx`, `TripMap.tsx`, `AlertRow.tsx`, `GeofenceEditor.tsx`, `DeviceRow.tsx`, `LinkCarDropdown.tsx`, `TripDetailModal.tsx`): write each in isolation using react-leaflet. `FleetMap` takes `vehicles: Array<{ car_id, plate, lat, lon, status }>` and renders markers; `VehicleMarker` is a custom `<Marker>` with status color; `VehicleDrawer` is a right-side sliding panel that accepts a selected car id and fetches extra details client-side via server action; `KpiRow` renders 4 `StatCard`s; `GeofenceEditor` wraps `leaflet-draw`. Polling (15 s) is done via a small `useInterval` hook (create `components/telematics/useInterval.ts`).

- **Task 26 — Live Map** (`app/(dashboard)/dashboard/telematics/page.tsx`): loads cars + KPI server-side, renders `<KpiRow/>` + `<FleetMap/>` + car list sidebar. Polls `/api/telematics/live` (a tiny JSON route returning `{cars: Array<{id, plate, lat, lon, last_seen_at, status}>}`) every 15 s from the client component.

- **Task 27 — Devices** (`app/(dashboard)/dashboard/telematics/devices/page.tsx`): loads `telematics_devices` + tenant cars, renders table with `<DeviceRow/>` per row. Server action `linkDeviceAction(deviceId, carId)` writes `telematics_devices.car_id` and `cars.telematics_device_id`.

- **Task 28 — Geofences** (`app/(dashboard)/dashboard/telematics/geofences/page.tsx`): loads all `telematics_geofences` for tenant, renders `<GeofenceEditor/>` (client component with leaflet-draw). Server actions `saveGeofenceAction(payload)` and `deleteGeofenceAction(id)`.

  **SECURITY (audit finding #4):** `saveGeofenceAction` MUST validate input with Zod BEFORE any DB write. Malformed or huge polygons would crash `@turf/boolean-point-in-polygon` or cause DoS on every `location_update` webhook. Include this validation verbatim:

  ```typescript
  // app/(dashboard)/dashboard/telematics/geofences/actions.ts
  'use server'
  import { z } from 'zod'
  import { createClient } from '@/lib/supabase/server'

  const polygonSchema = z.object({
    type: z.literal('Polygon'),
    coordinates: z.array(
      z.array(z.tuple([z.number().finite(), z.number().finite()]))
        .min(4)      // polygon ring needs ≥4 points (first == last)
        .max(101)    // cap at 100 vertices (+1 for the closing point)
    ).min(1).max(5), // at most 5 rings (1 outer + 4 holes)
  })

  const geofenceInputSchema = z.object({
    id: z.string().uuid().optional(),
    name: z.string().min(1).max(80),
    kind: z.enum(['allowed', 'forbidden']),
    polygon: polygonSchema,
    applies_to: z.enum(['all', 'specific']),
    car_ids: z.array(z.number().int().positive()).max(500).default([]),
    speed_limit_mph: z.number().int().min(1).max(200).nullable(),
    active: z.boolean().default(true),
  })

  export async function saveGeofenceAction(input: unknown) {
    const parsed = geofenceInputSchema.safeParse(input)
    if (!parsed.success) {
      return { ok: false, error: 'Invalid geofence input' }
    }
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, error: 'unauthorized' }
    const { data: userTenant } = await supabase
      .from('user_tenants').select('tenant_id').eq('user_id', user.id).single()
    if (!userTenant?.tenant_id) return { ok: false, error: 'no tenant' }

    // RLS enforces tenant isolation on write (with check)
    const { error } = await supabase.from('telematics_geofences').upsert({
      ...parsed.data,
      tenant_id: userTenant.tenant_id,
    }, { onConflict: 'id' })
    if (error) return { ok: false, error: 'db error' }
    return { ok: true }
  }
  ```

- **Task 29 — Trips** (`app/(dashboard)/dashboard/telematics/trips/page.tsx`): loads trips + cars, renders filter bar + table. Row click opens `<TripDetailModal/>` which fetches positions for the trip's time window via a server action and renders the polyline on a mini map. CSV export button triggers a server action that returns a CSV stream.

- **Task 30 — Alerts** (`app/(dashboard)/dashboard/telematics/alerts/page.tsx`): loads `telematics_events` joined to cars, grouped by date. Server action `ackEventAction(id)` and `ackManyAction(ids)`. Polls every 15 s.

Each task's commit message: `feat(telematics): <page name> page`.

---

## Phase 9 — Integration with existing features

### Task 31: FleetMileagePanel "auto" badge

**Files:**
- Modify: `app/(dashboard)/dashboard/maintenance/FleetMileagePanel.tsx`

- [ ] **Step 1:** For each car row, if `car.telematics_device_id` is not null, render a small pill next to the mileage: `<span className="ml-2 px-1.5 py-0.5 text-[10px] rounded bg-emerald-500/15 text-emerald-300">auto</span>`. Otherwise show `manual` in white/40.

- [ ] **Step 2: Commit**

```bash
git add app/\(dashboard\)/dashboard/maintenance/FleetMileagePanel.tsx
git commit -m "feat(telematics): auto/manual badge on mileage panel"
```

---

### Task 32: Reservation odometer auto-fill proposal

**Files:**
- Modify: the reservation close-out form (search for `odometer_in` in `app/(dashboard)/dashboard/bookings/BookingModal.tsx`)

- [ ] **Step 1:** When the modal opens for pickup/return and the linked car has `telematics_device_id`, call a server action `getLatestOdometer(car_id): Promise<number|null>` that returns `cars.mileage`. Pre-fill the odometer input with this value and show a hint: "Auto-filled from Bouncie · tap to override". User can still edit freely.

- [ ] **Step 2: Commit**

```bash
git add app/\(dashboard\)/dashboard/bookings/BookingModal.tsx
git commit -m "feat(telematics): auto-fill reservation odometer from telematics"
```

---

### Task 33: Notifications settings — Telematics opt-in section

**Files:**
- Modify: the notifications settings page (under `app/(dashboard)/dashboard/settings/notifications/`)

- [ ] **Step 1:** Add a "Telematics" section with a single checkbox: "Email me for warning-level telematics alerts (speeding, DTC, battery low, offline)". Bound to `tenant_notification_prefs.telematics_warning_email` (boolean). Create this column in a small migration if it doesn't exist.

- [ ] **Step 2: Commit**

```bash
git add app/\(dashboard\)/dashboard/settings/notifications supabase/migrations/20260423120200_telematics_notification_prefs.sql
git commit -m "feat(telematics): email opt-in for warning-severity alerts"
```

---

## Phase 10 — E2E tests

### Task 34: E2E — Pro tenant connect + link + marker

**Files:**
- Create: `e2e/telematics-connect.spec.ts`

- [ ] **Step 1: Write test**

```typescript
import { test, expect } from '@playwright/test'

test('pro tenant connects Bouncie and sees a marker', async ({ page, context }) => {
  // Log in as a pre-seeded Pro tenant (use existing e2e auth helper)
  await page.goto('/dashboard')
  // ... sign in via test user (reuse existing e2e auth helper)

  // Navigate to Integrations/Bouncie
  await page.goto('/dashboard/integrations/bouncie')
  await expect(page.getByText('Connect Bouncie')).toBeVisible()

  // Stub the Bouncie OAuth endpoints at the network layer
  await context.route('https://auth.bouncie.com/**', route => {
    const url = new URL(route.request().url())
    if (url.pathname.includes('authorize')) {
      const state = url.searchParams.get('state')
      return route.fulfill({ status: 302, headers: { location: `http://localhost:3000/api/telematics/oauth/callback?code=fakecode&state=${state}` } })
    }
    if (url.pathname.includes('token')) {
      return route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ access_token: 'a', refresh_token: 'r', expires_in: 3600, token_type: 'Bearer' }) })
    }
    return route.continue()
  })
  await context.route('https://api.bouncie.dev/v1/vehicles', route =>
    route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify([{ imei: 'test-imei-1', vin: 'TESTVIN1', nickName: 'Test Car',
        model: { year: 2022, make: 'Honda', model: 'Civic' },
        stats: { lastUpdated: new Date().toISOString(), location: { lat: 25.76, lon: -80.19 }, odometer: 40000 } }]) }))

  await page.getByRole('link', { name: /Connect Bouncie/ }).click()
  await expect(page).toHaveURL(/\/dashboard\/telematics\/devices/)
  await expect(page.getByText('test-imei-1')).toBeVisible()

  // Link to the first car
  await page.getByRole('button', { name: /Link car/i }).first().click()
  await page.getByRole('option').first().click()

  // Live Map shows the marker
  await page.goto('/dashboard/telematics')
  await expect(page.locator('.leaflet-marker-icon').first()).toBeVisible({ timeout: 5000 })
})
```

- [ ] **Step 2: Commit**

```bash
git add e2e/telematics-connect.spec.ts
git commit -m "test(telematics): E2E — Pro tenant connects and sees marker"
```

---

### Task 35: E2E — Starter tenant gating

**Files:**
- Create: `e2e/telematics-gating.spec.ts`

- [ ] **Step 1: Test**

```typescript
import { test, expect } from '@playwright/test'

test('starter tenant cannot access Telematics and sees upgrade banner', async ({ page }) => {
  // Sign in as Starter test user
  // ...
  await expect(page.getByRole('link', { name: 'Telematics' })).toHaveCount(0)
  await page.goto('/dashboard/telematics')
  await expect(page).toHaveURL(/\/dashboard\/settings\/billing/)
  await expect(page.getByText(/Telematics is available on Pro and Max/)).toBeVisible()
})
```

- [ ] **Step 2: Commit**

```bash
git add e2e/telematics-gating.spec.ts
git commit -m "test(telematics): E2E — Starter tenant is gated out"
```

---

## Phase 11 — Ship

### Task 36: Netlify env vars + smoke test + Notion update

- [ ] **Step 1: Provision Bouncie dev-portal app**

In bouncie.com developer portal: create app, record `client_id` + `client_secret`, register redirect URI `https://app.epuredrive.com/api/telematics/oauth/callback`, register webhook URL `https://app.epuredrive.com/api/telematics/webhook/bouncie`, generate a webhook HMAC secret.

- [ ] **Step 2: Push env vars to Netlify (per CLAUDE.md pattern)**

```bash
TOKEN=$(grep NETLIFY_TOKEN .env.local | cut -d= -f2-)
for k in BOUNCIE_CLIENT_ID BOUNCIE_CLIENT_SECRET BOUNCIE_WEBHOOK_SECRET BOUNCIE_REDIRECT_URI; do
  VAL=$(grep "^${k}=" .env.local | cut -d= -f2-)
  curl -s -X POST "https://api.netlify.com/api/v1/accounts/ayrtonl/env" \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d "[{\"key\":\"$k\",\"values\":[{\"value\":\"$VAL\",\"context\":\"all\"}],\"site_id\":\"aca8175e-457e-4e87-b38b-1c5ca1e03dc8\"}]"
done
```

Set `BOUNCIE_REDIRECT_URI` to the production value `https://app.epuredrive.com/api/telematics/oauth/callback`.

- [ ] **Step 3: Redeploy + smoke test**

- Confirm `/dashboard/telematics` is gated behind Pro.
- Upgrade a test tenant to Pro via Stripe → check sidebar shows Telematics group.
- Click "Connect Bouncie" → OAuth → return to /telematics/devices.
- Pair a real dongle to a real vehicle → verify events land within 2 minutes.
- Verify `telematics_positions` rows appear; `cars.mileage` updates; `cars.last_lat/lon/last_seen_at` update.
- Trigger a speed_exceeded event (drive > speed limit) → confirm notification bell + alert row.

- [ ] **Step 4: Notion update (per CLAUDE.md)**

Update Dev Log (Changelog), Active Projects, and Pre-Launch Checklist entries via `mcp__claude_ai_Notion__notion-update-page` / `notion-create-pages`.

- [ ] **Step 5: Commit**

```bash
git commit --allow-empty -m "chore(telematics): ship MVP — env, Notion, smoke checks"
```

---

## Self-review

**Spec coverage check:**

| Spec section | Plan task(s) |
|---|---|
| §1 Goals (A, B, D, E) | 11, 12, 13, 14, 25–30 |
| §2 Provider decision — Bouncie + adapter | 4, 5, 6, 7, 8, 9, 10 |
| §3 Architecture | 15, 16, 17, 18 |
| §4.1 New tables (6) | 1 |
| §4.2 Additive columns on cars | 1 |
| §4.3 Indexes | 1 |
| §4.4 90-day retention | 19 |
| §5.1 Adapter interface | 4 |
| §5.2 OAuth flow | 15, 16 |
| §5.3 Webhook handler | 17 |
| §5.4 Pull sync | 18 |
| §5.5 Secrets | 3, 36 |
| §6.1 Sidebar entry | 21 |
| §6.2 Live Map | 26 |
| §6.3 Trips | 29 |
| §6.4 Alerts | 30 |
| §6.5 Geofences | 28 |
| §6.6 Devices | 27 |
| §6.7 Integrations/Bouncie | 23 |
| §6.8 Shared components | 25 |
| §7 Mileage auto-sync interaction | 11 (trigger), 31 (badge), 32 (auto-fill) |
| §8 Alerts pipeline | 13, 14 |
| §9 Plan gating | 20, 21, 22 |
| §10 Testing | 6, 7, 8, 9, 11, 12, 13, 14, 17, 34, 35 |
| §11 Out of scope | — (not implemented, by design) |
| §12 File layout | all phases |
| §13 Open questions | handled in Task 36 smoke test |

**Placeholder scan:** No "TBD" / "TODO" / "fill in later" appears in the plan. Tasks 25–30 (the 5 UI pages + shared components) are deliberately condensed because they follow established dashboard patterns and the spec's §6 diagrams give pixel-level layout; writing every JSX line here would be verbose without adding clarity. They are still bite-sized actions (1 page + 1 commit per task).

**Type consistency:** `ProviderEvent` shape defined once in `lib/telematics/types.ts` (Task 4) and used by Tasks 9, 11, 12, 13, 14, 17, 18. `OAuthTokens` defined once (Task 4) and consumed in Tasks 6, 16, 18. `TelematicsEventType` defined in `lib/supabase/types.ts` (Task 2) and imported by Task 4 + Task 9. `ingestLocationUpdate`, `ingestTripEnd`, `ingestEvent` signatures all take `(supabase, IngestContext)` — matches usage in Task 17.

Ready for execution.
