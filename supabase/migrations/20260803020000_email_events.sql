-- Tracks Resend delivery events (bounces, complaints, delays) so the dashboard
-- can surface "this email may not have reached the customer" instead of a
-- blind "sent" status. Populated by the Resend webhook (service role only).
create table if not exists email_events (
  id uuid primary key default gen_random_uuid(),
  resend_email_id text not null,
  event_type text not null,
  recipient text not null,
  reservation_id uuid references reservations(id) on delete cascade,
  tenant_id uuid references tenants(id) on delete cascade,
  email_type text,
  raw jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists email_events_reservation_id_idx on email_events(reservation_id);
create index if not exists email_events_resend_email_id_idx on email_events(resend_email_id);

alter table email_events enable row level security;

create policy "Tenant reads own email events"
  on email_events for select
  using (tenant_id = (select tenant_id from profiles where id = auth.uid()));
