-- KAYAD CMS FOUNDATION
-- Reconciles the previously standalone CMS schema with the canonical
-- Supabase migration chain. All objects are idempotent so this migration
-- remains safe if a partial environment already contains older CMS tables.

-- ============================================================
-- KAYAD WEBSITE BUILDER / CMS - DATABASE SCHEMA
-- Dynamic frontend rendering from database
-- ============================================================

-- ============================================================
-- PAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cms_pages (
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

CREATE INDEX IF NOT EXISTS idx_page_status ON public.cms_pages(status);
CREATE INDEX IF NOT EXISTS idx_page_slug ON public.cms_pages(slug);

-- ============================================================
-- PAGE SECTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cms_page_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Page
  page_id UUID REFERENCES public.cms_pages(id) ON DELETE CASCADE,

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

CREATE INDEX IF NOT EXISTS idx_section_page ON public.cms_page_sections(page_id);
CREATE INDEX IF NOT EXISTS idx_section_order ON public.cms_page_sections(ordering);

-- ============================================================
-- NAVIGATION
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cms_navigation (
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
-- NAVIGATION ITEMS (Structured)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cms_nav_items (
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

CREATE INDEX IF NOT EXISTS idx_nav_item_nav ON public.cms_nav_items(nav_id);

-- ============================================================
-- HERO SECTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cms_hero_sections (
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
-- CONTENT BLOCKS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cms_content_blocks (
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
-- CAR CARDS / LISTINGS CONFIG
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cms_car_card_configs (
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
-- THEME CONFIGURATION
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cms_theme_configs (
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
-- POPUPS / MODALS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cms_popups (
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
-- MEDIA LIBRARY
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cms_media (
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

CREATE INDEX IF NOT EXISTS idx_media_type ON public.cms_media(media_type);
CREATE INDEX IF NOT EXISTS idx_media_folder ON public.cms_media(folder);

-- ============================================================
-- FORMS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cms_forms (
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
-- FOOTER CONFIG
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cms_footer_configs (
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
-- SEO CONFIG
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cms_seo_configs (
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
-- CONTENT VERSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cms_content_versions (
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

CREATE INDEX IF NOT EXISTS idx_version_content ON public.cms_content_versions(content_type, content_id);

-- ============================================================
-- WEBSITE SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cms_website_settings (
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
-- ANNOUNCEMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cms_announcements (
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


-- Compatibility persistence for the legacy CMS website-settings service.
-- The canonical CMS domain uses cms_website_settings for key/value records;
-- this table preserves the older flat settings API until that service is
-- fully converged on the canonical model.
CREATE TABLE IF NOT EXISTS public.website_settings (
  id uuid primary key default gen_random_uuid(),
  website_name varchar(200) not null default 'KAYAD',
  website_tagline varchar(500) not null default 'Africa''s Smartest Automotive Platform',
  primary_color varchar(30) not null default '#1e3a5f',
  secondary_color varchar(30) not null default '#64748b',
  accent_color varchar(30) not null default '#c4a484',
  success_color varchar(30) not null default '#10b981',
  warning_color varchar(30) not null default '#f59e0b',
  danger_color varchar(30) not null default '#ef4444',
  background_color varchar(30) not null default '#f5f0e8',
  surface_color varchar(30) not null default '#ffffff',
  container_max_width varchar(30) not null default '1280px',
  font_family varchar(200) not null default 'Inter, sans-serif',
  button_style varchar(50) not null default 'rounded',
  card_style varchar(50) not null default 'elevated',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_website_settings_active ON public.website_settings(id) WHERE is_active;

-- KAYAD CMS + Website Builder domain
-- Canonical persistence for Content Studio and Visual Page Builder.

alter table if exists public.cms_pages
  add column if not exists title varchar(300),
  add column if not exists content jsonb not null default '[]'::jsonb,
  add column if not exists seo jsonb not null default '{}'::jsonb,
  add column if not exists schedule_at timestamptz,
  add column if not exists target_audience jsonb not null default '{}'::jsonb,
  add column if not exists personalization jsonb not null default '{}'::jsonb,
  add column if not exists created_by uuid,
  add column if not exists updated_by uuid;

update public.cms_pages set title = coalesce(title, page_name) where title is null;

create or replace function public.kayad_sync_cms_page_name()
returns trigger language plpgsql as $$
begin
  if new.title is null or btrim(new.title) = '' then
    new.title := new.page_name;
  end if;
  if new.title is not null then
    new.page_name := new.title;
  end if;
  if new.page_type is null or btrim(new.page_type) = '' then
    new.page_type := 'custom';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_kayad_sync_cms_page_name on public.cms_pages;
create trigger trg_kayad_sync_cms_page_name
before insert or update on public.cms_pages
for each row execute function public.kayad_sync_cms_page_name();

create table if not exists public.cms_contents (
  id uuid primary key default gen_random_uuid(),
  title varchar(300) not null,
  slug varchar(220) not null unique,
  content_type varchar(40) not null default 'article',
  body text not null default '',
  excerpt text not null default '',
  featured_image varchar(500) not null default '',
  category varchar(120) not null default '',
  tags jsonb not null default '[]'::jsonb,
  author uuid,
  seo jsonb not null default '{}'::jsonb,
  status varchar(20) not null default 'draft' check (status in ('draft','scheduled','published','archived')),
  schedule_at timestamptz,
  featured boolean not null default false,
  related_articles jsonb not null default '[]'::jsonb,
  reading_time integer not null default 0,
  version integer not null default 1,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create table if not exists public.cms_faqs (
  id uuid primary key default gen_random_uuid(),
  question varchar(500) not null,
  answer text not null,
  category varchar(120) not null default 'general',
  "order" integer not null default 0,
  popularity integer not null default 0,
  related_questions jsonb not null default '[]'::jsonb,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cms_campaigns (
  id uuid primary key default gen_random_uuid(),
  name varchar(250) not null,
  campaign_type varchar(50) not null default 'promotion',
  description text not null default '',
  discount jsonb not null default '{}'::jsonb,
  banner jsonb not null default '{}'::jsonb,
  start_date timestamptz not null default now(),
  end_date timestamptz,
  target_audience jsonb not null default '{}'::jsonb,
  status varchar(20) not null default 'draft' check (status in ('draft','scheduled','active','paused','completed','archived')),
  highlights jsonb not null default '[]'::jsonb,
  terms text not null default '',
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cms_banners (
  id uuid primary key default gen_random_uuid(),
  title varchar(300) not null,
  banner_type varchar(40) not null default 'hero',
  desktop_image varchar(500) not null default '',
  tablet_image varchar(500) not null default '',
  mobile_image varchar(500) not null default '',
  link varchar(500) not null default '',
  target_audience jsonb not null default '{}'::jsonb,
  status varchar(20) not null default 'draft' check (status in ('draft','scheduled','active','paused','expired','archived')),
  "order" integer not null default 0,
  schedule_at timestamptz,
  schedule_end timestamptz,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cms_taxonomies (
  id uuid primary key default gen_random_uuid(),
  name varchar(180) not null,
  slug varchar(200) not null,
  taxonomy_type varchar(40) not null default 'category',
  description text not null default '',
  parent uuid references public.cms_taxonomies(id) on delete set null,
  "order" integer not null default 0,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (taxonomy_type, slug)
);

create table if not exists public.cms_revisions (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null,
  content_type varchar(40) not null,
  version integer not null,
  data jsonb not null default '{}'::jsonb,
  note text,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (content_id, content_type, version)
);

create table if not exists public.cms_ab_tests (
  id uuid primary key default gen_random_uuid(),
  name varchar(250) not null,
  content_id uuid,
  content_type varchar(40),
  variants jsonb not null default '[]'::jsonb,
  metric varchar(50) not null default 'conversion',
  status varchar(20) not null default 'draft' check (status in ('draft','running','paused','completed','archived')),
  results jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cms_analytics (
  id uuid primary key default gen_random_uuid(),
  content_id uuid,
  content_type varchar(40),
  event varchar(40) not null,
  metadata jsonb not null default '{}'::jsonb,
  user_id uuid,
  timestamp timestamptz not null default now()
);

create index if not exists idx_cms_pages_status_updated on public.cms_pages(status, updated_at desc);
create index if not exists idx_cms_pages_slug_status on public.cms_pages(slug, status);
create index if not exists idx_cms_contents_status_published on public.cms_contents(status, published_at desc);
create index if not exists idx_cms_contents_type_status on public.cms_contents(content_type, status);
create index if not exists idx_cms_faqs_category_order on public.cms_faqs(category, "order");
create index if not exists idx_cms_campaigns_status_dates on public.cms_campaigns(status, start_date, end_date);
create index if not exists idx_cms_banners_status_order on public.cms_banners(status, "order");
create index if not exists idx_cms_revisions_content_version on public.cms_revisions(content_id, content_type, version desc);
create index if not exists idx_cms_analytics_content_time on public.cms_analytics(content_id, timestamp desc);

alter table public.cms_pages enable row level security;
alter table public.cms_contents enable row level security;
alter table public.cms_faqs enable row level security;
alter table public.cms_campaigns enable row level security;
alter table public.cms_banners enable row level security;
alter table public.cms_taxonomies enable row level security;
alter table public.cms_revisions enable row level security;
alter table public.cms_ab_tests enable row level security;
alter table public.cms_analytics enable row level security;

-- Public reads are limited to published/active material. Admin mutations remain
-- server-side through the existing protected API; no public write policy is added.
drop policy if exists cms_pages_public_read on public.cms_pages;
create policy cms_pages_public_read on public.cms_pages for select using (status = 'published');
drop policy if exists cms_contents_public_read on public.cms_contents;
create policy cms_contents_public_read on public.cms_contents for select using (status = 'published');
drop policy if exists cms_faqs_public_read on public.cms_faqs;
create policy cms_faqs_public_read on public.cms_faqs for select using (true);
drop policy if exists cms_banners_public_read on public.cms_banners;
create policy cms_banners_public_read on public.cms_banners for select using (status = 'active');

-- Harden the legacy website-builder tables under the same server-side CMS
-- security boundary. The public application only needs published/active
-- content; administrative writes continue through the protected backend
-- using the Supabase service role.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'cms_pages','cms_page_sections','cms_navigation','cms_nav_items',
    'cms_hero_sections','cms_content_blocks','cms_car_card_configs',
    'cms_theme_configs','cms_popups','cms_media','cms_forms',
    'cms_footer_configs','cms_seo_configs','cms_content_versions',
    'cms_website_settings','cms_announcements','website_settings'
  ] LOOP
    EXECUTE format('alter table public.%I enable row level security', t);
  END LOOP;
END $$;

drop policy if exists cms_page_sections_public_read on public.cms_page_sections;
create policy cms_page_sections_public_read on public.cms_page_sections
  for select using (is_active = true and is_visible = true);

drop policy if exists cms_navigation_public_read on public.cms_navigation;
create policy cms_navigation_public_read on public.cms_navigation
  for select using (is_active = true);

drop policy if exists cms_nav_items_public_read on public.cms_nav_items;
create policy cms_nav_items_public_read on public.cms_nav_items
  for select using (is_active = true and is_visible = true);

drop policy if exists cms_hero_sections_public_read on public.cms_hero_sections;
create policy cms_hero_sections_public_read on public.cms_hero_sections
  for select using (is_active = true);

drop policy if exists cms_content_blocks_public_read on public.cms_content_blocks;
create policy cms_content_blocks_public_read on public.cms_content_blocks
  for select using (is_active = true);

drop policy if exists cms_car_card_configs_public_read on public.cms_car_card_configs;
create policy cms_car_card_configs_public_read on public.cms_car_card_configs
  for select using (is_active = true);

drop policy if exists cms_theme_configs_public_read on public.cms_theme_configs;
create policy cms_theme_configs_public_read on public.cms_theme_configs
  for select using (is_active = true);

drop policy if exists cms_popups_public_read on public.cms_popups;
create policy cms_popups_public_read on public.cms_popups
  for select using (status = 'active');

drop policy if exists cms_media_public_read on public.cms_media;
create policy cms_media_public_read on public.cms_media
  for select using (status = 'active');

drop policy if exists cms_forms_public_read on public.cms_forms;
create policy cms_forms_public_read on public.cms_forms
  for select using (status = 'active');

drop policy if exists cms_footer_configs_public_read on public.cms_footer_configs;
create policy cms_footer_configs_public_read on public.cms_footer_configs
  for select using (is_active = true);

drop policy if exists cms_seo_configs_public_read on public.cms_seo_configs;
create policy cms_seo_configs_public_read on public.cms_seo_configs
  for select using (is_active = true);

drop policy if exists cms_website_settings_public_read on public.cms_website_settings;
create policy cms_website_settings_public_read on public.cms_website_settings
  for select using (true);

drop policy if exists cms_announcements_public_read on public.cms_announcements;
create policy cms_announcements_public_read on public.cms_announcements
  for select using (status = 'active');

drop policy if exists website_settings_public_read on public.website_settings;
create policy website_settings_public_read on public.website_settings
  for select using (is_active = true);

-- Version and analytics records are internal implementation/audit data and
-- deliberately receive no public SELECT policy.
alter table public.cms_content_versions enable row level security;
alter table public.cms_revisions enable row level security;
alter table public.cms_ab_tests enable row level security;
alter table public.cms_analytics enable row level security;

create unique index if not exists idx_cms_navigation_code_unique
  on public.cms_navigation(nav_code);
