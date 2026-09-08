-- ============================================================
-- KAYAD INSPECTION WORKFORCE & DIGITAL LIFECYCLE HARDENING
-- 20260908070000
--
-- Converges inspection_bookings with digital_inspections and the
-- real ghost_checker/inspection_staff workforce. No new parallel
-- inspection entity is introduced.
-- ============================================================

-- Digital inspection ownership must identify the actual user account.
ALTER TABLE digital_inspections
  ADD COLUMN IF NOT EXISTS inspector_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS inspector_signature TEXT,
  ADD COLUMN IF NOT EXISTS inspector_signed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS customer_reviewed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS customer_review_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_digital_inspections_inspector
  ON digital_inspections(inspector_id);

-- One digital inspection is the execution record for one marketplace booking.
CREATE UNIQUE INDEX IF NOT EXISTS uq_digital_inspections_booking
  ON digital_inspections(booking_id);

-- Backfill the canonical inspector identity where historical assignments exist.
UPDATE digital_inspections di
SET inspector_id = s.user_id
FROM inspection_bookings b
JOIN inspection_staff s ON s.id = b.assigned_staff_id
WHERE di.booking_id = b.id
  AND di.inspector_id IS NULL
  AND s.user_id IS NOT NULL;

-- Workforce records must map to a real user for field execution.
CREATE INDEX IF NOT EXISTS idx_inspection_staff_user
  ON inspection_staff(user_id);

CREATE INDEX IF NOT EXISTS idx_inspection_staff_available
  ON inspection_staff(provider_id, is_active, is_available);

ALTER TABLE inspection_staff
  DROP CONSTRAINT IF EXISTS inspection_staff_role_check;

ALTER TABLE inspection_staff
  ADD CONSTRAINT inspection_staff_role_check
  CHECK (role IN (
    'lead_engineer',
    'senior_inspector',
    'junior_inspector',
    'field_technician',
    'workshop_technician',
    'quality_reviewer'
  ));

-- Booking lifecycle is explicit and finite.
ALTER TABLE inspection_bookings
  DROP CONSTRAINT IF EXISTS inspection_bookings_status_check;

ALTER TABLE inspection_bookings
  ADD CONSTRAINT inspection_bookings_status_check
  CHECK (status IN (
    'booked',
    'confirmed',
    'inspector_assigned',
    'travelling',
    'inspection_started',
    'inspection_complete',
    'report_generated',
    'customer_reviewed',
    'closed',
    'cancelled',
    'no_show'
  ));

ALTER TABLE inspection_bookings
  DROP CONSTRAINT IF EXISTS inspection_bookings_payment_status_check;

ALTER TABLE inspection_bookings
  ADD CONSTRAINT inspection_bookings_payment_status_check
  CHECK (payment_status IN (
    'pending',
    'deposit_paid',
    'fully_paid',
    'partial_refund',
    'refunded'
  ));

-- Digital engine lifecycle.
ALTER TABLE digital_inspections
  DROP CONSTRAINT IF EXISTS digital_inspections_status_check;

ALTER TABLE digital_inspections
  ADD CONSTRAINT digital_inspections_status_check
  CHECK (status IN (
    'in_progress',
    'completed',
    'submitted',
    'under_review',
    'approved',
    'published',
    'archived'
  ));

-- Every stage has a unique order within an inspection.
CREATE UNIQUE INDEX IF NOT EXISTS uq_inspection_stage_order
  ON inspection_stages(inspection_id, stage_order);

CREATE UNIQUE INDEX IF NOT EXISTS uq_inspection_stage_name
  ON inspection_stages(inspection_id, stage_name);

-- Evidence and defects must remain attached to an inspection point.
CREATE INDEX IF NOT EXISTS idx_inspection_evidence_validation
  ON inspection_evidence(point_id, is_validated);

CREATE INDEX IF NOT EXISTS idx_inspection_defects_point_open
  ON inspection_defects(point_id, is_resolved);

