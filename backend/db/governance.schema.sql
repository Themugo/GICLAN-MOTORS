-- ============================================================
// KAYAD TRUST, COMPLIANCE & GOVERNANCE CENTER - DATABASE SCHEMA
// Governance layer for automotive ecosystem integrity
-- ============================================================

-- ============================================================
// ENTITY REGISTRY (All platform participants)
// ============================================================
CREATE TABLE IF NOT EXISTS entity_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Entity Classification
  entity_type VARCHAR(30) NOT NULL, -- 'user', 'dealer', 'inspector', 'auction_house', 'bank', 'insurance', 'fleet', 'government'

  -- Account
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  company_name VARCHAR(200),

  -- Verification Status
  verification_level VARCHAR(30) NOT NULL DEFAULT 'basic', -- 'basic', 'verified_individual', 'verified_private_seller', 'verified_dealer', 'verified_inspector', 'verified_auction', 'verified_fleet', 'verified_bank', 'verified_insurance', 'verified_government'

  -- Trust Profile
  trust_score DECIMAL(5, 2) DEFAULT 50,
  trust_level VARCHAR(20) DEFAULT 'new', -- 'new', 'bronze', 'silver', 'gold', 'platinum', 'trusted'

  -- Metrics
  total_transactions INTEGER DEFAULT 0,
  successful_transactions INTEGER DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  avg_rating DECIMAL(3, 2) DEFAULT 0,
  complaint_count INTEGER DEFAULT 0,
  dispute_count INTEGER DEFAULT 0,

  -- Compliance
  compliance_score DECIMAL(5, 2) DEFAULT 100,
  violation_count INTEGER DEFAULT 0,
  last_violation_at TIMESTAMP,

  -- Status
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'suspended', 'restricted', 'banned', 'pending_review'
  suspension_reason TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id)
);

CREATE INDEX idx_entity_type ON entity_registry(entity_type);
CREATE INDEX idx_entity_verification ON entity_registry(verification_level);
CREATE INDEX idx_entity_status ON entity_registry(status);
CREATE INDEX idx_entity_trust ON entity_registry(trust_score);

-- ============================================================
// VERIFICATION APPLICATIONS
// ============================================================
CREATE TABLE IF NOT EXISTS verification_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Applicant
  entity_id UUID REFERENCES entity_registry(id) ON DELETE CASCADE,

  -- Requested Level
  requested_level VARCHAR(30) NOT NULL,
  current_level VARCHAR(30),

  -- Documents
  documents JSONB DEFAULT '[]', -- [{type, url, status, verified_at}]

  -- Verification Checklist
  checklist JSONB DEFAULT '[]', -- [{item, required, status, verified_by, verified_at}]

  -- Identity Verification
  id_number VARCHAR(50),
  id_type VARCHAR(20), -- 'national_id', 'passport', 'drivers_license'
  id_front_url VARCHAR(500),
  id_back_url VARCHAR(500),
  id_verified BOOLEAN DEFAULT false,

  -- Business Verification
  business_registration_number VARCHAR(50),
  kra_pin VARCHAR(20),
  tax_compliance_certificate VARCHAR(500),
  business_license_url VARCHAR(500),
  trade_license_url VARCHAR(500),
  physical_address TEXT,
  address_verified BOOLEAN DEFAULT false,

  -- Bank Verification
  bank_name VARCHAR(100),
  bank_account VARCHAR(50),
  mpesa_number VARCHAR(20),
  bank_verified BOOLEAN DEFAULT false,

  -- Professional Certifications
  certifications JSONB DEFAULT '[]', -- [{type, number, expiry, url, verified}]

  -- Status
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'documents_received', 'under_review', 'approved', 'rejected', 'expired', 'requires_renewal'

  -- Review
  reviewed_by UUID,
  reviewed_at TIMESTAMP,
  review_notes TEXT,

  -- Fees
  verification_fee DECIMAL(10, 2) DEFAULT 0,
  fee_paid BOOLEAN DEFAULT false,

  -- Expiry
  verified_at TIMESTAMP,
  expires_at TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_verification_entity ON verification_applications(entity_id);
