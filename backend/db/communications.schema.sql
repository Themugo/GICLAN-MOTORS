-- ============================================================
// KAYAD COMMUNICATIONS & COLLABORATION HUB - DATABASE SCHEMA
// Unified communication layer for automotive ecosystem
-- ============================================================

-- ============================================================
// CONVERSATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Conversation Identity
  conversation_code VARCHAR(50) UNIQUE NOT NULL, -- KAYAD-Conv-XXXXXXXX

  -- Context (required - every conversation belongs to an object)
  context_type VARCHAR(30) NOT NULL, -- 'listing', 'auction', 'inspection', 'escrow', 'finance', 'support', 'dealer_lead', 'passport', 'internal'
  context_id UUID NOT NULL,

  -- Type
  conversation_type VARCHAR(30) NOT NULL, -- 'buyer_dealer', 'buyer_seller', 'buyer_inspector', 'dealer_inspector', 'auction_bidder', 'internal_team', 'support'

  -- Participants
  participants JSONB DEFAULT '[]', -- [{user_id, role, joined_at}]

  -- Subject
  subject VARCHAR(200),
  subject_entity_data JSONB DEFAULT '{}', -- e.g., {vehicle_vin, listing_id}

  -- Settings
  is_group BOOLEAN DEFAULT false,
  is_internal BOOLEAN DEFAULT false, -- Internal team conversations

  -- Status
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'archived', 'resolved'

  -- Last Activity
  last_message_at TIMESTAMP,
  last_message_preview TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(context_type, context_id, conversation_type)
);

CREATE INDEX idx_conversation_context ON conversations(context_type, context_id);
CREATE INDEX idx_conversation_participant ON conversations USING gin(participants);
CREATE INDEX idx_conversation_status ON conversations(status);

-- ============================================================
// MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Reference
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,

  -- Sender
  sender_id UUID NOT NULL,
  sender_name VARCHAR(100) NOT NULL,
  sender_type VARCHAR(20) NOT NULL, -- 'user', 'system', 'bot', 'ai'
  sender_role VARCHAR(30), -- 'buyer', 'seller', 'dealer', 'inspector', 'admin'

  -- Content
  message_type VARCHAR(20) NOT NULL, -- 'text', 'file', 'system', 'notification', 'email', 'sms'
  content TEXT NOT NULL,

  -- Attachments
  attachments JSONB DEFAULT '[]', -- [{file_id, file_name, file_type, file_url}]

  -- Metadata
  metadata JSONB DEFAULT '{}', -- Additional context

  -- Status
  status VARCHAR(20) DEFAULT 'sent', -- 'sent', 'delivered', 'read', 'failed'

  -- Read Receipts
  read_by JSONB DEFAULT '[]', -- [{user_id, read_at}]

  -- Timestamps
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  delivered_at TIMESTAMP,
  read_at TIMESTAMP,

  INDEX idx_message_conversation ON messages(conversation_id);
  INDEX idx_message_sender ON messages(sender_id);
  INDEX idx_message_time ON messages(sent_at DESC);
);

-- ============================================================
// NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Recipient
  recipient_id UUID NOT NULL,
  recipient_email VARCHAR(200),
  recipient_phone VARCHAR(20),

  -- Notification
  notification_type VARCHAR(50) NOT NULL, -- 'vehicle_saved', 'price_drop', 'inspection_complete', 'auction_starting', 'auction_ending', 'bid_outbid', 'bid_accepted', 'listing_approved', 'listing_rejected', 'ownership_transfer', 'finance_decision', 'dispute_update'

  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,

  -- Context
  context_type VARCHAR(30), -- 'listing', 'auction', 'inspection', 'escrow', 'finance', 'support'
  context_id UUID,

  -- Action
  action_url VARCHAR(500),
  action_data JSONB DEFAULT '{}',

  -- Channels
  channels JSONB DEFAULT '["in_app"]', -- 'in_app', 'email', 'sms', 'push'

  -- Priority
  priority VARCHAR(10) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'

  -- Status
  status VARCHAR(20) DEFAULT 'unread', -- 'unread', 'read', 'archived'

  -- Read
  read_at TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_notification_recipient ON notifications(recipient_id);
  INDEX idx_notification_type ON notifications(notification_type);
  INDEX idx_notification_status ON notifications(status);
);

