-- Dedup Upcar-sourced reservations by the Upcar booking id embedded in `notes`
-- (marker: "Upcar-Res #<id>"). Mirrors uniq_turo_res_id. The id is stable across
-- a booking's accept / modify / car-swap / cancel emails, so all of them update
-- the one row instead of inserting duplicates under concurrent poll runs.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_upcar_res_id
  ON public.reservations ((substring(notes from 'Upcar-Res #([0-9]+)')))
  WHERE source = 'upcar' AND notes ~ 'Upcar-Res #[0-9]+';
