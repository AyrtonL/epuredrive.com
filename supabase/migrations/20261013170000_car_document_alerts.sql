-- Vehicle registration / insurance expiry alerts. One row per alert sent
-- (car, document, expiry date, threshold 30/7/0 days) so the daily cron
-- never repeats itself; renewing a document changes expiry_date and alerts
-- start fresh. Written only by the cron (service role).

create table if not exists public.car_document_alerts (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  car_id integer not null references public.cars(id) on delete cascade,
  kind text not null check (kind in ('registration', 'insurance')),
  expiry_date date not null,
  threshold integer not null check (threshold in (30, 7, 0)),
  sent_at timestamptz not null default now(),
  unique (car_id, kind, expiry_date, threshold)
);

create index if not exists car_document_alerts_tenant_idx on public.car_document_alerts (tenant_id);

alter table public.car_document_alerts enable row level security;

create policy car_document_alerts_tenant_select on public.car_document_alerts
  for select to authenticated
  using (tenant_id = current_tenant_id());

create policy superuser_car_document_alerts_all on public.car_document_alerts
  for all to authenticated
  using (is_superuser());

revoke all on public.car_document_alerts from anon;