-- ============================================================
// FILES & ATTACHMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS message_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- File
  file_name VARCHAR(200) NOT NULL,
  file_type VARCHAR(50) NOT NULL, -- 'image', 'document', 'pdf', 'video'
  file_size INTEGER NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  file_path VARCHAR(500),

  -- Upload
  uploaded_by UUID NOT NULL,
  uploaded_by_name VARCHAR(100),

  -- Context
  context_type VARCHAR(30), -- 'message', 'listing', 'inspection', 'passport', 'support'
  context_id UUID,

  -- Permissions
  visibility VARCHAR(20) DEFAULT 'private', -- 'private', 'conversation', 'public'
  allowed_roles JSONB DEFAULT '[]', -- Roles that can access

  -- Status
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'deleted'

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_file_context ON message_files(context_type, context_id);
);

-- ============================================================
// EMAIL QUEUE
-- ============================================================
CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Recipient
  recipient_id UUID,
  recipient_email VARCHAR(200) NOT NULL,
  recipient_name VARCHAR(100),

  -- Email
  subject VARCHAR(300) NOT NULL,
  body_text TEXT,
  body_html TEXT,
  template_id VARCHAR(50), -- 'inspection_complete', 'auction_win', etc.
  template_data JSONB DEFAULT '{}',

  -- Headers
  from_email VARCHAR(200),
  from_name VARCHAR(100),
  reply_to VARCHAR(200),

  -- Status
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sending', 'sent', 'delivered', 'failed', 'bounced'

  -- Delivery
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP,

  -- Retry
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  scheduled_at TIMESTAMP,

  INDEX idx_email_status ON email_queue(status);
  INDEX idx_email_recipient ON email_queue(recipient_email);
);

-- ============================================================
// SMS QUEUE
-- ============================================================
CREATE TABLE IF NOT EXISTS sms_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Recipient
  recipient_id UUID,
  recipient_phone VARCHAR(20) NOT NULL,
  recipient_name VARCHAR(100),

  -- Message
  message TEXT NOT NULL,
  message_type VARCHAR(30) DEFAULT 'transactional', -- 'transactional', 'promotional', 'verification'

  -- Status
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sending', 'sent', 'delivered', 'failed'

  -- Provider
  provider VARCHAR(50), -- 'twilio', 'africastalking'
  provider_message_id VARCHAR(100),

  -- Delivery
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
// AUTOMATED REMINDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS automated_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Reminder
  reminder_code VARCHAR(50) UNIQUE NOT NULL,
  reminder_type VARCHAR(50) NOT NULL, -- 'auction_upcoming', 'inspection_appointment', 'viewing_day', 'document_expiry', 'finance_deadline', 'registration_incomplete', 'support_followup'

  -- Target
  target_user_id UUID NOT NULL,
  target_context_type VARCHAR(30),
  target_context_id UUID,

  -- Schedule
  trigger_at TIMESTAMP NOT NULL,
  repeat_interval VARCHAR(20), -- 'daily', 'weekly', 'monthly'

  -- Content
  title VARCHAR(200) NOT NULL,
  message_template TEXT NOT NULL,
  template_data JSONB DEFAULT '{}',

  -- Channels
  channels JSONB DEFAULT '["in_app", "email"]',

  -- Status
  status VARCHAR(20) DEFAULT 'scheduled', -- 'scheduled', 'sent', 'cancelled', 'completed'

  -- Execution
  executed_at TIMESTAMP,
  notification_id UUID,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_reminder_target ON automated_reminders(target_user_id);
  INDEX idx_reminder_trigger ON automated_reminders(trigger_at, status);
);

