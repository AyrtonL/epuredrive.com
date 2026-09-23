-- Recurring host-starvation incidents (2026-09-05, 09-20/21, 09-23 -- see project
-- memory) show stripe-sync-worker dominating each incident's failure count
-- (105-219 failed "job startup timeout" runs vs 5-39 for every other cron),
-- because its */1 schedule retries roughly every 10s while pg_cron can't launch
-- workers, adding fork pressure during the exact window the host is already
-- starved. Halving the cadence to */2 halves that retry pressure without
-- materially degrading Stripe sync latency (queue still drains within ~2 min).
SELECT cron.alter_job(job_id := 1, schedule := '*/2 * * * *');
