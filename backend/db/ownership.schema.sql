-- ============================================================
// KAYAD VEHICLE OWNERSHIP PLATFORM - DATABASE SCHEMA
// Lifelong digital companion for vehicle ownership
-- ============================================================

-- ============================================================
// OWNER PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS owner_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User Reference
  user_id UUID NOT NULL UNIQUE,

  -- Profile
  owner_since DATE,
  total_vehicles_owned INTEGER DEFAULT 0,

  -- Dashboard Preferences
  preferred_vehicle_id UUID,
  notification_preferences JSONB DEFAULT '{"email": true, "sms": true, "push": true}',

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
// OWNER VEHICLES (My Garage)
// ============================================================
CREATE TABLE IF NOT EXISTS owner_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Owner
  owner_id UUID NOT NULL,

  -- Vehicle
  passport_id UUID, -- Reference to vehicle_passports
  vin VARCHAR(17),
  make VARCHAR(50) NOT NULL,
  model VARCHAR(50) NOT NULL,
  year INTEGER,
  registration_number VARCHAR(20),
  colour VARCHAR(30),

  -- Ownership
  ownership_type VARCHAR(20) NOT NULL, -- 'current', 'sold', 'favourite', 'recently_viewed'
  purchase_date DATE,
  purchase_price DECIMAL(12, 2),
  purchase_mileage INTEGER,
  sale_date DATE,
  sale_price DECIMAL(12, 2),

  -- Current Values
  current_mileage INTEGER,
  current_market_value DECIMAL(12, 2),
  value_updated_at TIMESTAMP,

  -- Insurance
  insurance_policy_number VARCHAR(50),
  insurance_provider VARCHAR(100),
  insurance_expiry DATE,
  insurance_status VARCHAR(20) DEFAULT 'active',

  -- Finance
  finance_institution VARCHAR(100),
  finance_remaining DECIMAL(12, 2),
  finance_monthly DECIMAL(10, 2),
  finance_expiry DATE,
  finance_status VARCHAR(20) DEFAULT 'paid_off',

  -- Status
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'sold', 'archived'

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_owner_vehicles_owner ON owner_vehicles(owner_id);
  INDEX idx_owner_vehicles_type ON owner_vehicles(ownership_type);
  INDEX idx_owner_vehicles_status ON owner_vehicles(status);
);

-- ============================================================
// SERVICE RECORDS
-- ============================================================
CREATE TABLE IF NOT EXISTS ownership_service_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Vehicle
  owner_vehicle_id UUID NOT NULL,

  -- Service
  service_date DATE NOT NULL,
  service_type VARCHAR(50) NOT NULL, -- 'oil_change', 'brake_service', 'tyres', 'battery', 'suspension', 'engine_repair', 'transmission_repair', 'general_service', 'other'
  service_title VARCHAR(200) NOT NULL,
  service_description TEXT,

  -- Workshop
  workshop_name VARCHAR(200),
  workshop_verified BOOLEAN DEFAULT false,
  workshop_address TEXT,
  workshop_phone VARCHAR(30),

  -- Mileage & Cost
  mileage_at_service INTEGER,
  service_cost DECIMAL(10, 2),
  currency VARCHAR(3) DEFAULT 'KES',

  -- Invoice
  invoice_number VARCHAR(50),
  invoice_url VARCHAR(500),

  -- Documents
  documents JSONB DEFAULT '[]', -- [{name, url, type}]
  photos JSONB DEFAULT '[]',

  -- Verification
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_service_vehicle ON ownership_service_records(owner_vehicle_id);
  INDEX idx_service_date ON ownership_service_records(service_date DESC);
);

-- ============================================================
// OWNERSHIP REMINDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS ownership_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Vehicle
  owner_vehicle_id UUID NOT NULL,

  -- Reminder
  reminder_type VARCHAR(50) NOT NULL, -- 'routine_service', 'insurance_renewal', 'inspection_renewal', 'road_tax', 'finance_installment', 'warranty_expiry', 'licence_renewal', 'tyre_replacement', 'battery_check', 'custom'

  title VARCHAR(200) NOT NULL,
  description TEXT,

  -- Schedule
  due_date DATE NOT NULL,
  due_mileage INTEGER,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_interval VARCHAR(20), -- 'monthly', 'quarterly', '6months', 'yearly'

  -- Status
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed', 'snoozed', 'cancelled'

  -- Completion
  completed_at TIMESTAMP,
  completed_service_record_id UUID,

  -- Notifications
  notify_days_before INTEGER DEFAULT 7,
  notified BOOLEAN DEFAULT false,
  last_notification_at TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_reminder_vehicle ON ownership_reminders(owner_vehicle_id);
  INDEX idx_reminder_due ON ownership_reminders(due_date);
  INDEX idx_reminder_status ON ownership_reminders(status);
);

