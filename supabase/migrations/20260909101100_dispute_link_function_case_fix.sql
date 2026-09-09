-- Re-deployed in production after the link columns were renamed to the
-- project's canonical camelCase convention. The function body is maintained
-- by the same canonical dispute-open implementation as 20260909100500.
-- (CREATE OR REPLACE is intentionally explicit so replayed environments get
-- the same production function.)
CREATE OR REPLACE FUNCTION public.kayad_open_dispute_atomic(p_escrow_id UUID,p_actor_id UUID,p_role TEXT,p_title TEXT,p_description TEXT,p_category TEXT,p_priority TEXT,p_idempotency_key TEXT DEFAULT NULL) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v escrows%ROWTYPE; v_inspection UUID; v_chat UUID; v_now TIMESTAMPTZ:=now(); v_participants UUID[];
BEGIN
 SELECT * INTO v FROM escrows WHERE id=p_escrow_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Escrow not found'; END IF;
 IF p_role NOT IN ('admin','superadmin','escrow_officer') AND v.buyer<>p_actor_id AND v.seller<>p_actor_id THEN RAISE EXCEPTION 'You are not involved in this escrow'; END IF;
 IF v.status='disputed' AND v."disputeWorkflowStatus" IS NOT NULL THEN RETURN jsonb_build_object('escrow',to_jsonb(v),'idempotent',true); END IF;
 IF v.status NOT IN ('pending','funded','vehicle_confirmed','delivered','released') THEN RAISE EXCEPTION 'Escrow cannot be disputed from status %',v.status; END IF;
 UPDATE escrows SET status='disputed',"disputedAt"=v_now,"disputedBy"=p_actor_id,"disputeReason"=coalesce(p_description,p_title),"disputeTitle"=coalesce(nullif(p_title,''),'Escrow dispute'),"disputeDescription"=coalesce(p_description,p_title,''),"disputeCategory"=coalesce(p_category,'other'),"disputePriority"=coalesce(p_priority,'medium'),"disputeWorkflowStatus"='open',"disputeAssignedTo"=NULL,"disputeTimeline"=jsonb_build_array(jsonb_build_object('action','Dispute opened','actor',p_actor_id,'at',v_now,'note',coalesce(p_title,p_description,''))),"disputeEvidence"='[]'::jsonb,"disputeInternalNotes"='[]'::jsonb,"disputeMediation"=NULL,"disputeResolution"=NULL,"disputeAppeal"=NULL,"disputeLastActionKey"=p_idempotency_key,"updatedAt"=v_now WHERE id=p_escrow_id;
 SELECT id INTO v_inspection FROM vehicle_inspections WHERE car_id=v.car ORDER BY created_at DESC LIMIT 1;
 IF v_inspection IS NOT NULL THEN UPDATE escrows SET "disputeInspectionId"=v_inspection WHERE id=p_escrow_id; END IF;
 v_participants:=ARRAY(SELECT DISTINCT x FROM unnest(ARRAY[v.buyer,v.seller]) x WHERE x IS NOT NULL ORDER BY x);
 IF v.car IS NOT NULL THEN SELECT id INTO v_chat FROM chats WHERE car=v.car AND participants=v_participants LIMIT 1; IF v_chat IS NULL THEN INSERT INTO chats(participants,car,messages,"createdAt","updatedAt") VALUES(v_participants,v.car,'[]'::jsonb,v_now,v_now) RETURNING id INTO v_chat; END IF; UPDATE escrows SET "disputeChatId"=v_chat WHERE id=p_escrow_id; END IF;
 SELECT * INTO v FROM escrows WHERE id=p_escrow_id; RETURN jsonb_build_object('escrow',to_jsonb(v),'idempotent',false);
END; $$;
REVOKE ALL ON FUNCTION public.kayad_open_dispute_atomic(UUID,UUID,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kayad_open_dispute_atomic(UUID,UUID,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) TO service_role;
