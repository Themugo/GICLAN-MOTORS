-- ============================================================
// KAYAD PLATFORM ECOSYSTEM - DATABASE SCHEMA
// Extensible automotive platform for East Africa
-- ============================================================

-- ============================================================
// DEVELOPERS
-- ============================================================
CREATE TABLE IF NOT EXISTS developers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Developer
  developer_code VARCHAR(50) UNIQUE NOT NULL,

  -- User
  user_id UUID,
  email VARCHAR(200) NOT NULL,
  name VARCHAR(200) NOT NULL,

  -- Company
  company_name VARCHAR(200),
  company_website VARCHAR(500),
  company_size VARCHAR(20), -- 'startup', 'smb', 'enterprise'

  -- Profile
  bio TEXT,
  avatar_url VARCHAR(500),

  -- Status
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'suspended', 'inactive'

  -- Stats
  total_apps INTEGER DEFAULT 0,
  total_api_calls INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
// APPLICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS platform_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Application
  app_code VARCHAR(50) UNIQUE NOT NULL,
  app_name VARCHAR(200) NOT NULL,
  description TEXT,

  -- Developer
  developer_id UUID REFERENCES developers(id),

  -- Logo & Branding
  logo_url VARCHAR(500),
  primary_color VARCHAR(20),

  -- Category
  category VARCHAR(50) NOT NULL, -- 'crm', 'accounting', 'fleet', 'marketing', 'analytics', 'finance', 'insurance', 'inspection', 'logistics', 'other'

  -- Website & Support
  website_url VARCHAR(500),
  support_email VARCHAR(200),
  support_url VARCHAR(500),

  -- Environment
  environment VARCHAR(20) DEFAULT 'sandbox', -- 'sandbox', 'production'

  -- Status
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'suspended', 'published'

  -- Review
  review_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_app_developer ON platform_applications(developer_id);
CREATE INDEX idx_app_status ON platform_applications(status);
CREATE INDEX idx_app_category ON platform_applications(category);

-- ============================================================
// API KEYS
-- ============================================================
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Key
  key_code VARCHAR(50) UNIQUE NOT NULL,
  key_prefix VARCHAR(10) NOT NULL,
  key_hash VARCHAR(100) NOT NULL,

  -- Application
  app_id UUID REFERENCES platform_applications(id),

  -- Type
  key_type VARCHAR(20) NOT NULL, -- 'production', 'sandbox', 'test'

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMP,

  -- Scopes
  scopes JSONB DEFAULT '[]',

  -- Rate Limits
  rate_limit_per_hour INTEGER DEFAULT 1000,
  rate_limit_per_day INTEGER,

  -- Usage
  total_calls INTEGER DEFAULT 0,

  -- Expiry
  expires_at TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_key_app ON api_keys(app_id);
CREATE INDEX idx_key_active ON api_keys(is_active);

-- ============================================================
// OAUTH CLIENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS oauth_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Client
  client_id VARCHAR(100) UNIQUE NOT NULL,
  client_secret_hash VARCHAR(100) NOT NULL,

  -- Application
  app_id UUID REFERENCES platform_applications(id),

  -- Configuration
  redirect_uris JSONB DEFAULT '[]',
  allowed_scopes JSONB DEFAULT '[]',

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
// API SCOPES
-- ============================================================
CREATE TABLE IF NOT EXISTS api_scopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Scope
  scope_code VARCHAR(50) UNIQUE NOT NULL,
  scope_name VARCHAR(200) NOT NULL,
  description TEXT,

  -- Category
  category VARCHAR(50) NOT NULL, -- 'listings', 'auctions', 'inspections', 'dealers', 'finance', 'analytics', 'notifications'

  -- Access Level
  access_level VARCHAR(20) NOT NULL, -- 'read', 'write', 'admin'

  -- Risk
  risk_level VARCHAR(10) DEFAULT 'low', -- 'low', 'medium', 'high'

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
// WEBHOOK SUBSCRIPTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS webhook_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Subscription
  subscription_code VARCHAR(50) UNIQUE NOT NULL,

  -- Application
  app_id UUID REFERENCES platform_applications(id),

  -- Event
  event_type VARCHAR(100) NOT NULL, -- 'vehicle.listed', 'auction.started', etc.

  -- Endpoint
  endpoint_url VARCHAR(500) NOT NULL,
  secret_key VARCHAR(100),

  -- Filters
  filters JSONB DEFAULT '{}',

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Stats
  total_deliveries INTEGER DEFAULT 0,
  successful_deliveries INTEGER DEFAULT 0,
  failed_deliveries INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_webhook_app ON webhook_subscriptions(app_id);
