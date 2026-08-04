-- Bouncie redelivers webhooks (confirmed: trip_start/trip_end routinely
-- arrive twice with the same transactionId+timestamp) and the MIL
-- reconciliation added in 20260803010000 can also re-fire while a vehicle's
-- last_seen_at is frozen (parked, no new telemetry). ingestEvent() had no
-- idempotency, so every redelivery/re-fire created a fresh duplicate row —
-- surfaced to users as repeated identical alerts in the feed.
--
-- Mirrors the existing telematics_positions pattern (unique index +
-- ignoreDuplicates upsert). Scoped to device_id is not null: the rare
-- device-less events (connection_expired) aren't part of this problem and
-- are low-volume enough not to need it.

-- Collapse existing duplicates first (keep the earliest-inserted row of
-- each set; if any duplicate was already acknowledged, carry that
-- acknowledgment onto the row we keep before dropping the rest).
with ranked as (
  select id, tenant_id, device_id, event_type, occurred_at, acknowledged_at,
         row_number() over (
           partition by tenant_id, device_id, event_type, occurred_at
           order by id
         ) as rn,
         max(acknowledged_at) over (
           partition by tenant_id, device_id, event_type, occurred_at
         ) as group_acknowledged_at
  from public.telematics_events
  where device_id is not null
)
update public.telematics_events e
set acknowledged_at = r.group_acknowledged_at
from ranked r
where e.id = r.id and r.rn = 1
  and r.group_acknowledged_at is not null and e.acknowledged_at is null;

with ranked as (
  select id,
         row_number() over (
           partition by tenant_id, device_id, event_type, occurred_at
           order by id
         ) as rn
  from public.telematics_events
  where device_id is not null
)
delete from public.telematics_events e
using ranked r
where e.id = r.id and r.rn > 1;

create unique index if not exists telematics_events_dedupe_idx
  on public.telematics_events (tenant_id, device_id, event_type, occurred_at)
  where device_id is not null;
