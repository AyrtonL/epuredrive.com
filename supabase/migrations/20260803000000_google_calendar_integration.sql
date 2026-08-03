-- Google Calendar integration: one connection per tenant, one event per confirmed reservation.
create table if not exists google_calendar_connections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) unique,
  google_email text,
  access_token text not null,
  refresh_token text not null,
  calendar_id text not null default 'primary',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table reservations add column if not exists google_calendar_event_id text;

alter table google_calendar_connections enable row level security;

create policy "Tenant reads own calendar connection"
  on google_calendar_connections for select
  using (tenant_id = (select tenant_id from profiles where id = auth.uid()));

create policy "Tenant deletes own calendar connection"
  on google_calendar_connections for delete
  using (tenant_id = (select tenant_id from profiles where id = auth.uid()));
