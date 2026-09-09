-- Inspection execution, evidence/results and communication bridge.
-- vehicle_inspections is the production canonical inspection execution table.
ALTER TABLE public.vehicle_inspections
  ADD COLUMN IF NOT EXISTS chat_id UUID REFERENCES public.chats(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS current_stage TEXT,
  ADD COLUMN IF NOT EXISTS stage_progress JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS condition_rating TEXT,
  ADD COLUMN IF NOT EXISTS overall_score INTEGER,
  ADD COLUMN IF NOT EXISTS overall_grade TEXT,
  ADD COLUMN IF NOT EXISTS inspector_notes TEXT;
CREATE INDEX IF NOT EXISTS idx_vehicle_inspections_chat ON public.vehicle_inspections(chat_id);

CREATE OR REPLACE FUNCTION public.kayad_bridge_inspection_execution(
  p_vehicle_inspection_id UUID,p_car_id UUID,p_buyer_id UUID,p_provider_id UUID DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_vi vehicle_inspections%ROWTYPE; v_chat_id UUID; v_seller UUID;
BEGIN
  SELECT * INTO v_vi FROM vehicle_inspections WHERE id=p_vehicle_inspection_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Vehicle inspection not found'; END IF;
  IF v_vi.requester_id <> p_buyer_id THEN RAISE EXCEPTION 'Inspection buyer mismatch'; END IF;
  SELECT dealer_id INTO v_seller FROM cars WHERE id=p_car_id;
  IF v_vi.chat_id IS NOT NULL THEN v_chat_id:=v_vi.chat_id;
  ELSE
    INSERT INTO chats(participants,car,messages,"createdAt","updatedAt")
    VALUES(ARRAY(SELECT DISTINCT x FROM unnest(ARRAY[p_buyer_id,v_seller]) x WHERE x IS NOT NULL ORDER BY x),p_car_id,'[]'::jsonb,now(),now())
    RETURNING id INTO v_chat_id;
    UPDATE vehicle_inspections SET chat_id=v_chat_id,updated_at=now() WHERE id=v_vi.id;
  END IF;
  UPDATE vehicle_inspections SET current_stage=COALESCE(current_stage,'job_verification'),updated_at=now() WHERE id=v_vi.id;
  RETURN jsonb_build_object('vehicleInspectionId',v_vi.id,'digitalInspectionId',v_vi.id,'chatId',v_chat_id,'idempotent',v_vi.chat_id IS NOT NULL);
END; $$;
REVOKE ALL ON FUNCTION public.kayad_bridge_inspection_execution(UUID,UUID,UUID,UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kayad_bridge_inspection_execution(UUID,UUID,UUID,UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.kayad_get_or_create_inspection_chat(
  p_vehicle_inspection_id UUID,p_car_id UUID,p_buyer_id UUID,p_seller_id UUID DEFAULT NULL,p_inspector_id UUID DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_vi vehicle_inspections%ROWTYPE; v_chat UUID; v_participants UUID[];
BEGIN
  SELECT * INTO v_vi FROM vehicle_inspections WHERE id=p_vehicle_inspection_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Vehicle inspection not found'; END IF;
  IF v_vi.requester_id <> p_buyer_id THEN RAISE EXCEPTION 'Inspection buyer mismatch'; END IF;
  IF v_vi.chat_id IS NOT NULL THEN v_chat:=v_vi.chat_id;
  ELSE
    v_participants:=ARRAY(SELECT DISTINCT x FROM unnest(ARRAY[p_buyer_id,p_seller_id,p_inspector_id]) x WHERE x IS NOT NULL ORDER BY x);
    SELECT id INTO v_chat FROM chats WHERE car=p_car_id AND participants=v_participants LIMIT 1;
    IF v_chat IS NULL THEN
      INSERT INTO chats(participants,car,messages,"createdAt","updatedAt") VALUES(v_participants,p_car_id,'[]'::jsonb,now(),now()) RETURNING id INTO v_chat;
    END IF;
    UPDATE vehicle_inspections SET chat_id=v_chat,updated_at=now() WHERE id=v_vi.id;
  END IF;
  IF p_inspector_id IS NOT NULL THEN UPDATE chats SET participants=(SELECT ARRAY(SELECT DISTINCT x FROM unnest(participants || ARRAY[p_inspector_id]) x ORDER BY x)) WHERE id=v_chat; END IF;
  RETURN v_chat;
END; $$;
REVOKE ALL ON FUNCTION public.kayad_get_or_create_inspection_chat(UUID,UUID,UUID,UUID,UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kayad_get_or_create_inspection_chat(UUID,UUID,UUID,UUID,UUID) TO service_role;
