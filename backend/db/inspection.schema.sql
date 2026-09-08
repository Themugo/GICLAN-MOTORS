-- ============================================================
-- KAYAD INSPECTION MARKETPLACE - DATABASE SCHEMA
-- ============================================================

-- ============================================================
-- INSPECTION PROVIDERS (Companies/Businesses)
-- ============================================================
CREATE TABLE inspection_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  company_name VARCHAR(255) NOT NULL,
  trading_name VARCHAR(255),
  registration_number VARCHAR(100),
  tax_id VARCHAR(100),
  business_type VARCHAR(50) NOT NULL, -- 'company', 'partnership', 'sole_trader'

  -- Contact Information
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  whatsapp VARCHAR(50),
  website VARCHAR(255),

  -- Location
  country VARCHAR(100) NOT NULL DEFAULT 'Kenya',
  county VARCHAR(100),
  town VARCHAR(100),
  address TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  service_radius_km INTEGER DEFAULT 50,

  -- Business Profile
  description TEXT,
  logo_url VARCHAR(500),
  cover_image_url VARCHAR(500),
  gallery JSONB DEFAULT '[]',

  -- Operating Model
  has_workshop BOOLEAN DEFAULT false,
  offers_mobile BOOLEAN DEFAULT true,
  mobile_inspection_fee DECIMAL(10, 2) DEFAULT 0,

  -- Business Hours
  business_hours JSONB DEFAULT '{
    "monday": {"open": "08:00", "close": "18:00", "enabled": true},
    "tuesday": {"open": "08:00", "close": "18:00", "enabled": true},
    "wednesday": {"open": "08:00", "close": "18:00", "enabled": true},
    "thursday": {"open": "08:00", "close": "18:00", "enabled": true},
    "friday": {"open": "08:00", "close": "18:00", "enabled": true},
    "saturday": {"open": "09:00", "close": "14:00", "enabled": true},
    "sunday": {"open": "09:00", "close": "14:00", "enabled": false}
  }',

  -- Weekend availability
  weekend_available BOOLEAN DEFAULT true,
  same_day_available BOOLEAN DEFAULT true,

  -- Languages
  languages JSONB DEFAULT '["English", "Swahili"]',

  -- Specializations
  vehicle_types JSONB DEFAULT '["cars", "suvs", "trucks"]',
  inspection_types JSONB DEFAULT '[]',
  commercial_vehicles BOOLEAN DEFAULT false,
  electric_vehicles BOOLEAN DEFAULT false,
  luxury_vehicles BOOLEAN DEFAULT false,

  -- Experience
  years_in_business INTEGER DEFAULT 0,

  -- Status & Verification
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'active', 'suspended', 'inactive'
  verification_status VARCHAR(50) DEFAULT 'unverified', -- 'unverified', 'pending', 'verified'
  verified_at TIMESTAMP,
  verified_by UUID REFERENCES users(id),

  -- Ratings & Stats
  average_rating DECIMAL(3, 2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  total_completed_inspections INTEGER DEFAULT 0,
  response_time_minutes INTEGER DEFAULT 0,
  acceptance_rate DECIMAL(5, 2) DEFAULT 0,

  -- Subscription
  subscription_tier VARCHAR(50) DEFAULT 'basic', -- 'basic', 'premium', 'enterprise'
  subscription_expires_at TIMESTAMP,

  -- Commission
  commission_rate DECIMAL(5, 2) DEFAULT 15.00,
  payment_methods JSONB DEFAULT '["bank_transfer", "mpesa"]',
  bank_name VARCHAR(100),
  bank_account_name VARCHAR(255),
  bank_account_number VARCHAR(50),
  mpesa_paybill VARCHAR(50),
  mpesa_account VARCHAR(50),

  -- Compliance
  insurance_policy VARCHAR(255),
  insurance_expires_at TIMESTAMP,
  has_quality_certification BOOLEAN DEFAULT false,
  quality_certification_body VARCHAR(255),
  quality_certification_expires_at TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX idx_providers_status ON inspection_providers(status);
CREATE INDEX idx_providers_country ON inspection_providers(country);
CREATE INDEX idx_providers_rating ON inspection_providers(average_rating DESC);

-- ============================================================
-- INSPECTION PACKAGES
-- ============================================================
CREATE TABLE inspection_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES inspection_providers(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  description TEXT,
  inspection_type VARCHAR(100) NOT NULL, -- 'pre_purchase', 'dealer', 'auction', 'fleet', 'insurance', 'warranty', 'mechanical', 'road_test', 'import', 'commercial'

  -- Pricing
  price DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'KES',
  mobile_surcharge DECIMAL(10, 2) DEFAULT 0,

  -- Duration
  estimated_duration_minutes INTEGER NOT NULL DEFAULT 60,

  -- Coverage
  inspection_points INTEGER NOT NULL DEFAULT 150,
  includes_diagnostics BOOLEAN DEFAULT false,
  includes_road_test BOOLEAN DEFAULT false,
  includes_electrical_check BOOLEAN DEFAULT false,
  includes_suspension_check BOOLEAN DEFAULT false,

  -- What's Included
  included_items JSONB DEFAULT '[]',
  excluded_items JSONB DEFAULT '[]',

  -- Report
  report_template VARCHAR(50) DEFAULT 'standard', -- 'standard', 'detailed', 'premium'
  report_language VARCHAR(20) DEFAULT 'en',
  digital_report BOOLEAN DEFAULT true,
  pdf_report BOOLEAN DEFAULT true,

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_packages_provider ON inspection_packages(provider_id);
CREATE INDEX idx_packages_type ON inspection_packages(inspection_type);
CREATE INDEX idx_packages_price ON inspection_packages(price);

-- ============================================================
-- INSPECTION ENGINEERS/STAFF
-- ============================================================
CREATE TABLE inspection_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES inspection_providers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),

  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role VARCHAR(50) NOT NULL, -- 'lead_engineer', 'senior_inspector', 'junior_inspector', 'field_technician', 'workshop_technician', 'quality_reviewer'

  -- Certifications
  certifications JSONB DEFAULT '[]',
  years_experience INTEGER DEFAULT 0,
  specializations JSONB DEFAULT '[]',

  -- Contact
  phone VARCHAR(50),
  email VARCHAR(255),

  -- Photo
  photo_url VARCHAR(500),

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_available BOOLEAN DEFAULT true,

  -- Stats
  total_inspections INTEGER DEFAULT 0,
  average_rating DECIMAL(3, 2) DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_staff_provider ON inspection_staff(provider_id);
CREATE INDEX idx_staff_role ON inspection_staff(role);

-- ============================================================
-- INSPECTOR BRANCHES/LOCATIONS
-- ============================================================
CREATE TABLE inspection_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES inspection_providers(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  address TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  phone VARCHAR(50),

  -- Operating Hours (can override provider default)
  business_hours JSONB,

  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_branches_provider ON inspection_branches(provider_id);

-- ============================================================
-- BOOKINGS
-- ============================================================
CREATE TABLE inspection_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_reference VARCHAR(50) UNIQUE NOT NULL,

  -- Provider & Package
  provider_id UUID REFERENCES inspection_providers(id),
  package_id UUID REFERENCES inspection_packages(id),
  inspection_type VARCHAR(100) NOT NULL,

  -- Customer
  customer_id UUID REFERENCES users(id),
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50) NOT NULL,

  -- Vehicle
  vehicle_make VARCHAR(100),
  vehicle_model VARCHAR(100),
  vehicle_year INTEGER,
  vehicle_registration VARCHAR(50),
  vehicle_vin VARCHAR(50),
  vehicle_type VARCHAR(50),

  -- Location
  inspection_country VARCHAR(100) NOT NULL,
  inspection_county VARCHAR(100),
  inspection_town VARCHAR(100),
  inspection_address TEXT,
  inspection_latitude DECIMAL(10, 8),
  inspection_longitude DECIMAL(11, 8),
  is_mobile BOOLEAN DEFAULT true,

  -- Seller Info
  seller_name VARCHAR(255),
  seller_phone VARCHAR(50),
  seller_is_dealer BOOLEAN DEFAULT false,

  -- Schedule
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  estimated_end_time TIME,

  -- Assigned Inspector
  assigned_staff_id UUID REFERENCES inspection_staff(id),

  -- Status
  status VARCHAR(50) DEFAULT 'booked', -- 'booked', 'confirmed', 'inspector_assigned', 'travelling', 'inspection_started', 'inspection_complete', 'report_generated', 'customer_reviewed', 'closed', 'cancelled', 'no_show'
  status_changed_at TIMESTAMP,

  -- Notes
  customer_notes TEXT,
  internal_notes TEXT,
  cancellation_reason TEXT,

  -- Pricing
  base_price DECIMAL(10, 2) NOT NULL,
  mobile_fee DECIMAL(10, 2) DEFAULT 0,
  discount DECIMAL(10, 2) DEFAULT 0,
  total_price DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'KES',

  -- Payment
  payment_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'deposit_paid', 'fully_paid', 'refunded'
  payment_method VARCHAR(50),
  payment_reference VARCHAR(100),
  paid_at TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  confirmed_at TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  cancelled_at TIMESTAMP
);

