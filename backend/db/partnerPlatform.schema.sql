-- ============================================================
// KAYAD ENTERPRISE PARTNER PLATFORM - DATABASE SCHEMA
// Partner integration infrastructure
-- ============================================================

-- ============================================================
// PARTNER ORGANIZATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS partner_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Organization
  organization_code VARCHAR(50) UNIQUE NOT NULL, -- KAYAD-PART-XXXXXXXX
  organization_name VARCHAR(200) NOT NULL,
  
  -- Category
  partner_type VARCHAR(30) NOT NULL, -- 'bank', 'insurance', 'inspection', 'auction', 'dealer_group', 'fleet', 'importer', 'logistics', 'tracking', 'accounting', 'erp', 'crm', 'payment', 'government', 'developer', 'other'
  
  -- Contact
  primary_contact_name VARCHAR(100),
  primary_contact_email VARCHAR(200) NOT NULL,
  primary_contact_phone VARCHAR(30),
  technical_contact_name VARCHAR(100),
  technical_contact_email VARCHAR(200),
  
  -- Location
  country VARCHAR(50) NOT NULL,
  city VARCHAR(100),
  address TEXT,
  website VARCHAR(200),
  
  -- Verification
  verification_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'under_review', 'approved', 'rejected', 'suspended'
  verified_at TIMESTAMP,
  verified_by UUID,
  
  -- Business Info
  registration_number VARCHAR(50),
  tax_id VARCHAR(50),
  business_type VARCHAR(50),
  
  -- Status
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'suspended', 'terminated'
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_partner_type ON partner_organizations(partner_type);
CREATE INDEX idx_partner_status ON partner_organizations(status);

-- ============================================================
// PARTNER APPLICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS partner_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Application
  application_code VARCHAR(50) UNIQUE NOT NULL, -- KAYAD-App-XXXXXXXX
  
  -- Partner
  partner_id UUID REFERENCES partner_organizations(id) ON DELETE CASCADE,
  
  -- Application Details
  application_name VARCHAR(200) NOT NULL,
  application_description TEXT,
  application_website VARCHAR(200),
  
  -- Use Case
  use_case TEXT NOT NULL,
  expected_volume VARCHAR(50), -- 'low', 'medium', 'high'
  
  -- Onboarding Step
  onboarding_step VARCHAR(30) DEFAULT 'register', -- 'register', 'verify_business', 'technical_contact', 'security_review', 'agreement', 'api_approval', 'sandbox', 'production'
  
  -- Agreements
  data_processing_agreement_signed BOOLEAN DEFAULT false,
  api_agreement_signed BOOLEAN DEFAULT false,
  agreements_signed_at TIMESTAMP,
  
  -- Review
  reviewed_by UUID,
  reviewed_at TIMESTAMP,
  review_notes TEXT,
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'under_review', 'approved', 'rejected', 'suspended'
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_application_partner ON partner_applications(partner_id);
CREATE INDEX idx_application_status ON partner_applications(status);

-- ============================================================
// API CREDENTIALS
-- ============================================================
CREATE TABLE IF NOT EXISTS api_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Credential
  credential_code VARCHAR(50) UNIQUE NOT NULL, -- KAYAD-Key-XXXXXXXX
  
  -- Application
  application_id UUID REFERENCES partner_applications(id) ON DELETE CASCADE,
  
  -- Keys
  api_key VARCHAR(100) NOT NULL,
  api_secret_hash VARCHAR(255) NOT NULL, -- Hashed for security
  api_secret_plaintext VARCHAR(255), -- Only shown once, then hashed
  
  -- OAuth
  oauth_client_id VARCHAR(100),
  oauth_client_secret_hash VARCHAR(255),
  
  -- Type
  credential_type VARCHAR(20) NOT NULL, -- 'api_key', 'oauth', 'jwt'
  environment VARCHAR(20) NOT NULL, -- 'sandbox', 'production'
  
  -- Permissions
  permissions JSONB DEFAULT '[]', -- Granular permissions
  
  -- Status
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'revoked', 'expired'
  
  -- Security
  last_used_at TIMESTAMP,
  last_ip VARCHAR(50),
  
  -- Expiry
  expires_at TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(application_id, environment, credential_type)
);

