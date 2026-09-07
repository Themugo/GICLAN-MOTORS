-- KAYAD Advertising domain: canonical persisted ad slots + delivery metrics.
create table if not exists public.ad_slots (
  id uuid primary key default gen_random_uuid(),
  placement text not null check (placement in ('top_ticker','left_rail','right_rail','mid_grid','sidebar')),
  title text not null,
  tagline text,
  price_tag text,
  button_text text,
  button_url text,
  background_color text not null default '#1E3063',
  text_color text not null default '#FFFFFF',
  opacity numeric(5,2) not null default 100 check (opacity >= 0 and opacity <= 100),
  is_visible boolean not null default true,
  status text not null default 'active' check (status in ('draft','active','paused','expired')),
  start_at timestamptz,
  end_at timestamptz,
  sort_order integer not null default 0,
  impressions bigint not null default 0 check (impressions >= 0),
  clicks bigint not null default 0 check (clicks >= 0),
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ad_slots_dates_valid check (end_at is null or start_at is null or end_at > start_at),
  constraint ad_slots_button_url_valid check (button_url is null or button_url ~* '^https?://')
);
create index if not exists idx_ad_slots_public on public.ad_slots (placement, is_visible, status, sort_order);
create index if not exists idx_ad_slots_schedule on public.ad_slots (start_at, end_at);

alter table public.ad_slots enable row level security;
drop policy if exists ad_slots_public_read on public.ad_slots;
create policy ad_slots_public_read on public.ad_slots for select using (is_visible = true and status = 'active');
drop policy if exists ad_slots_admin_all on public.ad_slots;
create policy ad_slots_admin_all on public.ad_slots for all using (public.is_admin()) with check (public.is_admin());
