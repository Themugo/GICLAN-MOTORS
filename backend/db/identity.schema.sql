-- ============================================================
// KAYAD ENTERPRISE IDENTITY & ACCESS MANAGEMENT - DATABASE SCHEMA
// Security backbone for automotive ecosystem
-- ============================================================

-- ============================================================
// USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  user_code VARCHAR(50) UNIQUE NOT NULL, -- KAYAD-User-XXXXXXXX

  -- Authentication
  email VARCHAR(200) NOT NULL UNIQUE,
  phone VARCHAR(30),
  password_hash VARCHAR(255),

  -- Profile
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  profile_image_url VARCHAR(500),

  -- Identity Type
  identity_type VARCHAR(30) NOT NULL, -- 'buyer', 'private_seller', 'dealer_staff', 'dealer_owner', 'inspection_engineer', 'inspection_company', 'auction_company', 'auction_officer', 'bank_officer', 'insurance_officer', 'government', 'support', 'compliance', 'operations', 'executive', 'developer', 'partner', 'api_client', 'system'

  -- Organization
  organization_id UUID,
  department VARCHAR(100),
  job_title VARCHAR(100),

  -- Status
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'pending', 'suspended', 'terminated', 'locked'

  -- Lockout
  locked_at TIMESTAMP,
  lockout_reason VARCHAR(200),
  failed_login_attempts INTEGER DEFAULT 0,

  -- Email Verification
  email_verified BOOLEAN DEFAULT false,
  email_verified_at TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(email)
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_organization ON users(organization_id);
CREATE INDEX idx_users_type ON users(identity_type);
CREATE INDEX idx_users_status ON users(status);

-- ============================================================
// ORGANIZATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Organization
  org_code VARCHAR(50) UNIQUE NOT NULL, -- KAYAD-Org-XXXXXXXX
  org_name VARCHAR(200) NOT NULL,
  org_type VARCHAR(30) NOT NULL, -- 'dealer', 'inspection', 'auction', 'bank', 'insurance', 'government', 'fleet', 'partner', 'internal'

  -- Registration
  registration_number VARCHAR(50),
  tax_id VARCHAR(50),

  -- Contact
  primary_email VARCHAR(200),
  primary_phone VARCHAR(30),
  address TEXT,
  country VARCHAR(50) DEFAULT 'Kenya',

  -- Structure
  departments JSONB DEFAULT '[]',
  branches JSONB DEFAULT '[]',

  -- Status
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'pending', 'suspended', 'terminated'

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_org_type ON organizations(org_type);
CREATE INDEX idx_org_status ON organizations(status);

-- ============================================================
// ROLES
-- ============================================================
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Role
  role_code VARCHAR(50) UNIQUE NOT NULL,
  role_name VARCHAR(100) NOT NULL,
  description TEXT,

  -- Scope
  scope VARCHAR(20) NOT NULL, -- 'system', 'organization', 'custom'

  -- Organization (for custom roles)
  organization_id UUID REFERENCES organizations(id),

  -- Permissions
  permissions JSONB DEFAULT '[]',

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false, -- System roles cannot be deleted

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(organization_id, role_code)
);

CREATE INDEX idx_role_scope ON roles(scope);
CREATE INDEX idx_role_org ON roles(organization_id);

-- ============================================================
// USER ROLES
-- ============================================================
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id),

  -- Role
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,

  -- Scope
  role_scope VARCHAR(20) NOT NULL, -- 'system', 'organization'

  -- Validity
  is_active BOOLEAN DEFAULT true,
  granted_by UUID,
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,

  UNIQUE(user_id, role_id, organization_id)
);

CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_org ON user_roles(organization_id);

