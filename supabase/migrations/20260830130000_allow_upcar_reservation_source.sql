-- The Upcar email sync inserts reservations with source='upcar'; the existing
-- reservations_source_check CHECK constraint did not permit that value.
ALTER TABLE public.reservations DROP CONSTRAINT reservations_source_check;
ALTER TABLE public.reservations ADD CONSTRAINT reservations_source_check
  CHECK (source = ANY (ARRAY['manual','turo','upcar','web','website','ical','admin','stripe']));
