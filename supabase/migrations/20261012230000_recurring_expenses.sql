-- Recurring expenses (insurance, registration, subscriptions …) and
-- auto-generated loan installments. A daily cron + an on-save sync turn each
-- due occurrence into a real `transactions` row, so Expenses, Taxes, Reports,
-- ROI, Consignments and QuickBooks all see the same numbers.
--
-- Idempotency: every generated row carries a deterministic source_key
-- (rec:<rule>:<date>, loan:<car>:<n>:interest|principal) that is unique per
-- tenant — re-running the sync never duplicates. QuickBooks marks synced rows
-- by editing `description`, so the key must not live there.

create table if not exists public.recurring_expenses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  car_id integer references public.cars(id) on delete cascade,
  category text not null default 'insurance',
  description text,
  amount numeric(12,2) not null check (amount > 0),
  frequency text not null check (frequency in ('monthly', 'quarterly', 'yearly')),
  start_date date not null,
  end_date date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date)
);

create index if not exists recurring_expenses_tenant_idx on public.recurring_expenses (tenant_id);

alter table public.recurring_expenses enable row level security;

create policy recurring_expenses_tenant on public.recurring_expenses
  for all to authenticated
  using (tenant_id = current_tenant_id())
  with check (tenant_id = current_tenant_id());

create policy superuser_recurring_expenses_all on public.recurring_expenses
  for all to authenticated
  using (is_superuser());

revoke all on public.recurring_expenses from anon;

alter table public.transactions
  add column if not exists recurring_expense_id uuid references public.recurring_expenses(id) on delete set null,
  add column if not exists source_key text;

-- Full (non-partial) unique index so PostgREST upserts can target it;
-- NULL source_keys (manual expenses) never collide in Postgres.
create unique index if not exists transactions_tenant_source_key_uidx
  on public.transactions (tenant_id, source_key);
