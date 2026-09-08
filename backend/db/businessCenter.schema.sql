-- ============================================================
-- KAYAD INSPECTION BUSINESS CENTER - DATABASE SCHEMA
-- ============================================================

-- ============================================================
-- ENGINEERS/STAFF (Extended from inspection.schema)
-- ============================================================
CREATE TABLE IF NOT EXISTS inspection_engineers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES inspection_providers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),

  -- Personal Info
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  photo_url VARCHAR(500),

  -- Role
  role VARCHAR(50) NOT NULL, -- 'lead_engineer', 'senior_inspector', 'junior_inspector', 'electrical_specialist', 'body_specialist', 'commercial_specialist', 'motorcycle_specialist', 'qa_reviewer'

  -- Skills
  skills JSONB DEFAULT '[]', -- Array of skill codes
  vehicle_types JSONB DEFAULT '["cars", "suvs"]', -- Authorized vehicle types
  certifications JSONB DEFAULT '[]',

  -- Experience
  years_experience INTEGER DEFAULT 0,
  inspection_count INTEGER DEFAULT 0,

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_available BOOLEAN DEFAULT true,

  -- Location
  home_latitude DECIMAL(10, 8),
  home_longitude DECIMAL(11, 8),
  home_county VARCHAR(100),
  home_town VARCHAR(100),

  -- Performance
  average_rating DECIMAL(3, 2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  avg_inspection_time_minutes INTEGER DEFAULT 60,
  on_time_rate DECIMAL(5, 2) DEFAULT 100,
  quality_score DECIMAL(3, 2) DEFAULT 100,

  -- Working Hours
  working_hours JSONB DEFAULT '{
    "monday": {"enabled": true, "start": "08:00", "end": "18:00"},
    "tuesday": {"enabled": true, "start": "08:00", "end": "18:00"},
    "wednesday": {"enabled": true, "start": "08:00", "end": "18:00"},
    "thursday": {"enabled": true, "start": "08:00", "end": "18:00"},
    "friday": {"enabled": true, "start": "08:00", "end": "18:00},
    "saturday": {"enabled": true, "start": "09:00", "end": "14:00"},
    "sunday": {"enabled": false, "start": "09:00", "end": "14:00}
  }',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_engineers_provider ON inspection_engineers(provider_id);
CREATE INDEX idx_engineers_role ON inspection_engineers(role);
CREATE INDEX idx_engineers_available ON inspection_engineers(is_available);

-- ============================================================
-- ENGINEER SCHEDULES
-- ============================================================
CREATE TABLE IF NOT EXISTS engineer_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engineer_id UUID REFERENCES inspection_engineers(id) ON DELETE CASCADE,

  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,

  -- Availability Status
  status VARCHAR(50) DEFAULT 'available', -- 'available', 'booked', 'break', 'travel', 'sick', 'leave', 'training'

  -- Booking Reference (if booked)
  booking_id UUID REFERENCES inspection_bookings(id),

  -- Location
  location_name VARCHAR(255),
  location_address TEXT,
  estimated_travel_minutes INTEGER DEFAULT 0,

  -- Notes
  notes TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(engineer_id, date, start_time)
);

CREATE INDEX idx_engineer_schedules_engineer ON engineer_schedules(engineer_id);
CREATE INDEX idx_engineer_schedules_date ON engineer_schedules(date);
CREATE INDEX idx_engineer_schedules_status ON engineer_schedules(status);

-- ============================================================
-- CUSTOMERS (Linked to inspections)
-- ============================================================
CREATE TABLE IF NOT EXISTS inspection_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES inspection_providers(id),

  -- User Reference
  user_id UUID REFERENCES users(id),

  -- Contact Info
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),

  -- Customer Type
  customer_type VARCHAR(50) NOT NULL, -- 'private_buyer', 'dealer', 'auction', 'fleet', 'insurance', 'corporate', 'other'

  -- Business Info (for dealers/corporate)
  company_name VARCHAR(255),
  tax_id VARCHAR(100),

  -- Stats
  total_inspections INTEGER DEFAULT 0,
  total_spent DECIMAL(12, 2) DEFAULT 0,
  last_inspection_date DATE,
  average_rating DECIMAL(3, 2) DEFAULT 0,

  -- Preferences
  preferred_location_type VARCHAR(50), -- 'mobile', 'workshop'
  notes TEXT,

  -- Status
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_customers_provider ON inspection_customers(provider_id);
CREATE INDEX idx_customers_type ON inspection_customers(customer_type);

-- ============================================================
-- REPORT VERSIONS (For QA workflow)
-- ============================================================
CREATE TABLE IF NOT EXISTS report_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES inspection_reports(id) ON DELETE CASCADE,

  version_number INTEGER NOT NULL DEFAULT 1,

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'draft', -- 'draft', 'engineer_complete', 'qa_review', 'corrections_requested', 'approved', 'sent', 'archived'

  -- Content
  content JSONB DEFAULT '{}',

  -- Review Info
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP,
  review_notes TEXT,

  -- Approval
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,

  -- Customer Delivery
  sent_at TIMESTAMP,
  sent_via VARCHAR(50), -- 'email', 'sms', 'whatsapp', 'portal'

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_report_versions_report ON report_versions(report_id);
CREATE INDEX idx_report_versions_status ON report_versions(status);