CREATE INDEX idx_verification_status ON verification_applications(status);
CREATE INDEX idx_verification_expires ON verification_applications(expires_at);

-- ============================================================
// TRUST SCORE HISTORY
-- ============================================================
CREATE TABLE IF NOT EXISTS trust_score_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES entity_registry(id) ON DELETE CASCADE,

  -- Score
  previous_score DECIMAL(5, 2),
  new_score DECIMAL(5, 2) NOT NULL,

  -- Breakdown
  score_breakdown JSONB DEFAULT '{}', -- Component scores

  -- Change Reason
  change_type VARCHAR(50) NOT NULL, -- 'transaction_complete', 'review_received', 'complaint_filed', 'dispute_lost', 'verification_upgrade', 'violation', 'period_adjustment'
  change_description TEXT,

  -- Evidence
  related_transaction_id UUID,
  related_review_id UUID,
  related_dispute_id UUID,

  -- Calculated
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_trust_entity ON trust_score_history(entity_id);
);

-- ============================================================
// DISPUTE CASES
-- ============================================================
CREATE TABLE IF NOT EXISTS dispute_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Case Reference
  case_number VARCHAR(20) UNIQUE NOT NULL, -- KAYAD-D-XXXXXXXX

  -- Classification
  dispute_type VARCHAR(50) NOT NULL, -- 'buyer_vs_seller', 'buyer_vs_dealer', 'buyer_vs_inspector', 'dealer_vs_inspector', 'auction_dispute', 'inspection_appeal', 'payment_dispute', 'listing_dispute', 'fraud_report'

  -- Parties
  complainant_id UUID REFERENCES entity_registry(id),
  respondent_id UUID REFERENCES entity_registry(id),

  -- Subject
  subject VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,

  -- Related
  related_listing_id UUID,
  related_transaction_id UUID,
  related_inspection_id UUID,
  related_auction_id UUID,

  -- Status
  status VARCHAR(20) DEFAULT 'submitted', -- 'submitted', 'under_review', 'evidence_requested', 'investigation', 'mediation', 'decision', 'appeal', 'resolved', 'closed'

  -- Priority
  priority VARCHAR(10) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'

  -- Officer
  assigned_officer_id UUID,
  assigned_officer_name VARCHAR(100),
  assigned_at TIMESTAMP,

  -- Decision
  decision TEXT,
  decision_reason TEXT,
  decided_by UUID,
  decided_at TIMESTAMP,

  -- Resolution
  resolution_type VARCHAR(30), -- 'accepted', 'rejected', 'partial', 'mediated', 'escalated'
  resolution_details JSONB DEFAULT '{}',

  -- Appeal
  appeal_available BOOLEAN DEFAULT true,
  appeal_deadline TIMESTAMP,
  appealed BOOLEAN DEFAULT false,
  appeal_decision TEXT,
  appeal_decided_at TIMESTAMP,

  -- Financial
  disputed_amount DECIMAL(12, 2),
  awarded_amount DECIMAL(12, 2),

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_dispute_type ON dispute_cases(dispute_type);
  INDEX idx_dispute_status ON dispute_cases(status);
  INDEX idx_dispute_complainant ON dispute_cases(complainant_id);
  INDEX idx_dispute_respondent ON dispute_cases(respondent_id);
);

-- ============================================================
// DISPUTE EVIDENCE
-- ============================================================
CREATE TABLE IF NOT EXISTS dispute_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID REFERENCES dispute_cases(id) ON DELETE CASCADE,

  -- Evidence
  evidence_type VARCHAR(30) NOT NULL, -- 'document', 'image', 'message', 'receipt', 'inspection_report', 'contract', 'correspondence', 'other'
  title VARCHAR(200) NOT NULL,
  description TEXT,
  file_url VARCHAR(500),

  -- Submitter
  submitted_by UUID REFERENCES entity_registry(id),
  submitter_role VARCHAR(20), -- 'complainant', 'respondent', 'officer', 'system'

  -- Verification
  is_verified BOOLEAN DEFAULT false,
  verified_by UUID,
  verified_at TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_evidence_dispute ON dispute_evidence(dispute_id);

