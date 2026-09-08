-- ============================================================
// KAYAD WORKFLOW ORCHESTRATION ENGINE - DATABASE SCHEMA
// Unified orchestration layer for automotive ecosystem
-- ============================================================

-- ============================================================
// WORKFLOW DEFINITIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS workflow_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Workflow
  workflow_code VARCHAR(50) UNIQUE NOT NULL, -- 'buyer_journey', 'seller_journey', 'dealer_journey', 'inspection_journey', 'auction_journey', 'ownership_transfer', 'vehicle_lifecycle'
  workflow_name VARCHAR(200) NOT NULL,
  description TEXT,

  -- Type
  workflow_type VARCHAR(30) NOT NULL, -- 'buyer', 'seller', 'dealer', 'inspector', 'auction', 'system'

  -- Steps (stored as JSON)
  steps JSONB NOT NULL, -- [{step_id, name, module, action, required_fields, next_step_conditions}]

  -- Triggers
  trigger_type VARCHAR(30), -- 'event', 'manual', 'scheduled', 'api'
  trigger_config JSONB DEFAULT '{}',

  -- Settings
  is_active BOOLEAN DEFAULT true,
  allow_parallel BOOLEAN DEFAULT false,
  timeout_minutes INTEGER DEFAULT 60,

  -- Version
  version INTEGER DEFAULT 1,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
// WORKFLOW INSTANCES (Active workflows)
// ============================================================
CREATE TABLE IF NOT EXISTS workflow_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Reference
  workflow_id UUID REFERENCES workflow_definitions(id),
  instance_code VARCHAR(50) UNIQUE NOT NULL, -- KAYAD-WF-XXXXXXXX

  -- Context
  workflow_type VARCHAR(30) NOT NULL,
  entity_type VARCHAR(30) NOT NULL, -- 'listing', 'vehicle', 'transaction', 'user'
  entity_id UUID NOT NULL,

  -- Participants
  initiator_id UUID,
  initiator_name VARCHAR(100),
  participants JSONB DEFAULT '[]', -- [{user_id, role, notified}]

  -- Current State
  current_step VARCHAR(50),
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'paused', 'completed', 'cancelled', 'failed'

  -- Progress
  completed_steps JSONB DEFAULT '[]',
  skipped_steps JSONB DEFAULT '[]',

  -- Data
  context_data JSONB DEFAULT '{}', -- Shared data across workflow

  -- Timeline
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  last_activity_at TIMESTAMP,

  -- Error handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  INDEX idx_instance_entity ON workflow_instances(entity_type, entity_id);
  INDEX idx_instance_status ON workflow_instances(status);
  INDEX idx_instance_type ON workflow_instances(workflow_type);
);

-- ============================================================
// WORKFLOW EVENTS (Immutable event log)
// ============================================================
CREATE TABLE IF NOT EXISTS workflow_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Reference
  workflow_instance_id UUID REFERENCES workflow_instances(id) ON DELETE CASCADE,

  -- Event
  event_type VARCHAR(50) NOT NULL, -- 'step_started', 'step_completed', 'step_skipped', 'workflow_started', 'workflow_completed', 'workflow_cancelled', 'workflow_paused', 'notification_sent', 'document_generated', 'status_changed'
  event_name VARCHAR(100),

  -- Step
  step_id VARCHAR(50),
  step_name VARCHAR(100),

  -- Details
  event_data JSONB DEFAULT '{}',

  -- Actor
  actor_id UUID,
  actor_name VARCHAR(100),
  actor_type VARCHAR(30), -- 'user', 'system', 'automated'

  -- Source
  source_module VARCHAR(50),
  source_action VARCHAR(100),

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

  -- No updated_at - events are immutable
);

CREATE INDEX idx_workflow_events_instance ON workflow_events(workflow_instance_id);
CREATE INDEX idx_workflow_events_time ON workflow_events(created_at DESC);

