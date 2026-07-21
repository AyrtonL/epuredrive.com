-- Consignment owners: one owner, multiple cars.
-- 1. Owner identity table
-- 2. consignments.owner_id FK (one row still = one car)
-- 3. Backfill existing rows, grouping by (tenant_id, owner_name, email)
-- Legacy owner_name/email/phone columns are kept for now (dropped in a later
-- migration once the app no longer reads them).

CREATE TABLE IF NOT EXISTS consignment_owners (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid,
  name               text NOT NULL,
  email              text,
  phone              text,
  default_percentage numeric,
  notes              text,
  created_at         timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consignment_owners_tenant
  ON consignment_owners (tenant_id);

ALTER TABLE consignments
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES consignment_owners(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_consignments_owner
  ON consignments (owner_id);

-- Backfill: one owner per distinct (tenant_id, owner_name, coalesce(email,'')).
WITH grouped AS (
  SELECT
    tenant_id,
    owner_name,
    owner_email,
    (array_agg(owner_phone) FILTER (WHERE owner_phone IS NOT NULL))[1] AS phone,
    (array_agg(owner_percentage))[1] AS pct
  FROM consignments
  WHERE owner_id IS NULL AND owner_name IS NOT NULL
  GROUP BY tenant_id, owner_name, owner_email
),
inserted AS (
  INSERT INTO consignment_owners (tenant_id, name, email, phone, default_percentage)
  SELECT tenant_id, owner_name, owner_email, phone, pct
  FROM grouped
  RETURNING id, tenant_id, name, email
)
UPDATE consignments c
SET owner_id = i.id
FROM inserted i
WHERE c.owner_id IS NULL
  AND c.owner_name = i.name
  AND c.tenant_id IS NOT DISTINCT FROM i.tenant_id
  AND c.owner_email IS NOT DISTINCT FROM i.email;

-- RLS mirrors consignments.
ALTER TABLE consignment_owners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS consignment_owners_tenant ON consignment_owners;
CREATE POLICY consignment_owners_tenant ON consignment_owners
  FOR ALL
  USING ((tenant_id = current_tenant_id()) OR (tenant_id IS NULL))
  WITH CHECK ((tenant_id = current_tenant_id()) OR (tenant_id IS NULL));

DROP POLICY IF EXISTS superuser_consignment_owners_all ON consignment_owners;
CREATE POLICY superuser_consignment_owners_all ON consignment_owners
  FOR ALL
  USING (is_superuser());
