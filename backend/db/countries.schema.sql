-- ============================================================
// KAYAD MULTI-COUNTRY FRAMEWORK - DATABASE SCHEMA
// East African automotive infrastructure
-- ============================================================

-- ============================================================
// COUNTRIES
-- ============================================================
CREATE TABLE IF NOT EXISTS countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Country
  country_code VARCHAR(5) UNIQUE NOT NULL, -- 'KE', 'UG', 'TZ', 'RW', 'BI', 'SS'
  country_name VARCHAR(100) NOT NULL,
  iso_code VARCHAR(3) NOT NULL, -- 'KEN', 'UGA', 'TZA', 'RWA', 'BDI', 'SSD'

  -- Flags
  flag_emoji VARCHAR(10),
  flag_url VARCHAR(500),

  -- Status
  status VARCHAR(20) DEFAULT 'inactive', -- 'inactive', 'active', 'maintenance', 'suspended'
  is_primary BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
// COUNTRY CONFIGURATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS country_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Country
  country_id UUID REFERENCES countries(id) ON DELETE CASCADE,
  country_code VARCHAR(5) NOT NULL,

  -- Currency
  currency_code VARCHAR(3) NOT NULL, -- 'KES', 'UGX', 'TZS', 'RWF', 'BIF', 'SSP'
  currency_symbol VARCHAR(5) NOT NULL,
  currency_name VARCHAR(50) NOT NULL,
  currency_decimal_places INTEGER DEFAULT 2,

  -- Locale
  default_language VARCHAR(10) DEFAULT 'en',
  supported_languages JSONB DEFAULT '["en"]',
  date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
  time_format VARCHAR(20) DEFAULT '24h',
  timezone VARCHAR(50) NOT NULL, -- 'Africa/Nairobi', 'Africa/Kampala', etc.

  -- Phone
  phone_country_code VARCHAR(5) NOT NULL, -- '+254', '+256', '+255', etc.
  phone_format VARCHAR(50) DEFAULT 'XXX XXX XXXX',

  -- Address
  address_format JSONB DEFAULT '{
    "line1": "Address Line 1",
    "line2": "Address Line 2",
    "city": "City",
    "county": "County/Region",
    "postal_code": "Postal Code",
    "country": "Country"
  }',

  -- Number Formats
  number_decimal_separator VARCHAR(5) DEFAULT ',',
  number_thousand_separator VARCHAR(5) DEFAULT ' ',

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(country_id)
);

-- ============================================================
// PAYMENT PROVIDERS BY COUNTRY
-- ============================================================
CREATE TABLE IF NOT EXISTS country_payment_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Country
  country_code VARCHAR(5) NOT NULL,

  -- Provider
  provider_code VARCHAR(50) NOT NULL,
  provider_name VARCHAR(200) NOT NULL,
  provider_type VARCHAR(30) NOT NULL, -- 'mobile_money', 'bank', 'card', 'corporate', 'gateway'

  -- Configuration
  is_enabled BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  is_primary BOOLEAN DEFAULT false,

  -- Provider Details
  provider_config JSONB DEFAULT '{}', -- API keys, endpoints, etc.

  -- Fees
  transaction_fee_percentage DECIMAL(5, 2) DEFAULT 0,
  transaction_fee_fixed DECIMAL(12, 2) DEFAULT 0,

  -- Limits
  min_transaction_amount DECIMAL(12, 2) DEFAULT 0,
  max_transaction_amount DECIMAL(12, 2),

  -- Status
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'inactive', 'maintenance'

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(country_code, provider_code)
);

CREATE INDEX idx_payment_country ON country_payment_providers(country_code);
CREATE INDEX idx_payment_type ON country_payment_providers(provider_type);

