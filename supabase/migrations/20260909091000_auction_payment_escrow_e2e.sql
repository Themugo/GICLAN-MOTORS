-- Auction -> payment -> escrow end-to-end hardening.
-- Re-deploy the escrow funding RPC with identifiers required for realtime
-- reconciliation by buyer/car rooms.
CREATE OR REPLACE FUNCTION kayad_verify_escrow_funding_atomic(
  p_escrow_id UUID,
  p_actor_id UUID,
  p_reference TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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
  IF v_escrow.status <> 'pending' THEN RAISE EXCEPTION 'Only pending escrows can be funded'; END IF;
  IF v_escrow.custodian_account IS NULL THEN RAISE EXCEPTION 'Escrow has no configured custodian account'; END IF;
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
         history = COALESCE(history, '[]'::jsonb) || jsonb_build_array(jsonb_build_object('action', 'Bank funding verified — funds held in admin escrow account', 'by', p_actor_id, 'at', v_now, 'reference', NULLIF(trim(p_reference), ''))),
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
