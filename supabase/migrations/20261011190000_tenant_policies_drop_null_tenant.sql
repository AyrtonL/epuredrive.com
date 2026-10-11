-- SECURITY: tenant RLS policies no longer match rows with tenant_id IS NULL.
--
-- Nine tenant policies were `tenant_id = current_tenant_id() OR tenant_id IS NULL`
-- (USING and WITH CHECK), a leftover from the single-tenant era. Any signed-in
-- user could read/modify every NULL-tenant row and create new ones visible to
-- all tenants. consignment_owners and turo_feeds applied to the `public` role,
-- so even anonymous requests could do it.
--
-- Every insert in the current app sets tenant_id explicitly (checked
-- 2026-10-11). Only the legacy static dashboard (public/admin/js/dashboard.js)
-- can omit it; those inserts now fail instead of creating cross-tenant rows.
-- The only NULL-tenant row (one past blocked date) is assigned to its car's tenant.

update public.blocked_dates b
   set tenant_id = c.tenant_id
  from public.cars c
 where b.tenant_id is null and b.car_id = c.id and c.tenant_id is not null;

alter policy blocked_dates_tenant        on public.blocked_dates        using (tenant_id = current_tenant_id()) with check (tenant_id = current_tenant_id());
alter policy car_services_tenant         on public.car_services         using (tenant_id = current_tenant_id()) with check (tenant_id = current_tenant_id());
alter policy cars_tenant                 on public.cars                 using (tenant_id = current_tenant_id()) with check (tenant_id = current_tenant_id());
alter policy consignment_expenses_tenant on public.consignment_expenses using (tenant_id = current_tenant_id()) with check (tenant_id = current_tenant_id());
alter policy consignments_tenant         on public.consignments         using (tenant_id = current_tenant_id()) with check (tenant_id = current_tenant_id());
alter policy customers_tenant            on public.customers            using (tenant_id = current_tenant_id()) with check (tenant_id = current_tenant_id());
alter policy reservations_tenant         on public.reservations         using (tenant_id = current_tenant_id()) with check (tenant_id = current_tenant_id());
alter policy consignment_owners_tenant   on public.consignment_owners   to authenticated using (tenant_id = current_tenant_id()) with check (tenant_id = current_tenant_id());
alter policy tenant_turo_feeds           on public.turo_feeds           to authenticated using (tenant_id = current_tenant_id()) with check (tenant_id = current_tenant_id());