-- ============================================================
// TRANSPORT AUTHORITIES BY COUNTRY
-- ============================================================
CREATE TABLE IF NOT EXISTS country_transport_authorities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Country
  country_code VARCHAR(5) NOT NULL,

  -- Authority
  authority_code VARCHAR(50) NOT NULL,
  authority_name VARCHAR(200) NOT NULL,
  authority_type VARCHAR(30) NOT NULL, -- 'registration', 'inspection', 'licensing', 'police'

  -- API Configuration
  api_endpoint VARCHAR(500),
  api_key_encrypted VARCHAR(500),

  -- Verification
  supports_online_verification BOOLEAN DEFAULT false,
  verification_fields JSONB DEFAULT '[]',

  -- Status
  status VARCHAR(20) DEFAULT 'active',

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(country_code, authority_code)
);

-- ============================================================
// TAX CONFIGURATION BY COUNTRY
-- ============================================================
CREATE TABLE IF NOT EXISTS country_tax_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Country
  country_code VARCHAR(5) NOT NULL,

  -- Tax
  tax_code VARCHAR(50) NOT NULL,
  tax_name VARCHAR(200) NOT NULL,
  tax_type VARCHAR(30) NOT NULL, -- 'vat', 'excise', 'stamp_duty', 'import_duty', 'service_tax', 'withholding'

  -- Rates
  rate_percentage DECIMAL(5, 2) DEFAULT 0,
  rate_fixed DECIMAL(12, 2) DEFAULT 0,

  -- Applicability
  applies_to_vehicles BOOLEAN DEFAULT true,
  applies_to_services BOOLEAN DEFAULT true,
  applies_to_finance BOOLEAN DEFAULT false,
  applies_to_auctions BOOLEAN DEFAULT true,

  -- Threshold
  min_amount DECIMAL(12, 2) DEFAULT 0,
  max_amount DECIMAL(12, 2),

  -- Collection
  collected_by VARCHAR(50), -- 'platform', 'government'
  remittance_frequency VARCHAR(20) DEFAULT 'monthly', -- 'weekly', 'monthly', 'quarterly'

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(country_code, tax_code)
);

CREATE INDEX idx_tax_country ON country_tax_configurations(country_code);
CREATE INDEX idx_tax_type ON country_tax_configurations(tax_type);

-- ============================================================
// VEHICLE REGISTRATION RULES BY COUNTRY
-- ============================================================
CREATE TABLE IF NOT EXISTS country_vehicle_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Country
  country_code VARCHAR(5) NOT NULL,

  -- Rule
  rule_code VARCHAR(50) NOT NULL,
  rule_name VARCHAR(200) NOT NULL,
  rule_category VARCHAR(30) NOT NULL, -- 'registration', 'inspection', 'import', 'export', 'ownership'

  -- Requirements
  requirements JSONB DEFAULT '[]',
  documents_required JSONB DEFAULT '[]',
  min_age_years INTEGER,
  max_ownership_years INTEGER,

  -- Validity
  validity_months INTEGER,

  -- Fees
  fee_amount DECIMAL(12, 2) DEFAULT 0,
  fee_currency VARCHAR(3) DEFAULT 'KES',

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(country_code, rule_code)
);

-- ============================================================
// LOCAL BUSINESS ENTITIES
-- ============================================================
CREATE TABLE IF NOT EXISTS country_business_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Country
  country_code VARCHAR(5) NOT NULL,

  -- Entity
  entity_code VARCHAR(50) NOT NULL,
  entity_name VARCHAR(200) NOT NULL,
  entity_type VARCHAR(30) NOT NULL, -- 'dealer', 'inspection', 'auction', 'bank', 'insurance', 'government', 'support'

  -- Registration
  registration_number VARCHAR(50),
  license_number VARCHAR(50),
  license_expiry DATE,

  -- Coverage
  operates_in_countries JSONB DEFAULT '[]', -- Country codes

  -- Contact
  primary_contact_name VARCHAR(100),
  primary_contact_email VARCHAR(200),
  primary_contact_phone VARCHAR(30),

  -- Status
  status VARCHAR(20) DEFAULT 'active',

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_entity_country ON country_business_entities(country_code);
  INDEX idx_entity_type ON country_business_entities(entity_type);
);

