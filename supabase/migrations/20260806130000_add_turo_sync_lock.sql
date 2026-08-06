-- Prevents concurrent pollGmail() runs for the same turo_email_syncs row.
-- Root cause of the recurring "Sync failed: 401" errors: the dashboard's
-- manual "Sync Now" button hits the same route as the 15-min pg_cron job,
-- and when both land close together they each refresh the Gmail access
-- token concurrently, which Google's token-verification edge sometimes
-- rejects within the first moment after issuance. A retry backoff was
-- added previously but doesn't always cover it. This lock removes the
-- race entirely by only letting one poll run per sync row at a time.
alter table turo_email_syncs
  add column sync_started_at timestamptz;
