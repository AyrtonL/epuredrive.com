-- Fix Log Maintenance (car_services INSERT/UPDATE failing on every submit).
--
-- ServiceModal.tsx and the CarService type have always sent a `description`
-- field, but car_services never had that column -> every create/update
-- failed with "column \"description\" of relation \"car_services\" does not
-- exist" (42703). car_services has been empty since launch as a result.
--
-- Fix: add the missing column so the app's payload matches the schema.
ALTER TABLE public.car_services
  ADD COLUMN IF NOT EXISTS description text;
