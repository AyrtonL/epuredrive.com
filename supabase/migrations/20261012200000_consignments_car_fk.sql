-- consignments.car_id had no FK, so a row pointing at a non-existent car
-- (car_id 999999) showed up as "Car #999999" in Consignments. That row was
-- deleted 2026-10-12 (0 orphans left); this keeps it from happening again.
-- Cars are soft-deleted (status='retired'), so a hard delete only happens in
-- tenant deletion — the consignment is meaningless without its car.

alter table public.consignments
  add constraint consignments_car_id_fkey
  foreign key (car_id) references public.cars(id) on delete cascade;