CREATE INDEX idx_credentials_application ON api_credentials(application_id);
CREATE INDEX idx_credentials_status ON api_credentials(status);

-- ============================================================
// API ENDPOINTS & RATE LIMITS
-- ============================================================
CREATE TABLE IF NOT EXISTS api_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Endpoint
  endpoint_code VARCHAR(50) UNIQUE NOT NULL, -- 'listings', 'passport', 'inspection', 'auction', 'valuation', 'trust', 'analytics'
  endpoint_name VARCHAR(200) NOT NULL,
  endpoint_description TEXT,
  
  -- API Version
  api_version VARCHAR(20) DEFAULT 'v1',
  
  -- Base URL
  base_path VARCHAR(100) NOT NULL,
  
  -- Methods
  allowed_methods JSONB DEFAULT '["GET"]', -- GET, POST, PUT, DELETE
  
  -- Rate Limits
  rate_limit_per_minute INTEGER DEFAULT 60,
  rate_limit_per_day INTEGER DEFAULT 10000,
  
  -- Permissions Required
  required_permissions JSONB DEFAULT '[]',
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
// WEBHOOK CONFIGURATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS webhook_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Config
  config_code VARCHAR(50) UNIQUE NOT NULL, -- KAYAD-Webhook-XXXXXXXX
  
  -- Application
  application_id UUID REFERENCES partner_applications(id) ON DELETE CASCADE,
  
  -- Webhook
  webhook_url VARCHAR(500) NOT NULL,
  webhook_name VARCHAR(200),
  
  -- Events
  subscribed_events JSONB DEFAULT '[]', -- Event types
  filter_conditions JSONB DEFAULT '{}',
  
  -- Security
  secret_key VARCHAR(255) NOT NULL,
  signature_method VARCHAR(20) DEFAULT 'hmac_sha256',
  
  -- IP Restrictions
  allowed_ips JSONB DEFAULT '[]',
  
  -- Status
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'paused', 'failed'
  
  -- Delivery
  delivery_attempts INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  last_delivery_at TIMESTAMP,
  last_delivery_status VARCHAR(20),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_webhook_application ON webhook_configs(application_id);
CREATE INDEX idx_webhook_status ON webhook_configs(status);

-- ============================================================
// WEBHOOK DELIVERIES
-- ============================================================
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Delivery
  delivery_code VARCHAR(50) UNIQUE NOT NULL,
  
  -- Webhook
  webhook_id UUID REFERENCES webhook_configs(id) ON DELETE CASCADE,
  
  -- Event
  event_type VARCHAR(50) NOT NULL,
  event_id UUID NOT NULL,
  event_data JSONB NOT NULL,
  
  -- Request
  request_payload JSONB NOT NULL,
  request_headers JSONB,
  request_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Response
  response_status INTEGER,
  response_body TEXT,
  response_time_ms INTEGER,
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'delivered', 'failed', 'retrying'
  
  -- Retry
  retry_count INTEGER DEFAULT 0,
  next_retry_at TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  delivered_at TIMESTAMP
);

CREATE INDEX idx_delivery_webhook ON webhook_deliveries(webhook_id);
CREATE INDEX idx_delivery_status ON webhook_deliveries(status);

-- ============================================================
// API USAGE LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS api_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Request
  request_id UUID NOT NULL,
  
  -- Credential
  credential_id UUID REFERENCES api_credentials(id),
  
  -- Partner
  partner_id UUID REFERENCES partner_organizations(id),
  application_id UUID REFERENCES partner_applications(id),
  
  -- Request Details
  method VARCHAR(10) NOT NULL,
  endpoint VARCHAR(200) NOT NULL,
  api_version VARCHAR(20),
  
  -- Response
  status_code INTEGER,
  response_time_ms INTEGER,
  
  -- Request Data
  request_ip VARCHAR(50),
  request_user_agent TEXT,
  request_size_bytes INTEGER,
  response_size_bytes INTEGER,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_usage_credential ON api_usage_logs(credential_id);
  INDEX idx_usage_partner ON api_usage_logs(partner_id);
  INDEX idx_usage_time ON api_usage_logs(created_at DESC);
);

