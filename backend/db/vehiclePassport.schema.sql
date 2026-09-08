-- ============================================================
// KAYAD DIGITAL VEHICLE PASSPORT™ - DATABASE SCHEMA
// Permanent digital identity for vehicles
-- ============================================================

-- ============================================================
// VEHICLE PASSPORTS (Main identity records)
// ============================================================
CREATE TABLE IF NOT EXISTS vehicle_passports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Vehicle Identity
  passport_number VARCHAR(50) UNIQUE NOT NULL, -- KAYAD-VP-XXXXXXXX
  vin VARCHAR(17) UNIQUE,
  chassis_number VARCHAR(50),
  engine_number VARCHAR(50),
  registration_number VARCHAR(20),

  -- Vehicle Specifications
  make VARCHAR(50) NOT NULL,
  model VARCHAR(50) NOT NULL,
  trim VARCHAR(50),
  year INTEGER,
  body_type VARCHAR(30),
  colour VARCHAR(30),
  country_of_origin VARCHAR(50),

  -- Technical Specs
  engine_capacity VARCHAR(20),
  fuel_type VARCHAR(20),
  transmission VARCHAR(20),
  drive_type VARCHAR(20),
  vehicle_category VARCHAR(30),

  -- Status
  status VARCHAR(30) DEFAULT 'active', -- 'active', 'inactive', 'write_off', 'exported'

  -- Verification
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMP,
  verification_level VARCHAR(20) DEFAULT 'basic', -- 'basic', 'standard', 'premium'

  -- Trust Score
  trust_score DECIMAL(5, 2) DEFAULT 0,
  inspection_score DECIMAL(5, 2) DEFAULT 0,
  maintenance_score DECIMAL(5, 2) DEFAULT 0,
  ownership_score DECIMAL(5, 2) DEFAULT 0,
  documentation_score DECIMAL(5, 2) DEFAULT 0,

  -- Badges (JSON array of badge codes)
  badges JSONB DEFAULT '[]',

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Index
  UNIQUE(vin, make, model)
);

CREATE INDEX idx_passports_vin ON vehicle_passports(vin);
CREATE INDEX idx_passports_registration ON vehicle_passports(registration_number);
CREATE INDEX idx_passports_status ON vehicle_passports(status);

-- ============================================================
// VEHICLE TIMELINE (Chronological event log)
// ============================================================
CREATE TABLE IF NOT EXISTS vehicle_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passport_id UUID REFERENCES vehicle_passports(id) ON DELETE CASCADE,

  -- Event Classification
  event_type VARCHAR(50) NOT NULL, -- 'import', 'registration', 'listing', 'inspection', 'auction', 'sale', 'ownership', 'finance', 'insurance', 'service', 'accident', 'recall', 'warranty', 'roadworthy'
  event_category VARCHAR(30), -- 'lifecycle', 'inspection', 'ownership', 'marketplace', 'service', 'incident'

  -- Event Details
  event_title VARCHAR(200) NOT NULL,
  event_description TEXT,

  -- Timing
  event_date DATE NOT NULL,
  event_time TIME,

  -- Verification
  is_verified BOOLEAN DEFAULT false,
  verified_source VARCHAR(100), -- 'kayad_system', 'ntsa', 'ke_rtoa', 'nairobi_sbp', 'coa_auctions', etc.
  reference_number VARCHAR(100),

  -- Evidence
  evidence_urls JSONB DEFAULT '[]', -- Array of document/image URLs
  documents JSONB DEFAULT '[]', -- Related document IDs

  -- Link to related records
  related_inspection_id UUID,
  related_auction_id UUID,
  related_listing_id UUID,
  related_service_id UUID,
  related_ownership_id UUID,

  -- Metadata
  performed_by UUID, -- User or system that recorded
  performed_by_name VARCHAR(100),

  -- Versioning (immutable - no updates allowed)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- No updated_at - timeline events are immutable
);

CREATE INDEX idx_timeline_passport ON vehicle_timeline(passport_id);
CREATE INDEX idx_timeline_type ON vehicle_timeline(event_type);
CREATE INDEX idx_timeline_date ON vehicle_timeline(event_date DESC);

