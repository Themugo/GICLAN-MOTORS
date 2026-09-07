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
