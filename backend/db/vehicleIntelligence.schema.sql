-- ============================================================
// KAYAD VEHICLE INTELLIGENCE NETWORK - DATABASE SCHEMA
// Intelligence layer for automotive ecosystem analytics
-- ============================================================

-- ============================================================
// PRICE HISTORY (Market data collection)
// ============================================================
CREATE TABLE IF NOT EXISTS vehicle_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Vehicle Identification
  vin VARCHAR(17),
  make VARCHAR(50) NOT NULL,
  model VARCHAR(50) NOT NULL,
  year INTEGER,

  -- Price Data
  price DECIMAL(12, 2) NOT NULL,
  price_type VARCHAR(30) NOT NULL, -- 'listing', 'sale', 'auction', 'wholesale', 'retail'
  currency VARCHAR(3) DEFAULT 'KES',

  -- Source
  source_type VARCHAR(30) NOT NULL, -- 'marketplace', 'dealer', 'auction', 'valuation', 'internal'
  source_id UUID,
  source_name VARCHAR(200),

  -- Location
  region VARCHAR(100),
  county VARCHAR(100),
  city VARCHAR(100),

  -- Vehicle Details
  mileage INTEGER,
  condition VARCHAR(20), -- 'excellent', 'good', 'fair', 'poor'
  colour VARCHAR(30),
  fuel_type VARCHAR(20),
  transmission VARCHAR(20),

  -- Timestamps
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Indexes
  INDEX idx_price_make_model (make, model),
  INDEX idx_price_year (year),
  INDEX idx_price_recorded (recorded_at),
  INDEX idx_price_vin (vin)
);

-- ============================================================
// VEHICLE VALUATIONS (Intelligence-generated values)
// ============================================================
CREATE TABLE IF NOT EXISTS vehicle_valuations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Reference
  vin VARCHAR(17),
  registration_number VARCHAR(20),
  make VARCHAR(50) NOT NULL,
  model VARCHAR(50) NOT NULL,
  year INTEGER NOT NULL,

  -- Valuation Types
  current_value DECIMAL(12, 2),
  wholesale_value DECIMAL(12, 2),
  dealer_value DECIMAL(12, 2),
  private_sale_value DECIMAL(12, 2),
  auction_estimate DECIMAL(12, 2),

  -- Confidence
  confidence_level VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high'
  confidence_factors JSONB DEFAULT '{}',

  -- Calculation Data
  comparable_count INTEGER DEFAULT 0,
  data_age_days INTEGER DEFAULT 0,
  regional_adjustment DECIMAL(5, 2) DEFAULT 0,
  mileage_adjustment DECIMAL(5, 2) DEFAULT 0,
  condition_adjustment DECIMAL(5, 2) DEFAULT 0,

  -- Depreciation
  depreciation_rate DECIMAL(5, 2) DEFAULT 0,
  monthly_depreciation DECIMAL(12, 2) DEFAULT 0,
  future_value_12m DECIMAL(12, 2),
  future_value_24m DECIMAL(12, 2),

  -- Metadata
  calculation_method VARCHAR(50), -- 'market_comparison', 'ml_model', 'dealer_network', 'auction_data'
  model_version VARCHAR(20), -- Version of valuation model

  -- Timestamps
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,

  -- Indexes
  INDEX idx_valuation_vin (vin),
  INDEX idx_valuation_expires (expires_at)
);

-- ============================================================
// MARKET ANALYTICS (Aggregated insights)
// ============================================================
CREATE TABLE IF NOT EXISTS market_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Period
  period_type VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly', 'quarterly', 'annual'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Scope
  scope VARCHAR(50) DEFAULT 'national', -- 'national', 'regional', 'county', 'city', 'make', 'model'
  scope_value VARCHAR(100), -- e.g., 'Nairobi', 'Toyota', 'Corolla'

  -- Vehicle Filters
  make VARCHAR(50),
  model VARCHAR(50),
  year_from INTEGER,
  year_to INTEGER,
  fuel_type VARCHAR(20),
  body_type VARCHAR(30),

  -- Metrics
  total_listings INTEGER DEFAULT 0,
  total_sales INTEGER DEFAULT 0,
  avg_listing_price DECIMAL(12, 2),
  avg_sale_price DECIMAL(12, 2),
  median_price DECIMAL(12, 2),
  price_change_pct DECIMAL(8, 2) DEFAULT 0,

  -- Demand
  total_views INTEGER DEFAULT 0,
  total_saves INTEGER DEFAULT 0,
  total_inquiries INTEGER DEFAULT 0,
  avg_days_on_market INTEGER DEFAULT 0,

  -- Supply
  new_listings INTEGER DEFAULT 0,
  removed_listings INTEGER DEFAULT 0,

  -- Competition
  avg_competition_score DECIMAL(5, 2) DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(period_type, period_start, scope, scope_value, make, model)
);