-- ============================================================
-- REPORT CORRECTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS report_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID REFERENCES report_versions(id) ON DELETE CASCADE,

  section VARCHAR(100) NOT NULL,
  issue_description TEXT NOT NULL,
  suggested_fix TEXT,

  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'fixed', 'rejected'

  -- Resolution
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMP,
  resolution_notes TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- BUSINESS METRICS (Aggregated data)
-- ============================================================
CREATE TABLE IF NOT EXISTS business_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES inspection_providers(id),

  metric_date DATE NOT NULL,
  metric_type VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'monthly'

  -- Job Metrics
  jobs_completed INTEGER DEFAULT 0,
  jobs_cancelled INTEGER DEFAULT 0,
  jobs_rescheduled INTEGER DEFAULT 0,
  average_inspection_time_minutes INTEGER DEFAULT 0,

  -- Revenue Metrics
  gross_revenue DECIMAL(12, 2) DEFAULT 0,
  net_revenue DECIMAL(12, 2) DEFAULT 0,
  commission_paid DECIMAL(12, 2) DEFAULT 0,

  -- Engineer Metrics
  engineer_hours_worked DECIMAL(6, 2) DEFAULT 0,
  engineer_utilization_rate DECIMAL(5, 2) DEFAULT 0,

  -- Customer Metrics
  new_customers INTEGER DEFAULT 0,
  repeat_customers INTEGER DEFAULT 0,
  average_customer_rating DECIMAL(3, 2) DEFAULT 0,

  -- Quality Metrics
  reports_approved INTEGER DEFAULT 0,
  reports_rejected INTEGER DEFAULT 0,
  quality_score DECIMAL(3, 2) DEFAULT 100,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(provider_id, metric_date, metric_type)
);

CREATE INDEX idx_metrics_provider ON business_metrics(provider_id);
CREATE INDEX idx_metrics_date ON business_metrics(metric_date);

-- ============================================================
-- MARKETING PROMOS
-- ============================================================
CREATE TABLE IF NOT EXISTS inspection_promos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES inspection_providers(id),

  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Discount
  discount_type VARCHAR(20) NOT NULL, -- 'percentage', 'fixed', 'free_upgrade'
  discount_value DECIMAL(10, 2),
  min_order_value DECIMAL(10, 2) DEFAULT 0,

  -- Validity
  starts_at TIMESTAMP NOT NULL,
  ends_at TIMESTAMP NOT NULL,

  -- Conditions
  applicable_packages JSONB DEFAULT '[]',
  applicable_customers JSONB DEFAULT '[]', -- Empty = all customers
  max_uses INTEGER,
  uses_count INTEGER DEFAULT 0,

  -- Status
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- DOCUMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS business_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES inspection_providers(id),

  type VARCHAR(50) NOT NULL, -- 'certificate', 'license', 'insurance', 'engineer_cert', 'template', 'training', 'other'

  title VARCHAR(255) NOT NULL,
  description TEXT,

  -- File Info
  file_url VARCHAR(500),
  file_type VARCHAR(50),
  file_size INTEGER,

  -- Validity
  issue_date DATE,
  expiry_date DATE,

  -- Verification
  is_verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMP,

  -- Associated Entity
  engineer_id UUID REFERENCES inspection_engineers(id),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_documents_provider ON business_documents(provider_id);
CREATE INDEX idx_documents_type ON business_documents(type);
CREATE INDEX idx_documents_expiry ON business_documents(expiry_date);

-- ============================================================
-- ENGINEER LOCATIONS (Real-time tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS engineer_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engineer_id UUID REFERENCES inspection_engineers(id) ON DELETE CASCADE,

  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,

  -- Status
  current_status VARCHAR(50) DEFAULT 'available', -- 'available', 'travelling', 'on_site', 'offline'

  -- Current Assignment
  booking_id UUID REFERENCES inspection_bookings(id),

  -- Accuracy
  accuracy_meters INTEGER,

  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_engineer_locations_engineer ON engineer_locations(engineer_id);
CREATE INDEX idx_engineer_locations_time ON engineer_locations(recorded_at DESC);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS business_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES inspection_providers(id),

  action_type VARCHAR(100) NOT NULL, -- 'booking_created', 'engineer_assigned', 'report_approved', 'payment_received', etc.

  entity_type VARCHAR(50), -- 'booking', 'engineer', 'report', 'customer', etc.
  entity_id UUID,

  performed_by UUID REFERENCES users(id),

  details JSONB DEFAULT '{}',

  ip_address VARCHAR(50),
  user_agent TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_provider ON business_audit_logs(provider_id);
CREATE INDEX idx_audit_logs_entity ON business_audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_time ON business_audit_logs(created_at DESC);