CREATE INDEX idx_bookings_provider ON inspection_bookings(provider_id);
CREATE INDEX idx_bookings_customer ON inspection_bookings(customer_id);
CREATE INDEX idx_bookings_status ON inspection_bookings(status);
CREATE INDEX idx_bookings_date ON inspection_bookings(scheduled_date);
CREATE INDEX idx_bookings_reference ON inspection_bookings(booking_reference);

-- ============================================================
-- INSPECTION REPORTS
-- ============================================================
CREATE TABLE inspection_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES inspection_bookings(id) UNIQUE,

  report_number VARCHAR(50) UNIQUE NOT NULL,

  -- Overall Score
  overall_score INTEGER NOT NULL, -- 1-100
  overall_condition VARCHAR(50) NOT NULL, -- 'excellent', 'good', 'fair', 'poor', 'bad'

  -- Section Scores
  engine_score INTEGER,
  transmission_score INTEGER,
  suspension_score INTEGER,
  brakes_score INTEGER,
  electrical_score INTEGER,
  interior_score INTEGER,
  exterior_score INTEGER,
  body_score INTEGER,
  paint_score INTEGER,
  tyres_score INTEGER,
  undercarriage_score INTEGER,
  road_test_score INTEGER,

  -- Detailed Findings
  findings JSONB DEFAULT '[]', -- Array of finding objects
  critical_issues JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',

  -- Report Content
  executive_summary TEXT,
  detailed_findings TEXT,
  technician_notes TEXT,

  -- Road Test
  road_test_performed BOOLEAN DEFAULT false,
  road_test_notes TEXT,
  road_test_distance_km INTEGER,

  -- Diagnostics
  diagnostic_codes JSONB DEFAULT '[]',
  obd_scan_performed BOOLEAN DEFAULT false,

  -- Photos
  photos JSONB DEFAULT '[]',

  -- Documents
  pdf_url VARCHAR(500),
  pdf_generated_at TIMESTAMP,

  -- Quality
  quality_reviewed BOOLEAN DEFAULT false,
  quality_reviewer_id UUID REFERENCES inspection_staff(id),
  quality_reviewed_at TIMESTAMP,
  quality_score INTEGER,

  -- Signature
  inspector_signature_url VARCHAR(500),
  customer_signature_url VARCHAR(500),

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  signed_at TIMESTAMP,

  -- Access
  share_token VARCHAR(100) UNIQUE,
  share_expires_at TIMESTAMP,
  is_shared BOOLEAN DEFAULT false
);

