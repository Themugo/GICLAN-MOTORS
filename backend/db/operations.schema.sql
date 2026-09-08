-- ============================================================
// KAYAD OPERATIONS COMMAND CENTER - DATABASE SCHEMA
// Operational heartbeat for automotive ecosystem
-- ============================================================

-- ============================================================
// SERVICE HEALTH
-- ============================================================
CREATE TABLE IF NOT EXISTS service_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Service
  service_code VARCHAR(50) UNIQUE NOT NULL,
  service_name VARCHAR(200) NOT NULL,
  service_category VARCHAR(50) NOT NULL, -- 'marketplace', 'dealer', 'auction', 'inspection', 'trust', 'finance', 'communications', 'infrastructure', 'external'

  -- Health
  health_status VARCHAR(20) DEFAULT 'healthy', -- 'healthy', 'warning', 'degraded', 'critical', 'maintenance'
  uptime_percentage DECIMAL(5, 2) DEFAULT 100,

  -- Metrics
  response_time_ms INTEGER DEFAULT 0,
  error_rate DECIMAL(5, 2) DEFAULT 0,
  requests_per_minute INTEGER DEFAULT 0,

  -- Last Check
  last_check_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_incident_at TIMESTAMP,

  -- Dependencies
  depends_on JSONB DEFAULT '[]', -- Service codes this depends on

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_service_health_category ON service_health(service_category);
CREATE INDEX idx_service_health_status ON service_health(health_status);

-- ============================================================
// INCIDENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Incident
  incident_code VARCHAR(50) UNIQUE NOT NULL, -- KAYAD-INC-XXXXXXXX

  -- Severity
  severity VARCHAR(10) NOT NULL, -- 'critical', 'high', 'medium', 'low'

  -- Classification
  incident_type VARCHAR(50) NOT NULL, -- 'api_failure', 'marketplace_outage', 'messaging_failure', 'notification_delay', 'inspection_failure', 'auction_failure', 'auth_failure', 'infrastructure', 'security'

  -- Details
  title VARCHAR(300) NOT NULL,
  description TEXT NOT NULL,

  -- Affected Service
  affected_service_code VARCHAR(50),
  affected_service_name VARCHAR(200),

  -- Impact
  impact_scope VARCHAR(50), -- 'platform', 'business', 'user_group', 'specific_users'
  users_affected INTEGER DEFAULT 0,
  revenue_impact DECIMAL(14, 2) DEFAULT 0,

  -- Owner
  owner_id UUID,
  owner_name VARCHAR(100),
  owner_team VARCHAR(50),

  -- Timeline
  status VARCHAR(20) DEFAULT 'open', -- 'open', 'investigating', 'identified', 'monitoring', 'resolved', 'closed'

  -- Resolution
  root_cause TEXT,
  resolution_steps TEXT,
  resolved_at TIMESTAMP,
  resolution_time_minutes INTEGER,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_incident_severity ON incidents(severity);
  INDEX idx_incident_status ON incidents(status);
  INDEX idx_incident_service ON incidents(affected_service_code);
);

-- ============================================================
// INCIDENT TIMELINE
-- ============================================================
CREATE TABLE IF NOT EXISTS incident_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Incident
  incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,

  -- Event
  event_type VARCHAR(50) NOT NULL, -- 'created', 'status_changed', 'assigned', 'update', 'escalated', 'resolved'
  event_description TEXT NOT NULL,

  -- Actor
  actor_id UUID,
  actor_name VARCHAR(100),
  actor_team VARCHAR(50),

  -- Previous/New
  previous_status VARCHAR(20),
  new_status VARCHAR(20),

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_timeline_incident ON incident_timeline(incident_id);

-- ============================================================
// OPERATIONAL ALERTS
-- ============================================================
CREATE TABLE IF NOT EXISTS operational_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Alert
  alert_code VARCHAR(50) UNIQUE NOT NULL,

  -- Type
  alert_type VARCHAR(50) NOT NULL, -- 'high_error_rate', 'slow_response', 'fraud_spike', 'dealer_complaints', 'inspection_delays', 'auction_issues', 'infrastructure', 'security', 'capacity', 'anomaly'

  -- Severity
  severity VARCHAR(10) DEFAULT 'warning', -- 'info', 'warning', 'high', 'critical'

  -- Details
  title VARCHAR(300) NOT NULL,
  description TEXT,

  -- Source
  source_service VARCHAR(50),
  source_metric VARCHAR(100),

  -- Metrics
  metric_value DECIMAL(14, 2),
  threshold_value DECIMAL(14, 2),

  -- Related
  related_incident_id UUID,
  related_entity_type VARCHAR(30),
  related_entity_id UUID,

  -- Status
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'acknowledged', 'investigating', 'resolved', 'dismissed'

  -- Assignment
  assigned_to UUID,
  assigned_to_name VARCHAR(100),

  -- Resolution
  resolution_notes TEXT,
  resolved_at TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_alert_severity ON operational_alerts(severity);
  INDEX idx_alert_status ON operational_alerts(status);
  INDEX idx_alert_type ON operational_alerts(alert_type);
);