-- ============================================================
// PERMISSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Permission
  permission_code VARCHAR(100) UNIQUE NOT NULL, -- 'vehicles.view', 'listings.create', 'auctions.manage'
  permission_name VARCHAR(200) NOT NULL,
  description TEXT,

  -- Category
  category VARCHAR(50) NOT NULL, -- 'marketplace', 'dealer', 'auction', 'inspection', 'finance', 'compliance', 'admin', 'system'

  -- Risk Level
  risk_level VARCHAR(10) DEFAULT 'low', -- 'low', 'medium', 'high', 'critical'

  -- Requires Approval
  requires_approval BOOLEAN DEFAULT false,
  approval_role VARCHAR(50),

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_permission_category ON permissions(category);

-- ============================================================
// USER SESSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Session
  session_id VARCHAR(100) UNIQUE NOT NULL,

  -- User
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- Device
  device_type VARCHAR(20), -- 'web', 'mobile', 'tablet'
  device_name VARCHAR(100),
  device_fingerprint VARCHAR(255),
  user_agent TEXT,

  -- Location
  ip_address VARCHAR(50),
  country VARCHAR(50),
  city VARCHAR(100),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),

  -- Token
  access_token_hash VARCHAR(255),
  refresh_token_hash VARCHAR(255),
  token_expires_at TIMESTAMP,

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_trusted BOOLEAN DEFAULT false,

  -- Activity
  last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  login_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  logout_at TIMESTAMP,

  INDEX idx_session_user ON user_sessions(user_id);
  INDEX idx_session_active ON user_sessions(is_active);
);

-- ============================================================
// MFA METHODS
-- ============================================================
CREATE TABLE IF NOT EXISTS mfa_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- Method
  method_type VARCHAR(20) NOT NULL, -- 'totp', 'sms', 'email', 'hardware_key', 'biometric'

  -- Details
  identifier VARCHAR(200), -- Email or phone number
  totp_secret_encrypted VARCHAR(255),
  hardware_key_public_key VARCHAR(500),

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_primary BOOLEAN DEFAULT false,

  -- Recovery
  recovery_codes_hash JSONB, -- Hashed recovery codes

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  verified_at TIMESTAMP,

  UNIQUE(user_id, method_type, identifier)
);

CREATE INDEX idx_mfa_user ON mfa_methods(user_id);

-- ============================================================
// SECURITY POLICIES
-- ============================================================
CREATE TABLE IF NOT EXISTS security_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Policy
  policy_code VARCHAR(50) UNIQUE NOT NULL,
  policy_name VARCHAR(200) NOT NULL,
  description TEXT,

  -- Scope
  scope VARCHAR(20) NOT NULL, -- 'system', 'organization'
  organization_id UUID REFERENCES organizations(id),

  -- Rules
  rules JSONB NOT NULL DEFAULT '{}', -- {password_min_length, password_complexity, mfa_required, session_timeout, ip_whitelist}

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
// AUTHENTICATION ATTEMPTS
-- ============================================================
CREATE TABLE IF NOT EXISTS auth_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User (if identified)
  user_id UUID REFERENCES users(id),
  email VARCHAR(200),

  -- Attempt
  attempt_type VARCHAR(30) NOT NULL, -- 'login', 'password_reset', 'mfa_verify', 'api_key'

  -- Result
  success BOOLEAN NOT NULL,
  failure_reason VARCHAR(100),

  -- Context
  ip_address VARCHAR(50),
  user_agent TEXT,
  device_fingerprint VARCHAR(255),

  -- Location
  country VARCHAR(50),
  city VARCHAR(100),

  -- Risk
  risk_score DECIMAL(5, 2) DEFAULT 0,
  risk_factors JSONB DEFAULT '[]',

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_auth_user ON auth_attempts(user_id);
  INDEX idx_auth_time ON auth_attempts(created_at DESC);
  INDEX idx_auth_ip ON auth_attempts(ip_address);
);

