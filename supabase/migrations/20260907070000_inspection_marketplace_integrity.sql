/*
# Inspection marketplace integrity hardening

Closes confirmed production gaps in the activated inspection marketplace:
- prevents two active bookings for the same provider/time slot racing through
  the application-side availability check;
- makes payment state structurally idempotent at the booking level;
- adds columns that the real settlement service already writes;
- prevents duplicate provider accounts for one user;
- adds basic non-negative money constraints.

The application already treats a provider slot as unavailable regardless of
whether a staff member is selected, so the unique slot key intentionally uses
provider/date/time rather than staff/date/time.
*/

ALTER TABLE inspection_bookings
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS payment_reference TEXT;

ALTER TABLE inspection_bookings
  DROP CONSTRAINT IF EXISTS chk_inspection_bookings_money_nonnegative;
ALTER TABLE inspection_bookings
  ADD CONSTRAINT chk_inspection_bookings_money_nonnegative
  CHECK (
    COALESCE(base_price, 0) >= 0 AND
    COALESCE(mobile_fee, 0) >= 0 AND
    COALESCE(discount, 0) >= 0 AND
    COALESCE(total_price, 0) >= 0
  );

-- One active booking may occupy a provider's advertised slot. Cancelled and
-- no-show records remain available for history without blocking rebooking.
CREATE UNIQUE INDEX IF NOT EXISTS idx_inspection_bookings_active_slot
  ON inspection_bookings(provider_id, scheduled_date, scheduled_time)
  WHERE status NOT IN ('cancelled', 'no_show');

-- A booking can have exactly one completed inspection-payment transaction.
-- This closes the double-payment race left by the application-only check.
CREATE UNIQUE INDEX IF NOT EXISTS idx_inspection_one_completed_payment
  ON inspection_transactions(booking_id)
  WHERE transaction_type = 'inspection_payment' AND status = 'completed';

-- Payment references are provider-facing idempotency identifiers. Do not let
-- the same reference be applied to two inspection payment transactions.
CREATE UNIQUE INDEX IF NOT EXISTS idx_inspection_payment_reference
  ON inspection_transactions(reference)
  WHERE transaction_type = 'inspection_payment' AND reference IS NOT NULL;

-- A normal user account may own at most one inspection-provider profile.
CREATE UNIQUE INDEX IF NOT EXISTS idx_inspection_provider_one_per_user
  ON inspection_providers(user_id)
  WHERE user_id IS NOT NULL;

ALTER TABLE inspection_transactions
  DROP CONSTRAINT IF EXISTS chk_inspection_transactions_amount_nonzero;
ALTER TABLE inspection_transactions
  ADD CONSTRAINT chk_inspection_transactions_amount_nonzero
  CHECK (amount <> 0);

ALTER TABLE inspection_refunds
  DROP CONSTRAINT IF EXISTS chk_inspection_refunds_amount_positive;
ALTER TABLE inspection_refunds
  ADD CONSTRAINT chk_inspection_refunds_amount_positive
  CHECK (amount > 0);

-- Keep the provider marketplace's price sort backed by a real provider-level
-- value instead of attempting to sort on a non-existent nested packages field.
ALTER TABLE inspection_providers
  ADD COLUMN IF NOT EXISTS starting_price NUMERIC;

CREATE OR REPLACE FUNCTION refresh_inspection_provider_starting_price(p_provider_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE inspection_providers p
  SET starting_price = (
    SELECT MIN(price)
    FROM inspection_packages
    WHERE provider_id = p_provider_id
      AND is_active = true
  ),
  updated_at = now()
  WHERE p.id = p_provider_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trg_refresh_inspection_provider_starting_price()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM refresh_inspection_provider_starting_price(COALESCE(NEW.provider_id, OLD.provider_id));
  IF TG_OP = 'UPDATE' AND NEW.provider_id IS DISTINCT FROM OLD.provider_id THEN
    PERFORM refresh_inspection_provider_starting_price(OLD.provider_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_inspection_package_starting_price ON inspection_packages;
CREATE TRIGGER trg_inspection_package_starting_price
AFTER INSERT OR UPDATE OF provider_id, price, is_active OR DELETE ON inspection_packages
FOR EACH ROW
EXECUTE FUNCTION trg_refresh_inspection_provider_starting_price();

UPDATE inspection_providers p
SET starting_price = (
  SELECT MIN(price)
  FROM inspection_packages ip
  WHERE ip.provider_id = p.id
    AND ip.is_active = true
)
WHERE EXISTS (
  SELECT 1 FROM inspection_packages ip WHERE ip.provider_id = p.id
);