-- ============================================================
// TRAVEL LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS travel_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Vehicle
  owner_vehicle_id UUID NOT NULL,

  -- Trip
  trip_date DATE NOT NULL,
  odometer_start INTEGER,
  odometer_end INTEGER,
  distance_km DECIMAL(10, 2),

  -- Fuel
  fuel_litres DECIMAL(8, 2),
  fuel_cost DECIMAL(10, 2),
  fuel_efficiency DECIMAL(8, 2), -- km/L

  -- Route
  origin VARCHAR(200),
  destination VARCHAR(200),
  route_notes TEXT,

  -- Purpose
  purpose VARCHAR(50), -- 'commute', 'business', 'personal', 'travel', 'other'

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_travel_vehicle ON travel_logs(owner_vehicle_id);
  INDEX idx_travel_date ON travel_logs(trip_date DESC);
);

-- ============================================================
// EXPENSE TRACKER
-- ============================================================
CREATE TABLE IF NOT EXISTS ownership_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Vehicle
  owner_vehicle_id UUID NOT NULL,

  -- Expense
  expense_date DATE NOT NULL,
  expense_type VARCHAR(50) NOT NULL, -- 'fuel', 'repairs', 'insurance', 'parking', 'tolls', 'finance_payment', 'maintenance', 'road_tax', 'other'

  description VARCHAR(200),
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'KES',

  -- Category
  category VARCHAR(50), -- 'fuel', 'maintenance', 'finance', 'insurance', 'taxes', 'other'

  -- Receipt
  receipt_url VARCHAR(500),

  -- Recurring
  is_recurring BOOLEAN DEFAULT false,
  recurring_interval VARCHAR(20),

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_expense_vehicle ON ownership_expenses(owner_vehicle_id);
  INDEX idx_expense_date ON ownership_expenses(expense_date DESC);
  INDEX idx_expense_type ON ownership_expenses(expense_type);
);

-- ============================================================
// OWNERSHIP DOCUMENTS (Document Vault)
// ============================================================
CREATE TABLE IF NOT EXISTS ownership_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Vehicle
  owner_vehicle_id UUID NOT NULL,

  -- Document
  document_type VARCHAR(50) NOT NULL, -- 'logbook', 'inspection_report', 'finance_document', 'insurance', 'service_receipt', 'purchase_agreement', 'warranty', 'certificate', 'other'

  title VARCHAR(200) NOT NULL,
  description TEXT,

  -- File
  file_name VARCHAR(200),
  file_type VARCHAR(50),
  file_url VARCHAR(500),
  file_size INTEGER,

  -- Verification
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMP,

  -- Status
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'expired', 'archived'

  -- Expiry
  issue_date DATE,
  expiry_date DATE,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_documents_vehicle ON ownership_documents(owner_vehicle_id);
  INDEX idx_documents_type ON ownership_documents(document_type);
  INDEX idx_documents_expiry ON ownership_documents(expiry_date);
);

-- ============================================================
// OWNERSHIP ALERTS
-- ============================================================
CREATE TABLE IF NOT EXISTS ownership_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Vehicle
  owner_vehicle_id UUID NOT NULL,

  -- Alert
  alert_type VARCHAR(50) NOT NULL, -- 'recall', 'market_value_change', 'insurance_expiry', 'maintenance_due', 'document_expiry', 'demand_update'

  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,

  -- Severity
  severity VARCHAR(10) DEFAULT 'info', -- 'info', 'warning', 'urgent'

  -- Action
  action_url VARCHAR(500),
  action_label VARCHAR(100),

  -- Status
  status VARCHAR(20) DEFAULT 'unread', -- 'unread', 'read', 'actioned', 'dismissed'

  -- Read
  read_at TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_alerts_vehicle ON ownership_alerts(owner_vehicle_id);
  INDEX idx_alerts_status ON ownership_alerts(status);
);

-- ============================================================
// VALUE TRACKING
-- ============================================================
CREATE TABLE IF NOT EXISTS value_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Vehicle
  owner_vehicle_id UUID NOT NULL,

  -- Valuation
  market_value DECIMAL(12, 2) NOT NULL,
  wholesale_value DECIMAL(12, 2),
  retail_value DECIMAL(12, 2),

  -- Metrics
  depreciation_from_purchase DECIMAL(12, 2),
  depreciation_pct DECIMAL(5, 2),
  comparable_count INTEGER DEFAULT 0,
  demand_score DECIMAL(5, 2) DEFAULT 50,

  -- Comparison
  similar_listings_count INTEGER DEFAULT 0,
  avg_price_similar DECIMAL(12, 2),

  -- Recommendations
  best_time_to_sell VARCHAR(50), -- 'now', '3months', '6months', '12months'
  sell_now_estimate DECIMAL(12, 2),

  -- Calculated
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_value_vehicle ON value_tracking(owner_vehicle_id);
  INDEX idx_value_date ON value_tracking(calculated_at DESC);
);
