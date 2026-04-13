-- Add custom_domain column to tenants
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS custom_domain TEXT UNIQUE;

-- Fast index for middleware lookup (runs on every request from a custom domain)
CREATE INDEX IF NOT EXISTS idx_tenants_custom_domain
  ON tenants (custom_domain)
  WHERE custom_domain IS NOT NULL;

-- Allow anonymous middleware lookup (only slug + custom_domain columns are selected)
CREATE POLICY "anon_read_tenant_routing" ON tenants
  FOR SELECT TO anon
  USING (true);
