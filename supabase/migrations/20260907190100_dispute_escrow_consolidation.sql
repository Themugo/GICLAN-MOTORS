-- Canonical dispute storage for vehicle-purchase escrow.
-- Disputes are workflow metadata on the authoritative escrows row;
-- no second financial disputes table is introduced.

ALTER TABLE escrows
  ADD COLUMN IF NOT EXISTS "disputeTitle" TEXT,
  ADD COLUMN IF NOT EXISTS "disputeDescription" TEXT,
  ADD COLUMN IF NOT EXISTS "disputeCategory" TEXT,
  ADD COLUMN IF NOT EXISTS "disputePriority" TEXT,
  ADD COLUMN IF NOT EXISTS "disputeWorkflowStatus" TEXT,
  ADD COLUMN IF NOT EXISTS "disputeAssignedTo" UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS "disputeTimeline" JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "disputeEvidence" JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "disputeInternalNotes" JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "disputeMediation" JSONB,
  ADD COLUMN IF NOT EXISTS "disputeResolution" JSONB,
  ADD COLUMN IF NOT EXISTS "disputeAppeal" JSONB,
  ADD COLUMN IF NOT EXISTS "disputeLastActionKey" TEXT;

ALTER TABLE escrows
  DROP CONSTRAINT IF EXISTS escrows_dispute_category_check,
  ADD CONSTRAINT escrows_dispute_category_check CHECK (
    "disputeCategory" IS NULL OR "disputeCategory" IN ('condition_mismatch','delivery_issue','payment_dispute','fraud','other')
  ),
  DROP CONSTRAINT IF EXISTS escrows_dispute_priority_check,
  ADD CONSTRAINT escrows_dispute_priority_check CHECK (
    "disputePriority" IS NULL OR "disputePriority" IN ('low','medium','high','urgent')
  ),
  DROP CONSTRAINT IF EXISTS escrows_dispute_workflow_status_check,
  ADD CONSTRAINT escrows_dispute_workflow_status_check CHECK (
    "disputeWorkflowStatus" IS NULL OR "disputeWorkflowStatus" IN ('open','under_review','mediation','resolved','appealed','closed')
  );

CREATE INDEX IF NOT EXISTS idx_escrows_dispute_workflow_status ON escrows("disputeWorkflowStatus") WHERE status = 'disputed';
CREATE INDEX IF NOT EXISTS idx_escrows_dispute_assigned_to ON escrows("disputeAssignedTo") WHERE status = 'disputed';
CREATE INDEX IF NOT EXISTS idx_escrows_dispute_last_action ON escrows("disputeLastActionKey") WHERE "disputeLastActionKey" IS NOT NULL;