-- ============================================================
// DISPUTE TIMELINE
-- ============================================================
CREATE TABLE IF NOT EXISTS dispute_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID REFERENCES dispute_cases(id) ON DELETE CASCADE,

  -- Event
  event_type VARCHAR(50) NOT NULL, -- 'created', 'assigned', 'evidence_submitted', 'status_changed', 'decision_made', 'appeal_filed', 'resolved'
  event_description TEXT NOT NULL,

  -- Actor
  actor_id UUID,
  actor_name VARCHAR(100),
  actor_role VARCHAR(30),

  -- Previous/New Values
  previous_status VARCHAR(20),
  new_status VARCHAR(20),

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
// FRAUD REPORTS
-- ============================================================
CREATE TABLE IF NOT EXISTS fraud_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Report Reference
  report_number VARCHAR(20) UNIQUE NOT NULL, -- KAYAD-F-XXXXXXXX

  -- Classification
  report_type VARCHAR(50) NOT NULL, -- 'fake_listing', 'fake_dealer', 'identity_fraud', 'inspection_fraud', 'auction_manipulation', 'document_forgery', 'scam_attempt', 'suspicious_behaviour', 'duplicate_listing'

  -- Reporter
  reporter_id UUID REFERENCES entity_registry(id),
  reporter_email VARCHAR(200),
  reporter_anonymous BOOLEAN DEFAULT false,

  -- Subject
  subject_entity_id UUID REFERENCES entity_registry(id),
  subject_vin VARCHAR(17),
  subject_listing_id UUID,

  -- Report
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  evidence JSONB DEFAULT '[]',

  -- Status
  status VARCHAR(20) DEFAULT 'submitted', -- 'submitted', 'under_review', 'evidence_requested', 'investigation', 'resolved', 'closed', 'dismissed'

  -- Priority
  priority VARCHAR(10) DEFAULT 'normal',

  -- Officer
  assigned_officer_id UUID,
  assigned_at TIMESTAMP,

  -- Investigation
  investigation_notes TEXT,
  confirmed_fraud BOOLEAN DEFAULT false,

  -- Resolution
  resolution TEXT,
  action_taken VARCHAR(100),
  resolved_by UUID,
  resolved_at TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_fraud_type ON fraud_reports(report_type);
  INDEX idx_fraud_status ON fraud_reports(status);
  INDEX idx_fraud_subject ON fraud_reports(subject_entity_id);
);

-- ============================================================
// IMMUTABLE AUDIT LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS governance_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Action Classification
  action_type VARCHAR(50) NOT NULL, -- 'listing_created', 'listing_updated', 'listing_deleted', 'price_changed', 'ownership_updated', 'inspection_submitted', 'auction_started', 'auction_ended', 'account_updated', 'verification_completed', 'permission_changed', 'dispute_filed', 'dispute_resolved'

  action_category VARCHAR(30) NOT NULL, -- 'listing', 'transaction', 'inspection', 'auction', 'account', 'verification', 'dispute', 'compliance'

  -- Entity
  entity_type VARCHAR(30) NOT NULL, -- 'user', 'listing', 'inspection', 'auction', 'transaction', 'document'
  entity_id UUID NOT NULL,

  -- Actor
  actor_id UUID,
  actor_type VARCHAR(30), -- 'user', 'admin', 'system', 'api'
  actor_name VARCHAR(100),

  -- Context
  ip_address VARCHAR(50),
  user_agent TEXT,
  session_id VARCHAR(100),

  -- Changes
  previous_state JSONB,
  new_state JSONB,
  changed_fields JSONB DEFAULT '[]', -- ['price', 'status']

  -- Source
  source VARCHAR(50), -- 'web', 'mobile', 'api', 'system', 'admin'
  source_details VARCHAR(200),

  -- Integrity
  checksum VARCHAR(64), -- SHA-256 hash of entire record
  previous_checksum VARCHAR(64), -- Previous log entry's checksum (chain integrity)

  -- Immutable timestamps (no updated_at)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_audit_entity ON governance_audit_log(entity_type, entity_id);
  INDEX idx_audit_actor ON governance_audit_log(actor_id);
  INDEX idx_audit_type ON governance_audit_log(action_type);
  INDEX idx_audit_time ON governance_audit_log(created_at DESC);
);

