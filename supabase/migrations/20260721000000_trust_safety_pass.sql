-- Trust, Correctness & Safety pass
-- 1. Tenant lifecycle: suspension instead of only hard-delete
-- 2. Persist Stripe identifiers for accurate MRR
-- 3. Transactional tenant deletion (all-or-nothing)

-- ── 1. Tenant status / suspension ────────────────────────────────────────────
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_reason text;

-- Guard against bad values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tenants_status_check'
  ) THEN
    ALTER TABLE tenants
      ADD CONSTRAINT tenants_status_check
      CHECK (status IN ('active', 'suspended'));
  END IF;
END $$;

-- ── 2. Stripe identifiers (for real MRR + robust subscription mapping) ────────
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

CREATE INDEX IF NOT EXISTS idx_tenants_stripe_customer
  ON tenants (stripe_customer_id);

-- ── 3. Transactional tenant deletion ─────────────────────────────────────────
-- Replaces 8 un-checked sequential deletes. Runs in a single transaction so a
-- mid-way failure rolls back completely rather than orphaning child rows.
CREATE OR REPLACE FUNCTION delete_tenant_cascade(p_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM reservations          WHERE tenant_id = p_tenant_id;
  DELETE FROM blocked_dates         WHERE tenant_id = p_tenant_id;
  DELETE FROM car_services          WHERE tenant_id = p_tenant_id;
  DELETE FROM consignment_expenses  WHERE tenant_id = p_tenant_id;
  DELETE FROM consignments          WHERE tenant_id = p_tenant_id;
  DELETE FROM cars                  WHERE tenant_id = p_tenant_id;
  DELETE FROM customers             WHERE tenant_id = p_tenant_id;
  UPDATE profiles SET tenant_id = NULL WHERE tenant_id = p_tenant_id;
  DELETE FROM tenants               WHERE id = p_tenant_id;
END;
$$;
