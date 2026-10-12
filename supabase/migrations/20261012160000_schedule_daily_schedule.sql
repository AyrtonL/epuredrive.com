-- 7am New York "today's pickups & returns" digest. pg_cron runs in UTC, so
-- fire at 11:00 (EDT) and 12:00 (EST); the route only sends on the run that
-- is 7am in New York. Same pg_cron → API pattern as the other crons, and
-- register it with the cron_health_check() watchdog.

select cron.schedule(
  'daily-schedule',
  '0 11,12 * * *',
  $$
  select net.http_post(
    url := 'https://epuredrive.com/api/cron/daily-schedule',
    headers := jsonb_build_object('Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='cron_secret')),
    timeout_milliseconds := 55000);
  $$
);

do $$
declare
  def text := pg_get_functiondef('public.cron_health_check'::regproc);
begin
  if position('''daily-schedule''' in def) = 0 then
    execute replace(def, '(''maintenance-alerts'', 1800),',
      '(''daily-schedule'', 1800),' || chr(10) || '      (''maintenance-alerts'', 1800),');
  end if;
end $$;
