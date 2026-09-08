-- ============================================================
// KAYAD WEBSITE BUILDER / CMS - DATABASE SCHEMA
// Dynamic frontend rendering from database
-- ============================================================

-- ============================================================
// PAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS cms_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Page
  page_code VARCHAR(50) UNIQUE NOT NULL,
  page_name VARCHAR(200) NOT NULL,
  page_type VARCHAR(30) NOT NULL, -- 'homepage', 'marketplace', 'auction', 'inspection', 'dealers', 'about', 'contact', 'custom'

  -- Slug
  slug VARCHAR(200) UNIQUE NOT NULL,

  -- Status
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'published', 'archived'

  -- Layout
  layout_code VARCHAR(50),

  -- SEO
  meta_title VARCHAR(200),
  meta_description TEXT,
  og_image_url VARCHAR(500),
  canonical_url VARCHAR(500),
  robots VARCHAR(50) DEFAULT 'index,follow',
  schema_markup JSONB DEFAULT '{}',

  -- Version
  version INTEGER DEFAULT 1,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  published_at TIMESTAMP
);

CREATE INDEX idx_page_status ON cms_pages(status);
CREATE INDEX idx_page_slug ON cms_pages(slug);

-- ============================================================
// PAGE SECTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS cms_page_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Page
  page_id UUID REFERENCES cms_pages(id) ON DELETE CASCADE,

  -- Section
  section_code VARCHAR(50) NOT NULL,
  section_type VARCHAR(50) NOT NULL, -- 'hero', 'featured_cars', 'search', 'banner', 'stats', 'testimonials', 'partners', 'footer', 'custom'

  -- Content
  title VARCHAR(300),
  subtitle VARCHAR(500),
  content JSONB DEFAULT '{}',

  -- Layout
  ordering INTEGER DEFAULT 0,

  -- Visibility
  is_visible BOOLEAN DEFAULT true,
  show_on_mobile BOOLEAN DEFAULT true,
  show_on_desktop BOOLEAN DEFAULT true,

  -- Scheduling
  schedule_start TIMESTAMP,
  schedule_end TIMESTAMP,

  -- Styling
  background_color VARCHAR(20),
  background_image VARCHAR(500),
  padding_top VARCHAR(20),
  padding_bottom VARCHAR(20),
  custom_css TEXT,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_section_page ON cms_page_sections(page_id);
CREATE INDEX idx_section_order ON cms_page_sections(ordering);

-- ============================================================
// NAVIGATION
-- ============================================================
CREATE TABLE IF NOT EXISTS cms_navigation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Navigation
  nav_code VARCHAR(50) NOT NULL, -- 'main', 'footer', 'mobile', 'top_bar'
  nav_name VARCHAR(100) NOT NULL,

  -- Items stored as JSON for flexibility
  items JSONB DEFAULT '[]',

  -- Settings
  settings JSONB DEFAULT '{}', -- sticky, transparent, etc.

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
// NAVIGATION ITEMS (Structured)
-- ============================================================
CREATE TABLE IF NOT EXISTS cms_nav_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Navigation
  nav_id UUID REFERENCES cms_navigation(id) ON DELETE CASCADE,

  -- Item
  item_code VARCHAR(50) NOT NULL,
  label VARCHAR(200) NOT NULL,
  url VARCHAR(500),

  -- Type
  item_type VARCHAR(20) DEFAULT 'link', -- 'link', 'dropdown', 'mega_menu', 'button', 'divider'

  -- Icon
  icon VARCHAR(50),
  badge VARCHAR(50),

  -- Parent
  parent_id UUID REFERENCES cms_nav_items(id),

  -- Visibility
  is_visible BOOLEAN DEFAULT true,
  show_on_mobile BOOLEAN DEFAULT true,
  show_on_desktop BOOLEAN DEFAULT true,

  -- Permission
  requires_permission VARCHAR(50),
  requires_role VARCHAR(50),

  -- Styling
  custom_class VARCHAR(100),
  highlight_color VARCHAR(20),

  -- Order
  ordering INTEGER DEFAULT 0,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_nav_item_nav ON cms_nav_items(nav_id);

