-- supabase/migrations/20260813010000_add_reservation_reviews.sql

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS review_token uuid;

COMMENT ON COLUMN reservations.review_token IS
  'Opaque token for the public no-login review page, generated when the review-request email is sent. Same pattern as agreement_token.';

CREATE TABLE IF NOT EXISTS reservation_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  car_id integer REFERENCES cars(id) ON DELETE SET NULL,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reservation_id)
);

COMMENT ON TABLE reservation_reviews IS
  'Star rating + comment left by a renter via the post-return review-request email. Private to the tenant in v1.';

ALTER TABLE reservation_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY reservation_reviews_tenant ON reservation_reviews
  FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY superuser_reservation_reviews_all ON reservation_reviews
  FOR ALL
  USING (is_superuser());
