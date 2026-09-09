ALTER TABLE public.escrows
  ADD COLUMN IF NOT EXISTS disputeInspectionId UUID REFERENCES public.vehicle_inspections(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS disputeChatId UUID REFERENCES public.chats(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_escrows_dispute_inspection ON public.escrows(disputeInspectionId) WHERE disputeInspectionId IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_escrows_dispute_chat ON public.escrows(disputeChatId) WHERE disputeChatId IS NOT NULL;

CREATE OR REPLACE FUNCTION public.kayad_open_dispute_atomic(
  p_escrow_id UUID, p_actor_id UUID, p_role TEXT, p_title TEXT, p_description TEXT,
  p_category TEXT, p_priority TEXT, p_idempotency_key TEXT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v escrows%ROWTYPE; v_inspection UUID; v_now TIMESTAMPTZ:=now(); v_role TEXT;
BEGIN
 SELECT * INTO v FROM escrows WHERE id=p_escrow_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Escrow not found'; END IF;
 IF p_role NOT IN ('admin','superadmin','escrow_officer') AND v.buyer<>p_actor_id AND v.seller<>p_actor_id THEN RAISE EXCEPTION 'You are not involved in this escrow'; END IF;
 IF v.status='disputed' AND v.disputeWorkflowStatus IS NOT NULL THEN
   RETURN jsonb_build_object('escrow',to_jsonb(v),'idempotent',true);
 END IF;
 IF v.status NOT IN ('pending','funded','vehicle_confirmed','delivered','released') THEN RAISE EXCEPTION 'Escrow cannot be disputed from status %',v.status; END IF;
 IF p_role NOT IN ('admin','superadmin','escrow_officer') THEN v_role:=CASE WHEN v.buyer=p_actor_id THEN 'buyer' ELSE 'seller' END; ELSE v_role:='admin'; END IF;
 UPDATE escrows SET status='disputed', disputedAt=v_now, disputedBy=p_actor_id, disputeReason=coalesce(p_description,p_title),
   disputeTitle=coalesce(nullif(p_title,''),'Escrow dispute'), disputeDescription=coalesce(p_description,p_title,''),
   disputeCategory=coalesce(p_category,'other'), disputePriority=coalesce(p_priority,'medium'), disputeWorkflowStatus='open',
   disputeAssignedTo=NULL, disputeTimeline=jsonb_build_array(jsonb_build_object('action','Dispute opened','actor',p_actor_id,'at',v_now,'note',coalesce(p_title,p_description,''))),
   disputeEvidence='[]'::jsonb, disputeInternalNotes='[]'::jsonb, disputeMediation=NULL, disputeResolution=NULL, disputeAppeal=NULL,
   disputeLastActionKey=p_idempotency_key, updatedAt=v_now
 WHERE id=p_escrow_id;
 SELECT id INTO v_inspection FROM vehicle_inspections WHERE car_id=v.car ORDER BY created_at DESC LIMIT 1;
 IF v_inspection IS NOT NULL THEN UPDATE escrows SET disputeInspectionId=v_inspection WHERE id=p_escrow_id; END IF;
 SELECT * INTO v FROM escrows WHERE id=p_escrow_id;
 RETURN jsonb_build_object('escrow',to_jsonb(v),'idempotent',false);
END; $$;
REVOKE ALL ON FUNCTION public.kayad_open_dispute_atomic(UUID,UUID,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kayad_open_dispute_atomic(UUID,UUID,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.kayad_transition_dispute_atomic(p_escrow_id UUID,p_actor_id UUID,p_role TEXT,p_next_status TEXT,p_reason TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v escrows%ROWTYPE; v_current TEXT; v_now TIMESTAMPTZ:=now(); v_timeline JSONB;
BEGIN
 SELECT * INTO v FROM escrows WHERE id=p_escrow_id FOR UPDATE;
 IF NOT FOUND OR v.status<>'disputed' THEN RAISE EXCEPTION 'Dispute not found'; END IF;
 v_current:=coalesce(v.disputeWorkflowStatus,'open');
 IF p_role NOT IN ('admin','superadmin','escrow_officer') AND NOT (p_next_status='appealed' AND (v.buyer=p_actor_id OR v.seller=p_actor_id)) THEN RAISE EXCEPTION 'Not authorized'; END IF;
 IF NOT ((v_current='open' AND p_next_status IN ('under_review','resolved','closed')) OR (v_current='under_review' AND p_next_status IN ('mediation','resolved','closed')) OR (v_current='mediation' AND p_next_status IN ('resolved','closed')) OR (v_current='resolved' AND p_next_status IN ('appealed','closed')) OR (v_current='appealed' AND p_next_status IN ('under_review','resolved','closed'))) THEN RAISE EXCEPTION 'Transition % -> % is not allowed',v_current,p_next_status; END IF;
 v_timeline:=coalesce(v.disputeTimeline,'[]'::jsonb) || jsonb_build_array(jsonb_build_object('action',format('Status: %s → %s',v_current,p_next_status),'actor',p_actor_id,'fromStatus',v_current,'toStatus',p_next_status,'note',coalesce(p_reason,''),'at',v_now));
 UPDATE escrows SET disputeWorkflowStatus=p_next_status, disputeTimeline=v_timeline, updatedAt=v_now WHERE id=p_escrow_id;
 SELECT * INTO v FROM escrows WHERE id=p_escrow_id;
 RETURN to_jsonb(v);
END; $$;
REVOKE ALL ON FUNCTION public.kayad_transition_dispute_atomic(UUID,UUID,TEXT,TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kayad_transition_dispute_atomic(UUID,UUID,TEXT,TEXT,TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.kayad_append_dispute_evidence_atomic(p_escrow_id UUID,p_actor_id UUID,p_role TEXT,p_item JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v escrows%ROWTYPE; v_item JSONB; v_arr JSONB;
BEGIN
 SELECT * INTO v FROM escrows WHERE id=p_escrow_id FOR UPDATE;
 IF NOT FOUND OR v.status<>'disputed' THEN RAISE EXCEPTION 'Active dispute not found'; END IF;
 IF p_role NOT IN ('admin','superadmin','escrow_officer') AND v.buyer<>p_actor_id AND v.seller<>p_actor_id THEN RAISE EXCEPTION 'Access denied'; END IF;
 v_item:=jsonb_build_object('_id',coalesce(p_item->>'_id',gen_random_uuid()::text),'type',coalesce(p_item->>'type','document'),'fileName',p_item->>'fileName','mimeType',p_item->>'mimeType','size',coalesce((p_item->>'size')::numeric,0),'url',p_item->>'url','publicId',p_item->>'publicId','thumbnailUrl',p_item->>'thumbnailUrl','description',coalesce(p_item->>'description',''),'uploadedBy',p_actor_id,'uploadedByRole',p_role,'createdAt',now(),'verified',false);
 v_arr:=coalesce(v.disputeEvidence,'[]'::jsonb) || jsonb_build_array(v_item);
 UPDATE escrows SET disputeEvidence=v_arr, disputeTimeline=coalesce(disputeTimeline,'[]'::jsonb)||jsonb_build_array(jsonb_build_object('action','Evidence uploaded','actor',p_actor_id,'at',now(),'note',coalesce(p_item->>'fileName',''))) ,updatedAt=now() WHERE id=p_escrow_id;
 RETURN jsonb_build_object('item',v_item,'evidence',v_arr);
END; $$;
REVOKE ALL ON FUNCTION public.kayad_append_dispute_evidence_atomic(UUID,UUID,TEXT,JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kayad_append_dispute_evidence_atomic(UUID,UUID,TEXT,JSONB) TO service_role;

CREATE OR REPLACE FUNCTION public.kayad_resolve_dispute_atomic(p_escrow_id UUID,p_actor_id UUID,p_decision TEXT,p_amount NUMERIC DEFAULT NULL,p_seller_amount NUMERIC DEFAULT NULL,p_buyer_amount NUMERIC DEFAULT NULL,p_reason TEXT DEFAULT NULL,p_idempotency_key TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v escrows%ROWTYPE; v_payment UUID; v_commission NUMERIC; v_seller NUMERIC; v_buyer NUMERIC; v_now TIMESTAMPTZ:=now(); v_status TEXT; v_resolution JSONB;
BEGIN
 SELECT * INTO v FROM escrows WHERE id=p_escrow_id FOR UPDATE;
 IF NOT FOUND OR v.status<>'disputed' THEN RAISE EXCEPTION 'Disputed escrow not found'; END IF;
 IF p_actor_id IS NULL THEN RAISE EXCEPTION 'Decision actor required'; END IF;
 IF p_decision NOT IN ('partial_refund','full_refund','release_funds','split_settlement','dismissed') THEN RAISE EXCEPTION 'Unknown decision'; END IF;
 IF v.disputeWorkflowStatus NOT IN ('under_review','mediation','appealed','open') THEN RAISE EXCEPTION 'Cannot resolve dispute in state %',v.disputeWorkflowStatus; END IF;
 IF p_idempotency_key IS NOT NULL AND v.disputeLastActionKey=p_idempotency_key AND v.disputeResolution IS NOT NULL THEN RETURN jsonb_build_object('escrow',to_jsonb(v),'idempotent',true); END IF;
 v_commission:=coalesce(v.commission,round(v.amount*0.05));
 CASE p_decision
 WHEN 'full_refund' THEN v_status:='refunded'; v_seller:=0; v_buyer:=v.amount;
 WHEN 'partial_refund' THEN IF coalesce(p_amount,0)>v.amount THEN RAISE EXCEPTION 'Refund exceeds escrow'; END IF; v_status:='refunded'; v_buyer:=coalesce(p_amount,0); v_seller:=coalesce(p_seller_amount,v.amount-v_buyer); v_commission:=CASE WHEN v_buyer>=v.amount THEN 0 ELSE v_commission END;
 WHEN 'release_funds','dismissed' THEN v_status:='released'; v_seller:=coalesce(p_seller_amount,v.amount-v_commission); v_buyer:=coalesce(p_buyer_amount,0);
 WHEN 'split_settlement' THEN v_status:='released'; v_buyer:=coalesce(p_buyer_amount,round(v.amount/2)); v_seller:=coalesce(p_seller_amount,v.amount-v_buyer-v_commission); END CASE;
 IF v_seller<0 OR v_buyer<0 OR v_seller+v_buyer+v_commission>v.amount THEN RAISE EXCEPTION 'Settlement amounts exceed escrow'; END IF;
 v_resolution:=jsonb_build_object('decision',p_decision,'amount',coalesce(p_amount,v.amount),'sellerAmount',v_seller,'buyerAmount',v_buyer,'platformFee',v_commission,'reason',coalesce(p_reason,''),'decidedBy',p_actor_id,'decidedAt',v_now,'implemented',true,'implementedAt',v_now);
 UPDATE escrows SET status=v_status, disputeWorkflowStatus='resolved', disputeResolution=v_resolution, disputeLastActionKey=p_idempotency_key,
   refundedAt=CASE WHEN v_status='refunded' THEN v_now ELSE refundedAt END, refundedBy=CASE WHEN v_status='refunded' THEN p_actor_id ELSE refundedBy END,
   releasedAt=CASE WHEN v_status='released' THEN v_now ELSE releasedAt END, releasedBy=CASE WHEN v_status='released' THEN p_actor_id ELSE releasedBy END,
   commission=v_commission, sellerAmount=v_seller, disputeTimeline=coalesce(disputeTimeline,'[]'::jsonb)||jsonb_build_array(jsonb_build_object('action',format('Resolved — %s',p_decision),'actor',p_actor_id,'fromStatus',v.disputeWorkflowStatus,'toStatus','resolved','note',coalesce(p_reason,''),'at',v_now)),updatedAt=v_now
 WHERE id=p_escrow_id;
 v_payment:=v.payment;
 IF v_payment IS NOT NULL THEN UPDATE payments SET status=CASE WHEN v_status='refunded' THEN 'refunded' ELSE 'released' END, platform_fee=v_commission, dealer_amount=v_seller, updated_at=v_now WHERE id=v_payment; END IF;
 IF v_status='released' AND v.car IS NOT NULL THEN UPDATE cars SET sold=true,isPaid=true WHERE id=v.car; END IF;
 SELECT * INTO v FROM escrows WHERE id=p_escrow_id;
 RETURN jsonb_build_object('escrow',to_jsonb(v),'idempotent',false);
END; $$;
REVOKE ALL ON FUNCTION public.kayad_resolve_dispute_atomic(UUID,UUID,TEXT,NUMERIC,NUMERIC,NUMERIC,TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kayad_resolve_dispute_atomic(UUID,UUID,TEXT,NUMERIC,NUMERIC,NUMERIC,TEXT,TEXT) TO service_role;
