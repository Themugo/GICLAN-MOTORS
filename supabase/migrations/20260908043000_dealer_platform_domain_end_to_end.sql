-- KAYAD Dealer Platform domain: CRM activity, marketing, workforce lifecycle and finance contract.

create table if not exists public.marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  dealer uuid not null references public.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 160),
  campaign_type text not null check (campaign_type in ('promotion','listing','brand','event','social')),
  description text,
  budget numeric(14,2) not null default 0 check (budget >= 0),
  status text not null default 'draft' check (status in ('draft','scheduled','active','paused','completed','archived')),
  start_date timestamptz,
  end_date timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);
create index if not exists marketing_campaigns_dealer_status_idx on public.marketing_campaigns(dealer,status,created_at desc);

create table if not exists public.loan_applications (
  id uuid primary key default gen_random_uuid(),
  dealer uuid not null references public.users(id) on delete cascade,
  applicant uuid references public.users(id) on delete set null,
  vehicle uuid references public.cars(id) on delete set null,
  lender text,
  requested_amount numeric(14,2) not null default 0 check (requested_amount >= 0),
  approved_amount numeric(14,2) check (approved_amount is null or approved_amount >= 0),
  status text not null default 'submitted' check (status in ('submitted','under_review','approved','declined','disbursed')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists loan_applications_dealer_status_idx on public.loan_applications(dealer,status,created_at desc);
create index if not exists loan_applications_applicant_idx on public.loan_applications(applicant,created_at desc);

alter table public.marketing_campaigns enable row level security;
alter table public.loan_applications enable row level security;

drop policy if exists marketing_campaigns_dealer_select on public.marketing_campaigns;
create policy marketing_campaigns_dealer_select on public.marketing_campaigns for select using (auth.uid() = dealer);
drop policy if exists marketing_campaigns_service_only on public.marketing_campaigns;
create policy marketing_campaigns_service_only on public.marketing_campaigns for all using (false) with check (false);

drop policy if exists loan_applications_dealer_select on public.loan_applications;
create policy loan_applications_dealer_select on public.loan_applications for select using (auth.uid() = dealer or auth.uid() = applicant);
drop policy if exists loan_applications_service_only on public.loan_applications;
create policy loan_applications_service_only on public.loan_applications for all using (false) with check (false);

comment on table public.marketing_campaigns is 'Canonical dealer marketing campaign configuration. Performance metrics must come from real tracked events; configuration rows never fabricate impressions/clicks/ROI.';
comment on table public.loan_applications is 'Canonical dealer-scoped finance application contract; lender/application workflows may populate this table through trusted services.';

-- Existing workforce policy allowed a member to update their own row, which could
-- include role/permissions. Dealer ownership is the authoritative mutation boundary.
drop policy if exists dealer_teams_owner_update on public.dealer_teams;
create policy dealer_teams_owner_update on public.dealer_teams for update using (auth.uid() = dealer) with check (auth.uid() = dealer);
