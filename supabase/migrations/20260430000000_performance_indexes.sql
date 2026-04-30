-- Performance indexes for hot dashboard queries.
--
-- Why: dashboard, bookings, ROI, fleet, and consignments pages filter every
-- query by tenant_id, often combined with status, pickup_date, created_at,
-- transaction_date, or service_date. Without these indexes Postgres falls
-- back to sequential scans, which makes the dashboard slow as the data
-- volume grows.
--
-- Strategy: prefer compound indexes (tenant_id, hot_column) so a single
-- index serves both tenant scoping and the most common filter/order
-- combinations. Plain CREATE INDEX (not CONCURRENTLY) so the file works
-- inside Supabase's migration transaction; tables are small enough today
-- that the brief write lock is acceptable.

-- ── reservations (hottest table; appears in 11 dashboard queries) ──────
create index if not exists reservations_tenant_pickup_date_idx
  on public.reservations (tenant_id, pickup_date desc);

create index if not exists reservations_tenant_created_at_idx
  on public.reservations (tenant_id, created_at desc);

create index if not exists reservations_tenant_status_idx
  on public.reservations (tenant_id, status);

create index if not exists reservations_car_id_idx
  on public.reservations (car_id);

-- ── cars ───────────────────────────────────────────────────────────────
create index if not exists cars_tenant_id_idx
  on public.cars (tenant_id);

-- ── transactions (finance pages order by transaction_date) ─────────────
create index if not exists transactions_tenant_date_idx
  on public.transactions (tenant_id, transaction_date desc);

create index if not exists transactions_car_id_idx
  on public.transactions (car_id);

-- ── car_services (maintenance + ROI) ───────────────────────────────────
create index if not exists car_services_tenant_service_date_idx
  on public.car_services (tenant_id, service_date desc);

create index if not exists car_services_car_id_idx
  on public.car_services (car_id);

-- ── consignments ───────────────────────────────────────────────────────
create index if not exists consignments_tenant_id_idx
  on public.consignments (tenant_id);

-- ── customers ──────────────────────────────────────────────────────────
create index if not exists customers_tenant_id_idx
  on public.customers (tenant_id);

-- ── profiles (looked up by tenant in bookings/admin actions) ──────────
create index if not exists profiles_tenant_id_idx
  on public.profiles (tenant_id);
