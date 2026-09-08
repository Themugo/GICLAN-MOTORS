-- ============================================================
// KAYAD AUTOMOTIVE DATA EXCHANGE - DATABASE SCHEMA
// Trusted marketplace for verified automotive intelligence
-- ============================================================

-- ============================================================
// DATA PRODUCTS
-- ============================================================
CREATE TABLE IF NOT EXISTS data_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Product
  product_code VARCHAR(50) UNIQUE NOT NULL,
  product_name VARCHAR(200) NOT NULL,
  description TEXT,

  -- Category
  category VARCHAR(50) NOT NULL, -- 'market', 'dealer', 'fleet', 'finance', 'insurance', 'government', 'research'

  -- Type
  product_type VARCHAR(30) NOT NULL, -- 'report', 'api', 'dashboard', 'export'

  -- Access Level
  access_level VARCHAR(20) NOT NULL, -- 'public', 'partner', 'commercial', 'internal', 'confidential'

  -- Pricing
  pricing_type VARCHAR(20) DEFAULT 'free', -- 'free', 'subscription', 'per_query', 'custom'
  price_monthly DECIMAL(12, 2),
  price_annual DECIMAL(12, 2),

  -- Data Points
  data_categories JSONB DEFAULT '[]',
  update_frequency VARCHAR(20) DEFAULT 'daily', -- 'realtime', 'hourly', 'daily', 'weekly', 'monthly'

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_product_category ON data_products(category);
CREATE INDEX idx_product_access ON data_products(access_level);

-- ============================================================
// MARKET INDICES
-- ============================================================
CREATE TABLE IF NOT EXISTS market_indices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Index
  index_code VARCHAR(50) UNIQUE NOT NULL,
  index_name VARCHAR(200) NOT NULL,
  description TEXT,

  -- Scope
  scope VARCHAR(20) DEFAULT 'national', -- 'national', 'regional', 'country'
  country_code VARCHAR(5),

  -- Category
  category VARCHAR(50) NOT NULL, -- 'vehicle', 'auction', 'inspection', 'finance'
  vehicle_type VARCHAR(50),

  -- Values
  current_value DECIMAL(12, 4),
  previous_value DECIMAL(12, 4),
  change_percentage DECIMAL(8, 4),
  change_direction VARCHAR(10), -- 'up', 'down', 'stable'

  -- Period
  period_type VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly', 'quarterly', 'annual'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Components
  components JSONB DEFAULT '[]',

  -- Confidence
  confidence_score DECIMAL(5, 2),
  sample_size INTEGER,

  -- Timestamps
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(index_code, period_type, period_start)
);

CREATE INDEX idx_index_category ON market_indices(category);
CREATE INDEX idx_index_period ON market_indices(period_start DESC);

-- ============================================================
// PRICE TRENDS
-- ============================================================
CREATE TABLE IF NOT EXISTS price_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Vehicle
  vehicle_code VARCHAR(50) NOT NULL,
  make VARCHAR(50),
  model VARCHAR(50),
  year INTEGER,
  body_type VARCHAR(50),

  -- Scope
  country_code VARCHAR(5) DEFAULT 'KE',
  region VARCHAR(50),

  -- Prices
  avg_price DECIMAL(12, 2),
  min_price DECIMAL(12, 2),
  max_price DECIMAL(12, 2),
  median_price DECIMAL(12, 2),

  -- Volume
  total_listings INTEGER,
  active_listings INTEGER,
  sold_last_30_days INTEGER,

  -- Trends
  price_change_7d DECIMAL(8, 4),
  price_change_30d DECIMAL(8, 4),
  price_change_90d DECIMAL(8, 4),
  price_change_1y DECIMAL(8, 4),

  -- Demand
  demand_score DECIMAL(5, 2), -- 0-100
  supply_score DECIMAL(5, 2), -- 0-100

  -- Period
  period_date DATE NOT NULL,

  -- Timestamps
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(vehicle_code, country_code, region, period_date)
);

CREATE INDEX idx_trend_vehicle ON price_trends(vehicle_code);
CREATE INDEX idx_trend_date ON price_trends(period_date DESC);

-- ============================================================
// VEHICLE STATISTICS
-- ============================================================
CREATE TABLE IF NOT EXISTS vehicle_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Vehicle
  vehicle_code VARCHAR(50) NOT NULL,
  make VARCHAR(50) NOT NULL,
  model VARCHAR(50) NOT NULL,
  year INTEGER,
  body_type VARCHAR(50),

  -- Scope
  country_code VARCHAR(5) DEFAULT 'KE',

  -- Sales Stats
  total_sold INTEGER DEFAULT 0,
  avg_days_to_sell DECIMAL(8, 2),
  avg_mileage_at_sale INTEGER,

  -- Price Stats
  avg_sale_price DECIMAL(12, 2),
  median_sale_price DECIMAL(12, 2),

  -- Demand
  search_volume INTEGER DEFAULT 0,
  inquiry_volume INTEGER DEFAULT 0,
  view_volume INTEGER DEFAULT 0,

  -- Condition Distribution
  excellent_condition_pct DECIMAL(5, 2),
  good_condition_pct DECIMAL(5, 2),
  fair_condition_pct DECIMAL(5, 2),

  -- Period
  period_type VARCHAR(20) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Timestamps
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(vehicle_code, country_code, period_type, period_start)
);

