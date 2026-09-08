-- ============================================================
-- KAYAD 150-POINT DIGITAL INSPECTION ENGINE - DATABASE SCHEMA
-- ============================================================

-- ============================================================
-- INSPECTIONS (Main inspection records)
-- ============================================================
CREATE TABLE IF NOT EXISTS digital_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES inspection_bookings(id),
  provider_id UUID REFERENCES inspection_providers(id),

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'in_progress', -- 'in_progress', 'completed', 'submitted', 'under_review', 'approved', 'published', 'archived'
  current_stage VARCHAR(50) DEFAULT 'job_verification', -- Current workflow stage

  -- Vehicle Identification
  vehicle_vin VARCHAR(17),
  vehicle_chassis VARCHAR(50),
  vehicle_engine_number VARCHAR(50),
  vehicle_registration VARCHAR(20),
  vehicle_make VARCHAR(50),
  vehicle_model VARCHAR(50),
  vehicle_trim VARCHAR(50),
  vehicle_year INTEGER,
  vehicle_engine_capacity VARCHAR(20),
  vehicle_fuel_type VARCHAR(20), -- 'petrol', 'diesel', 'electric', 'hybrid'
  vehicle_transmission VARCHAR(20), -- 'manual', 'automatic', 'cvt'
  vehicle_drive_type VARCHAR(20), -- 'fwd', 'rwd', 'awd', '4wd'
  vehicle_odometer INTEGER,
  vehicle_colour VARCHAR(30),
  vehicle_country_origin VARCHAR(50),
  vehicle_body_type VARCHAR(30),

  -- Verification
  logbook_verified BOOLEAN DEFAULT false,
  logbook_verified_at TIMESTAMP,
  tims_verified BOOLEAN DEFAULT false,
  tims_verified_at TIMESTAMP,

  -- Scores (calculated after inspection)
  mechanical_score INTEGER,
  safety_score INTEGER,
  body_score INTEGER,
  interior_score INTEGER,
  electrical_score INTEGER,
  roadworthiness_score INTEGER,
  overall_score INTEGER,
  overall_grade VARCHAR(5), -- 'A+', 'A', 'B+', 'B', 'C', 'D'

  -- Timestamps
  inspection_started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  inspection_completed_at TIMESTAMP,
  submitted_at TIMESTAMP,
  reviewed_at TIMESTAMP,
  published_at TIMESTAMP,

  -- Location
  inspection_latitude DECIMAL(10, 8),
  inspection_longitude DECIMAL(11, 8),
  inspection_location_name VARCHAR(255),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_inspections_booking ON digital_inspections(booking_id);
CREATE INDEX idx_inspections_provider ON digital_inspections(provider_id);
CREATE INDEX idx_inspections_status ON digital_inspections(status);
CREATE INDEX idx_inspections_vin ON digital_inspections(vehicle_vin);

-- ============================================================
-- INSPECTION STAGES (Workflow tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS inspection_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID REFERENCES digital_inspections(id) ON DELETE CASCADE,

  stage_name VARCHAR(50) NOT NULL,
  stage_order INTEGER NOT NULL,

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'skipped'
  started_at TIMESTAMP,
  completed_at TIMESTAMP,

  -- Progress
  total_points INTEGER DEFAULT 0,
  completed_points INTEGER DEFAULT 0,

  -- Notes
  notes TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_stages_inspection ON inspection_stages(inspection_id);

-- ============================================================
-- INSPECTION POINTS (Individual inspection items)
-- ============================================================
CREATE TABLE IF NOT EXISTS inspection_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID REFERENCES digital_inspections(id) ON DELETE CASCADE,
  stage_id UUID REFERENCES inspection_stages(id) ON DELETE CASCADE,

  -- Point Definition
  point_code VARCHAR(50) NOT NULL, -- e.g., 'EXT_PAINT_001'
  point_name VARCHAR(100) NOT NULL,
  point_description TEXT,
  category VARCHAR(50), -- 'exterior', 'interior', 'engine', 'transmission', etc.
  subcategory VARCHAR(50),

  -- Position
  display_order INTEGER DEFAULT 0,

  -- Requirements
  is_mandatory BOOLEAN DEFAULT false,
  requires_photo BOOLEAN DEFAULT false,
  requires_video BOOLEAN DEFAULT false,
  requires_diagnostic BOOLEAN DEFAULT false,
  severity_level VARCHAR(20), -- 'critical', 'high', 'medium', 'low'

  -- Evidence collected
  condition_rating VARCHAR(30), -- 'excellent', 'good', 'fair', 'requires_attention', 'critical', 'not_tested', 'not_applicable'
  defect_classification VARCHAR(30), -- 'safety', 'mechanical', 'electrical', 'cosmetic', 'maintenance', 'advisory', 'monitor'

  -- Notes
  inspector_notes TEXT,
  recommendation TEXT,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(inspection_id, point_code)
);

