-- Track last-known MIL (check engine light) state per device so the
-- 5-minute pg_cron sync can detect a state change and recover a dropped
-- 'mil' webhook delivery (Bouncie's webhook push isn't guaranteed for
-- every MIL transition — see lib/telematics/sync.ts).
alter table public.telematics_devices
  add column if not exists mil_on boolean;
