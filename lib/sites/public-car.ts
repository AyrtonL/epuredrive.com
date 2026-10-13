// lib/sites/public-car.ts
//
// The only `cars` columns the public booking site may read. The anon role is
// granted exactly these (migration 20261013180000) — never select('*') on a
// public page: VIN, plate, live GPS position, tracker id, mileage, notes and
// document dates are private to the operator.

export const PUBLIC_CAR_COLUMNS =
  'id, tenant_id, make, model, model_full, year, daily_rate, color, car_color, image_url, gallery, category, badge, seats, transmission, hp, top_speed, features, description, status'