-- ============================================================
// SECURITY AUDIT LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Event
  event_type VARCHAR(50) NOT NULL, -- 'login', 'logout', 'role_change', 'permission_change', 'password_change', 'mfa_enabled', 'device_registered', 'session_revoked', 'account_locked', 'api_key_created', 'access_denied'

  -- User
  user_id UUID,
  user_email VARCHAR(200),
  user_type VARCHAR(30),

  -- Actor (if different from user)
  actor_id UUID,
  actor_email VARCHAR(200),
  actor_type VARCHAR(30), -- 'user', 'admin', 'system', 'api'

  -- Target (if applicable)
  target_user_id UUID,
  target_type VARCHAR(30),
  target_id UUID,

  -- Context
  ip_address VARCHAR(50),
  user_agent TEXT,
  session_id VARCHAR(100),

  -- Details
  event_data JSONB DEFAULT '{}',

  -- Result
  success BOOLEAN DEFAULT true,
  failure_reason VARCHAR(200),

  -- Timestamps (immutable - no updated_at)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_audit_user ON security_audit_log(user_id);
  INDEX idx_audit_type ON security_audit_log(event_type);
  INDEX idx_audit_time ON security_audit_log(created_at DESC);
  INDEX idx_audit_target ON security_audit_log(target_user_id);
);

-- ============================================================
// ACCESS REQUESTS
-- ============================================================
CREATE TABLE IF NOT EXISTS access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Request
  request_code VARCHAR(50) UNIQUE NOT NULL,

  -- User
  user_id UUID REFERENCES users(id),
  user_email VARCHAR(200) NOT NULL,

  -- Organization
  organization_id UUID REFERENCES organizations(id),

  -- Requested Access
  requested_role_id UUID REFERENCES roles(id),
  requested_permissions JSONB DEFAULT '[]',
  justification TEXT,

  -- Approval Workflow
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'cancelled'

  -- Approvers
  approver_id UUID,
  approver_name VARCHAR(100),
  approved_at TIMESTAMP,
  approval_notes TEXT,

  -- Compliance Review
  compliance_reviewer_id UUID,
  compliance_reviewed_at TIMESTAMP,
  compliance_notes TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_access_user ON access_requests(user_id);
  INDEX idx_access_org ON access_requests(organization_id);
  INDEX idx_access_status ON access_requests(status);
);

-- ============================================================
// API CLIENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS api_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Client
  client_code VARCHAR(50) UNIQUE NOT NULL,
  client_name VARCHAR(200) NOT NULL,
  description TEXT,

  -- Organization
  organization_id UUID REFERENCES organizations(id),

  -- Authentication
  client_id VARCHAR(100) UNIQUE NOT NULL,
  client_secret_hash VARCHAR(255),

  -- Grant Type
  grant_types JSONB DEFAULT '["client_credentials"]', -- 'client_credentials', 'authorization_code', 'refresh_token'

  -- Scopes
  allowed_scopes JSONB DEFAULT '[]',

  -- Redirect URIs
  redirect_uris JSONB DEFAULT '[]',

  -- Security
  require_pkce BOOLEAN DEFAULT true,
  token_endpoint_auth_method VARCHAR(20) DEFAULT 'client_secret_post',

  -- Status
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'suspended', 'revoked'

  -- Rate Limits
  rate_limit_per_minute INTEGER DEFAULT 60,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP,

  UNIQUE(organization_id, client_id)
);

CREATE INDEX idx_api_client_org ON api_clients(organization_id);
CREATE INDEX idx_api_client_status ON api_clients(status);

-- ============================================================
// ACCESS TOKENS
-- ============================================================
CREATE TABLE IF NOT EXISTS access_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Token
  token_hash VARCHAR(255) UNIQUE NOT NULL,
  token_type VARCHAR(20) DEFAULT 'Bearer',

  -- Client/User
  client_id UUID REFERENCES api_clients(id),
  user_id UUID REFERENCES users(id),

  -- Scope
  scopes JSONB DEFAULT '[]',

  -- Validity
  issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  revoked BOOLEAN DEFAULT false,
  revoked_at TIMESTAMP,

  -- Context
  ip_address VARCHAR(50),
  user_agent TEXT,

  INDEX idx_token_user ON access_tokens(user_id);
  INDEX idx_token_expires ON access_tokens(expires_at);
);
