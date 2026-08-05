-- supabase/migrations/20260804010000_add_card_surcharge.sql
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS card_surcharge_rate numeric(5,4) DEFAULT 0.06;

COMMENT ON COLUMN tenants.card_surcharge_rate IS
  'Decimal rate (0.06 = 6%) added to card payments. NULL treated as 0.06 default.';

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS payment_method text;

COMMENT ON COLUMN reservations.payment_method IS
  'How the reservation was/will be paid: card or cash. NULL for legacy rows predating this feature.';