-- ============================================================
// JOURNEY SESSIONS (User journey tracking)
// ============================================================
CREATE TABLE IF NOT EXISTS journey_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User
  user_id UUID,
  session_id VARCHAR(100) UNIQUE NOT NULL,

  -- Journey
  journey_type VARCHAR(30) NOT NULL, -- 'buyer', 'seller', 'dealer', 'inspector', 'auction'

  -- Entry
  entry_point VARCHAR(50), -- 'search', 'listing', 'inspection', 'auction'
  entry_vehicle_id UUID,
  entry_listing_id UUID,

  -- Steps Completed
  steps JSONB DEFAULT '[]', -- [{step, timestamp, data}]

  -- Vehicle Interest
  interested_vehicles JSONB DEFAULT '[]',

  -- Current Position
  current_step VARCHAR(50),

  -- Funnel Data
  search_queries JSONB DEFAULT '[]',
  vehicles_viewed INTEGER DEFAULT 0,
  vehicles_saved INTEGER DEFAULT 0,
  inspections_booked INTEGER DEFAULT 0,

  -- Conversion
  is_converted BOOLEAN DEFAULT false,
  conversion_type VARCHAR(30),
  conversion_id UUID,
  converted_at TIMESTAMP,

  -- Timestamps
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP,

  INDEX idx_journey_user ON journey_sessions(user_id);
  INDEX idx_journey_session ON journey_sessions(session_id);
);

-- ============================================================
// VEHICLE LIFECYCLE TRACKING
-- ============================================================
CREATE TABLE IF NOT EXISTS vehicle_lifecycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Vehicle
  vin VARCHAR(17) UNIQUE NOT NULL,

  -- Current State
  current_status VARCHAR(30) NOT NULL, -- 'available', 'reserved', 'inspection_booked', 'inspection_complete', 'auction_scheduled', 'auction_live', 'sold', 'ownership_pending', 'transferred', 'archived'

  -- Module References
  passport_id UUID,
  current_listing_id UUID,
  current_inspection_id UUID,
  current_auction_id UUID,
  current_transaction_id UUID,

  -- Ownership
  current_owner_id UUID,
  current_owner_type VARCHAR(30),

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_event_at TIMESTAMP,

  INDEX idx_lifecycle_vin ON vehicle_lifecycles(vin);
  INDEX idx_lifecycle_status ON vehicle_lifecycles(current_status);
);

-- ============================================================
// STATUS SYNCHRONIZATION LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS status_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Entity
  entity_type VARCHAR(30) NOT NULL, -- 'vehicle', 'listing', 'inspection', 'auction', 'transaction'
  entity_id UUID NOT NULL,

  -- Change
  previous_status VARCHAR(30),
  new_status VARCHAR(30) NOT NULL,

  -- Source
  source_module VARCHAR(50) NOT NULL,
  source_action VARCHAR(100),

  -- Propagation
  synchronized_modules JSONB DEFAULT '[]', -- Modules that were updated

  -- Context
  change_reason VARCHAR(200),
  related_entities JSONB DEFAULT '[]',

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_sync_entity ON status_sync_log(entity_type, entity_id);
  INDEX idx_sync_time ON status_sync_log(created_at DESC);
);

-- ============================================================
// CROSS-MODULE NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS workflow_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Recipient
  recipient_id UUID NOT NULL,
  recipient_type VARCHAR(30), -- 'buyer', 'seller', 'dealer', 'inspector', 'auction_organizer', 'admin'
  recipient_email VARCHAR(200),
  recipient_phone VARCHAR(20),

  -- Notification
  notification_type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,

  -- Context
  workflow_instance_id UUID,
  related_entity_type VARCHAR(30),
  related_entity_id UUID,

  -- Journey Context
  journey_type VARCHAR(30),
  journey_session_id UUID,

  -- Priority
  priority VARCHAR(10) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'

  -- Channels
  channels JSONB DEFAULT '["in_app", "email"]',

  -- Status
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'read', 'failed'

  -- Delivery
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  read_at TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_notification_recipient ON workflow_notifications(recipient_id);
  INDEX idx_notification_status ON workflow_notifications(status);
  INDEX idx_notification_type ON workflow_notifications(notification_type);
);

