---
name: supabase-schema-check
description: Use when about to write an INSERT or UPDATE against Supabase/PostgreSQL in this repo — before writing the query, not after it fails
---

# Supabase Schema Check

## Overview
Silent write failures in this project come from assuming a column is optional or guessing its name. Check the real schema first — it's one query, and it's cheaper than a failed cron run or a prod outage.

## When to Use
Before any `INSERT`/`UPDATE` (raw SQL, Supabase JS client, or `mcp__claude_ai_Supabase__execute_sql`) against a table you haven't just verified this session.

## Steps
1. Query the real schema, don't assume:
   ```sql
   select column_name, is_nullable, column_default
   from information_schema.columns
   where table_name = '<table>'
   order by ordinal_position;
   ```
2. Flag every column where `is_nullable = 'NO'` and `column_default is null` — these are required with no fallback. Your insert must supply them explicitly.
3. Check for triggers on the table (`get_advisors` or `\d <table>` equivalent) — a write may auto-mirror into another table. Don't hand-duplicate what a trigger already does.
4. Test with realistic data (real car IDs, real date ranges), then `SELECT` the row back to confirm it landed as expected.

## Known gotchas in this schema (verified, not guesses)
- `reservations.booking_code` — NOT NULL, no default. A cron insert that omits it fails silently. See `feedback_reservations_booking_code` memory.
- `car_services` — has a DB trigger that auto-mirrors maintenance cost into `transactions` as an expense (linked via `transaction_id`). The cost column is `cost`, not `amount`. Don't double-insert the expense side yourself.
- `tenants.owner_email` / `owner_name` — NULL for every tenant. Resolve operator contact via the `get_tenant_owners()` RPC, never by reading these columns directly.
- `consignment_owners` — consignments are normalized here (one owner → many cars via `owner_id` FK). Legacy `owner_name`/`email`/`phone` columns on the old table are pending removal — don't write to them.

## Common Mistakes
- Assuming a column is optional because it "seems like metadata" — check `is_nullable`, don't guess.
- Inserting into a table that has a mirroring trigger, then also writing the mirrored row by hand → double-counted expense/revenue.
- Reading `owner_email` directly instead of calling `get_tenant_owners()`.
