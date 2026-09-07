-- KAYAD: Payment + Escrow domain integrity.
-- Keep at most one active pending payment per user/car/type. The application
-- still handles the friendly duplicate response; this index closes the race.
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_one_pending_per_user_car_type
  ON payments(user_id, car_id, type)
  WHERE status = 'pending';

-- Checkout IDs are provider identifiers and must never map to two payments.
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_checkout_request_unique
  ON payments(checkout_request_id)
  WHERE checkout_request_id IS NOT NULL;
