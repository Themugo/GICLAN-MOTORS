-- ============================================================
// KAYAD ENTERPRISE CONTENT STUDIO - DATABASE SCHEMA
// Digital Publishing Platform for KAYAD Ecosystem
-- ============================================================

-- ============================================================
// BLOGS / ARTICLES
-- ============================================================
CREATE TABLE IF NOT EXISTS cs_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Article
  article_code VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(300) NOT NULL,
  slug VARCHAR(300) UNIQUE NOT NULL,
  excerpt TEXT,
  content TEXT,

  -- Classification
  content_type VARCHAR(30) DEFAULT 'blog', -- 'blog', 'news', 'knowledge_base', 'help_center', 'faq'

  -- Author
  author_id UUID,
  author_name VARCHAR(100),
  author_avatar VARCHAR(500),

  -- Categories & Tags
  categories JSONB DEFAULT '[]',
  tags JSONB DEFAULT '[]',

  -- Media
  featured_image VARCHAR(500),
  featured_video VARCHAR(500),
  gallery JSONB DEFAULT '[]',

  -- SEO
  meta_title VARCHAR(200),
  meta_description TEXT,
  og_image VARCHAR(500),
  canonical_url VARCHAR(500),
  schema_markup JSONB DEFAULT '{}',

  -- Reading
  reading_time_minutes INTEGER,
  word_count INTEGER,

  -- Related
  related_articles JSONB DEFAULT '[]',

  -- Publishing
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'review', 'scheduled', 'published', 'archived'
  published_at TIMESTAMP,

  -- Scheduling
  schedule_publish_at TIMESTAMP,
  schedule_unpublish_at TIMESTAMP,

  -- Workflow
  created_by UUID,
  created_by_name VARCHAR(100),
  reviewed_by UUID,
  reviewed_by_name VARCHAR(100),
  approved_by UUID,
  approved_by_name VARCHAR(100),

  -- Stats
  views INTEGER DEFAULT 0,
  unique_views INTEGER DEFAULT 0,
  avg_time_on_page INTEGER DEFAULT 0,
  bounce_rate DECIMAL(5, 2),
  shares INTEGER DEFAULT 0,

  -- Featured
  is_featured BOOLEAN DEFAULT false,
  is_pinned BOOLEAN DEFAULT false,

  -- Version
  version INTEGER DEFAULT 1,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_article_status ON cs_articles(status);
CREATE INDEX idx_article_type ON cs_articles(content_type);
CREATE INDEX idx_article_slug ON cs_articles(slug);

-- ============================================================
// FAQ MANAGEMENT
-- ============================================================
CREATE TABLE IF NOT EXISTS cs_faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- FAQ
  faq_code VARCHAR(50) UNIQUE NOT NULL,
  question VARCHAR(500) NOT NULL,
  answer TEXT NOT NULL,

  -- Category
  category VARCHAR(100),
  subcategory VARCHAR(100),

  -- Tags
  tags JSONB DEFAULT '[]',

  -- Visibility
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'published', 'archived'

  -- Ordering
  ordering INTEGER DEFAULT 0,

  -- Popularity
  view_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  not_helpful_count INTEGER DEFAULT 0,

  -- Publishing
  published_at TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_faq_category ON cs_faqs(category);
CREATE INDEX idx_faq_status ON cs_faqs(status);

-- ============================================================
// LANDING PAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS cs_landing_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Landing Page
  page_code VARCHAR(50) UNIQUE NOT NULL,
  page_name VARCHAR(200) NOT NULL,
  slug VARCHAR(300) UNIQUE NOT NULL,

  -- Purpose
  purpose VARCHAR(100), -- 'dealer_recruitment', 'auction_week', 'bank_promo', 'expo', 'campaign'

  -- Content
  hero_title VARCHAR(300),
  hero_subtitle VARCHAR(500),
  hero_image VARCHAR(500),
  content TEXT,

  -- Blocks
  blocks JSONB DEFAULT '[]', -- [{type, order, content}]

  -- SEO
  meta_title VARCHAR(200),
  meta_description TEXT,
  og_image VARCHAR(500),

  -- Targeting
  target_countries JSONB DEFAULT '[]',
  target_user_types JSONB DEFAULT '[]',

  -- CTA
  primary_cta_text VARCHAR(100),
  primary_cta_url VARCHAR(500),
  secondary_cta_text VARCHAR(100),
  secondary_cta_url VARCHAR(500),

  -- Publishing
  status VARCHAR(20) DEFAULT 'draft',
  published_at TIMESTAMP,
  expires_at TIMESTAMP,

  -- Stats
  views INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5, 2),

  -- Version
  version INTEGER DEFAULT 1,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_landing_purpose ON cs_landing_pages(purpose);
