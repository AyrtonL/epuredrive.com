-- Follow-up to 20260721020000_consignment_owners.sql
-- Owner identity moved to consignment_owners; new inserts (createConsignment)
-- no longer write the legacy owner_name. That column was NOT NULL with no
-- default, so "+ Add car" would fail with a not-null violation. Make it
-- nullable. (owner_email/owner_phone are already nullable.)
ALTER TABLE consignments ALTER COLUMN owner_name DROP NOT NULL;

-- A car may belong to at most one owner. Prevents a car's revenue being
-- counted in two owners' payouts (double-count). Partial: only rows linked
-- to an owner are constrained.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_consignments_car_owned
  ON consignments (car_id)
  WHERE owner_id IS NOT NULL;
