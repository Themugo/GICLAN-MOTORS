-- ============================================================
// KAYAD AI INTELLIGENCE & DECISION ENGINE - DATABASE SCHEMA
// Intelligence layer for Africa's smartest automotive platform
-- ============================================================

-- ============================================================
// AI MODELS
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Model
  model_code VARCHAR(50) UNIQUE NOT NULL,
  model_name VARCHAR(200) NOT NULL,
  model_type VARCHAR(30) NOT NULL, -- 'recommendation', 'prediction', 'fraud_detection', 'analysis', 'classification'

  -- Version
  version VARCHAR(20) NOT NULL,
  is_production BOOLEAN DEFAULT false,

  -- Configuration
  configuration JSONB DEFAULT '{}',
  hyperparameters JSONB DEFAULT '{}',

  -- Performance
  accuracy DECIMAL(5, 2),
  precision DECIMAL(5, 2),
  recall DECIMAL(5, 2),
  f1_score DECIMAL(5, 2),

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Training
  trained_at TIMESTAMP,
  training_data_size INTEGER,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_model_type ON ai_models(model_type);
CREATE INDEX idx_model_active ON ai_models(is_active);

-- ============================================================
// AI RECOMMENDATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Recommendation
  recommendation_code VARCHAR(50) UNIQUE NOT NULL,

  -- Type
  recommendation_type VARCHAR(50) NOT NULL, -- 'vehicle_recommendation', 'price_suggestion', 'pricing_optimization', 'fraud_alert', 'market_insight', 'risk_assessment'

  -- Category
  category VARCHAR(30) NOT NULL, -- 'buyer', 'seller', 'dealer', 'inspection', 'auction', 'finance', 'market', 'executive'

  -- Target
  target_type VARCHAR(30), -- 'vehicle', 'user', 'dealer', 'listing'
  target_id UUID,

  -- Recommendation Data
  recommendation_title VARCHAR(300) NOT NULL,
  recommendation_text TEXT NOT NULL,
  recommended_action TEXT,

  -- Explanation
  explanation TEXT NOT NULL,
  confidence_score DECIMAL(5, 2) NOT NULL, -- 0-100
  supporting_evidence JSONB DEFAULT '[]',
  data_sources JSONB DEFAULT '[]',

  -- Model
  model_code VARCHAR(50),
  model_version VARCHAR(20),

  -- Status
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'shown', 'accepted', 'rejected', 'superseded'

  -- Feedback
  user_feedback VARCHAR(20), -- 'helpful', 'not_helpful', 'incorrect'
  user_feedback_notes TEXT,

  -- Timestamps
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  shown_at TIMESTAMP,
  actioned_at TIMESTAMP,

  INDEX idx_recommendation_type ON ai_recommendations(recommendation_type);
  INDEX idx_recommendation_category ON ai_recommendations(category);
  INDEX idx_recommendation_target ON ai_recommendations(target_type, target_id);
  INDEX idx_recommendation_status ON ai_recommendations(status);
);

-- ============================================================
// FRAUD DETECTION FLAGS
-- ============================================================
CREATE TABLE IF NOT EXISTS fraud_detection_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Flag
  flag_code VARCHAR(50) UNIQUE NOT NULL,

  -- Type
  flag_type VARCHAR(50) NOT NULL, -- 'duplicate_listing', 'image_reuse', 'suspicious_seller', 'auction_manipulation', 'inspection_fraud', 'identity_abuse', 'fake_dealer', 'price_manipulation', 'vin_inconsistency', 'unusual_behaviour'

  -- Severity
  severity VARCHAR(10) NOT NULL, -- 'low', 'medium', 'high', 'critical'

  -- Details
  title VARCHAR(300) NOT NULL,
  description TEXT NOT NULL,

  -- Evidence
  evidence JSONB DEFAULT '{}', -- {screenshots: [], data: {}, patterns: []}
  confidence_score DECIMAL(5, 2) NOT NULL,

  -- Related Entities
  related_entity_type VARCHAR(30), -- 'listing', 'user', 'dealer', 'inspection', 'auction'
  related_entity_id UUID,

  -- Status
  status VARCHAR(20) DEFAULT 'open', -- 'open', 'under_review', 'confirmed', 'false_positive', 'resolved'

  -- Review
  reviewed_by UUID,
  reviewed_at TIMESTAMP,
  review_notes TEXT,

  -- Action
  action_taken VARCHAR(100),
  action_by UUID,
  action_at TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_fraud_type ON fraud_detection_flags(flag_type);
  INDEX idx_fraud_severity ON fraud_detection_flags(severity);
  INDEX idx_fraud_status ON fraud_detection_flags(status);
  INDEX idx_fraud_entity ON fraud_detection_flags(related_entity_type, related_entity_id);
);