-- ============================================================
// DEALER BENCHMARKS
-- ============================================================
CREATE TABLE IF NOT EXISTS dealer_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Dealer (anonymized)
  dealer_code VARCHAR(50) NOT NULL,
  dealer_tier VARCHAR(20),

  -- Scope
  country_code VARCHAR(5) DEFAULT 'KE',
  region VARCHAR(50),

  -- Inventory
  avg_inventory_size INTEGER,
  inventory_turnover_rate DECIMAL(5, 2),

  -- Performance
  avg_days_to_sell DECIMAL(8, 2),
  listing_to_sale_ratio DECIMAL(5, 4),
  avg_price_premium DECIMAL(5, 2), -- % above market avg

  -- Demand
  avg_leads_per_listing DECIMAL(5, 2),
  lead_conversion_rate DECIMAL(5, 2),

  -- Quality
  avg_inspection_score DECIMAL(5, 2),
  listing_quality_score DECIMAL(5, 2),

  -- Activity
  new_listings_this_month INTEGER,
  sales_this_month INTEGER,

  -- Period
  period_type VARCHAR(20) NOT NULL,
  period_date DATE NOT NULL,

  -- Timestamps
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(dealer_code, period_type, period_date)
);

-- ============================================================
// INSPECTION STATISTICS
-- ============================================================
CREATE TABLE IF NOT EXISTS inspection_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Scope
  country_code VARCHAR(5) DEFAULT 'KE',
  region VARCHAR(50),

  -- Volumes
  total_inspections INTEGER DEFAULT 0,
  inspections_passed INTEGER DEFAULT 0,
  inspections_failed INTEGER DEFAULT 0,
  pass_rate DECIMAL(5, 2),

  -- Common Issues
  common_mechanical_issues JSONB DEFAULT '[]',
  common_electrical_issues JSONB DEFAULT '[]',
  common_body_issues JSONB DEFAULT '[]',

  -- Component Reliability
  engine_reliability_score DECIMAL(5, 2),
  transmission_reliability_score DECIMAL(5, 2),
  brake_reliability_score DECIMAL(5, 2),
  suspension_reliability_score DECIMAL(5, 2),
  electrical_reliability_score DECIMAL(5, 2),

  -- Avg Scores
  avg_overall_score DECIMAL(5, 2),
  avg_engine_score DECIMAL(5, 2),
  avg_body_score DECIMAL(5, 2),
  avg_interior_score DECIMAL(5, 2),

  -- Mileage
  avg_mileage INTEGER,
  avg_age_years DECIMAL(4, 1),

  -- Repair Estimates
  avg_repair_cost DECIMAL(12, 2),
  avg_deferred_maintenance DECIMAL(12, 2),

  -- Period
  period_type VARCHAR(20) NOT NULL,
  period_date DATE NOT NULL,

  -- Timestamps
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(country_code, region, period_type, period_date)
);

-- ============================================================
// AUCTION STATISTICS
-- ============================================================
CREATE TABLE IF NOT EXISTS auction_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Scope
  country_code VARCHAR(5) DEFAULT 'KE',
  region VARCHAR(50),
  auction_type VARCHAR(30),

  -- Volumes
  total_auctions INTEGER DEFAULT 0,
  total_lots INTEGER DEFAULT 0,
  lots_sold INTEGER DEFAULT 0,
  sell_through_rate DECIMAL(5, 2),

  -- Bidding
  avg_bids_per_lot DECIMAL(5, 2),
  avg_unique_bidders DECIMAL(5, 2),
  bid_increase_pct DECIMAL(5, 2),

  -- Prices
  avg_starting_price DECIMAL(12, 2),
  avg_reserve_price DECIMAL(12, 2),
  avg_winning_price DECIMAL(12, 2),
  avg_premium_over_reserve DECIMAL(5, 2),

  -- Performance
  reserve_met_rate DECIMAL(5, 2),
  avg_time_to_close_mins DECIMAL(8, 2),

  -- Categories
  category_performance JSONB DEFAULT '{}',

  -- Period
  period_type VARCHAR(20) NOT NULL,
  period_date DATE NOT NULL,

  -- Timestamps
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(country_code, auction_type, period_type, period_date)
);

