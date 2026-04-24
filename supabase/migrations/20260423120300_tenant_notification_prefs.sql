-- Task 33 — per-tenant notification preferences
-- Primary use: opt-in for warning-level telematics alert emails.
-- Critical-severity alerts always email; warnings only email when
-- telematics_warning_email is true (enforced in lib/telematics/alerts.ts).

create table if not exists public.tenant_notification_prefs (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  telematics_warning_email boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tenant_notification_prefs enable row level security;

drop policy if exists tenant_notification_prefs_tenant on public.tenant_notification_prefs;
create policy tenant_notification_prefs_tenant on public.tenant_notification_prefs for all
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

drop policy if exists tenant_notification_prefs_superuser on public.tenant_notification_prefs;
create policy tenant_notification_prefs_superuser on public.tenant_notification_prefs for all
  using (public.is_superuser());