-- ============================================================
// VEHICLE VALUATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS vehicle_valuations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Valuation
  valuation_code VARCHAR(50) UNIQUE NOT NULL,

  -- Vehicle
  vehicle_id UUID,
  make VARCHAR(50),
  model VARCHAR(50),
  year INTEGER,
  trim VARCHAR(100),
  mileage INTEGER,
  condition VARCHAR(20),
  location VARCHAR(100),

  -- Valuation
  estimated_value DECIMAL(12, 2) NOT NULL,
  min_value DECIMAL(12, 2),
  max_value DECIMAL(12, 2),
  currency VARCHAR(3) DEFAULT 'KES',

  -- Confidence
  confidence_score DECIMAL(5, 2),
  comparable_count INTEGER,

  -- Market Analysis
  market_trend VARCHAR(20), -- 'increasing', 'stable', 'decreasing'
  price_change_30d DECIMAL(8, 2),
  price_change_90d DECIMAL(8, 2),

  -- Factors
  factors_considered JSONB DEFAULT '[]',
  positive_factors JSONB DEFAULT '[]',
  negative_factors JSONB DEFAULT '[]',

  -- Model
  model_code VARCHAR(50),
  model_version VARCHAR(20),

  -- Timestamps
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  valid_until TIMESTAMP,

  INDEX idx_valuation_vehicle ON vehicle_valuations(vehicle_id);
  INDEX idx_valuation_value ON vehicle_valuations(estimated_value);
);

-- ============================================================
// MARKET ANALYTICS
-- ============================================================
CREATE TABLE IF NOT EXISTS market_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Analysis
  analysis_code VARCHAR(50) UNIQUE NOT NULL,

  -- Type
  analysis_type VARCHAR(50) NOT NULL, -- 'price_trend', 'demand_analysis', 'popular_makes', 'regional_demand', 'seasonal_pattern', 'auction_activity'

  -- Scope
  scope_type VARCHAR(20), -- 'national', 'regional', 'dealer', 'market'
  scope_id UUID,
  region VARCHAR(50),
  country VARCHAR(50) DEFAULT 'Kenya',

  -- Analysis Data
  analysis_period VARCHAR(20), -- 'daily', 'weekly', 'monthly', 'quarterly'
  period_start DATE,
  period_end DATE,

  -- Metrics
  metrics JSONB DEFAULT '{}',
  trends JSONB DEFAULT '{}',

  -- Insights
  insight_summary TEXT,
  key_findings JSONB DEFAULT '[]',

  -- Confidence
  confidence_score DECIMAL(5, 2),

  -- Timestamps
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_market_type ON market_analytics(analysis_type);
  INDEX idx_market_region ON market_analytics(region);
  INDEX idx_market_period ON market_analytics(period_start DESC);
);

-- ============================================================
// PREDICTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Prediction
  prediction_code VARCHAR(50) UNIQUE NOT NULL,

  -- Type
  prediction_type VARCHAR(50) NOT NULL, -- 'days_to_sell', 'price_prediction', 'demand_forecast', 'customer_churn', 'inventory_risk', 'auction_outcome'

  -- Target
  target_type VARCHAR(30), -- 'listing', 'dealer', 'vehicle'
  target_id UUID,

  -- Prediction
  predicted_value DECIMAL(14, 2),
  predicted_range_low DECIMAL(14, 2),
  predicted_range_high DECIMAL(14, 2),
  prediction_unit VARCHAR(20), -- 'days', 'KES', 'percentage'

  -- Confidence
  confidence_score DECIMAL(5, 2),

  -- Model
  model_code VARCHAR(50),
  model_version VARCHAR(20),

  -- Features Used
  features_used JSONB DEFAULT '[]',

  -- Status
  actual_value DECIMAL(14, 2),
  prediction_accuracy DECIMAL(5, 2), -- Calculated after outcome

  -- Timestamps
  predicted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actual_at TIMESTAMP,
  valid_until TIMESTAMP,

  INDEX idx_prediction_type ON ai_predictions(prediction_type);
  INDEX idx_prediction_target ON ai_predictions(target_type, target_id);
);