CREATE INDEX idx_landing_status ON cs_landing_pages(status);

-- ============================================================
// CONTENT BLOCKS (Reusable)
-- ============================================================
CREATE TABLE IF NOT EXISTS cs_content_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Block
  block_code VARCHAR(50) UNIQUE NOT NULL,
  block_name VARCHAR(200) NOT NULL,
  block_type VARCHAR(50) NOT NULL, -- 'hero', 'heading', 'paragraph', 'button', 'image', 'video', 'gallery', 'carousel', 'stats', 'testimonial', 'faq', 'pricing', 'map', 'countdown', 'newsletter', 'html', 'custom'

  -- Content
  title VARCHAR(300),
  content TEXT,
  config JSONB DEFAULT '{}', -- Type-specific configuration

  -- Media
  media_url VARCHAR(500),
  media_alt VARCHAR(200),

  -- Styling
  custom_css TEXT,
  custom_class VARCHAR(100),

  -- Reusability
  is_global BOOLEAN DEFAULT false,

  -- Status
  status VARCHAR(20) DEFAULT 'active',

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
// BANNERS
-- ============================================================
CREATE TABLE IF NOT EXISTS cs_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Banner
  banner_code VARCHAR(50) UNIQUE NOT NULL,
  banner_name VARCHAR(200) NOT NULL,

  -- Type
  banner_type VARCHAR(50) NOT NULL, -- 'hero', 'auction', 'dealer', 'finance', 'inspection', 'popup', 'sticky', 'floating'

  -- Content
  title VARCHAR(300),
  subtitle VARCHAR(500),
  content TEXT,
  cta_text VARCHAR(100),
  cta_url VARCHAR(500),

  -- Media
  desktop_image VARCHAR(500),
  tablet_image VARCHAR(500),
  mobile_image VARCHAR(500),
  video_url VARCHAR(500),

  -- Styling
  background_color VARCHAR(20),
  text_color VARCHAR(20),

  -- Targeting
  target_pages JSONB DEFAULT '[]',
  target_countries JSONB DEFAULT '[]',
  target_user_types JSONB DEFAULT '[]',

  -- Display
  position VARCHAR(30), -- 'top', 'bottom', 'hero', 'sidebar'
  size VARCHAR(20), -- 'small', 'medium', 'large', 'fullscreen'

  -- Scheduling
  start_date TIMESTAMP,
  end_date TIMESTAMP,

  -- Status
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'active', 'paused', 'ended'

  -- Stats
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_banner_type ON cs_banners(banner_type);
CREATE INDEX idx_banner_status ON cs_banners(status);

-- ============================================================
// CAMPAIGNS
-- ============================================================
CREATE TABLE IF NOT EXISTS cs_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Campaign
  campaign_code VARCHAR(50) UNIQUE NOT NULL,
  campaign_name VARCHAR(200) NOT NULL,
  description TEXT,

  -- Type
  campaign_type VARCHAR(50) NOT NULL, -- 'discount', 'dealer_promo', 'inspection_discount', 'finance_offer', 'seasonal', 'awareness'

  -- Content
  headline VARCHAR(300),
  description_text TEXT,

  -- Media
  banner_image VARCHAR(500),
  logo VARCHAR(500),

  -- Discount/Offer
  discount_type VARCHAR(20), -- 'percentage', 'fixed', 'cashback'
  discount_value DECIMAL(10, 2),
  max_discount DECIMAL(12, 2),
  terms_conditions TEXT,

  -- Targeting
  target_vehicle_types JSONB DEFAULT '[]',
  target_dealers JSONB DEFAULT '[]',
  target_countries JSONB DEFAULT '[]',

  -- Landing
  landing_page_id UUID,

  -- Scheduling
  start_date TIMESTAMP,
  end_date TIMESTAMP,

  -- Status
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'scheduled', 'active', 'paused', 'completed'

  -- Budget
  budget DECIMAL(12, 2),
  spent DECIMAL(12, 2) DEFAULT 0,

  -- Stats
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  revenue_generated DECIMAL(14, 2) DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_campaign_type ON cs_campaigns(campaign_type);
CREATE INDEX idx_campaign_status ON cs_campaigns(status);

