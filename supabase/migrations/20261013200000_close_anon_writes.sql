-- SECURITY: two over-broad policies.
--
-- 1. reservations.anon_insert_reservations (WITH CHECK true) let anyone with
--    the public anon key insert a reservation into ANY tenant with ANY status
--    and amount (fake "completed" revenue, calendar-blocking bookings). The
--    booking site never used it: /api/booking/request, the Stripe/Square
--    webhooks and the email/iCal syncs all insert with the service role.
--
-- 2. qb_api_logs."Service role full access on qb_api_logs" was granted to
--    role public with USING true — i.e. anon/authenticated could read, write
--    and delete QuickBooks API logs. Scope it to service_role as intended.

drop policy if exists anon_insert_reservations on public.reservations;
revoke insert, update, delete on public.reservations from anon;

drop policy if exists "Service role full access on qb_api_logs" on public.qb_api_logs;
create policy "Service role full access on qb_api_logs" on public.qb_api_logs
  for all to service_role
  using (true)
  with check (true);
revoke all on public.qb_api_logs from anon;
