-- supabase/migrations/20260414_add_fuel_charge_per_level.sql
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS fuel_charge_per_level numeric(10,2) DEFAULT NULL;

COMMENT ON COLUMN tenants.fuel_charge_per_level IS
  'Charge applied per fuel level unit missing at return (e.g. 20.00 = $20 per quarter-tank). NULL means use default $20 charge.';
