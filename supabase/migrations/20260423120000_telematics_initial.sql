-- Telematics (Bouncie) — initial schema
-- Spec:  docs/superpowers/specs/2026-04-23-telematics-bouncie-design.md
-- Plan:  docs/superpowers/plans/2026-04-23-telematics-bouncie.md
--
-- RLS convention matches existing tables (cars, reservations):
--   (tenant_id = current_tenant_id()) for user-auth clients
--   is_superuser() bypass for platform admins
--   service_role bypasses RLS by default (webhook + cron use it)

-- ── telematics_connections ─────────────────────────────────────────────
create table if not exists public.telematics_connections (
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
create index if not exists telematics_connections_tenant_id_idx on public.telematics_connections (tenant_id);

alter table public.telematics_connections enable row level security;
drop policy if exists telematics_connections_tenant on public.telematics_connections;
create policy telematics_connections_tenant on public.telematics_connections for all
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());
drop policy if exists telematics_connections_superuser on public.telematics_connections;
create policy telematics_connections_superuser on public.telematics_connections for all
  using (public.is_superuser());

-- ── telematics_devices ─────────────────────────────────────────────────
create table if not exists public.telematics_devices (
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
create index if not exists telematics_devices_tenant_idx on public.telematics_devices (tenant_id);
create index if not exists telematics_devices_car_idx on public.telematics_devices (car_id);
create index if not exists telematics_devices_unlinked_idx on public.telematics_devices (tenant_id) where car_id is null;

alter table public.telematics_devices enable row level security;
drop policy if exists telematics_devices_tenant on public.telematics_devices;
create policy telematics_devices_tenant on public.telematics_devices for all
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());
drop policy if exists telematics_devices_superuser on public.telematics_devices;
create policy telematics_devices_superuser on public.telematics_devices for all
  using (public.is_superuser());

-- ── telematics_positions ───────────────────────────────────────────────
create table if not exists public.telematics_positions (
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
create index if not exists telematics_positions_device_time_idx on public.telematics_positions (tenant_id, device_id, recorded_at desc);
create index if not exists telematics_positions_recorded_at_idx on public.telematics_positions (recorded_at);

alter table public.telematics_positions enable row level security;
-- SECURITY: Intentionally NO insert/update/delete policy for user-auth clients.
-- All writes go through the service-role client (webhook + cron).
-- Adding a user-role INSERT policy here is a security regression (audit finding #9).
drop policy if exists telematics_positions_tenant_read on public.telematics_positions;
create policy telematics_positions_tenant_read on public.telematics_positions for select
  using (tenant_id = public.current_tenant_id());
drop policy if exists telematics_positions_superuser on public.telematics_positions;
create policy telematics_positions_superuser on public.telematics_positions for all
  using (public.is_superuser());

-- ── telematics_trips ───────────────────────────────────────────────────
create table if not exists public.telematics_trips (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  device_id uuid not null references public.telematics_devices(id) on delete cascade,
  car_id integer references public.cars(id) on delete set null,
  reservation_id uuid references public.reservations(id) on delete set null,
  started_at timestamptz not null,
  ended_at timestamptz,
  start_lat numeric(10,7),
  start_lon numeric(10,7),
  end_lat numeric(10,7),
  end_lon numeric(10,7),
  distance_mi numeric,
  duration_s integer,
  max_speed_mph numeric(5,1),
  hard_braking_count integer not null default 0,
  hard_accel_count integer not null default 0,
  fuel_consumed_gal numeric,
  bouncie_trip_id text,
  unique (tenant_id, bouncie_trip_id)
);
create index if not exists telematics_trips_tenant_time_idx on public.telematics_trips (tenant_id, started_at desc);
create index if not exists telematics_trips_reservation_idx on public.telematics_trips (reservation_id);

alter table public.telematics_trips enable row level security;
-- SECURITY: service-role writes only (see telematics_positions comment above).
drop policy if exists telematics_trips_tenant_read on public.telematics_trips;
create policy telematics_trips_tenant_read on public.telematics_trips for select
  using (tenant_id = public.current_tenant_id());
drop policy if exists telematics_trips_superuser on public.telematics_trips;
create policy telematics_trips_superuser on public.telematics_trips for all
  using (public.is_superuser());

-- ── telematics_events ──────────────────────────────────────────────────
create table if not exists public.telematics_events (
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
create index if not exists telematics_events_feed_idx on public.telematics_events (tenant_id, acknowledged_at nulls first, occurred_at desc);
create index if not exists telematics_events_type_idx on public.telematics_events (tenant_id, event_type);

alter table public.telematics_events enable row level security;
drop policy if exists telematics_events_tenant_read on public.telematics_events;
create policy telematics_events_tenant_read on public.telematics_events for select
  using (tenant_id = public.current_tenant_id());
drop policy if exists telematics_events_tenant_ack on public.telematics_events;
create policy telematics_events_tenant_ack on public.telematics_events for update
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());
drop policy if exists telematics_events_superuser on public.telematics_events;
create policy telematics_events_superuser on public.telematics_events for all
  using (public.is_superuser());

-- ── telematics_geofences ───────────────────────────────────────────────
create table if not exists public.telematics_geofences (
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
create index if not exists telematics_geofences_tenant_active_idx on public.telematics_geofences (tenant_id) where active;

alter table public.telematics_geofences enable row level security;
drop policy if exists telematics_geofences_tenant on public.telematics_geofences;
create policy telematics_geofences_tenant on public.telematics_geofences for all
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());
drop policy if exists telematics_geofences_superuser on public.telematics_geofences;
create policy telematics_geofences_superuser on public.telematics_geofences for all
  using (public.is_superuser());

-- ── cars additive columns ──────────────────────────────────────────────
alter table public.cars
  add column if not exists telematics_device_id uuid references public.telematics_devices(id) on delete set null,
  add column if not exists last_seen_at timestamptz,
  add column if not exists last_lat numeric(10,7),
  add column if not exists last_lon numeric(10,7);
create index if not exists cars_telematics_device_id_idx on public.cars (telematics_device_id);

-- ── feature flag seed (idempotent) ─────────────────────────────────────
insert into public.feature_flags (key, label, description, enabled, scope)
values ('bouncie_telematics', 'Bouncie Telematics', 'Enables Telematics dashboard + Bouncie integration', false, 'per-tenant')
on conflict (key) do nothing;

-- ── Monotonic mileage trigger ──────────────────────────────────────────
-- Prevents cars.mileage from decreasing when auto-updated by telematics.
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