-- ============================================================
// COMPLIANCE MONITORING
-- ============================================================
CREATE TABLE IF NOT EXISTS compliance_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Alert
  alert_type VARCHAR(50) NOT NULL, -- 'expired_license', 'expired_certification', 'outstanding_dispute', 'policy_violation', 'inactive_account', 'outstanding_payment', 'pending_review', 'trust_score_change', 'suspicious_activity'

  severity VARCHAR(10) DEFAULT 'info', -- 'info', 'warning', 'high', 'critical'

  -- Subject
  entity_id UUID REFERENCES entity_registry(id),

  -- Details
  title VARCHAR(200) NOT NULL,
  description TEXT,
  details JSONB DEFAULT '{}',

  -- Related
  related_document_id UUID,
  related_certification_id UUID,
  related_dispute_id UUID,

  -- Status
  status VARCHAR(20) DEFAULT 'open', -- 'open', 'acknowledged', 'resolved', 'dismissed'

  -- Resolution
  resolution_notes TEXT,
  resolved_by UUID,
  resolved_at TIMESTAMP,

  -- Notifications
  notified_at TIMESTAMP,
  notification_channels JSONB DEFAULT '[]',

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_compliance_entity ON compliance_alerts(entity_id);
  INDEX idx_compliance_status ON compliance_alerts(status);
  INDEX idx_compliance_type ON compliance_alerts(alert_type);
);

-- ============================================================
// CERTIFICATION MANAGEMENT
-- ============================================================
CREATE TABLE IF NOT EXISTS certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Entity
  entity_id UUID REFERENCES entity_registry(id),
  certification_type VARCHAR(50) NOT NULL, -- 'dealer_certification', 'inspection_certification', 'auction_accreditation', 'fleet_verification', 'partner_certification'

  -- Certificate
  certificate_number VARCHAR(50) UNIQUE,
  certificate_name VARCHAR(200),

  -- Issuer
  issuing_authority VARCHAR(200),
  issuing_authority_type VARCHAR(30), -- 'kayad', 'external', 'government'

  -- Validity
  issued_at DATE NOT NULL,
  expires_at DATE NOT NULL,

  -- Status
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'expired', 'suspended', 'revoked', 'renewed'

  -- Documents
  certificate_url VARCHAR(500),
  supporting_documents JSONB DEFAULT '[]',

  -- Compliance
  inspection_required BOOLEAN DEFAULT false,
  last_inspection_at TIMESTAMP,
  next_inspection_at TIMESTAMP,

  -- Reminders
  reminder_30d_sent BOOLEAN DEFAULT false,
  reminder_14d_sent BOOLEAN DEFAULT false,
  reminder_7d_sent BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(entity_id, certification_type),
  INDEX idx_cert_entity ON certifications(entity_id);
  INDEX idx_cert_expires ON certifications(expires_at);
);