-- ============================================================
// FINANCE STATISTICS
-- ============================================================
CREATE TABLE IF NOT EXISTS finance_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Scope
  country_code VARCHAR(5) DEFAULT 'KE',

  -- Volumes
  total_applications INTEGER DEFAULT 0,
  applications_approved INTEGER DEFAULT 0,
  approval_rate DECIMAL(5, 2),

  -- Loan Sizes
  avg_loan_size DECIMAL(12, 2),
  median_loan_size DECIMAL(12, 2),
  min_loan_size DECIMAL(12, 2),
  max_loan_size DECIMAL(12, 2),

  -- Terms
  avg_loan_term_months DECIMAL(5, 1),
  avg_interest_rate DECIMAL(5, 2),

  -- Down Payments
  avg_down_payment DECIMAL(12, 2),
  avg_down_payment_pct DECIMAL(5, 2),

  -- Vehicle Categories
  vehicle_category_distribution JSONB DEFAULT '{}',

  -- Repayment
  avg_monthly_payment DECIMAL(12, 2),
  default_rate DECIMAL(5, 2),

  -- Period
  period_type VARCHAR(20) NOT NULL,
  period_date DATE NOT NULL,

  -- Timestamps
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(country_code, period_type, period_date)
);

-- ============================================================
// REGIONAL ANALYTICS
-- ============================================================
CREATE TABLE IF NOT EXISTS regional_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Scope
  country_code VARCHAR(5) NOT NULL,
  region VARCHAR(50) NOT NULL,

  -- Volumes
  total_listings INTEGER DEFAULT 0,
  active_listings INTEGER DEFAULT 0,
  vehicles_sold INTEGER DEFAULT 0,

  -- Prices
  avg_listing_price DECIMAL(12, 2),
  avg_sale_price DECIMAL(12, 2),
  price_trend VARCHAR(10),

  -- Demand
  demand_score DECIMAL(5, 2),
  avg_days_to_sell DECIMAL(8, 2),

  -- Dealers
  active_dealers INTEGER DEFAULT 0,
  new_dealers INTEGER DEFAULT 0,

  -- Auctions
  auction_volume INTEGER DEFAULT 0,
  auction_sell_through DECIMAL(5, 2),

  -- Growth
  listings_growth_pct DECIMAL(8, 4),
  sales_growth_pct DECIMAL(8, 4),
  revenue_growth_pct DECIMAL(8, 4),

  -- Period
  period_type VARCHAR(20) NOT NULL,
  period_date DATE NOT NULL,

  -- Timestamps
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(country_code, region, period_type, period_date)
);

CREATE INDEX idx_regional_country ON regional_analytics(country_code);
CREATE INDEX idx_regional_period ON regional_analytics(period_date DESC);

-- ============================================================
// DATA SUBSCRIPTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS data_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Subscriber
  subscriber_id UUID NOT NULL,
  subscriber_name VARCHAR(200) NOT NULL,
  subscriber_type VARCHAR(30) NOT NULL, -- 'dealer', 'bank', 'insurance', 'government', 'research', 'partner'

  -- Subscription
  subscription_code VARCHAR(50) UNIQUE NOT NULL,

  -- Products
  products JSONB DEFAULT '[]',

  -- Access
  access_level VARCHAR(20) NOT NULL,

  -- Pricing
  pricing_type VARCHAR(20) NOT NULL,
  price_amount DECIMAL(12, 2),
  billing_cycle VARCHAR(20) DEFAULT 'monthly',

  -- Status
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'expired', 'cancelled', 'suspended'

  -- Dates
  start_date DATE NOT NULL,
  end_date DATE,
  next_billing_date DATE,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_subscription_subscriber ON data_subscriptions(subscriber_id);
CREATE INDEX idx_subscription_status ON data_subscriptions(status);

-- ============================================================
// DATA ACCESS LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS data_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Access
  access_code VARCHAR(50) UNIQUE NOT NULL,

  -- User
  user_id UUID,
  user_type VARCHAR(30),

  -- Data Product
  product_id UUID,
  product_code VARCHAR(50),

  -- Request
  request_type VARCHAR(30) NOT NULL, -- 'view', 'export', 'api', 'download'
  request_params JSONB DEFAULT '{}',

  -- Response
  records_returned INTEGER,
  response_time_ms INTEGER,

  -- Scope
  scope VARCHAR(20) DEFAULT 'national',
  country_code VARCHAR(5),

  -- Timestamps
  accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_access_user ON data_access_logs(user_id);
CREATE INDEX idx_access_product ON data_access_logs(product_id);
CREATE INDEX idx_access_time ON data_access_logs(accessed_at DESC);

-- ============================================================
// MARKET REPORTS
-- ============================================================
CREATE TABLE IF NOT EXISTS market_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Report
  report_code VARCHAR(50) UNIQUE NOT NULL,
  report_name VARCHAR(300) NOT NULL,
  description TEXT,

  -- Type
  report_type VARCHAR(50) NOT NULL, -- 'weekly', 'monthly', 'quarterly', 'annual', 'special'

  -- Scope
  country_code VARCHAR(5),
  regions JSONB DEFAULT '[]',

  -- Content
  summary TEXT,
  key_findings JSONB DEFAULT '[]',
  data_sources JSONB DEFAULT '[]',

  -- Attachments
  attachments JSONB DEFAULT '[]',

  -- Access
  access_level VARCHAR(20) NOT NULL,

  -- Status
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'review', 'published', 'archived'

  -- Publishing
  published_at TIMESTAMP,
  published_by UUID,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_report_type ON market_reports(report_type);
CREATE INDEX idx_report_status ON market_reports(status);