-- ============================================================
// AI INSIGHTS
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Insight
  insight_code VARCHAR(50) UNIQUE NOT NULL,

  -- Category
  category VARCHAR(30) NOT NULL, -- 'buyer', 'seller', 'dealer', 'market', 'executive'

  -- Insight
  insight_title VARCHAR(300) NOT NULL,
  insight_text TEXT NOT NULL,

  -- Type
  insight_type VARCHAR(50) NOT NULL, -- 'trend', 'opportunity', 'risk', 'recommendation', 'anomaly'

  -- Severity
  severity VARCHAR(10), -- For risks and anomalies

  -- Data
  supporting_data JSONB DEFAULT '{}',
  affected_entities JSONB DEFAULT '[]',

  -- Status
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'superseded', 'archived'

  -- Timestamps
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,

  INDEX idx_insight_category ON ai_insights(category);
  INDEX idx_insight_type ON ai_insights(insight_type);
  INDEX idx_insight_status ON ai_insights(status);
);

-- ============================================================
// AI FEEDBACK
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Feedback
  feedback_code VARCHAR(50) UNIQUE NOT NULL,

  -- Related
  recommendation_id UUID REFERENCES ai_recommendations(id),
  prediction_id UUID REFERENCES ai_predictions(id),
  insight_id UUID REFERENCES ai_insights(id),

  -- Feedback
  feedback_type VARCHAR(20) NOT NULL, -- 'helpful', 'not_helpful', 'correct', 'incorrect'
  feedback_notes TEXT,

  -- User
  user_id UUID,
  user_type VARCHAR(30),

  -- Impact
  was_actioned BOOLEAN DEFAULT false,
  outcome_notes TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_feedback_recommendation ON ai_feedback(recommendation_id);
CREATE INDEX idx_feedback_user ON ai_feedback(user_id);

-- ============================================================
// MODEL AUDIT TRAIL
-- ============================================================
CREATE TABLE IF NOT EXISTS model_audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Event
  event_type VARCHAR(50) NOT NULL, -- 'model_trained', 'model_deployed', 'model_updated', 'model_retired', 'performance_review', 'bias_check'

  -- Model
  model_code VARCHAR(50) NOT NULL,
  model_version VARCHAR(20),

  -- Event Data
  event_data JSONB DEFAULT '{}',
  performance_metrics JSONB,

  -- Actor
  actor_id UUID,
  actor_type VARCHAR(30), -- 'system', 'admin', 'ml_engineer'

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_model ON model_audit_trail(model_code);
CREATE INDEX idx_audit_time ON model_audit_trail(created_at DESC);

-- ============================================================
// USER AI PREFERENCES
-- ============================================================
CREATE TABLE IF NOT EXISTS user_ai_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User
  user_id UUID NOT NULL UNIQUE,

  -- Preferences
  ai_enabled BOOLEAN DEFAULT true,
  recommendations_enabled BOOLEAN DEFAULT true,
  fraud_alerts_enabled BOOLEAN DEFAULT true,
  market_insights_enabled BOOLEAN DEFAULT true,

  -- Notification Frequency
  notification_frequency VARCHAR(20) DEFAULT 'daily', -- 'realtime', 'daily', 'weekly', 'monthly'

  -- Privacy
  share_analytics BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
// DEALER AI ANALYTICS
-- ============================================================
CREATE TABLE IF NOT EXISTS dealer_ai_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Dealer
  dealer_id UUID NOT NULL,

  -- Period
  period_start DATE,
  period_end DATE,

  -- Performance
  avg_days_to_sell DECIMAL(5, 2),
  listing_quality_score DECIMAL(5, 2),
  pricing_accuracy DECIMAL(5, 2),

  -- Inventory
  fast_moving_ratio DECIMAL(5, 2),
  slow_moving_count INTEGER,
  overstock_count INTEGER,

  -- Demand
  top_demand_makes JSONB DEFAULT '[]',
  demand_forecast JSONB DEFAULT '{}',

  -- Recommendations
  active_recommendations INTEGER DEFAULT 0,
  accepted_recommendations INTEGER DEFAULT 0,
  recommendation_acceptance_rate DECIMAL(5, 2),

  -- Timestamps
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_dealer_analytics_dealer ON dealer_ai_analytics(dealer_id);
CREATE INDEX idx_dealer_analytics_period ON dealer_ai_analytics(period_start DESC);