-- ============================================================
// OWNERSHIP HISTORY
// ============================================================
CREATE TABLE IF NOT EXISTS ownership_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passport_id UUID REFERENCES vehicle_passports(id) ON DELETE CASCADE,

  -- Ownership Number (sequential per vehicle)
  ownership_number INTEGER NOT NULL,

  -- Period
  ownership_start DATE NOT NULL,
  ownership_end DATE,

  -- Ownership Type
  ownership_type VARCHAR(30) NOT NULL, -- 'dealer', 'corporate', 'private', 'fleet', 'government', 'auction'

  -- Owner Reference (encrypted/masked for privacy)
  owner_reference_hash VARCHAR(64), -- Hashed identifier for internal use
  owner_display_name VARCHAR(100), -- Public display name (e.g., "Auto Dealer Ltd" or "Private Owner")

  -- Transfer Details
  transfer_method VARCHAR(30), -- 'sale', 'gift', 'inheritance', 'court_order', 'export'
  previous_owner_hash VARCHAR(64),
  transfer_amount DECIMAL(12, 2),
  transfer_currency VARCHAR(3) DEFAULT 'KES',

  -- Verification
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMP,
  verification_documents JSONB DEFAULT '[]',

  -- Status
  is_current BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(passport_id, ownership_number)
);

CREATE INDEX idx_ownership_passport ON ownership_history(passport_id);
CREATE INDEX idx_ownership_current ON ownership_history(passport_id, is_current);

-- ============================================================
// INSPECTION HISTORY (Links to Digital Inspection Engine)
// ============================================================
CREATE TABLE IF NOT EXISTS inspection_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passport_id UUID REFERENCES vehicle_passports(id) ON DELETE CASCADE,

  -- Inspection Reference
  inspection_id UUID, -- Reference to digital_inspections table
  inspection_report_id UUID, -- Reference to inspection_reports table

  -- Inspection Details
  inspection_date DATE NOT NULL,
  inspection_type VARCHAR(50), -- 'pre_purchase', 'dealer', 'fleet', 'auction', 'roadworthy', 'insurance'
  provider_id UUID,
  provider_name VARCHAR(200),

  -- Scores
  overall_score INTEGER,
  overall_grade VARCHAR(5),
  mechanical_score INTEGER,
  safety_score INTEGER,
  body_score INTEGER,
  interior_score INTEGER,
  electrical_score INTEGER,

  -- Defects Summary
  critical_defects INTEGER DEFAULT 0,
  major_defects INTEGER DEFAULT 0,
  minor_defects INTEGER DEFAULT 0,

  -- Verification
  is_verified BOOLEAN DEFAULT true,
  report_verification_code VARCHAR(50),

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_inspection_passport ON inspection_history(passport_id);
CREATE INDEX idx_inspection_date ON inspection_history(inspection_date DESC);

-- ============================================================
// SERVICE HISTORY
// ============================================================
CREATE TABLE IF NOT EXISTS service_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passport_id UUID REFERENCES vehicle_passports(id) ON DELETE CASCADE,

  -- Service Details
  service_date DATE NOT NULL,
  service_type VARCHAR(50) NOT NULL, -- 'oil_service', 'brake_service', 'timing_belt', 'battery', 'tyres', 'suspension', 'engine_repair', 'transmission_repair', 'major_overhaul'
  service_title VARCHAR(200) NOT NULL,
  service_description TEXT,

  -- Workshop
  workshop_id UUID,
  workshop_name VARCHAR(200),
  workshop_verified BOOLEAN DEFAULT false,

  -- Mileage
  mileage_at_service INTEGER,

  -- Cost
  service_cost DECIMAL(12, 2),
  currency VARCHAR(3) DEFAULT 'KES',

  -- Invoice
  invoice_number VARCHAR(50),
  invoice_url VARCHAR(500),

  -- Evidence
  evidence_urls JSONB DEFAULT '[]',

  -- Verification
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_service_passport ON service_history(passport_id);
CREATE INDEX idx_service_date ON service_history(service_date DESC);