CREATE INDEX idx_market_period ON market_analytics(period_start, period_end);
CREATE INDEX idx_market_scope ON market_analytics(scope, scope_value);

-- ============================================================
// SEARCH TRENDS (Buyer behavior analytics)
// ============================================================
CREATE TABLE IF NOT EXISTS search_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Search Parameters
  search_query VARCHAR(255),
  make VARCHAR(50),
  model VARCHAR(50),
  year_from INTEGER,
  year_to INTEGER,
  budget_min DECIMAL(12, 2),
  budget_max DECIMAL(12, 2),

  -- Location
  region VARCHAR(100),

  -- Results
  results_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  save_count INTEGER DEFAULT 0,
  inquiry_count INTEGER DEFAULT 0,

  -- Period
  period_type VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly'
  period_date DATE NOT NULL,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_trends_query (search_query),
  INDEX idx_trends_period (period_date)
);

-- ============================================================
// FRAUD ALERTS (Suspicious activity detection)
// ============================================================
CREATE TABLE IF NOT EXISTS fraud_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Alert Classification
  alert_type VARCHAR(50) NOT NULL, -- 'mileage_inconsistency', 'duplicate_listing', 'vin_anomaly', 'ownership_anomaly', 'inspection_manipulation', 'image_duplication', 'price_manipulation', 'bidding_abuse', 'fake_dealership'
  alert_severity VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high', 'critical'

  -- Confidence
  confidence_score DECIMAL(5, 2) NOT NULL, -- 0-100

  -- Details
  title VARCHAR(200) NOT NULL,
  description TEXT,
  evidence JSONB DEFAULT '{}', -- Evidence supporting the alert

  -- Related Entities
  related_vin VARCHAR(17),
  related_listing_id UUID,
  related_user_id UUID,
  related_entity_type VARCHAR(30),
  related_entity_id UUID,

  -- Status
  status VARCHAR(20) DEFAULT 'open', -- 'open', 'investigating', 'resolved', 'dismissed', 'confirmed_fraud'

  -- Resolution
  resolution_notes TEXT,
  resolved_by UUID,
  resolved_at TIMESTAMP,

  -- Audit
  created_by VARCHAR(50) DEFAULT 'system', -- 'system', 'admin', 'ai'
  detection_method VARCHAR(100), -- 'pattern_match', 'ml_model', 'manual_review'

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_fraud_type (alert_type),
  INDEX idx_fraud_status (status),
  INDEX idx_fraud_severity (alert_severity),
  INDEX idx_fraud_vin (related_vin)
);

-- ============================================================
// DEALER ANALYTICS (Dealer performance metrics)
// ============================================================
CREATE TABLE IF NOT EXISTS dealer_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Dealer
  dealer_id UUID NOT NULL,
  dealer_name VARCHAR(200),

  -- Period
  period_type VARCHAR(20) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Listing Metrics
  active_listings INTEGER DEFAULT 0,
  new_listings INTEGER DEFAULT 0,
  listings_sold INTEGER DEFAULT 0,
  listings_removed INTEGER DEFAULT 0,

  -- Pricing
  avg_listing_price DECIMAL(12, 2),
  avg_sale_price DECIMAL(12, 2),
  avg_price_difference DECIMAL(12, 2), -- Difference from market

  -- Performance
  avg_days_to_sell INTEGER DEFAULT 0,
  sell_through_rate DECIMAL(5, 2) DEFAULT 0, -- % of listings that sell
  price_reduction_rate DECIMAL(5, 2) DEFAULT 0, -- % requiring price reduction

  -- Engagement
  total_views INTEGER DEFAULT 0,
  total_saves INTEGER DEFAULT 0,
  total_inquiries INTEGER DEFAULT 0,
  inquiry_to_view_rate DECIMAL(5, 2) DEFAULT 0,

  -- Inspection
  inspections_requested INTEGER DEFAULT 0,
  inspection_conversion_rate DECIMAL(5, 2) DEFAULT 0,

  -- Auction (if applicable)
  auctions_conducted INTEGER DEFAULT 0,
  auction_success_rate DECIMAL(5, 2) DEFAULT 0,

  -- Customer
  customer_rating DECIMAL(3, 2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,

  -- Competition
  market_share DECIMAL(5, 2) DEFAULT 0,
  competitive_index DECIMAL(5, 2) DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(dealer_id, period_type, period_start)
);

