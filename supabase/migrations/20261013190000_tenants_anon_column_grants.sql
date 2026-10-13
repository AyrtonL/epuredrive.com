-- SECURITY: tenants had a table-wide anon SELECT (policy tenants_anon_read for
-- the public site). Anyone with the public anon key could read every tenant's
-- square_access_token / square_refresh_token (full Square API access), Stripe
-- customer/subscription ids, owner contact and notes. Restrict anon to the
-- columns the public site uses (lib/sites/public-car.ts PUBLIC_TENANT_COLUMNS).
-- Ship the code that stops selecting '*' first.

revoke select on public.tenants from anon;

grant select (
  id, name, slug, plan, status, brand_name, logo_url, primary_color, accent_color,
  tagline, description, hero_image_url, site_theme, whatsapp_phone, business_hours,
  pickup_locations, company_address, company_phone, experience_pillars, how_it_works,
  custom_domain, payment_processor, stripe_account_id, square_merchant_id,
  card_surcharge_rate
) on public.tenants to anon;
