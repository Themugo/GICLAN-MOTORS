-- KAYAD Escrow custody boundary.
-- Vehicle purchase funds must not be collected through M-Pesa STK.
-- Until the future KAYAD e-wallet exists, the supported custody rail is
-- bank transfer into an administrator-configured KAYAD escrow account.

ALTER TABLE platform_config
  ADD COLUMN IF NOT EXISTS escrow_rules JSONB NOT NULL DEFAULT '{"enabled":false,"privateSellerRequirement":"mandatory","fundingMethods":["bank_transfer"],"releaseDays":3,"minimumAmount":0,"maximumAmount":null,"commissionPct":0,"futureWalletEnabled":false}'::jsonb;

CREATE TABLE IF NOT EXISTS escrow_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_name TEXT NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'bank' CHECK (account_type = 'bank'),
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  branch TEXT,
  currency TEXT NOT NULL DEFAULT 'KES' CHECK (currency = 'KES'),
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_escrow_accounts_active ON escrow_accounts(is_active);
CREATE UNIQUE INDEX IF NOT EXISTS idx_escrow_accounts_primary_active
  ON escrow_accounts(is_primary) WHERE is_primary = true AND is_active = true;

ALTER TABLE escrow_accounts ENABLE ROW LEVEL SECURITY;

ALTER TABLE escrows
  ADD COLUMN IF NOT EXISTS custodian_account UUID REFERENCES escrow_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS funding_method TEXT CHECK (funding_method IN ('bank_transfer','future_wallet')),
  ADD COLUMN IF NOT EXISTS funding_reference TEXT,
  ADD COLUMN IF NOT EXISTS funded_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS funding_verified_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_escrows_custodian_account ON escrows(custodian_account);
CREATE INDEX IF NOT EXISTS idx_escrows_funding_reference ON escrows(funding_reference);

-- Historical dealer escrow approval is no longer a vehicle escrow eligibility
-- mechanism. Keep the user columns for compatibility with older admin screens,
-- but all vehicle escrow creation is server-enforced to private sellers only.

CREATE OR REPLACE FUNCTION kayad_verify_escrow_funding_atomic(
  p_escrow_id UUID,
  p_actor_id UUID,
  p_reference TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_escrow escrows%ROWTYPE;
  v_account escrow_accounts%ROWTYPE;
  v_now TIMESTAMPTZ := now();
  v_release_days INTEGER := 3;
  v_rules JSONB;
BEGIN
  SELECT * INTO v_escrow FROM escrows WHERE id = p_escrow_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Escrow not found'; END IF;
  IF v_escrow.status <> 'pending' THEN
    RAISE EXCEPTION 'Only pending escrows can be funded';
  END IF;
  IF v_escrow.custodian_account IS NULL THEN
    RAISE EXCEPTION 'Escrow has no configured custodian account';
  END IF;
  SELECT * INTO v_account FROM escrow_accounts WHERE id = v_escrow.custodian_account AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Configured escrow account is inactive or missing'; END IF;

  SELECT escrow_rules INTO v_rules FROM platform_config LIMIT 1;
  v_release_days := GREATEST(0, COALESCE((v_rules->>'releaseDays')::INTEGER, 3));

  UPDATE escrows
     SET status = 'funded',
         "fundedAt" = v_now,
         funded_by = p_actor_id,
         funding_reference = NULLIF(trim(p_reference), ''),
         funding_verified_at = v_now,
         "autoReleaseEligibleAt" = v_now + make_interval(days => v_release_days),
         timeline = COALESCE(timeline, '{}'::jsonb) || jsonb_build_object('depositReceived', true),
         history = COALESCE(history, '[]'::jsonb) || jsonb_build_array(
           jsonb_build_object('action', 'Bank funding verified — funds held in admin escrow account', 'by', p_actor_id, 'at', v_now, 'reference', NULLIF(trim(p_reference), ''))
         ),
         updated_at = v_now
   WHERE id = v_escrow.id;

  IF v_escrow.payment IS NOT NULL THEN
    UPDATE payments SET status = 'success', processed = true, paid_at = v_now, updated_at = v_now WHERE id = v_escrow.payment;
  END IF;

  RETURN jsonb_build_object('id', v_escrow.id, 'status', 'funded', 'buyerId', v_escrow.buyer, 'carId', v_escrow.car, 'fundingReference', NULLIF(trim(p_reference), ''));
END;
$$;

REVOKE ALL ON FUNCTION kayad_verify_escrow_funding_atomic(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION kayad_verify_escrow_funding_atomic(UUID, UUID, TEXT) TO service_role;
