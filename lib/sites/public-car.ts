// lib/sites/public-car.ts
//
// The only `cars` columns the public booking site may read. The anon role is
// granted exactly these (migration 20261013180000) — never select('*') on a
// public page: VIN, plate, live GPS position, tracker id, mileage, notes and
// document dates are private to the operator.

export const PUBLIC_CAR_COLUMNS =
  'id, tenant_id, make, model, model_full, year, daily_rate, color, car_color, image_url, gallery, category, badge, seats, transmission, hp, top_speed, features, description, status'

// Same rule for `tenants` (migration 20261013190000). Never expose payment
// tokens (square_access_token / square_refresh_token), Stripe customer or
// subscription ids, owner contact, notes or internal timestamps.
export const PUBLIC_TENANT_COLUMNS =
  'id, name, slug, plan, status, brand_name, logo_url, primary_color, accent_color, tagline, description, hero_image_url, site_theme, whatsapp_phone, business_hours, pickup_locations, company_address, company_phone, experience_pillars, how_it_works, custom_domain, payment_processor, stripe_account_id, square_merchant_id, card_surcharge_rate'