-- ============================================================
// COMMUNICATION TEMPLATES
-- ============================================================
CREATE TABLE IF NOT EXISTS communication_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Template
  template_code VARCHAR(50) UNIQUE NOT NULL,
  template_name VARCHAR(200) NOT NULL,
  template_category VARCHAR(30) NOT NULL, -- 'marketplace', 'auction', 'inspection', 'finance', 'support', 'system'

  -- Channels
  channels JSONB DEFAULT '["email"]', -- 'email', 'sms', 'in_app'

  -- Content
  subject_template VARCHAR(300), -- For email
  title_template VARCHAR(200), -- For in-app
  body_template TEXT NOT NULL,

  -- Variables
  variables JSONB DEFAULT '[]', -- [{name, required, type}]

  -- Settings
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false, -- System templates cannot be deleted

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
// PUSH NOTIFICATION TOKENS
-- ============================================================
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User
  user_id UUID NOT NULL,

  -- Device
  device_type VARCHAR(20) NOT NULL, -- 'ios', 'android', 'web'
  device_token VARCHAR(500) NOT NULL,

  -- Provider
  provider VARCHAR(20) DEFAULT 'fcm', -- 'fcm', 'apns'

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id, device_token)
);

-- ============================================================
// MESSAGE THREADS (Email/Support)
-- ============================================================
CREATE TABLE IF NOT EXISTS message_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Thread
  thread_code VARCHAR(50) UNIQUE NOT NULL,
  thread_type VARCHAR(30) NOT NULL, -- 'support_ticket', 'email_thread'

  -- Subject
  subject VARCHAR(300) NOT NULL,

  -- Participants
  participants JSONB DEFAULT '[]',

  -- Status
  status VARCHAR(20) DEFAULT 'open', -- 'open', 'pending', 'resolved', 'closed'
  priority VARCHAR(10) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'

  -- Assignment
  assigned_to UUID,
  assigned_to_name VARCHAR(100),

  -- Context
  context_type VARCHAR(30),
  context_id UUID,

  -- Metrics
  first_response_at TIMESTAMP,
  first_response_time_minutes INTEGER,
  resolution_time_minutes INTEGER,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,

  INDEX idx_thread_status ON message_threads(status);
  INDEX idx_thread_context ON message_threads(context_type, context_id);
);

-- ============================================================
// COMMUNICATION AUDIT LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS communication_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Action
  action_type VARCHAR(50) NOT NULL, -- 'message_sent', 'message_delivered', 'notification_sent', 'email_sent', 'sms_sent'

  -- Entity
  entity_type VARCHAR(30) NOT NULL, -- 'message', 'notification', 'email', 'sms'
  entity_id UUID NOT NULL,

  -- Actor
  actor_id UUID,
  actor_name VARCHAR(100),

  -- Context
  context_type VARCHAR(30),
  context_id UUID,

  -- Details
  details JSONB DEFAULT '{}',

  -- Result
  result VARCHAR(20), -- 'success', 'failed'
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_audit_entity ON communication_audit_log(entity_type, entity_id);
  INDEX idx_audit_time ON communication_audit_log(created_at DESC);
);

-- ============================================================
// TEAM CHANNELS (Internal)
-- ============================================================
CREATE TABLE IF NOT EXISTS team_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Channel
  channel_code VARCHAR(50) UNIQUE NOT NULL,
  channel_name VARCHAR(200) NOT NULL,

  -- Team
  team_type VARCHAR(30) NOT NULL, -- 'dealer', 'inspection', 'auction', 'support', 'management'
  team_id UUID, -- If it's a business's internal team

  -- Members
  members JSONB DEFAULT '[]', -- [{user_id, role, joined_at}]

  -- Settings
  is_private BOOLEAN DEFAULT true,
  description TEXT,

  -- Status
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'archived'

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