-- Audit reads follow the inspection lifecycle.
CREATE INDEX IF NOT EXISTS idx_inspection_audit_entity
  ON inspection_audit_logs(entity_type, entity_id, created_at DESC);

-- Prevent execution from being marked paid incorrectly.
CREATE OR REPLACE FUNCTION kayad_validate_inspection_booking_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status IN ('confirmed','inspector_assigned','travelling','inspection_started',
                    'inspection_complete','report_generated','customer_reviewed','closed')
     AND NEW.payment_status <> 'fully_paid' THEN
    RAISE EXCEPTION 'Inspection booking % requires fully_paid payment before execution', NEW.id;
  END IF;

  IF NEW.status IN ('inspector_assigned','travelling','inspection_started',
                    'inspection_complete','report_generated','customer_reviewed','closed')
     AND NEW.assigned_staff_id IS NULL THEN
    RAISE EXCEPTION 'Inspection booking % requires an assigned inspector', NEW.id;
  END IF;

  IF NEW.status = 'inspection_started' AND NEW.assigned_staff_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM inspection_staff s
      WHERE s.id = NEW.assigned_staff_id
        AND s.is_active = true
        AND s.user_id IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'Inspection booking % has an invalid active inspector', NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_inspection_booking_transition ON inspection_bookings;

CREATE TRIGGER trg_validate_inspection_booking_transition
BEFORE INSERT OR UPDATE OF status, payment_status, assigned_staff_id
ON inspection_bookings
FOR EACH ROW
EXECUTE FUNCTION kayad_validate_inspection_booking_transition();

-- Keep digital inspection ownership synchronized with the booking assignment.
CREATE OR REPLACE FUNCTION kayad_sync_digital_inspection_inspector()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.assigned_staff_id IS NOT NULL THEN
    SELECT s.user_id INTO NEW.inspector_id
    FROM inspection_bookings b
    JOIN inspection_staff s ON s.id = b.assigned_staff_id
    WHERE b.id = NEW.booking_id
      AND s.user_id IS NOT NULL
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_digital_inspection_inspector ON digital_inspections;

CREATE TRIGGER trg_sync_digital_inspection_inspector
BEFORE INSERT OR UPDATE OF booking_id
ON digital_inspections
FOR EACH ROW
EXECUTE FUNCTION kayad_sync_digital_inspection_inspector();

-- RLS: backend uses service-role access; direct authenticated access is
-- restricted to the customer, assigned inspector, provider workforce,
-- or administrators. Existing policies are replaced deterministically.
ALTER TABLE digital_inspections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "digital_inspections_access" ON digital_inspections;

CREATE POLICY "digital_inspections_access"
ON digital_inspections
FOR SELECT
TO authenticated
USING (
  inspector_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM inspection_bookings b
    WHERE b.id = digital_inspections.booking_id
      AND b.customer_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM inspection_bookings b
    JOIN inspection_staff s ON s.id = b.assigned_staff_id
    WHERE b.id = digital_inspections.booking_id
      AND s.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
      AND u.role IN ('admin','superadmin')
  )
);

-- Direct writes are intentionally not exposed to ordinary customers.
DROP POLICY IF EXISTS "digital_inspections_no_direct_write" ON digital_inspections;

CREATE POLICY "digital_inspections_no_direct_write"
ON digital_inspections
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
      AND u.role IN ('ghost_checker','admin','superadmin')
  )
);

CREATE POLICY "digital_inspections_staff_update"
ON digital_inspections
FOR UPDATE
TO authenticated
USING (
  inspector_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
      AND u.role IN ('admin','superadmin')
  )
)
WITH CHECK (
  inspector_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
      AND u.role IN ('admin','superadmin')
  )
);

COMMENT ON COLUMN digital_inspections.inspector_id IS
  'Canonical inspector user identity; ghost_checker role, derived from inspection_staff.user_id.';

COMMENT ON TABLE digital_inspections IS
  'Canonical execution record for inspection_bookings; one booking has at most one digital inspection.';