-- ============================================================
// ACCIDENT HISTORY
// ============================================================
CREATE TABLE IF NOT EXISTS accident_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passport_id UUID REFERENCES vehicle_passports(id) ON DELETE CASCADE,

  -- Accident Details
  accident_date DATE NOT NULL,
  accident_type VARCHAR(30) NOT NULL, -- 'minor', 'moderate', 'major', 'structural', 'write_off'

  -- Description
  description TEXT,
  location VARCHAR(200),

  -- Report
  police_report_number VARCHAR(50),
  insurance_claim_number VARCHAR(50),

  -- Impact
  impact_zones JSONB DEFAULT '[]', -- ['front', 'rear', 'left', 'right', 'roof', 'undercarriage']

  -- Structural Damage
  has_structural_damage BOOLEAN DEFAULT false,
  structural_notes TEXT,

  -- Repair Status
  repair_status VARCHAR(30) DEFAULT 'unknown', -- 'not_repaired', 'partially_repaired', 'fully_repaired', 'written_off'
  repair_completion_date DATE,
  repair_invoice_url VARCHAR(500),

  -- Financial
  estimated_damage DECIMAL(12, 2),

  -- Evidence
  photos JSONB DEFAULT '[]',
  documents JSONB DEFAULT '[]',

  -- Verification
  is_verified BOOLEAN DEFAULT false,
  verified_by VARCHAR(100),
  verified_at TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_accident_passport ON accident_history(passport_id);

-- ============================================================
// AUCTION HISTORY
// ============================================================
CREATE TABLE IF NOT EXISTS auction_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passport_id UUID REFERENCES vehicle_passports(id) ON DELETE CASCADE,

  -- Auction Details
  auction_date DATE NOT NULL,
  auction_organizer VARCHAR(200),
  organizer_verified BOOLEAN DEFAULT false,
  auction_type VARCHAR(50), -- 'dealer_auction', 'bank_auction', 'insurance_auction', 'government_auction', 'import_auction'

  -- Lot Information
  lot_number VARCHAR(20),
  reserve_met BOOLEAN,
  reserve_price DECIMAL(12, 2),

  -- Result
  sold BOOLEAN DEFAULT false,
  selling_price DECIMAL(12, 2),
  currency VARCHAR(3) DEFAULT 'KES',

  -- Buyer (masked)
  winning_bidder_hash VARCHAR(64),
  winning_bidder_display VARCHAR(100), -- 'Anonymous Bidder' or verified dealer name

  -- Related Records
  inspection_id UUID,
  listing_id UUID,

  -- Auction Replay
  replay_url VARCHAR(500),

  -- Verification
  is_verified BOOLEAN DEFAULT false,
  verification_documents JSONB DEFAULT '[]',

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_auction_passport ON auction_history(passport_id);
CREATE INDEX idx_auction_date ON auction_history(auction_date DESC);

-- ============================================================
// FINANCE HISTORY
// ============================================================
CREATE TABLE IF NOT EXISTS finance_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passport_id UUID REFERENCES vehicle_passports(id) ON DELETE CASCADE,

  -- Finance Event
  event_date DATE NOT NULL,
  event_type VARCHAR(50) NOT NULL, -- 'finance_eligible', 'loan_approved', 'loan_declined', 'loan_active', 'loan_cleared', 'repossession', 'asset_recovery', 'bank_clearance'

  -- Institution
  financial_institution VARCHAR(200),
  institution_verified BOOLEAN DEFAULT false,

  -- Loan Details
  loan_amount DECIMAL(12, 2),
  loan_currency VARCHAR(3) DEFAULT 'KES',
  loan_term_months INTEGER,
  interest_rate DECIMAL(5, 2),

  -- Status
  is_active BOOLEAN DEFAULT false,
  clearance_date DATE,
  clearance_certificate_url VARCHAR(500),

  -- Verification
  is_verified BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_finance_passport ON finance_history(passport_id);

-- ============================================================
// MARKETPLACE HISTORY
// ============================================================
CREATE TABLE IF NOT EXISTS marketplace_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passport_id UUID REFERENCES vehicle_passports(id) ON DELETE CASCADE,

  -- Listing
  listing_id UUID,
  listing_date DATE,
  listing_price DECIMAL(12, 2),
  listing_currency VARCHAR(3) DEFAULT 'KES',

  -- Status Changes
  event_type VARCHAR(50) NOT NULL, -- 'listed', 'price_changed', 'de_listed', 'sold', 'listing_updated'
  event_date DATE NOT NULL,

  -- Views & Interest
  view_count INTEGER DEFAULT 0,
  save_count INTEGER DEFAULT 0,
  inquiry_count INTEGER DEFAULT 0,
  inspection_requests INTEGER DEFAULT 0,

  -- Sale (if sold)
  sold_price DECIMAL(12, 2),
  sold_date DATE,

  -- Verification
  is_verified BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_marketplace_passport ON marketplace_history(passport_id);