-- ============================================================
// LIVE METRICS
-- ============================================================
CREATE TABLE IF NOT EXISTS live_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Metric
  metric_code VARCHAR(50) NOT NULL,
  metric_name VARCHAR(200) NOT NULL,
  metric_category VARCHAR(50) NOT NULL,

  -- Value
  metric_value DECIMAL(14, 2) NOT NULL,
  metric_unit VARCHAR(20),

  -- Comparison
  previous_value DECIMAL(14, 2),
  change_percentage DECIMAL(8, 2),

  -- Period
  period_type VARCHAR(20), -- 'minute', 'hour', 'day'
  period_start TIMESTAMP,

  -- Source
  source_service VARCHAR(50),

  -- Timestamps
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_live_metric_code ON live_metrics(metric_code);
  INDEX idx_live_metric_time ON live_metrics(recorded_at DESC);
);

-- ============================================================
// PLATFORM STATISTICS
-- ============================================================
CREATE TABLE IF NOT EXISTS platform_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Period
  period_type VARCHAR(20) NOT NULL, -- 'hourly', 'daily', 'weekly', 'monthly'
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,

  -- User Metrics
  total_users INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  new_registrations INTEGER DEFAULT 0,
  users_online INTEGER DEFAULT 0,

  -- Marketplace Metrics
  active_listings INTEGER DEFAULT 0,
  new_listings INTEGER DEFAULT 0,
  vehicles_sold INTEGER DEFAULT 0,
  total_views INTEGER DEFAULT 0,
  search_queries INTEGER DEFAULT 0,

  -- Dealer Metrics
  active_dealers INTEGER DEFAULT 0,
  dealer_listings INTEGER DEFAULT 0,

  -- Auction Metrics
  active_auctions INTEGER DEFAULT 0,
  auction_participants INTEGER DEFAULT 0,
  auction_bids INTEGER DEFAULT 0,
  auction_revenue DECIMAL(14, 2) DEFAULT 0,

  -- Inspection Metrics
  inspections_completed INTEGER DEFAULT 0,
  inspections_pending INTEGER DEFAULT 0,
  avg_inspection_score DECIMAL(5, 2),

  -- Communication Metrics
  messages_sent INTEGER DEFAULT 0,
  notifications_sent INTEGER DEFAULT 0,

  -- Support Metrics
  support_tickets INTEGER DEFAULT 0,
  avg_response_time_minutes INTEGER DEFAULT 0,

  -- API Metrics
  api_requests INTEGER DEFAULT 0,
  api_errors INTEGER DEFAULT 0,
  avg_api_response_time_ms INTEGER DEFAULT 0,

  -- Calculated
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(period_type, period_start)
);

CREATE INDEX idx_stats_period ON platform_statistics(period_start DESC);

-- ============================================================
// BUSINESS HEALTH SCORES
-- ============================================================
CREATE TABLE IF NOT EXISTS business_health_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Business
  business_id UUID NOT NULL,
  business_type VARCHAR(30) NOT NULL, -- 'dealer', 'inspection', 'auction', 'bank', 'insurance'
  business_name VARCHAR(200) NOT NULL,

  -- Score
  health_score DECIMAL(5, 2) DEFAULT 80,
  health_level VARCHAR(20) DEFAULT 'healthy', -- 'excellent', 'healthy', 'warning', 'at_risk'

  -- Components
  satisfaction_score DECIMAL(5, 2) DEFAULT 80,
  reliability_score DECIMAL(5, 2) DEFAULT 80,
  performance_score DECIMAL(5, 2) DEFAULT 80,

  -- Metrics
  total_transactions INTEGER DEFAULT 0,
  successful_transactions INTEGER DEFAULT 0,
  dispute_count INTEGER DEFAULT 0,
  complaint_count INTEGER DEFAULT 0,
  avg_response_time_minutes INTEGER DEFAULT 0,

  -- Alerts
  active_alerts INTEGER DEFAULT 0,
  recent_incidents INTEGER DEFAULT 0,

  -- Period
  period_start DATE,
  period_end DATE,

  -- Timestamps
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(business_id, period_start)
);

CREATE INDEX idx_business_health_type ON business_health_scores(business_type);
CREATE INDEX idx_business_health_score ON business_health_scores(health_score);

-- ============================================================
// REGIONAL METRICS
-- ============================================================
CREATE TABLE IF NOT EXISTS regional_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Region
  region_code VARCHAR(20) NOT NULL,
  region_name VARCHAR(100) NOT NULL,
  country VARCHAR(50) NOT NULL,

  -- Metrics
  total_listings INTEGER DEFAULT 0,
  total_dealers INTEGER DEFAULT 0,
  total_inspections INTEGER DEFAULT 0,
  total_auctions INTEGER DEFAULT 0,
  vehicles_sold INTEGER DEFAULT 0,
  avg_price DECIMAL(12, 2) DEFAULT 0,

  -- Demand
  search_volume INTEGER DEFAULT 0,
  inquiry_rate DECIMAL(5, 2) DEFAULT 0,

  -- Period
  period_start DATE,
  period_end DATE,

  -- Timestamps
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
// OPERATIONS NOTES
-- ============================================================
CREATE TABLE IF NOT EXISTS operations_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Note
  note_type VARCHAR(30) NOT NULL, -- 'incident', 'maintenance', 'update', 'decision', 'general'

  -- Content
  title VARCHAR(300) NOT NULL,
  content TEXT NOT NULL,

  -- Related
  related_incident_id UUID,
  related_service VARCHAR(50),

  -- Author
  author_id UUID NOT NULL,
  author_name VARCHAR(100) NOT NULL,
  author_team VARCHAR(50),

  -- Status
  is_pinned BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notes_type ON operations_notes(note_type);
CREATE INDEX idx_notes_incident ON operations_notes(related_incident_id);