-- ============================================================
// INSPECTION ANALYTICS (Provider performance)
// ============================================================
CREATE TABLE IF NOT EXISTS inspection_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Provider
  provider_id UUID NOT NULL,
  provider_name VARCHAR(200),

  -- Period
  period_type VARCHAR(20) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Volume
  inspections_completed INTEGER DEFAULT 0,
  inspections_cancelled INTEGER DEFAULT 0,
  avg_completion_time_hours DECIMAL(6, 2) DEFAULT 0,

  -- Quality
  avg_overall_score DECIMAL(5, 2) DEFAULT 0,
  avg_quality_score DECIMAL(5, 2) DEFAULT 0,
  rejection_rate DECIMAL(5, 2) DEFAULT 0,
  correction_rate DECIMAL(5, 2) DEFAULT 0,

  -- Ratings
  avg_customer_rating DECIMAL(3, 2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,

  -- Defect Detection
  avg_critical_defects DECIMAL(5, 2) DEFAULT 0,
  avg_major_defects DECIMAL(5, 2) DEFAULT 0,
  defect_detection_rate DECIMAL(5, 2) DEFAULT 0, -- % that find issues

  -- Common Issues Found
  common_issues JSONB DEFAULT '[]',

  -- Revenue
  total_revenue DECIMAL(12, 2) DEFAULT 0,
  avg_revenue_per_inspection DECIMAL(12, 2) DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(provider_id, period_type, period_start)
);

-- ============================================================
// AUCTION ANALYTICS (Auction performance)
// ============================================================
CREATE TABLE IF NOT EXISTS auction_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Auction Event
  auction_id UUID,
  organizer_id UUID,
  organizer_name VARCHAR(200),

  -- Period
  period_type VARCHAR(20) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Volume
  lots_listed INTEGER DEFAULT 0,
  lots_sold INTEGER DEFAULT 0,
  lots_unsold INTEGER DEFAULT 0,
  lots_withdrawn INTEGER DEFAULT 0,

  -- Pricing
  total_revenue DECIMAL(14, 2) DEFAULT 0,
  avg_lot_value DECIMAL(12, 2) DEFAULT 0,
  median_lot_value DECIMAL(12, 2),
  reserve_not_met_count INTEGER DEFAULT 0,

  -- Performance
  sell_through_rate DECIMAL(5, 2) DEFAULT 0,
  avg_bid_count_per_lot DECIMAL(5, 2) DEFAULT 0,
  avg_time_to_close_minutes DECIMAL(6, 2) DEFAULT 0,

  -- Bidding Activity
  total_bids INTEGER DEFAULT 0,
  unique_bidders INTEGER DEFAULT 0,
  avg_bids_per_bidder DECIMAL(5, 2) DEFAULT 0,

  -- Category Performance
  category_performance JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
// VEHICLE HEALTH ANALYTICS (Aggregated vehicle insights)
// ============================================================
CREATE TABLE IF NOT EXISTS vehicle_health_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Vehicle Profile
  make VARCHAR(50) NOT NULL,
  model VARCHAR(50) NOT NULL,
  year_from INTEGER,
  year_to INTEGER,
  generation VARCHAR(20),

  -- Period
  period_type VARCHAR(20) NOT NULL,
  period_date DATE NOT NULL,

  -- Reliability Metrics
  total_inspections INTEGER DEFAULT 0,
  avg_overall_score DECIMAL(5, 2) DEFAULT 0,
  failure_rate DECIMAL(5, 2) DEFAULT 0,

  -- Common Issues (by category)
  engine_issues_pct DECIMAL(5, 2) DEFAULT 0,
  transmission_issues_pct DECIMAL(5, 2) DEFAULT 0,
  suspension_issues_pct DECIMAL(5, 2) DEFAULT 0,
  electrical_issues_pct DECIMAL(5, 2) DEFAULT 0,
  body_issues_pct DECIMAL(5, 2) DEFAULT 0,

  -- Specific Defects
  common_defects JSONB DEFAULT '[]', -- [{code, name, frequency}]
  critical_defects JSONB DEFAULT '[]',

  -- Maintenance
  avg_mileage_at_service INTEGER DEFAULT 0,
  common_services JSONB DEFAULT '[]',

  -- Reliability Score
  reliability_score DECIMAL(5, 2) DEFAULT 0,

  -- Ranking
  reliability_rank INTEGER, -- Rank among similar vehicles
  total_models_compared INTEGER,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(make, model, year_from, year_to, period_type, period_date)
);