-- ============================================================
// ANNOUNCEMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS cs_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Announcement
  announcement_code VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(300) NOT NULL,
  message TEXT NOT NULL,

  -- Type
  announcement_type VARCHAR(30) NOT NULL, -- 'emergency', 'maintenance', 'auction_alert', 'holiday', 'regional', 'security', 'system'

  -- Severity
  severity VARCHAR(20) DEFAULT 'info', -- 'info', 'warning', 'critical'

  -- Display
  display_location VARCHAR(30) DEFAULT 'banner', -- 'banner', 'modal', 'notification', 'all'

  -- Media
  icon VARCHAR(50),
  image_url VARCHAR(500),

  -- Actions
  action_text VARCHAR(100),
  action_url VARCHAR(500),

  -- Targeting
  target_countries JSONB DEFAULT '[]',
  target_user_types JSONB DEFAULT '[]',
  target_pages JSONB DEFAULT '[]',

  -- Scheduling
  start_date TIMESTAMP,
  end_date TIMESTAMP,

  -- Status
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'active', 'ended'

  -- Stats
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_announcement_type ON cs_announcements(announcement_type);
CREATE INDEX idx_announcement_status ON cs_announcements(status);

-- ============================================================
// PUBLISHING CALENDAR
-- ============================================================
CREATE TABLE IF NOT EXISTS cs_publishing_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Schedule
  schedule_code VARCHAR(50) UNIQUE NOT NULL,

  -- Content Reference
  content_type VARCHAR(30) NOT NULL, -- 'article', 'landing_page', 'banner', 'campaign', 'announcement'
  content_id UUID,
  content_name VARCHAR(200),

  -- Action
  action VARCHAR(30) NOT NULL, -- 'publish', 'unpublish', 'archive', 'delete'

  -- Scheduled Time
  scheduled_at TIMESTAMP NOT NULL,

  -- Status
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'cancelled'

  -- Execution
  executed_at TIMESTAMP,
  executed_by UUID,
  error_message TEXT,

  -- Recurrence
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern VARCHAR(30), -- 'daily', 'weekly', 'monthly'

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_schedule_content ON cs_publishing_schedule(content_type, content_id);
CREATE INDEX idx_schedule_time ON cs_publishing_schedule(scheduled_at);

-- ============================================================
// CONTENT VERSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS cs_content_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Version
  version_code VARCHAR(50) UNIQUE NOT NULL,

  -- Content Reference
  content_type VARCHAR(30) NOT NULL, -- 'article', 'landing_page', 'page', 'banner'
  content_id UUID,

  -- Snapshot
  snapshot JSONB NOT NULL,

  -- Version Info
  version_number INTEGER NOT NULL,
  change_summary TEXT,

  -- Status
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'published', 'archived'

  -- Author
  created_by UUID,
  created_by_name VARCHAR(100),
  created_by_role VARCHAR(50),

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  published_at TIMESTAMP
);

CREATE INDEX idx_version_content ON cs_content_versions(content_type, content_id);

-- ============================================================
// CONTENT ANALYTICS
-- ============================================================
CREATE TABLE IF NOT EXISTS cs_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Analytics
  analytics_code VARCHAR(50) UNIQUE NOT NULL,

  -- Content Reference
  content_type VARCHAR(30) NOT NULL,
  content_id UUID,
  content_name VARCHAR(200),

  -- Metrics
  views INTEGER DEFAULT 0,
  unique_views INTEGER DEFAULT 0,
  avg_time_seconds INTEGER DEFAULT 0,
  bounce_rate DECIMAL(5, 2),
  exits INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,

  -- Conversions
  conversions INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5, 2),
  revenue DECIMAL(14, 2) DEFAULT 0,

  -- Top Search Terms
  top_search_terms JSONB DEFAULT '[]',

  -- Period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(content_type, content_id, period_start)
);

-- ============================================================
// A/B TESTS
-- ============================================================
CREATE TABLE IF NOT EXISTS cs_ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Test
  test_code VARCHAR(50) UNIQUE NOT NULL,
  test_name VARCHAR(200) NOT NULL,

  -- Content Reference
  content_type VARCHAR(30) NOT NULL,
  content_id UUID,

  -- Variants
  variants JSONB DEFAULT '[]', -- [{id, name, config, weight, views, conversions}]

  -- Status
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'running', 'completed', 'archived'

  -- Distribution
  traffic_percentage INTEGER DEFAULT 100,

  -- Schedule
  start_date TIMESTAMP,
  end_date TIMESTAMP,

  -- Winner
  winner_variant_id VARCHAR(50),
  confidence_level DECIMAL(5, 2),

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
// CONTENT WORKFLOW
-- ============================================================
CREATE TABLE IF NOT EXISTS cs_workflow_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Log
  log_code VARCHAR(50) UNIQUE NOT NULL,

  -- Content Reference
  content_type VARCHAR(30) NOT NULL,
  content_id UUID,
  content_name VARCHAR(200),

  -- Action
  action VARCHAR(30) NOT NULL, -- 'created', 'submitted', 'approved', 'rejected', 'published', 'unpublished', 'archived'

  -- Actor
  actor_id UUID,
  actor_name VARCHAR(100),
  actor_role VARCHAR(50),

  -- Comment
  comment TEXT,

  -- Previous/Next State
  previous_status VARCHAR(20),
  new_status VARCHAR(20),

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_workflow_content ON cs_workflow_logs(content_type, content_id);
CREATE INDEX idx_workflow_actor ON cs_workflow_logs(actor_id);

