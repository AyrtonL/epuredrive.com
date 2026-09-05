-- Harden cron_health_check() after the 2026-09-05 07:16-09:46 UTC host-starvation
-- incident: pg_cron failed to launch workers ~165 times ("job startup timeout")
-- across every job, but only 2 failures reached net._http_response, so the old
-- watchdog under-reported a 2.5h outage as "2 HTTP errors".
--
-- Two changes:
--  1. Silent-job check now looks at the last *succeeded* run, not the last run of
--     any status -- a job that fires every minute but fails to start every time
--     was previously considered "not silent".
--  2. New check: any single job with >= 5 failed cron.job_run_details rows in the
--     last 26h (grouped by normalized return_message) is reported. These failures
--     never produce an HTTP response row, so the existing checks cannot see them.

CREATE OR REPLACE FUNCTION public.cron_health_check()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_resend_key text;
  v_from_email text;
  v_admin_email text;
  v_silent_jobs text := '';
  v_error_summary text := '';
  v_failed_runs text := '';
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

  IF NOT v_has_issues THEN
    RETURN;
  END IF;

  v_body := '<h2>Cron health alert -- ePure Drive</h2>';
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
$function$;
