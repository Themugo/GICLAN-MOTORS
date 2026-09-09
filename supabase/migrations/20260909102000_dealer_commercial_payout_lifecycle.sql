-- Dealer commercial lifecycle: canonical payout records + expiry projection.
CREATE TABLE IF NOT EXISTS public.dealer_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  escrow uuid NOT NULL REFERENCES public.escrows(id) ON DELETE RESTRICT,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  commission numeric(14,2) NOT NULL DEFAULT 0 CHECK (commission >= 0),
  net_amount numeric(14,2) NOT NULL CHECK (net_amount >= 0),
  currency text NOT NULL DEFAULT 'KES',
  phone text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','paid','failed','cancelled')),
  provider text NOT NULL DEFAULT 'mpesa_b2c',
  conversation_id text,
  transaction_id text,
  failure_reason text,
  initiated_at timestamptz,
  completed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS dealer_payouts_escrow_uq ON public.dealer_payouts(escrow);
CREATE INDEX IF NOT EXISTS dealer_payouts_dealer_status_idx ON public.dealer_payouts(dealer,status,created_at DESC);
CREATE INDEX IF NOT EXISTS dealer_payouts_conversation_idx ON public.dealer_payouts(conversation_id) WHERE conversation_id IS NOT NULL;
ALTER TABLE public.dealer_payouts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS dealer_payouts_owner_select ON public.dealer_payouts;
CREATE POLICY dealer_payouts_owner_select ON public.dealer_payouts FOR SELECT USING (auth.uid() = dealer);
DROP POLICY IF EXISTS dealer_payouts_service_only ON public.dealer_payouts;
CREATE POLICY dealer_payouts_service_only ON public.dealer_payouts FOR ALL USING (false) WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.kayad_expire_dealer_subscriptions_atomic()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_count integer;
BEGIN
  WITH expired AS (
    UPDATE dealer_subscriptions
    SET status='expired', updated_at=now(), metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('expiredAt',now())
    WHERE status='active' AND expires_at IS NOT NULL AND expires_at <= now()
    RETURNING dealer
  )
  SELECT count(*) INTO v_count FROM expired;
  UPDATE users u SET dealer_package=NULL, package_listing_max=0, package_expires_at=NULL,
    package_auto_renew=false, subscription_status='expired', package_features='[]'::jsonb,
    listings_locked=true, updated_at=now()
  WHERE u.role='dealer' AND u.subscription_status='active'
    AND NOT EXISTS (SELECT 1 FROM dealer_subscriptions s WHERE s.dealer=u.id AND s.status='active' AND (s.expires_at IS NULL OR s.expires_at>now()));
  RETURN v_count;
END; $$;
REVOKE ALL ON FUNCTION public.kayad_expire_dealer_subscriptions_atomic() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kayad_expire_dealer_subscriptions_atomic() TO service_role;

