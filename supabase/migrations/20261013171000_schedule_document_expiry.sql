-- Daily vehicle registration / insurance expiry check (12:45 UTC ≈ 8:45am
-- ET), same pg_cron → API pattern as recall-check, registered with the
-- cron_health_check() watchdog.

select cron.schedule(
  'document-expiry',
  '45 12 * * *',
  $$
  select net.http_post(
    url := 'https://epuredrive.com/api/cron/document-expiry',
    headers := jsonb_build_object('Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='cron_secret')),
    timeout_milliseconds := 55000);
  $$
);

do $$
declare
  def text := pg_get_functiondef('public.cron_health_check'::regproc);
begin
  if position('''document-expiry''' in def) = 0 then
    execute replace(def, '(''recall-check'', 1800),',
      '(''recall-check'', 1800),' || chr(10) || '      (''document-expiry'', 1800),');
  end if;
end $$;