-- ============================================================
// DOCUMENT FLOW TRACKING
-- ============================================================
CREATE TABLE IF NOT EXISTS document_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Document
  document_type VARCHAR(50) NOT NULL, -- 'inspection_report', 'ownership_document', 'finance_document', 'auction_certificate', 'payment_receipt', 'vehicle_passport'
  document_id UUID NOT NULL,

  -- Flow
  flow_code VARCHAR(50) UNIQUE NOT NULL, -- KAYAD-DF-XXXXXXXX
  flow_type VARCHAR(30) NOT NULL, -- 'inspection_complete', 'ownership_transfer', 'sale_complete'

  -- Route
  origin_module VARCHAR(50) NOT NULL,
  origin_entity_type VARCHAR(30),
  origin_entity_id UUID,

  destination_module VARCHAR(50),
  destination_entity_type VARCHAR(30),
  destination_entity_id UUID,

  -- Recipients
  sender_id UUID,
  sender_name VARCHAR(100),
  recipients JSONB DEFAULT '[]', -- [{user_id, role, received_at}]

  -- Status
  status VARCHAR(20) DEFAULT 'created', -- 'created', 'sent', 'delivered', 'acknowledged', 'archived'

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  acknowledged_at TIMESTAMP,

  INDEX idx_document_flow_type ON document_flows(flow_type);
  INDEX idx_document_flow_entity ON document_flows(origin_entity_type, origin_entity_id);
);

-- ============================================================
// UNIFIED SEARCH INDEX
-- ============================================================
CREATE TABLE IF NOT EXISTS unified_search_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Search Entity
  entity_type VARCHAR(30) NOT NULL, -- 'vehicle', 'dealer', 'inspector', 'auction', 'passport', 'document'
  entity_id UUID NOT NULL,

  -- Indexed Fields
  searchable_text TEXT NOT NULL,
  entity_data JSONB DEFAULT '{}',

  -- Filters
  category VARCHAR(50),
  subcategory VARCHAR(50),
  make VARCHAR(50),
  model VARCHAR(50),
  year_from INTEGER,
  year_to INTEGER,
  price_from DECIMAL(12, 2),
  price_to DECIMAL(12, 2),
  location VARCHAR(100),
  status VARCHAR(30),

  -- Relevance
  relevance_score DECIMAL(5, 2) DEFAULT 1.0,
  last_relevance_update TIMESTAMP,

  -- Visibility
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(entity_type, entity_id)
);

CREATE INDEX idx_search_text ON unified_search_index USING gin(to_tsvector('english', searchable_text));
CREATE INDEX idx_search_category ON unified_search_index(category);
CREATE INDEX idx_search_make_model ON unified_search_index(make, model);
CREATE INDEX idx_search_price ON unified_search_index(price_from, price_to);

-- ============================================================
// ENTERPRISE ANALYTICS AGGREGATES
-- ============================================================
CREATE TABLE IF NOT EXISTS enterprise_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Period
  period_type VARCHAR(20) NOT NULL, -- 'hourly', 'daily', 'weekly', 'monthly'
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,

  -- Module
  module VARCHAR(50) NOT NULL, -- 'marketplace', 'dealer', 'inspection', 'auction', 'trust', 'vehicle_passport'

  -- Metrics
  metrics JSONB NOT NULL, -- Dynamic metrics based on module

  -- Comparison
  previous_period_metrics JSONB,
  period_over_period_change JSONB,

  -- Timestamps
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(period_type, period_start, module)
);

CREATE INDEX idx_analytics_period ON enterprise_analytics(period_start, period_end);
CREATE INDEX idx_analytics_module ON enterprise_analytics(module);

-- ============================================================
// AUTOMATED RULE DEFINITIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Rule
  rule_code VARCHAR(50) UNIQUE NOT NULL,
  rule_name VARCHAR(200) NOT NULL,
  description TEXT,

  -- Trigger
  trigger_type VARCHAR(30) NOT NULL, -- 'event', 'schedule', 'condition'
  trigger_config JSONB NOT NULL, -- Event type or cron schedule

  -- Conditions
  conditions JSONB DEFAULT '[]', -- [{field, operator, value}]

  -- Actions
  actions JSONB NOT NULL, -- [{action_type, module, target_entity, data}]

  -- Priority
  priority INTEGER DEFAULT 0, -- Higher = runs first

  -- Settings
  is_active BOOLEAN DEFAULT true,
  is_test_mode BOOLEAN DEFAULT false,

  -- Execution
  last_executed_at TIMESTAMP,
  execution_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