-- ============================================================
// POLICIES
-- ============================================================
CREATE TABLE IF NOT EXISTS platform_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Policy
  policy_code VARCHAR(50) UNIQUE NOT NULL, -- 'marketplace_rules', 'auction_rules', 'inspection_standards', 'escrow_policy', 'privacy_policy', 'terms_of_service', 'dispute_procedure', 'code_of_conduct'

  title VARCHAR(200) NOT NULL,
  description TEXT,
  content TEXT,

  -- Version
  version VARCHAR(20) NOT NULL,
  effective_date DATE NOT NULL,

  -- Status
  status VARCHAR(20) DEFAULT 'active', -- 'draft', 'active', 'superseded', 'archived'
  superseded_by UUID,

  -- Acceptance
  acceptance_required BOOLEAN DEFAULT false,
  acceptance_records JSONB DEFAULT '[]', -- [{entity_id, accepted_at, version}]

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
// RISK ASSESSMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Subject
  entity_id UUID REFERENCES entity_registry(id),

  -- Assessment Type
  assessment_type VARCHAR(50) NOT NULL, -- 'account_risk', 'transaction_risk', 'listing_risk', 'behavioral_risk'

  -- Scores
  overall_risk_score DECIMAL(5, 2) DEFAULT 0,
  risk_level VARCHAR(20) DEFAULT 'low', -- 'low', 'medium', 'high', 'very_high'

  -- Components
  fraud_risk_score DECIMAL(5, 2) DEFAULT 0,
  compliance_risk_score DECIMAL(5, 2) DEFAULT 0,
  operational_risk_score DECIMAL(5, 2) DEFAULT 0,
  reputational_risk_score DECIMAL(5, 2) DEFAULT 0,

  -- Factors
  risk_factors JSONB DEFAULT '[]', -- [{factor, score, weight, description}]
  mitigation_actions JSONB DEFAULT '[]',

  -- Flags
  flags JSONB DEFAULT '[]', -- ['repeated_complaints', 'abnormal_activity', 'suspicious_patterns']

  -- Status
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'monitoring', 'resolved', 'escalated'

  -- Review
  next_review_at TIMESTAMP,
  last_review_at TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(entity_id, assessment_type)
);

-- ============================================================
// ENTERPRISE PARTNER GOVERNANCE
-- ============================================================
CREATE TABLE IF NOT EXISTS enterprise_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Partner
  entity_id UUID REFERENCES entity_registry(id),
  partner_type VARCHAR(30) NOT NULL, -- 'bank', 'insurance', 'government', 'fleet', 'corporate_buyer'

  -- Agreement
  partnership_agreement_url VARCHAR(500),
  data_sharing_agreement_url VARCHAR(500),
  api_access_level VARCHAR(20) DEFAULT 'basic', -- 'basic', 'standard', 'extended', 'full'

  -- Permissions
  permissions JSONB DEFAULT '[]', -- ['verify_vehicles', 'access_reports', 'submit_insurance']

  -- Verification Access
  can_verify_vehicles BOOLEAN DEFAULT false,
  can_access_financials BOOLEAN DEFAULT false,
  can_submit_claims BOOLEAN DEFAULT false,
  can_access_audit_logs BOOLEAN DEFAULT false,

  -- Status
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'suspended', 'terminated'

  -- Compliance
  last_compliance_review TIMESTAMP,
  compliance_status VARCHAR(20) DEFAULT 'compliant',

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(entity_id)
);

-- ============================================================
// NOTIFICATION TEMPLATES & LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS governance_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Recipient
  entity_id UUID REFERENCES entity_registry(id),
  recipient_email VARCHAR(200),
  recipient_phone VARCHAR(20),

  -- Notification
  notification_type VARCHAR(50) NOT NULL, -- 'verification_status', 'document_expiry', 'policy_update', 'compliance_warning', 'dispute_progress', 'trust_score_change', 'certification_renewal'

  title VARCHAR(200) NOT NULL,
  message TEXT,

  -- Channels
  channels JSONB DEFAULT '[]', -- ['email', 'sms', 'push', 'in_app']

  -- Status
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'read', 'failed'

  -- Delivery
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  read_at TIMESTAMP,

  -- Reference
  related_entity_type VARCHAR(30),
  related_entity_id UUID,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