-- Resolve the financial side of a dispute atomically while the escrow row is locked.
CREATE OR REPLACE FUNCTION kayad_resolve_dispute_atomic(
  p_escrow_id UUID,
  p_actor_id UUID,
  p_decision TEXT,
  p_amount NUMERIC DEFAULT NULL,
  p_seller_amount NUMERIC DEFAULT NULL,
  p_buyer_amount NUMERIC DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_escrow escrows%ROWTYPE;
  v_now TIMESTAMPTZ := now();
  v_rate NUMERIC := 0;
  v_commission NUMERIC := 0;
  v_refund NUMERIC := 0;
  v_seller NUMERIC := 0;
  v_buyer NUMERIC := 0;
  v_status TEXT;
  v_existing JSONB;
BEGIN
  SELECT * INTO v_escrow FROM escrows WHERE id = p_escrow_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Escrow not found'; END IF;

  IF v_escrow.status <> 'disputed' THEN
    RAISE EXCEPTION 'Escrow is not in disputed state';
  END IF;

  IF v_escrow."disputeWorkflowStatus" NOT IN ('under_review','mediation','appealed') THEN
    RAISE EXCEPTION 'Dispute cannot be financially resolved from workflow state %', v_escrow."disputeWorkflowStatus";
  END IF;

  IF p_idempotency_key IS NOT NULL AND v_escrow."disputeLastActionKey" = p_idempotency_key THEN
    RETURN jsonb_build_object('id', v_escrow.id, 'status', v_escrow.status, 'resolution', v_escrow."disputeResolution", 'idempotent', true);
  END IF;

  IF p_decision NOT IN ('full_refund','partial_refund','release_funds','split_settlement','dismissed') THEN
    RAISE EXCEPTION 'Unsupported dispute decision: %', p_decision;
  END IF;

  IF p_decision IN ('release_funds','dismissed','split_settlement') THEN
    BEGIN
      SELECT COALESCE(dealer_commission, 0) / 100.0 INTO v_rate FROM platform_config LIMIT 1;
    EXCEPTION WHEN undefined_table OR undefined_column THEN
      v_rate := 0;
    END;
    v_commission := ROUND(v_escrow.amount * v_rate);
  END IF;

  CASE p_decision
    WHEN 'full_refund' THEN
      v_refund := v_escrow.amount;
      v_seller := 0;
      v_buyer := v_refund;
      v_commission := 0;
      v_status := 'refunded';
    WHEN 'partial_refund' THEN
      v_refund := COALESCE(p_amount, -1);
      IF v_refund <= 0 OR v_refund >= v_escrow.amount THEN
        RAISE EXCEPTION 'Partial refund must be greater than zero and less than escrow amount';
      END IF;
      v_buyer := v_refund;
      v_seller := v_escrow.amount - v_refund;
      v_commission := 0;
      v_status := 'released';
    WHEN 'release_funds', 'dismissed' THEN
      v_buyer := 0;
      v_seller := v_escrow.amount - v_commission;
      v_status := 'released';
    WHEN 'split_settlement' THEN
      v_seller := COALESCE(p_seller_amount, -1);
      v_buyer := COALESCE(p_buyer_amount, -1);
      IF v_seller < 0 OR v_buyer < 0 OR ROUND(v_seller + v_buyer + v_commission, 2) <> ROUND(v_escrow.amount, 2) THEN
        RAISE EXCEPTION 'Split settlement must satisfy seller + buyer + platform fee = escrow amount';
      END IF;
      v_status := 'released';
  END CASE;

  UPDATE escrows
     SET status = v_status,
         commission = v_commission,
         "sellerAmount" = v_seller,
         "disputeLastActionKey" = COALESCE(p_idempotency_key, "disputeLastActionKey"),
         "disputeWorkflowStatus" = 'resolved',
         "disputeResolution" = jsonb_build_object(
           'decision', p_decision,
           'amount', CASE WHEN p_decision IN ('partial_refund','full_refund') THEN v_buyer ELSE v_escrow.amount END,
           'sellerAmount', v_seller,
           'buyerAmount', v_buyer,
           'platformFee', v_commission,
           'reason', COALESCE(p_reason,''),
           'decidedBy', p_actor_id,
           'decidedAt', v_now,
           'implemented', true,
           'implementedAt', v_now
         ),
         "updatedAt" = v_now,
         "releasedAt" = CASE WHEN v_status = 'released' THEN v_now ELSE "releasedAt" END,
         "releasedBy" = CASE WHEN v_status = 'released' THEN p_actor_id ELSE "releasedBy" END,
         "refundedAt" = CASE WHEN v_status = 'refunded' THEN v_now ELSE "refundedAt" END,
         "refundedBy" = CASE WHEN v_status = 'refunded' THEN p_actor_id ELSE "refundedBy" END,
         history = COALESCE(history,'[]'::jsonb) || jsonb_build_array(
           jsonb_build_object('action', concat('Dispute resolved: ',p_decision), 'by',p_actor_id,'at',v_now,'reason',p_reason,'buyerAmount',v_buyer,'sellerAmount',v_seller,'commission',v_commission)
         )
   WHERE id = v_escrow.id;

  IF v_escrow.payment IS NOT NULL THEN
    UPDATE payments
       SET status = CASE WHEN v_status = 'refunded' THEN 'refunded' ELSE 'released' END,
           platform_fee = v_commission,
           dealer_amount = v_seller,
           updated_at = v_now
     WHERE id = v_escrow.payment;
  END IF;

  IF v_escrow.car IS NOT NULL THEN
    UPDATE cars
       SET sold = CASE WHEN v_status = 'released' AND v_buyer = 0 THEN true ELSE false END,
           "isPaid" = CASE WHEN v_status = 'released' AND v_buyer = 0 THEN true ELSE false END,
           updated_at = v_now
     WHERE id = v_escrow.car;
  END IF;

  SELECT to_jsonb(e) INTO v_existing FROM escrows e WHERE e.id = v_escrow.id;
  RETURN v_existing || jsonb_build_object('idempotent', false);
END;
$$;

REVOKE ALL ON FUNCTION kayad_resolve_dispute_atomic(UUID, UUID, TEXT, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION kayad_resolve_dispute_atomic(UUID, UUID, TEXT, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT) TO authenticated;