CREATE INDEX idx_reports_booking ON inspection_reports(booking_id);
CREATE INDEX idx_reports_number ON inspection_reports(report_number);

-- ============================================================
-- INSPECTION CHECKLIST ITEMS (150-point checklist)
-- ============================================================
CREATE TABLE inspection_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES inspection_reports(id) ON DELETE CASCADE,

  category VARCHAR(50) NOT NULL, -- 'engine', 'transmission', 'suspension', etc.
  item_number INTEGER NOT NULL,
  item_name VARCHAR(255) NOT NULL,

  -- Status
  status VARCHAR(50) NOT NULL, -- 'pass', 'fail', 'warning', 'not_applicable', 'not_inspected'

  -- Details
  condition_notes TEXT,
  severity VARCHAR(50), -- 'critical', 'major', 'minor'

  -- Photos
  photos JSONB DEFAULT '[]',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_checklist_report ON inspection_checklist_items(report_id);
CREATE INDEX idx_checklist_category ON inspection_checklist_items(category);

-- ============================================================
-- BOOKING STATUS HISTORY
-- ============================================================
CREATE TABLE inspection_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES inspection_bookings(id) ON DELETE CASCADE,

  from_status VARCHAR(50),
  to_status VARCHAR(50) NOT NULL,
  changed_by UUID REFERENCES users(id),
  staff_id UUID REFERENCES inspection_staff(id),

  notes TEXT,
  location_latitude DECIMAL(10, 8),
  location_longitude DECIMAL(11, 8),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_status_history_booking ON inspection_status_history(booking_id);

