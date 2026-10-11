-- Web Push subscriptions (installed dashboard app / browser).
-- One row per device. Written only by /api/push/subscribe (server, admin client,
-- after verifying the session and taking tenant_id from the caller's profile);
-- read only by lib/push/send.ts. RLS on with no client policies on purpose.

create table if not exists public.push_subscriptions (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  tenant_id    uuid not null references public.tenants(id) on delete cascade,
  endpoint     text not null unique,
  p256dh       text not null,
  auth         text not null,
  user_agent   text,
  created_at   timestamptz not null default now(),
  last_used_at timestamptz
);

create index if not exists push_subscriptions_tenant_idx on public.push_subscriptions (tenant_id);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;
