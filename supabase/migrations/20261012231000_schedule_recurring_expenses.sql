-- Daily recurring-expense / loan-installment generation (10:15 UTC ≈ 6am ET),
-- same pg_cron → API pattern as the other crons, registered with the
-- cron_health_check() watchdog.

select cron.schedule(
  'recurring-expenses',
  '15 10 * * *',
  $$
  select net.http_post(
    url := 'https://epuredrive.com/api/cron/recurring-expenses',
    headers := jsonb_build_object('Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='cron_secret')),
    timeout_milliseconds := 55000);
  $$
);

do $$
declare
  def text := pg_get_functiondef('public.cron_health_check'::regproc);
begin
  if position('''recurring-expenses''' in def) = 0 then
    execute replace(def, '(''recall-check'', 1800),',
      '(''recall-check'', 1800),' || chr(10) || '      (''recurring-expenses'', 1800),');
  end if;
end $$;
