-- KAYAD Payment Gateway & Callback Reliability
-- Canonical payment lifecycle constraints, replay safety and audit protection.

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS result_desc TEXT;

-- A provider checkout identifier represents one payment attempt and must not
-- resolve to multiple payment rows.
CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_checkout_request_id
  ON payments(checkout_request_id)
  WHERE checkout_request_id IS NOT NULL;

-- Prevent two pending payments for the same logical operation from being
-- created concurrently by the same user.
CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_pending_operation
  ON payments(user_id, COALESCE(car_id, '00000000-0000-0000-0000-000000000000'::uuid), type)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_payments_user_status_created
  ON payments(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_car_status_created
  ON payments(car_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_type_status_created
  ON payments(type, status, created_at DESC);

-- One attempt number per payment. Retries are represented as new attempts,
-- never by overwriting the previous provider attempt.
CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_attempt_number
  ON payment_attempts(payment_id, attempt_number)
  WHERE payment_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_attempt_checkout
  ON payment_attempts(checkout_request_id)
  WHERE checkout_request_id IS NOT NULL;

-- Payment events are append-only audit records.
REVOKE UPDATE, DELETE ON payment_events FROM authenticated;
REVOKE UPDATE, DELETE ON payment_events FROM anon;

-- Provider webhook records are immutable after processing. Service-role
-- processing updates remain available through the backend connection.
REVOKE UPDATE, DELETE ON webhook_events FROM authenticated;
REVOKE UPDATE, DELETE ON webhook_events FROM anon;

COMMENT ON TABLE payments IS 'Canonical KAYAD payment records. Provider callbacks may advance status only through the payment lifecycle service.';
COMMENT ON TABLE payment_attempts IS 'Immutable-at-business-level provider attempts associated with a payment.';
COMMENT ON TABLE payment_events IS 'Append-only payment lifecycle audit events.';
COMMENT ON TABLE webhook_events IS 'Replay-protected inbound provider webhook receipts.';
