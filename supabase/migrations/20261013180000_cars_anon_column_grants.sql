-- SECURITY: the public booking site reads `cars` as anon (policy
-- cars_public_read). With a table-wide SELECT grant, anyone holding the
-- public anon key could read every column of every tenant's cars — including
-- live GPS position (last_lat/last_lon/last_seen_at), VIN, plate, tracker id,
-- mileage, notes and document dates. Restrict anon to the presentation
-- columns the site actually uses (lib/sites/public-car.ts).
--
-- Deploy order: the site code selecting PUBLIC_CAR_COLUMNS ships first; a
-- select('*') as anon fails once this is applied.

revoke select on public.cars from anon;

grant select (
  id, tenant_id, make, model, model_full, year, daily_rate, color, car_color,
  image_url, gallery, category, badge, seats, transmission, hp, top_speed,
  features, description, status
) on public.cars to anon;
