-- Daily NHTSA recall sweep (12:30 UTC ≈ 8:30am ET), same pg_cron → API pattern
-- as the other crons, and register it with the cron_health_check() watchdog.

select cron.schedule(
  'recall-check',
  '30 12 * * *',
  $$
  select net.http_post(
    url := 'https://epuredrive.com/api/cron/recall-check',
    headers := jsonb_build_object('Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='cron_secret')),
    timeout_milliseconds := 55000);
  $$
);

-- Add ('recall-check', 1800) to the watchdog's expected-interval list without
-- restating the whole function body.
do $$
declare
  def text := pg_get_functiondef('public.cron_health_check'::regproc);
begin
  if position('''recall-check''' in def) = 0 then
    execute replace(def, '(''poll-turo-emails'', 45),',
      '(''poll-turo-emails'', 45),' || chr(10) || '      (''recall-check'', 1800),');
  end if;
end $$;
