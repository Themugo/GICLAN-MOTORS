-- KAYAD Phase 14: refund + payment reconciliation integrity.
-- Uses only the canonical refunds/payments/escrows schema.

ALTER TABLE refunds
  ADD CONSTRAINT refunds_amount_positive CHECK (amount > 0) NOT VALID;

CREATE UNIQUE INDEX IF NOT EXISTS idx_refunds_one_active_per_payment
  ON refunds(payment_id)
  WHERE payment_id IS NOT NULL
    AND status IN ('pending', 'processing');

CREATE OR REPLACE FUNCTION kayad_transition_escrow_atomic(
  p_escrow_id UUID,
  p_next_status TEXT,
  p_actor_id UUID,
  p_role TEXT,
  p_idempotency_key TEXT DEFAULT NULL,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_escrow escrows%ROWTYPE;
  v_payment payments%ROWTYPE;
  v_commission NUMERIC;
  v_seller_amount NUMERIC;
  v_now TIMESTAMPTZ := now();
  v_rate NUMERIC := 0.05;
BEGIN
  SELECT * INTO v_escrow FROM escrows WHERE id = p_escrow_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Escrow not found'; END IF;

  -- A repeated idempotency key is a successful no-op. This check occurs
  -- while holding the row lock, so two identical requests cannot both win.
  IF p_idempotency_key IS NOT NULL AND v_escrow.lastActionKey = p_idempotency_key THEN
    RETURN jsonb_build_object('id', v_escrow.id, 'status', v_escrow.status, 'idempotent', true);
  END IF;

  IF v_escrow.status IN ('refunded', 'closed') THEN
    RAISE EXCEPTION 'Escrow is in terminal state %', v_escrow.status;
  END IF;

  IF NOT (
    (v_escrow.status = 'pending' AND p_next_status IN ('funded','disputed')) OR
    (v_escrow.status = 'funded' AND p_next_status IN ('vehicle_confirmed','disputed','released')) OR
    (v_escrow.status = 'vehicle_confirmed' AND p_next_status IN ('delivered','disputed','released')) OR
    (v_escrow.status = 'delivered' AND p_next_status IN ('released','disputed')) OR
    (v_escrow.status = 'disputed' AND p_next_status IN ('refunded','released')) OR
    (v_escrow.status = 'released' AND p_next_status IN ('closed','disputed'))
  ) THEN
    RAISE EXCEPTION 'Transition from % to % is not allowed', v_escrow.status, p_next_status;
  END IF;

  -- Match the canonical application state machine's role permissions.
  IF NOT (
    (v_escrow.status = 'pending' AND p_next_status = 'funded' AND p_role = 'system') OR
    (v_escrow.status = 'pending' AND p_next_status = 'disputed' AND p_role IN ('buyer','seller','admin','superadmin')) OR
    (v_escrow.status = 'funded' AND p_next_status = 'vehicle_confirmed' AND p_role IN ('buyer','admin','superadmin')) OR
    (v_escrow.status = 'funded' AND p_next_status = 'disputed' AND p_role IN ('buyer','seller','admin','superadmin')) OR
    (v_escrow.status = 'funded' AND p_next_status = 'released' AND p_role = 'system') OR
    (v_escrow.status = 'vehicle_confirmed' AND p_next_status = 'delivered' AND p_role IN ('seller','admin','superadmin')) OR
    (v_escrow.status = 'vehicle_confirmed' AND p_next_status = 'disputed' AND p_role IN ('buyer','seller','admin','superadmin')) OR
    (v_escrow.status = 'vehicle_confirmed' AND p_next_status = 'released' AND p_role = 'system') OR
    (v_escrow.status = 'delivered' AND p_next_status = 'released' AND p_role IN ('admin','superadmin','system')) OR
    (v_escrow.status = 'delivered' AND p_next_status = 'disputed' AND p_role IN ('buyer','seller','admin','superadmin')) OR
    (v_escrow.status = 'disputed' AND p_next_status = 'refunded' AND p_role IN ('admin','superadmin')) OR
    (v_escrow.status = 'disputed' AND p_next_status = 'released' AND p_role IN ('admin','superadmin')) OR
    (v_escrow.status = 'released' AND p_next_status = 'closed' AND p_role IN ('admin','superadmin','system')) OR
    (v_escrow.status = 'released' AND p_next_status = 'disputed' AND p_role IN ('admin','superadmin'))
  ) THEN
    RAISE EXCEPTION 'Role % is not authorized for transition % -> %', p_role, v_escrow.status, p_next_status;
  END IF;

  -- Actor ownership checks for buyer/seller transitions.
  IF p_role = 'buyer' AND p_actor_id IS NOT NULL AND v_escrow.buyer <> p_actor_id THEN
    RAISE EXCEPTION 'Only the escrow buyer can perform this action';
  END IF;
  IF p_role = 'seller' AND p_actor_id IS NOT NULL AND v_escrow.seller <> p_actor_id THEN
    RAISE EXCEPTION 'Only the escrow seller can perform this action';
  END IF;

  -- Auto-release guard: the window must have opened for system releases from
  -- funded/vehicle_confirmed states.
  IF p_next_status = 'released'
     AND v_escrow.status IN ('funded','vehicle_confirmed')
     AND (v_escrow.autoReleaseEligibleAt IS NULL OR v_escrow.autoReleaseEligibleAt > v_now) THEN
    RAISE EXCEPTION 'Auto-release window has not yet opened';
  END IF;

  IF p_next_status = 'released' THEN
    BEGIN
      SELECT COALESCE(dealer_commission, 5) / 100.0 INTO v_rate
        FROM platform_config
       LIMIT 1;
    EXCEPTION WHEN undefined_column THEN
      v_rate := 0.05;
    END;
    v_commission := ROUND(v_escrow.amount * v_rate);
    v_seller_amount := v_escrow.amount - v_commission;
  END IF;

  UPDATE escrows
     SET status = p_next_status,
         lastActionKey = COALESCE(p_idempotency_key, lastActionKey),
         "updatedAt" = v_now,
         "fundedAt" = CASE WHEN p_next_status = 'funded' THEN v_now ELSE "fundedAt" END,
         "vehicleConfirmedAt" = CASE WHEN p_next_status = 'vehicle_confirmed' THEN v_now ELSE "vehicleConfirmedAt" END,
         "deliveredAt" = CASE WHEN p_next_status = 'delivered' THEN v_now ELSE "deliveredAt" END,
         "releasedAt" = CASE WHEN p_next_status = 'released' THEN v_now ELSE "releasedAt" END,
         "releasedBy" = CASE WHEN p_next_status = 'released' THEN p_actor_id ELSE "releasedBy" END,
         "refundedAt" = CASE WHEN p_next_status = 'refunded' THEN v_now ELSE "refundedAt" END,
         "refundedBy" = CASE WHEN p_next_status = 'refunded' THEN p_actor_id ELSE "refundedBy" END,
         "disputedAt" = CASE WHEN p_next_status = 'disputed' THEN v_now ELSE "disputedAt" END,
         "disputedBy" = CASE WHEN p_next_status = 'disputed' THEN p_actor_id ELSE "disputedBy" END,
         "disputeReason" = CASE WHEN p_next_status IN ('disputed','refunded') THEN p_reason ELSE "disputeReason" END,
         commission = CASE WHEN p_next_status = 'released' THEN v_commission ELSE commission END,
         "sellerAmount" = CASE WHEN p_next_status = 'released' THEN v_seller_amount ELSE "sellerAmount" END,
         timeline = COALESCE(timeline, '{}'::jsonb) || jsonb_build_object(
           CASE p_next_status
             WHEN 'funded' THEN 'depositReceived'
             WHEN 'vehicle_confirmed' THEN 'inspectionCompleted'
             WHEN 'delivered' THEN 'deliveryConfirmed'
             WHEN 'released' THEN 'fundsReleased'
             ELSE 'stateChanged'
           END, true
         ),
         history = COALESCE(history, '[]'::jsonb) || jsonb_build_array(
           jsonb_build_object('action', concat('Escrow transitioned to ', p_next_status), 'by', p_actor_id, 'at', v_now, 'reason', p_reason)
         )
   WHERE id = v_escrow.id;

  IF p_next_status = 'released' THEN
    IF v_escrow.car IS NOT NULL THEN
      UPDATE cars
         SET sold = true,
             status = 'sold',
             "isPaid" = true,
             updated_at = v_now
       WHERE id = v_escrow.car;
    END IF;

    IF v_escrow.payment IS NOT NULL THEN
      UPDATE payments
         SET status = 'released',
             platform_fee = v_commission,
             dealer_amount = v_seller_amount,
             updated_at = v_now
       WHERE id = v_escrow.payment;
    END IF;
  ELSIF p_next_status = 'refunded' THEN
    IF v_escrow.payment IS NOT NULL THEN
      SELECT * INTO v_payment FROM payments WHERE id = v_escrow.payment FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'Escrow payment not found'; END IF;
      IF v_payment.amount <> v_escrow.amount THEN
        RAISE EXCEPTION 'Refund/payment amount mismatch: escrow %, payment %', v_escrow.amount, v_payment.amount;
      END IF;
      IF EXISTS (SELECT 1 FROM refunds WHERE payment_id = v_payment.id AND status = 'completed') THEN
        RAISE EXCEPTION 'A completed refund already exists for payment %', v_payment.id;
      END IF;
      UPDATE payments SET status = 'refunded', updated_at = v_now WHERE id = v_escrow.payment;
      INSERT INTO refunds (payment_id, escrow_id, amount, reason, status, initiated_by, created_at, updated_at)
      SELECT v_escrow.payment, v_escrow.id, v_escrow.amount, p_reason, 'pending', p_actor_id, v_now, v_now
      WHERE NOT EXISTS (
        SELECT 1 FROM refunds
         WHERE payment_id = v_escrow.payment
           AND status IN ('pending','processing')
      );
    END IF;
    IF v_escrow.car IS NOT NULL THEN
      UPDATE cars SET sold = false, "isPaid" = false, updated_at = v_now WHERE id = v_escrow.car;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'id', v_escrow.id,
    'status', p_next_status,
    'commission', v_commission,
    'sellerAmount', v_seller_amount,
    'refundStatus', CASE WHEN p_next_status = 'refunded' THEN 'pending' ELSE NULL END,
    'idempotent', false
  );
END;
$$;

REVOKE ALL ON FUNCTION kayad_place_bid_atomic(UUID, UUID, NUMERIC, TEXT, TEXT, NUMERIC, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION kayad_confirm_bid_payment_atomic(TEXT, TEXT) FROM PUBLIC;

REVOKE ALL ON FUNCTION kayad_transition_escrow_atomic(UUID, TEXT, UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION kayad_transition_escrow_atomic(UUID, TEXT, UUID, TEXT, TEXT, TEXT) TO service_role;