-- ============================================================
// DOCUMENT VAULT
// ============================================================
CREATE TABLE IF NOT EXISTS vehicle_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passport_id UUID REFERENCES vehicle_passports(id) ON DELETE CASCADE,

  -- Document Type
  document_type VARCHAR(50) NOT NULL, -- 'inspection_report', 'invoice', 'logbook', 'import_document', 'finance_document', 'insurance_certificate', 'warranty_document', 'ownership_transfer', 'service_receipt', 'accident_report', 'other'

  -- Details
  document_title VARCHAR(200) NOT NULL,
  document_description TEXT,

  -- File
  file_url VARCHAR(500),
  file_type VARCHAR(50),
  file_size INTEGER,

  -- Verification
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMP,
  verified_by VARCHAR(100),

  -- Access
  visibility VARCHAR(20) DEFAULT 'public', -- 'public', 'private', 'restricted'

  -- Related Event
  related_timeline_id UUID REFERENCES vehicle_timeline(id),

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_documents_passport ON vehicle_documents(passport_id);
CREATE INDEX idx_documents_type ON vehicle_documents(document_type);

-- ============================================================
// VERIFICATION BADGES
// ============================================================
CREATE TABLE IF NOT EXISTS verification_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passport_id UUID REFERENCES vehicle_passports(id) ON DELETE CASCADE,

  -- Badge
  badge_code VARCHAR(50) NOT NULL, -- 'verified_identity', 'verified_ownership', 'verified_inspection', 'verified_dealer', 'verified_auction', 'verified_service', 'verified_finance', 'verified_documentation'
  badge_name VARCHAR(100),
  badge_description TEXT,

  -- Criteria Met
  criteria_met JSONB DEFAULT '{}',

  -- Awarded
  awarded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  awarded_by VARCHAR(100),

  -- Validity
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP,

  -- Evidence
  supporting_evidence JSONB DEFAULT '[]',

  UNIQUE(passport_id, badge_code)
);

-- ============================================================
// HEALTH ANALYTICS (Aggregated metrics)
// ============================================================
CREATE TABLE IF NOT EXISTS vehicle_health_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passport_id UUID REFERENCES vehicle_passports(id) ON DELETE CASCADE,

  -- Period
  period_type VARCHAR(20) NOT NULL, -- 'monthly', 'quarterly', 'annual'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Mechanical Trend
  mechanical_trend VARCHAR(10), -- 'improving', 'stable', 'declining'
  mechanical_delta DECIMAL(5, 2),

  -- Maintenance Trend
  maintenance_trend VARCHAR(10),
  maintenance_score DECIMAL(5, 2),
  maintenance_cost_total DECIMAL(12, 2),

  -- Inspection Trend
  inspection_trend VARCHAR(10),
  last_inspection_score INTEGER,
  inspection_count INTEGER DEFAULT 0,

  -- Usage Pattern
  estimated_annual_km INTEGER,
  usage_pattern VARCHAR(20), -- 'low', 'moderate', 'high', 'commercial'

  -- Risk
  risk_indicators JSONB DEFAULT '[]',
  risk_score DECIMAL(5, 2) DEFAULT 0,

  -- Overall
  health_score DECIMAL(5, 2) DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(passport_id, period_type, period_start)
);

-- ============================================================
// AUDIT LOG (Tamper-evident logging)
// ============================================================
CREATE TABLE IF NOT EXISTS passport_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passport_id UUID REFERENCES vehicle_passports(id) ON DELETE CASCADE,

  -- Action
  action_type VARCHAR(50) NOT NULL, -- 'created', 'updated', 'event_added', 'badge_awarded', 'score_updated'
  action_description TEXT,

  -- Entity
  entity_type VARCHAR(30),
  entity_id UUID,

  -- User
  performed_by UUID,
  performed_by_name VARCHAR(100),
  performed_by_type VARCHAR(30), -- 'system', 'admin', 'provider', 'inspector'

  -- Context
  ip_address VARCHAR(50),
  user_agent TEXT,

  -- Changes (immutable)
  previous_state JSONB,
  new_state JSONB,

  -- Verification
  checksum VARCHAR(64),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_passport ON passport_audit_log(passport_id);
CREATE INDEX idx_audit_time ON passport_audit_log(created_at DESC);