-- ============================================================
// USER PERMISSIONS (Content Studio)
-- ============================================================
CREATE TABLE IF NOT EXISTS cs_user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User
  user_id UUID NOT NULL,
  user_email VARCHAR(200) NOT NULL,
  user_name VARCHAR(100),

  -- Role
  role VARCHAR(30) NOT NULL, -- 'creator', 'reviewer', 'editor', 'publisher', 'admin'

  -- Permissions
  can_create BOOLEAN DEFAULT false,
  can_edit_own BOOLEAN DEFAULT false,
  can_edit_all BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  can_submit_review BOOLEAN DEFAULT false,
  can_approve BOOLEAN DEFAULT false,
  can_publish BOOLEAN DEFAULT false,
  can_archive BOOLEAN DEFAULT false,
  can_manage_media BOOLEAN DEFAULT false,
  can_manage_campaigns BOOLEAN DEFAULT false,
  can_view_analytics BOOLEAN DEFAULT false,
  can_manage_users BOOLEAN DEFAULT false,
  can_manage_settings BOOLEAN DEFAULT false,

  -- Content Type Permissions
  content_types JSONB DEFAULT '[]', -- ['blog', 'news', 'landing_page']

  -- Scope
  scope_countries JSONB DEFAULT '[]',

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
// MEDIA LIBRARY
-- ============================================================
CREATE TABLE IF NOT EXISTS cs_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Media
  media_code VARCHAR(50) UNIQUE NOT NULL,
  file_name VARCHAR(200) NOT NULL,
  original_name VARCHAR(200),

  -- Type
  media_type VARCHAR(30) NOT NULL, -- 'image', 'video', 'document', 'svg', 'icon'
  mime_type VARCHAR(100),

  -- URLs
  url VARCHAR(500) NOT NULL,
  thumbnail_url VARCHAR(500),
  optimized_url VARCHAR(500),

  -- Dimensions
  width INTEGER,
  height INTEGER,
  file_size INTEGER,
  duration_seconds INTEGER,

  -- Organization
  folder VARCHAR(200),
  tags JSONB DEFAULT '[]',

  -- SEO
  alt_text VARCHAR(200),
  caption TEXT,

  -- Usage
  usage_count INTEGER DEFAULT 0,
  used_in JSONB DEFAULT '[]',

  -- Compression
  original_file_size INTEGER,
  compression_applied BOOLEAN DEFAULT false,

  -- Status
  status VARCHAR(20) DEFAULT 'active',

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_media_type ON cs_media(media_type);
CREATE INDEX idx_media_folder ON cs_media(folder);

-- ============================================================
// SEO CONFIGURATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS cs_seo_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Config
  config_code VARCHAR(50) UNIQUE NOT NULL,

  -- Global
  site_name VARCHAR(200),
  site_tagline VARCHAR(300),

  -- Defaults
  default_meta_title VARCHAR(200),
  default_meta_description TEXT,
  default_og_image VARCHAR(500),

  -- Social
  twitter_handle VARCHAR(50),
  facebook_app_id VARCHAR(50),

  -- Robots
  robots_txt TEXT,
  sitemap_enabled BOOLEAN DEFAULT true,
  auto_sitemap BOOLEAN DEFAULT true,

  -- Schema
  organization_schema JSONB DEFAULT '{}',
  website_schema JSONB DEFAULT '{}',

  -- Analytics
  google_analytics_id VARCHAR(50),
  google_tag_manager_id VARCHAR(50),

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
// REDIRECTS
-- ============================================================
CREATE TABLE IF NOT EXISTS cs_redirects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Redirect
  redirect_code VARCHAR(50) UNIQUE NOT NULL,

  -- URLs
  from_url VARCHAR(500) NOT NULL,
  to_url VARCHAR(500) NOT NULL,

  -- Type
  redirect_type VARCHAR(20) DEFAULT '301', -- '301', '302', '307'

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Stats
  hit_count INTEGER DEFAULT 0,
  last_hit_at TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
// TRANSLATIONS / MULTILINGUAL
-- ============================================================
CREATE TABLE IF NOT EXISTS cs_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Translation
  translation_code VARCHAR(50) UNIQUE NOT NULL,

  -- Content Reference
  content_type VARCHAR(30) NOT NULL,
  content_id UUID,

  -- Language
  language_code VARCHAR(10) NOT NULL, -- 'en', 'sw', 'fr'

  -- Translation
  translated_content JSONB NOT NULL, -- {title, content, meta_title, etc.}

  -- Status
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'review', 'published'

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(content_type, content_id, language_code)
);
