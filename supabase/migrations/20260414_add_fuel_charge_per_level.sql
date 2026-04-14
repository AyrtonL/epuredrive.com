-- supabase/migrations/20260414_add_fuel_charge_per_level.sql
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS fuel_charge_per_level numeric(10,2) DEFAULT NULL;
