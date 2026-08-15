-- supabase/migrations/20260813000000_add_tenant_feedback.sql

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS feedback_email_sent_at timestamptz;
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS feedback_reminder_sent_at timestamptz;

COMMENT ON COLUMN tenants.feedback_email_sent_at IS
  'When the 14-day product feedback request email was sent. NULL = not yet sent.';
COMMENT ON COLUMN tenants.feedback_reminder_sent_at IS
  'When the 7-day feedback reminder was sent (only if no tenant_feedback row exists yet). NULL = not sent / not needed.';

CREATE TABLE IF NOT EXISTS tenant_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE tenant_feedback IS
  'Product feedback submitted by tenants via the 14-day feedback email CTA.';

ALTER TABLE tenant_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_feedback_tenant ON tenant_feedback
  FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY superuser_tenant_feedback_all ON tenant_feedback
  FOR ALL
  USING (is_superuser());