-- ============================================================
// PARTNER PERMISSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS partner_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Permission
  permission_code VARCHAR(50) UNIQUE NOT NULL, -- 'read_listings', 'write_listings', 'read_passport', etc.
  permission_name VARCHAR(200) NOT NULL,
  permission_description TEXT,
  
  -- Category
  category VARCHAR(50) NOT NULL, -- 'marketplace', 'passport', 'inspection', 'auction', 'valuation', 'trust', 'analytics', 'finance', 'admin'
  
  -- Risk Level
  risk_level VARCHAR(20) DEFAULT 'low', -- 'low', 'medium', 'high'
  
  -- Requires Approval
  requires_approval BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
// PARTNER DOCUMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS partner_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Partner
  partner_id UUID REFERENCES partner_organizations(id) ON DELETE CASCADE,
  
  -- Document
  document_type VARCHAR(50) NOT NULL, -- 'business_registration', 'tax_certificate', 'id_document', 'address_proof', 'agreement', 'other'
  document_name VARCHAR(200) NOT NULL,
  file_url VARCHAR(500),
  file_name VARCHAR(200),
  
  -- Verification
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMP,
  verified_by UUID,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_documents_partner ON partner_documents(partner_id);

-- ============================================================
// PARTNER SUPPORT TICKETS
-- ============================================================
CREATE TABLE IF NOT EXISTS partner_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Ticket
  ticket_code VARCHAR(50) UNIQUE NOT NULL, -- KAYAD-Support-XXXXXXXX
  
  -- Partner
  partner_id UUID REFERENCES partner_organizations(id),
  application_id UUID REFERENCES partner_applications(id),
  
  -- Contact
  contact_name VARCHAR(100) NOT NULL,
  contact_email VARCHAR(200) NOT NULL,
  
  -- Ticket
  ticket_type VARCHAR(50) NOT NULL, -- 'technical', 'permissions', 'bug', 'feature_request', 'billing', 'security'
  subject VARCHAR(300) NOT NULL,
  description TEXT NOT NULL,
  
  -- Priority
  priority VARCHAR(10) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  
  -- Status
  status VARCHAR(20) DEFAULT 'open', -- 'open', 'in_progress', 'waiting', 'resolved', 'closed'
  
  -- Assignment
  assigned_to UUID,
  assigned_to_name VARCHAR(100),
  
  -- Resolution
  resolution TEXT,
  resolved_at TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_ticket_partner ON partner_tickets(partner_id);
  INDEX idx_ticket_status ON partner_tickets(status);
);

-- ============================================================
// PARTNER ANALYTICS
-- ============================================================
CREATE TABLE IF NOT EXISTS partner_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Partner
  partner_id UUID REFERENCES partner_organizations(id),
  application_id UUID REFERENCES partner_applications(id),
  
  -- Period
  period_type VARCHAR(20) NOT NULL, -- 'hourly', 'daily', 'weekly', 'monthly'
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  
  -- Metrics
  total_requests INTEGER DEFAULT 0,
  successful_requests INTEGER DEFAULT 0,
  failed_requests INTEGER DEFAULT 0,
  avg_response_time_ms INTEGER DEFAULT 0,
  
  -- Endpoints
  endpoint_usage JSONB DEFAULT '{}', -- {endpoint: count}
  
  -- Rate Limits
  rate_limit_hits INTEGER DEFAULT 0,
  
  -- Webhooks
  webhooks_sent INTEGER DEFAULT 0,
  webhooks_failed INTEGER DEFAULT 0,
  
  -- Timestamps
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(partner_id, application_id, period_type, period_start)
);

CREATE INDEX idx_analytics_partner ON partner_analytics(partner_id);
CREATE INDEX idx_analytics_period ON partner_analytics(period_start DESC);