-- ============================================================
// RISK INDICATORS (Vehicle risk assessment)
// ============================================================
CREATE TABLE IF NOT EXISTS vehicle_risk_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Vehicle
  vin VARCHAR(17) NOT NULL,
  make VARCHAR(50),
  model VARCHAR(50),
  year INTEGER,

  -- Risk Categories
  ownership_risk_score DECIMAL(5, 2) DEFAULT 0,
  ownership_risk_factors JSONB DEFAULT '{}',

  accident_risk_score DECIMAL(5, 2) DEFAULT 0,
  accident_risk_factors JSONB DEFAULT '{}',

  maintenance_risk_score DECIMAL(5, 2) DEFAULT 0,
  maintenance_risk_factors JSONB DEFAULT '{}',

  market_risk_score DECIMAL(5, 2) DEFAULT 0,
  market_risk_factors JSONB DEFAULT '{}',

  fraud_risk_score DECIMAL(5, 2) DEFAULT 0,
  fraud_risk_factors JSONB DEFAULT '{}',

  -- Overall
  combined_risk_score DECIMAL(5, 2) DEFAULT 0,
  risk_level VARCHAR(20) DEFAULT 'low', -- 'low', 'medium', 'high', 'very_high'

  -- Flags
  active_flags JSONB DEFAULT '[]', -- ['suspicious_ownership', 'multiple_accidents', 'odometer_tampering']

  -- Timestamps
  last_calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(vin)
);

-- ============================================================
// MARKET CONFIDENCE INDICATORS
// ============================================================
CREATE TABLE IF NOT EXISTS market_confidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Scope
  scope VARCHAR(50) NOT NULL,
  scope_value VARCHAR(100),

  -- Indicators
  data_volume_score DECIMAL(5, 2) DEFAULT 0, -- How much data we have
  data_recency_score DECIMAL(5, 2) DEFAULT 0, -- How recent the data is
  data_consistency_score DECIMAL(5, 2) DEFAULT 0, -- How consistent the data is

  -- Components
  valuation_confidence DECIMAL(5, 2) DEFAULT 0,
  demand_confidence DECIMAL(5, 2) DEFAULT 0,
  pricing_confidence DECIMAL(5, 2) DEFAULT 0,

  -- Overall
  overall_confidence DECIMAL(5, 2) DEFAULT 0,

  -- Coverage
  listings_covered INTEGER DEFAULT 0,
  transactions_analyzed INTEGER DEFAULT 0,
  unique_vehicles INTEGER DEFAULT 0,

  -- Timestamps
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(scope, scope_value)
);

-- ============================================================
// MODEL REGISTRY (AI/ML model tracking)
// ============================================================
CREATE TABLE IF NOT EXISTS model_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Model Info
  model_name VARCHAR(100) NOT NULL,
  model_type VARCHAR(50) NOT NULL, -- 'valuation', 'fraud_detection', 'demand_forecast', 'risk_assessment'
  model_version VARCHAR(20) NOT NULL,

  -- Performance
  accuracy_score DECIMAL(5, 2),
  precision_score DECIMAL(5, 2),
  recall_score DECIMAL(5, 2),
  f1_score DECIMAL(5, 2),

  -- Training
  training_data_size INTEGER,
  training_period_start DATE,
  training_period_end DATE,

  -- Validation
  validation_data_size INTEGER,
  validation_score DECIMAL(5, 2),

  -- Status
  is_active BOOLEAN DEFAULT false,
  is_production BOOLEAN DEFAULT false,

  -- Metrics
  prediction_count INTEGER DEFAULT 0,
  avg_prediction_latency_ms INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deployed_at TIMESTAMP,
  retired_at TIMESTAMP
);

-- ============================================================
// PREDICTIONS LOG (AI prediction tracking)
// ============================================================
CREATE TABLE IF NOT EXISTS predictions_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Prediction Info
  model_id UUID REFERENCES model_registry(id),
  model_version VARCHAR(20),

  -- Input
  input_hash VARCHAR(64), -- Hash of input parameters
  input_features JSONB DEFAULT '{}',

  -- Output
  prediction_type VARCHAR(50) NOT NULL,
  predicted_value DECIMAL(12, 2),
  confidence_score DECIMAL(5, 2),

  -- Actual (for backtesting)
  actual_value DECIMAL(12, 2),
  prediction_error DECIMAL(12, 2),

  -- Entity
  entity_type VARCHAR(30), -- 'vehicle', 'dealer', 'auction'
  entity_id UUID,

  -- Request
  request_source VARCHAR(50), -- 'api', 'internal', 'batch'
  request_user_id UUID,

  -- Timestamps
  predicted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualized_at TIMESTAMP
);

CREATE INDEX idx_predictions_model ON predictions_log(model_id);
CREATE INDEX idx_predictions_entity ON predictions_log(entity_type, entity_id);
