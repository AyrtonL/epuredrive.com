-- car_recalls rows are created only by the recall-check cron (service role).
-- Tenants may read their rows and flip status/resolved_at — nothing else, so a
-- tenant can't plant a row pointing at another tenant's car_id.
drop policy if exists car_recalls_tenant on public.car_recalls;
create policy car_recalls_tenant_select on public.car_recalls for select to authenticated
  using (tenant_id = current_tenant_id());
create policy car_recalls_tenant_update on public.car_recalls for update to authenticated
  using (tenant_id = current_tenant_id()) with check (tenant_id = current_tenant_id());
revoke insert, update, delete on public.car_recalls from anon, authenticated;
grant select on public.car_recalls to authenticated;
grant update (status, resolved_at) on public.car_recalls to authenticated;
