-- supabase/migrations/20260413_add_experience_pillars.sql
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS experience_pillars JSONB DEFAULT NULL;

COMMENT ON COLUMN tenants.experience_pillars IS
  'Array of 3 objects: [{title: string, body: string}, ...]. NULL means use app defaults.';