-- ============================================================
-- REVIEWS & RATINGS
-- ============================================================
CREATE TABLE inspection_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES inspection_bookings(id) UNIQUE,
  provider_id UUID REFERENCES inspection_providers(id),
  customer_id UUID REFERENCES users(id),

  -- Ratings
  overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
  professionalism_rating INTEGER CHECK (professionalism_rating >= 1 AND professionalism_rating <= 5),
  thoroughness_rating INTEGER CHECK (thoroughness_rating >= 1 AND thoroughness_rating <= 5),
  timeliness_rating INTEGER CHECK (timeliness_rating >= 1 AND timeliness_rating <= 5),
  communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),

  -- Comment
  review_text TEXT,

  -- Response
  provider_response TEXT,
  responded_at TIMESTAMP,

  -- Status
  is_verified BOOLEAN DEFAULT true,
  is_published BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reviews_provider ON inspection_reviews(provider_id);
CREATE INDEX idx_reviews_customer ON inspection_reviews(customer_id);

-- ============================================================
-- PAYMENT SETTLEMENTS
-- ============================================================
CREATE TABLE inspection_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES inspection_providers(id),

  settlement_reference VARCHAR(50) UNIQUE NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Amounts
  gross_amount DECIMAL(12, 2) NOT NULL,
  commission_amount DECIMAL(12, 2) NOT NULL,
  tax_amount DECIMAL(12, 2) DEFAULT 0,
  net_amount DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'KES',

  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'paid', 'failed'

  -- Details
  bookings_count INTEGER,
  breakdown JSONB,

  -- Payment
  payment_method VARCHAR(50),
  payment_reference VARCHAR(100),
  paid_at TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP
);

CREATE INDEX idx_settlements_provider ON inspection_settlements(provider_id);
CREATE INDEX idx_settlements_status ON inspection_settlements(status);

-- ============================================================
-- PROVIDER BANK TRANSACTIONS
-- ============================================================
CREATE TABLE inspection_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES inspection_providers(id),
  booking_id UUID REFERENCES inspection_bookings(id),
  settlement_id UUID REFERENCES inspection_settlements(id),

  transaction_type VARCHAR(50) NOT NULL, -- 'inspection_payment', 'refund', 'commission', 'payout', 'adjustment'

  amount DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'KES',

  status VARCHAR(50) DEFAULT 'completed', -- 'pending', 'processing', 'completed', 'failed', 'refunded'

  description TEXT,
  reference VARCHAR(100),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transactions_provider ON inspection_transactions(provider_id);
