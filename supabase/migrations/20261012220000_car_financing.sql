-- Purchase + financing per vehicle, for real ROI (cash invested, interest,
-- loan balance, equity). Kept OUT of public.cars on purpose: cars has an
-- anon read policy (public fleet site), and purchase price / loan terms must
-- never be readable by the public. One row per car.

create table if not exists public.car_financing (
  car_id integer primary key references public.cars(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  purchase_price numeric(12,2) check (purchase_price >= 0),
  purchase_date date,
  down_payment numeric(12,2) check (down_payment >= 0),
  loan_amount numeric(12,2) check (loan_amount > 0),
  loan_apr numeric(6,3) check (loan_apr >= 0 and loan_apr <= 100),
  loan_term_months integer check (loan_term_months between 1 and 600),
  loan_first_payment_date date,
  current_value numeric(12,2) check (current_value >= 0),
  current_value_as_of date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A loan is either fully described or absent.
  constraint car_financing_loan_complete check (
    (loan_amount is null and loan_apr is null and loan_term_months is null and loan_first_payment_date is null)
    or (loan_amount is not null and loan_apr is not null and loan_term_months is not null and loan_first_payment_date is not null)
  )
);

create index if not exists car_financing_tenant_idx on public.car_financing (tenant_id);

alter table public.car_financing enable row level security;

create policy car_financing_tenant on public.car_financing
  for all to authenticated
  using (tenant_id = current_tenant_id())
  with check (tenant_id = current_tenant_id());

create policy superuser_car_financing_all on public.car_financing
  for all to authenticated
  using (is_superuser());

-- Belt and braces: no anon access at all.
revoke all on public.car_financing from anon;