CREATE INDEX idx_webhook_event ON webhook_subscriptions(event_type);

-- ============================================================
// WEBHOOK DELIVERIES
-- ============================================================
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Delivery
  delivery_code VARCHAR(50) UNIQUE NOT NULL,
  subscription_id UUID REFERENCES webhook_subscriptions(id),

  -- Event
  event_type VARCHAR(100) NOT NULL,
  event_id VARCHAR(100),
  payload JSONB NOT NULL,

  -- Delivery
  status VARCHAR(20) NOT NULL, -- 'pending', 'delivered', 'failed', 'retrying'
  attempts INTEGER DEFAULT 0,

  -- Response
  response_status_code INTEGER,
  response_body TEXT,
  response_time_ms INTEGER,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  delivered_at TIMESTAMP
);

CREATE INDEX idx_delivery_subscription ON webhook_deliveries(subscription_id);
CREATE INDEX idx_delivery_status ON webhook_deliveries(status);

-- ============================================================
// PLATFORM EVENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS platform_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Event
  event_code VARCHAR(50) UNIQUE NOT NULL,
  event_type VARCHAR(100) NOT NULL,

  -- Source
  source_type VARCHAR(30) NOT NULL, -- 'marketplace', 'auction', 'inspection', 'finance', 'identity', 'system'
  source_id UUID,

  -- Data
  event_data JSONB NOT NULL,

  -- Audience
  published_for VARCHAR(20) DEFAULT 'all', -- 'all', 'partners', 'internal'

  -- Timestamps
  occurred_at TIMESTAMP NOT NULL,
  published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_event_type ON platform_events(event_type);
CREATE INDEX idx_event_time ON platform_events(occurred_at DESC);

-- ============================================================
// EXTENSIONS / PLUGINS
-- ============================================================
CREATE TABLE IF NOT EXISTS extensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Extension
  extension_code VARCHAR(50) UNIQUE NOT NULL,
  extension_name VARCHAR(200) NOT NULL,
  description TEXT,

  -- Developer
  developer_id UUID REFERENCES developers(id),
  app_id UUID REFERENCES platform_applications(id),

  -- Category
  category VARCHAR(50) NOT NULL, -- 'crm', 'accounting', 'fleet', 'marketing', 'analytics', 'integration'

  -- Branding
  logo_url VARCHAR(500),
  screenshots JSONB DEFAULT '[]',

  -- Pricing
  pricing_type VARCHAR(20) DEFAULT 'free', -- 'free', 'paid', 'subscription', 'enterprise'
  price_amount DECIMAL(12, 2),
  billing_cycle VARCHAR(20), -- 'monthly', 'annual'

  -- Certification
  is_certified BOOLEAN DEFAULT false,
  certification_date DATE,
  certification_status VARCHAR(20), -- 'pending', 'approved', 'rejected'

  -- Status
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'pending_review', 'approved', 'rejected', 'published', 'suspended'

  -- Stats
  total_installs INTEGER DEFAULT 0,
  active_installs INTEGER DEFAULT 0,
  avg_rating DECIMAL(3, 2),

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_extension_developer ON extensions(developer_id);
CREATE INDEX idx_extension_status ON extensions(status);
CREATE INDEX idx_extension_category ON extensions(category);

