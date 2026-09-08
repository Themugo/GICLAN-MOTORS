-- KAYAD Lead/CRM domain: persistence, concurrency and workflow integrity.

CREATE TABLE IF NOT EXISTS lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  actor UUID REFERENCES users(id),
  actor_type TEXT NOT NULL DEFAULT 'dealer',
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE leads ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS total_messages INTEGER NOT NULL DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS first_response_time NUMERIC;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lost_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_stage_check;
ALTER TABLE leads ADD CONSTRAINT leads_stage_check CHECK (stage IN (
  'new','contacted','negotiating','test_drive','inspectionBooked','reserved','escrow_started','sold','lost'
));

CREATE INDEX IF NOT EXISTS idx_leads_business_identity
  ON leads (
    COALESCE(buyer, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(dealer, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(vehicle, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(source, ''),
    COALESCE(source_reference, '')
  );
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_created ON lead_activities(lead, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_dealer_activity ON leads(dealer, last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_dealer_stage ON leads(dealer, stage);
CREATE INDEX IF NOT EXISTS idx_leads_dealer_hot ON leads(dealer, is_hot) WHERE is_hot = true;

ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lead_activities_service_only ON lead_activities;
CREATE POLICY lead_activities_service_only ON lead_activities FOR ALL USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS leads_service_only ON leads;
CREATE POLICY leads_service_only ON leads FOR ALL USING (false) WITH CHECK (false);

CREATE OR REPLACE FUNCTION kayad_create_lead_atomic(
  p_buyer UUID,
  p_dealer UUID,
  p_vehicle UUID,
  p_source TEXT,
  p_source_reference TEXT,
  p_estimated_value NUMERIC DEFAULT 0
) RETURNS JSONB
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_lead leads%ROWTYPE;
  v_created BOOLEAN := false;
  v_key TEXT := concat_ws('|', COALESCE(p_buyer::text,''), COALESCE(p_dealer::text,''), COALESCE(p_vehicle::text,''), COALESCE(p_source,''), COALESCE(p_source_reference,''));
BEGIN
  -- Serialize identical business-key creates without requiring a destructive
  -- cleanup of historical duplicate leads during migration.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_key, 0));
  INSERT INTO leads (buyer,dealer,vehicle,source,source_reference,estimated_value,last_activity_at)
  VALUES (p_buyer,p_dealer,p_vehicle,p_source,p_source_reference,GREATEST(COALESCE(p_estimated_value,0),0),now())
  ON CONFLICT DO NOTHING
  RETURNING * INTO v_lead;
  IF FOUND THEN v_created := true; END IF;

  IF NOT v_created THEN
    SELECT * INTO v_lead FROM leads
    WHERE COALESCE(buyer,'00000000-0000-0000-0000-000000000000'::uuid)=COALESCE(p_buyer,'00000000-0000-0000-0000-000000000000'::uuid)
      AND COALESCE(dealer,'00000000-0000-0000-0000-000000000000'::uuid)=COALESCE(p_dealer,'00000000-0000-0000-0000-000000000000'::uuid)
      AND COALESCE(vehicle,'00000000-0000-0000-0000-000000000000'::uuid)=COALESCE(p_vehicle,'00000000-0000-0000-0000-000000000000'::uuid)
      AND COALESCE(source,'')=COALESCE(p_source,'')
      AND COALESCE(source_reference,'')=COALESCE(p_source_reference,'')
    ORDER BY created_at ASC LIMIT 1;
    IF NOT FOUND THEN RAISE EXCEPTION 'Unable to create or locate lead'; END IF;
  END IF;
  RETURN jsonb_build_object('lead', to_jsonb(v_lead), 'created', v_created);
END $$;

CREATE OR REPLACE FUNCTION kayad_transition_lead_atomic(
  p_lead_id UUID,
  p_new_stage TEXT,
  p_actor_id UUID
) RETURNS JSONB
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_lead leads%ROWTYPE;
  v_old_stage TEXT;
  v_now TIMESTAMPTZ := now();
  v_allowed BOOLEAN := false;
BEGIN
  IF p_new_stage NOT IN ('new','contacted','negotiating','test_drive','inspectionBooked','reserved','escrow_started','sold','lost') THEN
    RAISE EXCEPTION 'Invalid lead stage: %', p_new_stage;
  END IF;
  SELECT * INTO v_lead FROM leads WHERE id=p_lead_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lead not found'; END IF;

  v_allowed := CASE v_lead.stage
    WHEN 'new' THEN p_new_stage IN ('contacted','negotiating','lost')
    WHEN 'contacted' THEN p_new_stage IN ('negotiating','test_drive','inspectionBooked','lost')
    WHEN 'negotiating' THEN p_new_stage IN ('test_drive','inspectionBooked','reserved','lost')
    WHEN 'test_drive' THEN p_new_stage IN ('negotiating','inspectionBooked','reserved','lost')
    WHEN 'inspectionBooked' THEN p_new_stage IN ('negotiating','reserved','escrow_started','lost')
    WHEN 'reserved' THEN p_new_stage IN ('negotiating','escrow_started','sold','lost')
    WHEN 'escrow_started' THEN p_new_stage IN ('sold','lost')
    WHEN 'sold' THEN false
    WHEN 'lost' THEN p_new_stage IN ('new','contacted','negotiating')
    ELSE false
  END;
  IF v_lead.stage = p_new_stage THEN RETURN to_jsonb(v_lead); END IF;
  v_old_stage := v_lead.stage;
  IF NOT v_allowed THEN RAISE EXCEPTION 'Invalid lead stage transition: % -> %', v_lead.stage, p_new_stage; END IF;

  UPDATE leads SET
    stage=p_new_stage,
    converted_at=CASE WHEN p_new_stage='sold' THEN COALESCE(converted_at,v_now) ELSE converted_at END,
    lost_at=CASE WHEN p_new_stage='lost' THEN COALESCE(lost_at,v_now) ELSE lost_at END,
    last_activity_at=v_now,
    updated_at=v_now
  WHERE id=p_lead_id
  RETURNING * INTO v_lead;

  INSERT INTO lead_activities(lead,type,actor,actor_type,description,metadata)
  VALUES (p_lead_id,'stage_changed',p_actor_id,'dealer','Lead stage changed',jsonb_build_object('oldStage',v_old_stage,'newStage',p_new_stage));

  RETURN to_jsonb(v_lead);
END $$;
