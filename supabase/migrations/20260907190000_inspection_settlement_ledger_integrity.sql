-- Inspection settlement financial integrity: one canonical financial journal.
-- inspection_transactions remains an operational/audit projection; ledger_entries
-- is the authoritative financial record.

INSERT INTO ledger_accounts (code, name, type, category, description)
VALUES ('5100', 'Inspection Provider Payable', 'liability', 'inspection', 'Amounts owed to inspection providers')
ON CONFLICT (code) DO NOTHING;

ALTER TABLE inspection_settlements
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS payment_reference TEXT,
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

ALTER TABLE inspection_refunds
  ADD COLUMN IF NOT EXISTS ledger_reference TEXT;

ALTER TABLE inspection_transactions
  ADD COLUMN IF NOT EXISTS refund_id UUID REFERENCES inspection_refunds(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_inspection_settlement_period
  ON inspection_settlements(provider_id, period_start, period_end)
  WHERE status IN ('pending','processing','paid');

CREATE UNIQUE INDEX IF NOT EXISTS idx_inspection_refund_ledger_reference
  ON inspection_refunds(ledger_reference)
  WHERE ledger_reference IS NOT NULL;

ALTER TABLE inspection_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_refunds ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON inspection_settlements FROM anon, authenticated;
REVOKE ALL ON inspection_transactions FROM anon, authenticated;
REVOKE ALL ON inspection_refunds FROM anon, authenticated;

COMMENT ON TABLE inspection_settlements IS 'Operational settlement statements. Authoritative financial postings live in ledger_entries.';
COMMENT ON TABLE inspection_transactions IS 'Inspection operational/audit transaction projection; do not treat as the platform financial ledger.';

-- Atomic booking payment: booking state, operational projection and canonical
-- ledger postings commit or roll back together.
CREATE OR REPLACE FUNCTION kayad_process_inspection_payment_atomic(
  p_booking_id UUID,
  p_payment_method TEXT,
  p_payment_reference TEXT,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking inspection_bookings%ROWTYPE;
  v_provider inspection_providers%ROWTYPE;
  v_gross NUMERIC;
  v_rate NUMERIC;
  v_commission NUMERIC;
  v_provider_amount NUMERIC;
  v_existing JSONB;
BEGIN
  SELECT * INTO v_booking FROM inspection_bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF v_booking.payment_status = 'fully_paid' THEN
    RETURN jsonb_build_object('bookingId', p_booking_id, 'paymentStatus', 'fully_paid', 'idempotent', true);
  END IF;
  SELECT * INTO v_provider FROM inspection_providers WHERE id = v_booking.provider_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Inspection provider not found'; END IF;
  v_gross := ROUND(v_booking.total_price::NUMERIC, 2);
  v_rate := COALESCE(v_provider.commission_rate, 15);
  v_commission := ROUND(v_gross * v_rate / 100, 2);
  v_provider_amount := v_gross - v_commission;
  IF v_gross <= 0 OR v_provider_amount < 0 THEN RAISE EXCEPTION 'Invalid inspection payment allocation'; END IF;

  PERFORM kayad_post_ledger_entry_atomic(COALESCE(p_payment_reference, 'inspection-' || p_booking_id::TEXT) || ':provider', p_user_id, v_provider_amount, COALESCE(v_booking.currency,'KES'), 'inspection_payment', 'inspection_provider', 'Inspection provider payable', jsonb_build_object('booking_id',p_booking_id,'event','inspection_payment_provider'), '1000', '5100');
  IF v_commission > 0 THEN
    PERFORM kayad_post_ledger_entry_atomic(COALESCE(p_payment_reference, 'inspection-' || p_booking_id::TEXT) || ':commission', p_user_id, v_commission, COALESCE(v_booking.currency,'KES'), 'inspection_commission', 'platform', 'Inspection commission', jsonb_build_object('booking_id',p_booking_id,'event','inspection_commission'), '1000', '4000');
  END IF;

  UPDATE inspection_bookings SET payment_status='fully_paid', payment_method=p_payment_method, payment_reference=p_payment_reference, paid_at=now(), updated_at=now() WHERE id=p_booking_id;
  INSERT INTO inspection_transactions(provider_id,booking_id,transaction_type,amount,currency,status,description,reference,created_at)
  VALUES(v_booking.provider_id,p_booking_id,'inspection_payment',v_gross,COALESCE(v_booking.currency,'KES'),'completed','Inspection payment',p_payment_reference,now());
  INSERT INTO inspection_transactions(provider_id,booking_id,transaction_type,amount,currency,status,description,reference,created_at)
  VALUES(v_booking.provider_id,p_booking_id,'commission',-v_commission,COALESCE(v_booking.currency,'KES'),'completed','KAYAD inspection commission', 'COMM-'||v_booking.booking_reference,now());
  RETURN jsonb_build_object('bookingId',p_booking_id,'grossAmount',v_gross,'commissionAmount',v_commission,'commissionRate',v_rate,'netAmount',v_provider_amount,'paymentStatus','fully_paid','idempotent',false);
END;
$$;
REVOKE ALL ON FUNCTION kayad_process_inspection_payment_atomic(UUID,TEXT,TEXT,UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION kayad_process_inspection_payment_atomic(UUID,TEXT,TEXT,UUID) TO service_role;

-- Atomic refund: refund audit record and compensating ledger postings share the
-- same database transaction and the booking row is locked during the check.
CREATE OR REPLACE FUNCTION kayad_process_inspection_refund_atomic(
  p_booking_id UUID,
  p_amount NUMERIC,
  p_reason TEXT,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking inspection_bookings%ROWTYPE;
  v_provider inspection_providers%ROWTYPE;
  v_refund inspection_refunds%ROWTYPE;
  v_refunded NUMERIC;
  v_rate NUMERIC;
  v_provider_amount NUMERIC;
  v_commission_amount NUMERIC;
  v_status TEXT;
BEGIN
  SELECT * INTO v_booking FROM inspection_bookings WHERE id=p_booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF v_booking.payment_status NOT IN ('fully_paid','deposit_paid') THEN RAISE EXCEPTION 'Booking has no settled payment to refund'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Refund amount must be greater than zero'; END IF;
  SELECT COALESCE(SUM(amount),0) INTO v_refunded FROM inspection_refunds WHERE booking_id=p_booking_id AND status IN ('pending','approved','processing','completed');
  IF v_refunded + p_amount > v_booking.total_price THEN RAISE EXCEPTION 'Refund amount exceeds remaining refundable balance'; END IF;
  SELECT * INTO v_provider FROM inspection_providers WHERE id=v_booking.provider_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Inspection provider not found'; END IF;
  v_rate := COALESCE(v_provider.commission_rate,15);
  v_provider_amount := ROUND(p_amount * (1-v_rate/100),2);
  v_commission_amount := ROUND(p_amount-v_provider_amount,2);
  INSERT INTO inspection_refunds(booking_id,requested_by,approved_by,amount,currency,reason,status,requested_at,approved_at,created_at,updated_at,ledger_reference)
  VALUES(p_booking_id,p_user_id,p_user_id,p_amount,COALESCE(v_booking.currency,'KES'),COALESCE(p_reason,'Inspection refund'),'approved',now(),now(),now(),now(),'INS-REF-'||gen_random_uuid()::TEXT)
  RETURNING * INTO v_refund;
  IF v_provider_amount > 0 THEN PERFORM kayad_post_ledger_entry_atomic(v_refund.ledger_reference||':provider',p_user_id,v_provider_amount,COALESCE(v_booking.currency,'KES'),'inspection_refund','customer','Inspection provider refund',jsonb_build_object('refund_id',v_refund.id,'booking_id',p_booking_id),'5100','1200'); END IF;
  IF v_commission_amount > 0 THEN PERFORM kayad_post_ledger_entry_atomic(v_refund.ledger_reference||':commission',p_user_id,v_commission_amount,COALESCE(v_booking.currency,'KES'),'inspection_commission_refund','customer','Inspection commission refund',jsonb_build_object('refund_id',v_refund.id,'booking_id',p_booking_id),'4000','1200'); END IF;
  v_status := CASE WHEN v_refunded + p_amount >= v_booking.total_price THEN 'refunded' ELSE 'partial_refund' END;
  UPDATE inspection_refunds SET status='completed',processed_at=now(),updated_at=now() WHERE id=v_refund.id;
  UPDATE inspection_bookings SET payment_status=v_status,updated_at=now() WHERE id=p_booking_id;
  INSERT INTO inspection_transactions(provider_id,booking_id,transaction_type,amount,currency,status,refund_id,description,reference,created_at)
  VALUES(v_booking.provider_id,p_booking_id,'refund',-p_amount,COALESCE(v_booking.currency,'KES'),'completed',v_refund.id,v_refund.reason,v_refund.ledger_reference,now());
  RETURN jsonb_build_object('bookingId',p_booking_id,'refundId',v_refund.id,'refundAmount',p_amount,'commissionRefunded',v_commission_amount,'status','completed');
END;
$$;
REVOKE ALL ON FUNCTION kayad_process_inspection_refund_atomic(UUID,NUMERIC,TEXT,UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION kayad_process_inspection_refund_atomic(UUID,NUMERIC,TEXT,UUID) TO service_role;

-- Atomic settlement payout: ledger and settlement state cannot diverge.
CREATE OR REPLACE FUNCTION kayad_mark_inspection_settlement_paid_atomic(
  p_settlement_id UUID,
  p_payment_method TEXT,
  p_payment_reference TEXT,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settlement inspection_settlements%ROWTYPE;
BEGIN
  SELECT * INTO v_settlement FROM inspection_settlements WHERE id=p_settlement_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Settlement not found'; END IF;
  IF v_settlement.status='paid' THEN RETURN jsonb_build_object('settlementId',p_settlement_id,'status','paid','idempotent',true,'paidAt',v_settlement.paid_at); END IF;
  IF v_settlement.status <> 'pending' THEN RAISE EXCEPTION 'Settlement cannot be paid from %',v_settlement.status; END IF;
  PERFORM kayad_post_ledger_entry_atomic(p_settlement_id::TEXT,p_user_id,v_settlement.net_amount,COALESCE(v_settlement.currency,'KES'),'inspection_payout','inspection_provider','Inspection provider payout',jsonb_build_object('settlement_id',p_settlement_id,'provider_id',v_settlement.provider_id,'event','inspection_payout'),'5100','1200');
  UPDATE inspection_settlements SET status='paid',payment_method=p_payment_method,payment_reference=p_payment_reference,paid_at=now(),processed_at=now(),updated_at=now() WHERE id=p_settlement_id;
  UPDATE inspection_transactions SET status='completed' WHERE settlement_id=p_settlement_id;
  INSERT INTO inspection_transactions(provider_id,settlement_id,transaction_type,amount,currency,status,description,reference,created_at)
  VALUES(v_settlement.provider_id,p_settlement_id,'payout',v_settlement.net_amount,COALESCE(v_settlement.currency,'KES'),'completed','Inspection provider payout',p_payment_reference,now());
  RETURN jsonb_build_object('settlementId',p_settlement_id,'status','paid','paidAt',now(),'idempotent',false);
END;
$$;
REVOKE ALL ON FUNCTION kayad_mark_inspection_settlement_paid_atomic(UUID,TEXT,TEXT,UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION kayad_mark_inspection_settlement_paid_atomic(UUID,TEXT,TEXT,UUID) TO service_role;
