-- Telematics positions dedupe — idempotent ingest for Bouncie redeliveries
--
-- Bouncie can resend the same location webhook on network hiccups, which
-- previously produced duplicate rows in telematics_positions. Adding a
-- UNIQUE(device_id, recorded_at) constraint (combined with upsert +
-- ignoreDuplicates in lib/telematics/ingest.ts::ingestLocationUpdate) makes
-- replay safe.
--
-- Safety: verified on prod that no duplicate (device_id, recorded_at) rows
-- exist prior to applying this migration, so the index creation won't fail.

alter table public.telematics_positions
  add constraint telematics_positions_device_recorded_at_key
  unique (device_id, recorded_at);
