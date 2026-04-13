-- Add custom_domain column to tenants
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS custom_domain TEXT UNIQUE;

-- Fast index for middleware lookup (runs on every request from a custom domain)
CREATE INDEX IF NOT EXISTS idx_tenants_custom_domain
  ON tenants (custom_domain)
  WHERE custom_domain IS NOT NULL;