CREATE INDEX idx_transactions_booking ON inspection_transactions(booking_id);

-- ============================================================
-- QUALITY AUDITS
-- ============================================================
CREATE TABLE inspection_quality_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES inspection_reports(id),
  auditor_id UUID REFERENCES users(id),

  audit_score INTEGER CHECK (audit_score >= 0 AND audit_score <= 100),
  findings TEXT,

  checklist_accuracy BOOLEAN DEFAULT true,
  photo_quality BOOLEAN DEFAULT true,
  report_completeness BOOLEAN DEFAULT true,

  passed BOOLEAN DEFAULT true,

  notes TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- NOTIFICATIONS LOG
-- ============================================================
CREATE TABLE inspection_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES inspection_bookings(id),
  user_id UUID REFERENCES users(id),
  provider_id UUID REFERENCES inspection_providers(id),

  type VARCHAR(50) NOT NULL, -- 'booking_created', 'booking_confirmed', 'inspector_assigned', 'inspection_started', 'report_ready', 'review_request'

  title VARCHAR(255) NOT NULL,
  message TEXT,

  channel VARCHAR(20) NOT NULL, -- 'push', 'email', 'sms', 'whatsapp'

  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed', 'read'

  sent_at TIMESTAMP,
  read_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_booking ON inspection_notifications(booking_id);
CREATE INDEX idx_notifications_user ON inspection_notifications(user_id);

-- ============================================================
-- FAVOURITES (Saved Providers)
-- ============================================================
CREATE TABLE inspection_favourites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  provider_id UUID REFERENCES inspection_providers(id),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id, provider_id)
);

CREATE INDEX idx_favourites_user ON inspection_favourites(user_id);
CREATE INDEX idx_favourites_provider ON inspection_favourites(provider_id);

-- ============================================================
-- PROVIDER CREDENTIALS/CERTIFICATES
-- ============================================================
CREATE TABLE provider_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES inspection_providers(id) ON DELETE CASCADE,

  type VARCHAR(50) NOT NULL, -- 'business_license', 'certification', 'insurance', 'award', 'membership'
  name VARCHAR(255) NOT NULL,
  issuing_body VARCHAR(255),
  certificate_number VARCHAR(100),

  issue_date DATE,
  expiry_date DATE,

  document_url VARCHAR(500),

  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMP,
  verified_by UUID REFERENCES users(id),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_credentials_provider ON provider_credentials(provider_id);

-- ============================================================
-- STAFF SCHEDULES
-- ============================================================
CREATE TABLE staff_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID REFERENCES inspection_staff(id) ON DELETE CASCADE,

  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,

  is_available BOOLEAN DEFAULT true,
  is_sick BOOLEAN DEFAULT false,
  is_on_leave BOOLEAN DEFAULT false,

  notes TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(staff_id, date, start_time)
);

CREATE INDEX idx_schedules_staff ON staff_schedules(staff_id);
CREATE INDEX idx_schedules_date ON staff_schedules(date);

-- ============================================================
-- BOOKING DISPUTES
-- ============================================================
CREATE TABLE inspection_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES inspection_bookings(id),
  customer_id UUID REFERENCES users(id),
  provider_id UUID REFERENCES inspection_providers(id),

  reason VARCHAR(100) NOT NULL, -- 'no_show', 'poor_quality', 'incomplete', 'misconduct', 'other'
  description TEXT NOT NULL,

  evidence_urls JSONB DEFAULT '[]',

  status VARCHAR(50) DEFAULT 'open', -- 'open', 'under_review', 'resolved_customer', 'resolved_provider', 'closed'

  resolution TEXT,
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMP,

  refund_amount DECIMAL(10, 2),
  refund_status VARCHAR(50),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_disputes_booking ON inspection_disputes(booking_id);
CREATE INDEX idx_disputes_status ON inspection_disputes(status);
