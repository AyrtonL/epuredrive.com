-- return-reminders (app/api/cron/return-reminders/route.ts) sends a one-time D-1
-- "your return is tomorrow" customer email with no dedup guard, unlike its sibling
-- review-requests cron which already tracks review_email_sent_at. If that route is
-- ever re-triggered the same day (manual test hit, a retried cron call), every
-- matching reservation gets a duplicate customer-facing email. Add the same marker
-- pattern used by review_email_sent_at.
alter table reservations
  add column return_reminder_sent_at timestamptz;