-- ============================================================
// HERO SECTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS cms_hero_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Hero
  hero_code VARCHAR(50) UNIQUE NOT NULL,
  section_id UUID REFERENCES cms_page_sections(id) ON DELETE CASCADE,

  -- Content
  headline VARCHAR(300),
  subtitle VARCHAR(500),
  cta_text VARCHAR(100),
  cta_url VARCHAR(500),
  secondary_cta_text VARCHAR(100),
  secondary_cta_url VARCHAR(500),

  -- Background
  background_type VARCHAR(20) DEFAULT 'gradient', -- 'gradient', 'image', 'video'
  background_value VARCHAR(500), -- image URL or gradient colors
  overlay_opacity INTEGER DEFAULT 40,

  -- Slides (for carousel)
  slides JSONB DEFAULT '[]',

  -- Search Card
  show_search_card BOOLEAN DEFAULT true,
  search_card_config JSONB DEFAULT '{}',

  -- Stats
  stats JSONB DEFAULT '[]', -- [{label, value, icon}]

  -- Styling
  text_alignment VARCHAR(10) DEFAULT 'center', -- 'left', 'center', 'right'
  text_color VARCHAR(20) DEFAULT 'white',

  -- Animation
  animation_type VARCHAR(30) DEFAULT 'fade', -- 'fade', 'slide', 'none'

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
// CONTENT BLOCKS
-- ============================================================
CREATE TABLE IF NOT EXISTS cms_content_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Block
  block_code VARCHAR(50) UNIQUE NOT NULL,
  block_name VARCHAR(200) NOT NULL,
  block_type VARCHAR(30) NOT NULL, -- 'text', 'image', 'video', 'button', 'card', 'grid', 'form', 'map', 'chart'

  -- Content
  title VARCHAR(300),
  content TEXT,
  media_url VARCHAR(500),
  media_alt VARCHAR(200),

  -- Configuration
  config JSONB DEFAULT '{}',

  -- Layout
  width VARCHAR(20) DEFAULT 'full', -- 'full', 'container', 'narrow'
  alignment VARCHAR(10) DEFAULT 'left',

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
// CAR CARDS / LISTINGS CONFIG
-- ============================================================
CREATE TABLE IF NOT EXISTS cms_car_card_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Config
  config_code VARCHAR(50) UNIQUE NOT NULL,
  config_name VARCHAR(200) NOT NULL,

  -- Display Settings
  card_style VARCHAR(20) DEFAULT 'default', -- 'default', 'compact', 'premium', 'list'
  card_height VARCHAR(20) DEFAULT 'auto',
  image_ratio VARCHAR(20) DEFAULT '16:9',
  rounded_corners VARCHAR(10) DEFAULT 'lg',

  -- Fields to Show
  fields_to_show JSONB DEFAULT '["photo", "price", "title", "location", "mileage", "transmission"]',
  fields_order JSONB DEFAULT '[]',

  -- Badges
  show_inspection_badge BOOLEAN DEFAULT true,
  show_finance_badge BOOLEAN DEFAULT true,
  show_escrow_badge BOOLEAN DEFAULT true,
  show_warranty_badge BOOLEAN DEFAULT true,
  badge_position VARCHAR(20) DEFAULT 'top-left',

  -- Quick Actions
  show_wishlist BOOLEAN DEFAULT true,
  show_compare BOOLEAN DEFAULT true,
  show_quick_view BOOLEAN DEFAULT true,

  -- Layout
  columns_desktop INTEGER DEFAULT 4,
  columns_tablet INTEGER DEFAULT 2,
  columns_mobile INTEGER DEFAULT 1,
  gap VARCHAR(10) DEFAULT '4',

  -- Pagination
  pagination_type VARCHAR(20) DEFAULT 'numbered', -- 'numbered', 'load_more', 'infinite'
  items_per_page INTEGER DEFAULT 20,

  -- Hover Effects
  hover_effect VARCHAR(20) DEFAULT 'zoom',

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
// THEME CONFIGURATION
-- ============================================================
CREATE TABLE IF NOT EXISTS cms_theme_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Theme
  theme_code VARCHAR(50) UNIQUE NOT NULL,
  theme_name VARCHAR(200) NOT NULL,
  is_default BOOLEAN DEFAULT false,

  -- Colors
  colors JSONB DEFAULT '{
    "primary": "#1e3a5f",
    "secondary": "#64748b",
    "accent": "#c4a484",
    "success": "#10b981",
    "warning": "#f59e0b",
    "danger": "#ef4444",
    "info": "#3b82f6",
    "background": "#f5f0e8",
    "surface": "#ffffff",
    "text": "#1f2937",
    "textMuted": "#64748b",
    "border": "#e5e7eb"
  }',

  -- Typography
  typography JSONB DEFAULT '{
    "fontFamily": "Inter, sans-serif",
    "headingFont": "Inter, sans-serif",
    "headingWeights": [600, 700],
    "bodyWeight": 400,
    "baseSize": 16,
    "scale": 1.25
  }',

  -- Spacing
  spacing JSONB DEFAULT '{
    "unit": "px",
    "scale": [0, 4, 8, 16, 24, 32, 48, 64, 96]
  }',

  -- Border Radius
  border_radius JSONB DEFAULT '{
    "sm": "4px",
    "md": "8px",
    "lg": "12px",
    "xl": "16px",
    "full": "9999px"
  }',

  -- Shadows
  shadows JSONB DEFAULT '{
    "sm": "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    "md": "0 4px 6px -1px rgb(0 0 0 / 0.1)",
    "lg": "0 10px 15px -3px rgb(0 0 0 / 0.1)"
  }',

  -- Buttons
  buttons JSONB DEFAULT '{
    "primary": {"background": "#1e3a5f", "color": "#ffffff", "radius": "lg"},
    "secondary": {"background": "#f5f0e8", "color": "#1e3a5f", "radius": "lg"}
  }',

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
// POPUPS / MODALS
-- ============================================================
CREATE TABLE IF NOT EXISTS cms_popups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Popup
  popup_code VARCHAR(50) UNIQUE NOT NULL,
  popup_name VARCHAR(200) NOT NULL,

  -- Content
  title VARCHAR(300),
  content TEXT,
  image_url VARCHAR(500),
  cta_text VARCHAR(100),
  cta_url VARCHAR(500),

  -- Type
  popup_type VARCHAR(30) DEFAULT 'announcement', -- 'announcement', 'offer', 'maintenance', 'countdown', 'newsletter'

  -- Display Settings
  size VARCHAR(20) DEFAULT 'medium', -- 'small', 'medium', 'large', 'fullscreen'
  position VARCHAR(20) DEFAULT 'center',

  -- Scheduling
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  display_frequency VARCHAR(20) DEFAULT 'once', -- 'once', 'daily', 'always'

  -- Behavior
  auto_open BOOLEAN DEFAULT false,
  auto_open_delay INTEGER DEFAULT 0,
  show_close_button BOOLEAN DEFAULT true,
  close_on_overlay_click BOOLEAN DEFAULT true,

  -- Targeting
  target_pages JSONB DEFAULT '[]', -- page codes
  target_users VARCHAR(20) DEFAULT 'all', -- 'all', 'new', 'logged_in'

  -- Status
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'active', 'paused', 'ended'

  -- Stats
  impressions INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