CREATE OR REPLACE FUNCTION public.kayad_prepare_dealer_payout_atomic(p_escrow uuid,p_dealer uuid,p_phone text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v escrows%ROWTYPE; v_p dealer_payouts%ROWTYPE; v_commission numeric; v_net numeric;
BEGIN
 SELECT * INTO v FROM escrows WHERE id=p_escrow FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Escrow not found'; END IF;
 IF v.seller<>p_dealer THEN RAISE EXCEPTION 'Escrow does not belong to dealer'; END IF;
 IF v.status<>'released' THEN RAISE EXCEPTION 'Only released escrows can be paid out'; END IF;
 SELECT * INTO v_p FROM dealer_payouts WHERE escrow=p_escrow FOR UPDATE;
 IF FOUND THEN RETURN jsonb_build_object('payout',to_jsonb(v_p),'idempotent',true); END IF;
 v_commission:=coalesce(v.commission,0); v_net:=greatest(0,coalesce(v.sellerAmount,v.amount-v_commission));
 IF v_net<=0 THEN RAISE EXCEPTION 'Escrow has no positive dealer payout'; END IF;
 INSERT INTO dealer_payouts(dealer,escrow,amount,commission,net_amount,phone,status,metadata)
 VALUES(p_dealer,p_escrow,v.amount,v_commission,v_net,p_phone,'pending',jsonb_build_object('source','released_escrow')) RETURNING * INTO v_p;
 RETURN jsonb_build_object('payout',to_jsonb(v_p),'idempotent',false);
END; $$;
REVOKE ALL ON FUNCTION public.kayad_prepare_dealer_payout_atomic(uuid,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kayad_prepare_dealer_payout_atomic(uuid,uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.kayad_mark_dealer_payout_atomic(p_payout uuid,p_status text,p_conversation_id text DEFAULT NULL,p_transaction_id text DEFAULT NULL,p_failure_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v dealer_payouts%ROWTYPE;
BEGIN
 SELECT * INTO v FROM dealer_payouts WHERE id=p_payout FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Payout not found'; END IF;
 IF p_status NOT IN ('processing','paid','failed','cancelled') THEN RAISE EXCEPTION 'Invalid payout status'; END IF;
 UPDATE dealer_payouts SET status=p_status, conversation_id=coalesce(p_conversation_id,conversation_id), transaction_id=coalesce(p_transaction_id,transaction_id), failure_reason=coalesce(p_failure_reason,failure_reason), initiated_at=case when p_status='processing' then coalesce(initiated_at,now()) else initiated_at end, completed_at=case when p_status in ('paid','failed','cancelled') then coalesce(completed_at,now()) else completed_at end, updated_at=now() WHERE id=p_payout RETURNING * INTO v;
 RETURN to_jsonb(v);
END; $$;
REVOKE ALL ON FUNCTION public.kayad_mark_dealer_payout_atomic(uuid,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kayad_mark_dealer_payout_atomic(uuid,text,text,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.kayad_apply_dealer_verification_atomic(p_user uuid,p_action text,p_admin uuid,p_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_dealer uuid; v_status text;
BEGIN
 IF p_action NOT IN ('approve','reject','suspend') THEN RAISE EXCEPTION 'Invalid verification action'; END IF;
 IF NOT EXISTS (SELECT 1 FROM users WHERE id=p_admin AND role IN ('admin','superadmin')) THEN RAISE EXCEPTION 'Admin authorization required'; END IF;
 SELECT id INTO v_dealer FROM dealers WHERE "user"=p_user LIMIT 1;
 v_status:=CASE WHEN p_action='approve' THEN 'approved' WHEN p_action='reject' THEN 'rejected' ELSE 'pending' END;
 IF p_action='approve' THEN
   UPDATE users SET role='dealer', updated_at=now() WHERE id=p_user;
 ELSE
   UPDATE users SET updated_at=now() WHERE id=p_user;
 END IF;
 IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;
 IF v_dealer IS NOT NULL THEN UPDATE dealers SET approved=(p_action='approve'), is_suspended=(p_action='suspend'), suspension_reason=CASE WHEN p_action='suspend' THEN p_reason ELSE suspension_reason END, verified_at=CASE WHEN p_action='approve' THEN now() ELSE verified_at END, updated_at=now() WHERE id=v_dealer; END IF;
 UPDATE dealer_verifications SET verification_status=v_status, reviewed_at=now(), reviewed_by=p_admin, rejection_reason=CASE WHEN p_action='reject' THEN p_reason ELSE rejection_reason END, suspension_reason=CASE WHEN p_action='suspend' THEN p_reason ELSE suspension_reason END, updated_at=now() WHERE "user"=p_user;
 RETURN jsonb_build_object('userId',p_user,'dealerId',v_dealer,'action',p_action,'status',v_status);
END; $$;
REVOKE ALL ON FUNCTION public.kayad_apply_dealer_verification_atomic(uuid,text,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kayad_apply_dealer_verification_atomic(uuid,text,uuid,text) TO service_role;