CREATE INDEX idx_points_inspection ON inspection_points(inspection_id);
CREATE INDEX idx_points_stage ON inspection_points(stage_id);
CREATE INDEX idx_points_category ON inspection_points(category);

-- ============================================================
-- EVIDENCE (Photos, videos, measurements)
-- ============================================================
CREATE TABLE IF NOT EXISTS inspection_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  point_id UUID REFERENCES inspection_points(id) ON DELETE CASCADE,

  -- Type
  evidence_type VARCHAR(20) NOT NULL, -- 'photo', 'video', 'voice_note', 'measurement', 'diagnostic', 'document'

  -- Content
  file_url VARCHAR(500),
  file_type VARCHAR(50),
  file_size INTEGER,
  thumbnail_url VARCHAR(500),

  -- Metadata
  caption VARCHAR(255),
  measurement_value VARCHAR(50),
  measurement_unit VARCHAR(20),
  diagnostic_code VARCHAR(50),
  diagnostic_description TEXT,
  voice_transcription TEXT,

  -- Position
  display_order INTEGER DEFAULT 0,

  -- Validation
  is_validated BOOLEAN DEFAULT false,
  validated_by UUID REFERENCES users(id),
  validated_at TIMESTAMP,
  validation_notes TEXT,

  -- AI Readiness (for future)
  ai_confidence_score DECIMAL(5, 2),
  ai_suggestions JSONB,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_evidence_point ON inspection_evidence(point_id);

-- ============================================================
-- DEFECTS (Issues found during inspection)
-- ============================================================
CREATE TABLE IF NOT EXISTS inspection_defects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID REFERENCES digital_inspections(id) ON DELETE CASCADE,
  point_id UUID REFERENCES inspection_points(id),

  -- Classification
  defect_code VARCHAR(50),
  defect_title VARCHAR(200) NOT NULL,
  defect_description TEXT,
  classification VARCHAR(30) NOT NULL, -- 'safety_critical', 'mechanical', 'electrical', 'cosmetic', 'maintenance', 'advisory', 'monitor'

  -- Severity
  severity VARCHAR(20) NOT NULL, -- 'critical', 'high', 'medium', 'low'
  priority INTEGER DEFAULT 0,

  -- Location
  location VARCHAR(100), -- e.g., 'Front bumper', 'Driver seat'

  -- Recommendation
  recommendation TEXT,
  estimated_repair_cost DECIMAL(12, 2),
  urgency VARCHAR(20), -- 'immediate', 'within_week', 'within_month', 'when_convenient'

  -- Status
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP,
  resolution_notes TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_defects_inspection ON inspection_defects(inspection_id);
CREATE INDEX idx_defects_classification ON inspection_defects(classification);
CREATE INDEX idx_defects_severity ON inspection_defects(severity);

-- ============================================================
-- ROAD TEST RECORDINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS road_test_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID REFERENCES digital_inspections(id) ON DELETE CASCADE,

  -- Test Results
  acceleration_rating VARCHAR(30),
  braking_rating VARCHAR(30),
  cornering_rating VARCHAR(30),
  noise_rating VARCHAR(30),
  steering_feel_rating VARCHAR(30),
  suspension_rating VARCHAR(30),

  -- Metrics
  test_distance_km DECIMAL(8, 2),
  test_duration_minutes INTEGER,
  max_speed_kmh INTEGER,
  avg_fuel_consumption DECIMAL(5, 2),

  -- Evidence
  recording_url VARCHAR(500),
  route_description TEXT,

  -- Notes
  overall_notes TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- DIAGNOSTIC DATA
-- ============================================================
CREATE TABLE IF NOT EXISTS diagnostic_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID REFERENCES digital_inspections(id) ON DELETE CASCADE,

  -- System
  system_name VARCHAR(50), -- 'engine', 'transmission', 'brakes', 'airbags', etc.

  -- Codes
  trouble_codes JSONB DEFAULT '[]', -- Array of DTC codes
  pending_codes JSONB DEFAULT '[]',
  permanent_codes JSONB DEFAULT '[]',

  -- Status
  monitor_status JSONB DEFAULT '{}', -- Monitor readiness

  -- Data
  freeze_frame JSONB, -- Snapshot data
  supported_pids JSONB DEFAULT '[]',

  -- Interpretation
  interpretation TEXT,
  severity_assessment VARCHAR(20),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- REPORT VERSIONS (Tamper-resistant versioning)