// MEDIA LIBRARY
-- ============================================================
CREATE TABLE IF NOT EXISTS cms_media (
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

  -- Folder
  folder VARCHAR(200),
  tags JSONB DEFAULT '[]',

  -- Alt & SEO
  alt_text VARCHAR(200),
  caption TEXT,

  -- Usage
  usage_count INTEGER DEFAULT 0,

  -- Status
  status VARCHAR(20) DEFAULT 'active',

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_media_type ON cms_media(media_type);
CREATE INDEX idx_media_folder ON cms_media(folder);

-- ============================================================
// FORMS
-- ============================================================
CREATE TABLE IF NOT EXISTS cms_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Form
  form_code VARCHAR(50) UNIQUE NOT NULL,
  form_name VARCHAR(200) NOT NULL,
  form_type VARCHAR(30) NOT NULL, -- 'contact', 'dealer_registration', 'inspection_request', 'finance_request', 'support', 'newsletter', 'custom'

  -- Configuration
  fields JSONB DEFAULT '[]', -- [{type, name, label, required, options, validation}]
  submit_button_text VARCHAR(100),
  success_message TEXT,
  redirect_url VARCHAR(500),

  -- Email Notification
  notify_email VARCHAR(200),
  notify_template VARCHAR(50),

  -- Auto Response
  auto_response_enabled BOOLEAN DEFAULT false,
  auto_response_subject VARCHAR(200),
  auto_response_body TEXT,

  -- Settings
  captcha_enabled BOOLEAN DEFAULT true,
  submissions_limit INTEGER,

  -- Status
  status VARCHAR(20) DEFAULT 'active',

  -- Stats
  total_submissions INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
// FOOTER CONFIG
-- ============================================================
CREATE TABLE IF NOT EXISTS cms_footer_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Footer
  footer_code VARCHAR(50) UNIQUE NOT NULL,
  config_name VARCHAR(200) NOT NULL,

  -- Columns
  columns JSONB DEFAULT '[]', -- [{title, links: [{label, url}]}]

  -- Bottom Bar
  copyright_text TEXT,
  policies JSONB DEFAULT '[]', -- privacy, terms, cookies
  social_links JSONB DEFAULT '[]',

  -- App Download
  show_app_download BOOLEAN DEFAULT false,
  app_store_urls JSONB DEFAULT '{}',

  -- Newsletter
  show_newsletter BOOLEAN DEFAULT true,
  newsletter_placeholder VARCHAR(100),
  newsletter_button_text VARCHAR(50),

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
// SEO CONFIG
-- ============================================================
CREATE TABLE IF NOT EXISTS cms_seo_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Config
  config_code VARCHAR(50) UNIQUE NOT NULL,

  -- Global SEO
  site_name VARCHAR(200),
  site_tagline VARCHAR(300),
  site_logo_url VARCHAR(500),

  -- Defaults
  default_meta_title VARCHAR(200),
  default_meta_description TEXT,
  default_og_image VARCHAR(500),

  -- Robots
  robots_txt TEXT,
  sitemap_enabled BOOLEAN DEFAULT true,
  sitemap_urls JSONB DEFAULT '[]',

  -- Schema
  organization_schema JSONB DEFAULT '{}',

  -- Analytics
  google_analytics_id VARCHAR(50),
  google_tag_manager_id VARCHAR(50),
  facebook_pixel_id VARCHAR(50),

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
// CONTENT VERSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS cms_content_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Version
  version_code VARCHAR(50) UNIQUE NOT NULL,

  -- Content Type
  content_type VARCHAR(30) NOT NULL, -- 'page', 'navigation', 'theme', 'footer', 'popup'
  content_id UUID,

  -- Snapshot
  snapshot JSONB NOT NULL,

  -- Metadata
  version_number INTEGER NOT NULL,
  change_summary TEXT,

  -- Status
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'published', 'archived'

  -- Author
  created_by UUID,
  created_by_name VARCHAR(100),

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_version_content ON cms_content_versions(content_type, content_id);

-- ============================================================
// WEBSITE SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS cms_website_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Settings
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT,

  -- Category
  category VARCHAR(30) NOT NULL, -- 'general', 'appearance', 'security', 'integrations', 'notifications'

  -- Type
  value_type VARCHAR(20) DEFAULT 'text', -- 'text', 'boolean', 'number', 'json', 'file'

  -- Description
  description TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
// ANNOUNCEMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS cms_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Announcement
  announcement_code VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(300) NOT NULL,
  message TEXT NOT NULL,

  -- Type
  announcement_type VARCHAR(20) DEFAULT 'info', -- 'info', 'warning', 'success', 'error', 'urgent'

  -- Display
  display_location VARCHAR(20) DEFAULT 'top', -- 'top', 'bottom', 'modal'

  -- Scheduling
  start_date TIMESTAMP,
  end_date TIMESTAMP,

  -- Actions
  action_text VARCHAR(100),
  action_url VARCHAR(500),

  -- Status
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'active', 'ended'

  -- Stats
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
