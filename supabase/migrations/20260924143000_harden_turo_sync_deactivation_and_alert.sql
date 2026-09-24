-- Harden Turo/Upcar Gmail sync auth-failure handling:
--   1. Track consecutive auth failures instead of disabling on the first one —
--      a single transient Google token blip shouldn't kill a 15-min-cadence
--      sync that self-heals on the next tick.
--   2. Extend the existing cron_health_check() watchdog to alert same-day
--      when a sync does get disabled, instead of only finding out via a
--      missing reservation (see project_turo_email_sync memory, 2026-09-24
--      incident: sync died 2026-09-22, went unnoticed until a reservation
--      was reported missing).

alter table public.turo_email_syncs
  add column if not exists consecutive_auth_failures integer not null default 0;

create or replace function public.cron_health_check()
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
DECLARE
  v_resend_key text;
  v_from_email text;
  v_admin_email text;
  v_silent_jobs text := '';
  v_error_summary text := '';
  v_failed_runs text := '';
  v_dead_syncs text := '';
  v_body text;
  v_has_issues boolean := false;
  rec record;
BEGIN
  SELECT decrypted_secret INTO v_resend_key FROM vault.decrypted_secrets WHERE name = 'resend_api_key';
  SELECT decrypted_secret INTO v_from_email FROM vault.decrypted_secrets WHERE name = 'resend_from_email';
  SELECT decrypted_secret INTO v_admin_email FROM vault.decrypted_secrets WHERE name = 'admin_notify_email';

  -- 1. Jobs that have not *successfully* run within their expected interval.
  FOR rec IN
    SELECT j.jobname,
           gap.max_minutes,
           (SELECT max(jr.start_time)
              FROM cron.job_run_details jr
             WHERE jr.jobid = j.jobid
               AND jr.status = 'succeeded') AS last_run
    FROM cron.job j
    JOIN (VALUES
      ('maintenance-alerts', 1800),
      ('poll-turo-emails', 45),
      ('return-reminders', 1800),
      ('review-requests', 1800),
      ('stripe-sync-worker', 10),
      ('sync-ical', 90),
      ('telematics-positions-prune', 1800),
      ('telematics-sync', 20),
      ('tenant-feedback', 1800)
    ) AS gap(jobname, max_minutes) ON gap.jobname = j.jobname
    WHERE j.active
  LOOP
    IF rec.last_run IS NULL OR rec.last_run < now() - (rec.max_minutes || ' minutes')::interval THEN
      v_has_issues := true;
      v_silent_jobs := v_silent_jobs || format('%s: last successful run %s (expected within %s min)%s',
        rec.jobname, coalesce(rec.last_run::text, 'never'), rec.max_minutes, chr(10));
    END IF;
  END LOOP;

  -- 2. Downstream HTTP errors from pg_net responses in the last 26h.
  FOR rec IN
    SELECT
      status_code,
      -- collapse the per-event elapsed-time numbers out of timeout messages
      -- before grouping, so repeats of the same failure aggregate correctly
      regexp_replace(coalesce(error_msg, ''), '[0-9]+(\.[0-9]+)?', 'N', 'g') AS error_pattern,
      timed_out,
      count(*) AS n,
      min(created) AS first_seen,
      max(created) AS last_seen,
      (array_agg(left(coalesce(content, ''), 200)) FILTER (WHERE content IS NOT NULL))[1] AS sample
    FROM net._http_response
    WHERE created > now() - interval '26 hours'
      AND (status_code IS NULL OR status_code NOT IN (200, 204) OR error_msg IS NOT NULL OR timed_out)
    GROUP BY status_code, error_pattern, timed_out
    ORDER BY n DESC
    LIMIT 15
  LOOP
    v_has_issues := true;
    v_error_summary := v_error_summary || format('status=%s error=%s timeout=%s x%s (first %s, last %s) sample: %s%s',
      coalesce(rec.status_code::text, 'NULL'), coalesce(rec.error_pattern, '-'), rec.timed_out, rec.n,
      rec.first_seen, rec.last_seen, coalesce(rec.sample, ''), chr(10));
  END LOOP;

  -- 3. Cron jobs failing at the Postgres level (worker-startup timeouts, exec
  --    errors). These never reach net._http_response, so checks 1-2 miss them.
  FOR rec IN
    SELECT j.jobname,
           regexp_replace(coalesce(d.return_message, ''), '[0-9]+(\.[0-9]+)?', 'N', 'g') AS fail_pattern,
           count(*) AS n,
           min(d.start_time) AS first_seen,
           max(d.start_time) AS last_seen
    FROM cron.job_run_details d
    JOIN cron.job j ON j.jobid = d.jobid
    WHERE d.start_time > now() - interval '26 hours'
      AND d.status = 'failed'
    GROUP BY j.jobname, fail_pattern
    HAVING count(*) >= 5
    ORDER BY n DESC
    LIMIT 15
  LOOP
    v_has_issues := true;
    v_failed_runs := v_failed_runs || format('%s: %s failed runs -- "%s" (first %s, last %s)%s',
      rec.jobname, rec.n, rec.fail_pattern, rec.first_seen, rec.last_seen, chr(10));
  END LOOP;

  -- 4. Turo/Upcar Gmail sync disabled after repeated auth failures. This
  --    silently stops importing new bookings until someone notices — the
  --    2026-09-24 incident went undetected for ~2 days until a reservation
  --    was reported missing.
  FOR rec IN
    SELECT tenant_id, gmail_address, last_checked, consecutive_auth_failures
    FROM turo_email_syncs
    WHERE active = false
  LOOP
    v_has_issues := true;
    v_dead_syncs := v_dead_syncs || format('tenant %s (%s): disabled after %s consecutive auth failures, last successful check %s%s',
      rec.tenant_id, coalesce(rec.gmail_address, '-'), rec.consecutive_auth_failures, coalesce(rec.last_checked::text, 'never'), chr(10));
  END LOOP;

  IF NOT v_has_issues THEN
    RETURN;
  END IF;

  v_body := '<h2>Cron health alert -- ePure Drive</h2>';
  IF v_dead_syncs <> '' THEN
    v_body := v_body || '<h3>Turo/Upcar email sync disabled (no longer importing bookings)</h3><pre>' || v_dead_syncs || '</pre>';
  END IF;
  IF v_silent_jobs <> '' THEN
    v_body := v_body || '<h3>Jobs that missed their expected run</h3><pre>' || v_silent_jobs || '</pre>';
  END IF;
  IF v_failed_runs <> '' THEN
    v_body := v_body || '<h3>Cron jobs failing at the Postgres level (last 26h)</h3><pre>' || v_failed_runs || '</pre>';
  END IF;
  IF v_error_summary <> '' THEN
    v_body := v_body || '<h3>HTTP errors in the last 26h</h3><pre>' || v_error_summary || '</pre>';
  END IF;

  IF v_resend_key IS NOT NULL AND v_admin_email IS NOT NULL THEN
    PERFORM net.http_post(
      url := 'https://api.resend.com/emails',
      headers := jsonb_build_object('Authorization', 'Bearer ' || v_resend_key, 'Content-Type', 'application/json'),
      body := jsonb_build_object(
        'from', v_from_email,
        'to', jsonb_build_array(v_admin_email),
        'subject', '⚠️ Cron health alert -- ePure Drive',
        'html', v_body
      ),
      timeout_milliseconds := 20000
    );
  END IF;
END;
$function$