-- ============================================================
// EXTENSION INSTALLATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS extension_installations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Installation
  installation_code VARCHAR(50) UNIQUE NOT NULL,

  -- Extension
  extension_id UUID REFERENCES extensions(id),

  -- Customer
  customer_id UUID,
  customer_type VARCHAR(30) NOT NULL, -- 'dealer', 'bank', 'insurance', 'partner'

  -- Configuration
  configuration JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,

  -- Subscription
  subscription_start DATE,
  subscription_end DATE,

  -- Timestamps
  installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  uninstalled_at TIMESTAMP
);

CREATE INDEX idx_installation_extension ON extension_installations(extension_id);
CREATE INDEX idx_installation_customer ON extension_installations(customer_id);

-- ============================================================
// PARTNERS
-- ============================================================
CREATE TABLE IF NOT EXISTS platform_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Partner
  partner_code VARCHAR(50) UNIQUE NOT NULL,
  partner_name VARCHAR(200) NOT NULL,
  partner_type VARCHAR(50) NOT NULL, -- 'bank', 'insurance', 'inspection', 'auction', 'logistics', 'technology', 'government'

  -- Company
  company_name VARCHAR(200),
  registration_number VARCHAR(50),
  website VARCHAR(500),

  -- Contact
  primary_contact_name VARCHAR(100),
  primary_contact_email VARCHAR(200),
  primary_contact_phone VARCHAR(30),

  -- Integration
  integration_type VARCHAR(50), -- 'api', 'webhook', 's2s', 'embedded'
  integration_status VARCHAR(20) DEFAULT 'connected', -- 'connected', 'disconnected', 'pending'

  -- Partnership
  partnership_tier VARCHAR(20) DEFAULT 'standard', -- 'standard', 'preferred', 'strategic', 'enterprise'

  -- Status
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'inactive', 'suspended'

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_partner_type ON platform_partners(partner_type);
CREATE INDEX idx_partner_status ON platform_partners(status);

-- ============================================================
// API USAGE LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS api_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Usage
  log_code VARCHAR(50) UNIQUE NOT NULL,

  -- Key
  api_key_id UUID REFERENCES api_keys(id),
  app_id UUID REFERENCES platform_applications(id),

  -- Request
  endpoint VARCHAR(200) NOT NULL,
  method VARCHAR(10) NOT NULL,
  status_code INTEGER,

  -- Timing
  response_time_ms INTEGER,

  -- Scope
  scopes_used JSONB DEFAULT '[]',

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_usage_key ON api_usage_logs(api_key_id);
CREATE INDEX idx_usage_time ON api_usage_logs(created_at DESC);

-- ============================================================
// API RATE_LIMITS
-- ============================================================
CREATE TABLE IF NOT EXISTS api_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Key
  api_key_id UUID REFERENCES api_keys(id),

  -- Window
  window_type VARCHAR(10) NOT NULL, -- 'hour', 'day', 'minute'
  window_start TIMESTAMP NOT NULL,
  window_end TIMESTAMP NOT NULL,

  -- Counts
  request_count INTEGER DEFAULT 0,
  limit_value INTEGER NOT NULL,

  -- Timestamps
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(api_key_id, window_type, window_start)
);

-- ============================================================
// SDK VERSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS sdk_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- SDK
  sdk_code VARCHAR(50) UNIQUE NOT NULL,
  sdk_name VARCHAR(100) NOT NULL, -- 'javascript', 'python', 'java', 'php', 'csharp', 'go'

  -- Version
  version VARCHAR(20) NOT NULL,
  release_notes TEXT,

  -- Downloads
  download_count INTEGER DEFAULT 0,

  -- Status
  is_latest BOOLEAN DEFAULT false,
  is_stable BOOLEAN DEFAULT true,

  -- Timestamps
  released_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sdk_name ON sdk_versions(sdk_name);
