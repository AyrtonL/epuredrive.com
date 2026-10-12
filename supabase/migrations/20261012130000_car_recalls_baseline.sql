-- Recall alerts switch to "new campaigns only" (see lib/recalls/check.ts):
-- the backlog found on a car's first check is stored as silent 'baseline' rows,
-- hidden from the UI. cars.recall_baseline_key records the make/model/year/VIN
-- the baseline was taken for, so an edited car re-baselines instead of alerting.

alter table public.car_recalls drop constraint car_recalls_status_check;
alter table public.car_recalls add constraint car_recalls_status_check
  check (status in ('open', 'resolved', 'not_applicable', 'baseline'));

alter table public.cars add column if not exists recall_baseline_key text;

-- The 2026-10-12 first run alerted on the whole backlog; nhtsa.gov VIN lookups
-- showed none of it applied. Those rows become the baseline.
update public.car_recalls
   set status = 'baseline', notified_at = coalesce(notified_at, now())
 where status = 'open';