-- ============================================================
CREATE TABLE IF NOT EXISTS inspection_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID REFERENCES digital_inspections(id) ON DELETE CASCADE,

  -- Report Identity
  report_number VARCHAR(50) NOT NULL UNIQUE,
  report_version INTEGER DEFAULT 1,

  -- Status
  status VARCHAR(30) NOT NULL DEFAULT 'draft', -- 'draft', 'submitted', 'under_review', 'approved', 'published', 'archived'

  -- Content
  content JSONB DEFAULT '{}', -- Full report content
  pdf_url VARCHAR(500),

  -- Security
  content_hash VARCHAR(64), -- SHA-256 of content for tamper detection
  previous_hash VARCHAR(64), -- Hash of previous version

  -- Signatures
  inspector_signature TEXT, -- Base64 encoded signature image
  inspector_signed_at TIMESTAMP,
  inspector_ip_address VARCHAR(50),

  reviewer_signature TEXT,
  reviewer_signed_at TIMESTAMP,
  reviewer_ip_address VARCHAR(50),

  company_signature TEXT,
  company_signed_at TIMESTAMP,

  -- Verification
  verification_code VARCHAR(50) UNIQUE, -- For QR code
  verified_at TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(inspection_id, report_version)
);

CREATE INDEX idx_reports_inspection ON inspection_reports(inspection_id);
CREATE INDEX idx_reports_number ON inspection_reports(report_number);
CREATE INDEX idx_reports_verification ON inspection_reports(verification_code);

-- ============================================================
-- REPORT SHARING (Customer access)
-- ============================================================
CREATE TABLE IF NOT EXISTS report_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES inspection_reports(id) ON DELETE CASCADE,

  -- Access
  share_token VARCHAR(100) UNIQUE NOT NULL,
  access_type VARCHAR(20) DEFAULT 'view', -- 'view', 'download', 'full'

  -- Permissions
  allow_print BOOLEAN DEFAULT true,
  allow_share BOOLEAN DEFAULT false,

  -- Restrictions
  expires_at TIMESTAMP,
  max_views INTEGER,
  current_views INTEGER DEFAULT 0,

  -- Audit
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_accessed_at TIMESTAMP
);

CREATE INDEX idx_shares_token ON report_shares(share_token);

-- ============================================================
-- AUDIT LOG (Tamper-resistant activity tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS inspection_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID REFERENCES digital_inspections(id) ON DELETE CASCADE,

  -- Action
  action_type VARCHAR(50) NOT NULL,
  action_description TEXT,

  -- Entity
  entity_type VARCHAR(30),
  entity_id UUID,

  -- User
  performed_by UUID REFERENCES users(id),
  performed_by_name VARCHAR(100),

  -- Context
  ip_address VARCHAR(50),
  user_agent TEXT,
  session_id VARCHAR(100),

  -- Changes
  previous_state JSONB,
  new_state JSONB,

  -- Verification
  checksum VARCHAR(64),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_inspection ON inspection_audit_logs(inspection_id);
CREATE INDEX idx_audit_time ON inspection_audit_logs(created_at DESC);

-- ============================================================
-- QUALITY VALIDATION RULES
-- ============================================================
CREATE TABLE IF NOT EXISTS quality_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  rule_name VARCHAR(100) NOT NULL,
  rule_type VARCHAR(30), -- 'mandatory', 'warning', 'info'

  -- Condition
  condition_json JSONB, -- Rule condition

  -- Action
  action VARCHAR(30), -- 'block', 'warn', 'suggest'
  error_message TEXT,

  -- Scope
  applies_to_stages JSONB DEFAULT '[]',
  applies_to_categories JSONB DEFAULT '[]',

  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- INSPECTION TEMPLATES (Reusable configurations)
-- ============================================================
CREATE TABLE IF NOT EXISTS inspection_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES inspection_providers(id),

  template_name VARCHAR(100) NOT NULL,
  description TEXT,

  -- Configuration
  stages JSONB DEFAULT '[]', -- Ordered array of stage configs
  points JSONB DEFAULT '[]', -- Point definitions
  mandatory_checks JSONB DEFAULT '[]',

  -- Settings
  requires_photos BOOLEAN DEFAULT true,
  requires_diagnostics BOOLEAN DEFAULT false,
  min_photo_count INTEGER DEFAULT 10,

  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- DEFAULT 150-POINT TEMPLATE DATA
-- ============================================================

-- Categories and point counts:
-- Exterior: 30 points (Paint 8, Glass 4, Lighting 6, Tyres 4, Wheels 4, Body Panels 4)
-- Interior: 20 points (Seats 5, Dashboard 5, Electronics 5, A/C 3, Safety 2)
-- Engine: 15 points
-- Transmission: 10 points
-- Suspension: 10 points
-- Steering: 8 points
-- Brakes: 12 points
-- Electrical: 15 points
-- Road Test: 15 points
-- Safety Systems: 15 points
-- Total: 150 points
