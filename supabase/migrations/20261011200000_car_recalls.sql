-- Vehicle safety recalls (NHTSA), checked daily by /api/cron/recall-check.
-- One row per (car, NHTSA campaign). Matching is by make/model/year (NHTSA has
-- no public per-VIN open-recall API), so a row means "this recall MAY apply" —
-- the operator confirms against the VIN and marks it resolved / not applicable.

create table if not exists public.car_recalls (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  car_id integer not null references public.cars(id) on delete cascade,
  campaign_number text not null,
  manufacturer text,
  component text,
  summary text,
  consequence text,
  remedy text,
  report_received_date date,
  park_it boolean not null default false,
  park_outside boolean not null default false,
  matched_make text not null,
  matched_model text not null,
  matched_year integer not null,
  status text not null default 'open'
    check (status in ('open', 'resolved', 'not_applicable')),
  resolved_at timestamptz,
  first_seen_at timestamptz not null default now(),
  notified_at timestamptz,
  unique (car_id, campaign_number)
);

create index if not exists car_recalls_tenant_status_idx
  on public.car_recalls (tenant_id, status);

alter table public.car_recalls enable row level security;

create policy car_recalls_tenant on public.car_recalls
  for all to authenticated
  using (tenant_id = current_tenant_id())
  with check (tenant_id = current_tenant_id());

create policy superuser_car_recalls_all on public.car_recalls
  for all to authenticated
  using (is_superuser());