-- ============================================================
// REGIONAL SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS regional_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Setting
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_name VARCHAR(200) NOT NULL,
  setting_value TEXT,

  -- Scope
  applies_to VARCHAR(20) DEFAULT 'all', -- 'all', 'specific'
  country_codes JSONB DEFAULT '[]',

  -- Category
  category VARCHAR(30) NOT NULL, -- 'general', 'compliance', 'payments', 'taxes', 'notifications'

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
// CROSS-BORDER CONFIGURATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS cross_border_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Configuration
  config_code VARCHAR(50) UNIQUE NOT NULL,

  -- Countries
  from_country_code VARCHAR(5) NOT NULL,
  to_country_code VARCHAR(5) NOT NULL,

  -- Rules
  allows_import BOOLEAN DEFAULT true,
  allows_export BOOLEAN DEFAULT true,

  -- Requirements
  import_requirements JSONB DEFAULT '[]',
  export_requirements JSONB DEFAULT '[]',

  -- Taxes
  import_duty_percentage DECIMAL(5, 2) DEFAULT 0,
  export_duty_percentage DECIMAL(5, 2) DEFAULT 0,
  processing_fee DECIMAL(12, 2) DEFAULT 0,

  -- Logistics
  available_transport_methods JSONB DEFAULT '[]', -- 'road', 'sea', 'air'
  estimated_transit_days INTEGER,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(from_country_code, to_country_code)
);

-- ============================================================
// REGIONAL ANALYTICS
-- ============================================================
CREATE TABLE IF NOT EXISTS regional_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Country
  country_code VARCHAR(5) NOT NULL,

  -- Period
  period_type VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly', 'quarterly'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- User Metrics
  total_users INTEGER DEFAULT 0,
  new_registrations INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,

  -- Marketplace Metrics
  total_listings INTEGER DEFAULT 0,
  new_listings INTEGER DEFAULT 0,
  vehicles_sold INTEGER DEFAULT 0,
  total_revenue DECIMAL(14, 2) DEFAULT 0,
  avg_vehicle_price DECIMAL(12, 2) DEFAULT 0,

  -- Business Metrics
  active_dealers INTEGER DEFAULT 0,
  active_inspection_companies INTEGER DEFAULT 0,
  active_auction_companies INTEGER DEFAULT 0,

  -- Transaction Metrics
  total_transactions INTEGER DEFAULT 0,
  transaction_volume DECIMAL(14, 2) DEFAULT 0,

  -- Calculated
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(country_code, period_type, period_start)
);

CREATE INDEX idx_regional_country ON regional_analytics(country_code);
CREATE INDEX idx_regional_period ON regional_analytics(period_start DESC);

-- ============================================================
// COUNTRY COMPLIANCE DOCUMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS country_compliance_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Country
  country_code VARCHAR(5) NOT NULL,

  -- Document
  document_code VARCHAR(50) NOT NULL,
  document_name VARCHAR(200) NOT NULL,
  document_type VARCHAR(30) NOT NULL, -- 'terms', 'privacy', 'policy', 'legal', 'notice'

  -- Content
  content_en TEXT,
  content_sw TEXT,
  content_fr TEXT,

  -- Version
  version VARCHAR(20) NOT NULL,
  is_current BOOLEAN DEFAULT true,

  -- Legal
  effective_date DATE,
  last_reviewed_date DATE,

  -- Status
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'pending_review', 'active', 'archived'

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_compliance_country ON country_compliance_documents(country_code);
  INDEX idx_compliance_type ON country_compliance_documents(document_type);
);

-- ============================================================
// LOCALIZATION STRINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS localization_strings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Key
  string_key VARCHAR(200) NOT NULL,

  -- Country/Region
  locale VARCHAR(10) NOT NULL, -- 'en-KE', 'sw-KE', 'en-UG', etc.

  -- Translation
  translation TEXT NOT NULL,

  -- Context
  context VARCHAR(100),

  -- Status
  is_verified BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(locale, string_key)
);

CREATE INDEX idx_localization_locale ON localization_strings(locale);
