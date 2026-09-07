-- KAYAD Ownership + Digital Vehicle Passport domain.
-- Server-side API uses the service role; direct Data API access is deny-by-default.

create extension if not exists pgcrypto;

create table if not exists public.vehicle_passports (
  id uuid primary key default gen_random_uuid(),
  passport_number varchar(50) unique not null,
  vin varchar(17) unique,
  chassis_number varchar(50),
  engine_number varchar(50),
  registration_number varchar(20),
  make varchar(50) not null,
  model varchar(50) not null,
  trim varchar(50), year integer, body_type varchar(30), colour varchar(30),
  country_of_origin varchar(50), engine_capacity varchar(20), fuel_type varchar(20),
  transmission varchar(20), drive_type varchar(20), vehicle_category varchar(30),
  status varchar(30) not null default 'active',
  is_verified boolean not null default false, verified_at timestamptz,
  verification_level varchar(20) not null default 'basic',
  trust_score numeric(5,2) not null default 0,
  inspection_score numeric(5,2) not null default 0,
  maintenance_score numeric(5,2) not null default 0,
  ownership_score numeric(5,2) not null default 0,
  documentation_score numeric(5,2) not null default 0,
  badges jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists vehicle_passports_chassis_unique on public.vehicle_passports(chassis_number) where chassis_number is not null;
create unique index if not exists vehicle_passports_registration_unique on public.vehicle_passports(registration_number) where registration_number is not null;
create index if not exists vehicle_passports_status_idx on public.vehicle_passports(status);

create table if not exists public.owner_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  owner_since date,
  total_vehicles_owned integer not null default 0,
  preferred_vehicle_id uuid,
  notification_preferences jsonb not null default '{"email":true,"sms":true,"push":true}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists owner_profiles_user_idx on public.owner_profiles(user_id);

create table if not exists public.owner_vehicles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  passport_id uuid references public.vehicle_passports(id) on delete set null,
  vin varchar(17) not null,
  make varchar(50) not null,
  model varchar(50) not null,
  year integer,
  registration_number varchar(20),
  colour varchar(30),
  ownership_type varchar(20) not null default 'current',
  purchase_date date,
  purchase_price numeric(12,2),
  purchase_mileage integer,
  sale_date date,
  sale_price numeric(12,2),
  current_mileage integer,
  current_market_value numeric(12,2),
  value_updated_at timestamptz,
  status varchar(20) not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists owner_vehicles_owner_vin_active_unique on public.owner_vehicles(owner_id, vin) where status = 'active';
create index if not exists owner_vehicles_owner_idx on public.owner_vehicles(owner_id);
create index if not exists owner_vehicles_passport_idx on public.owner_vehicles(passport_id);

create table if not exists public.ownership_service_records (
  id uuid primary key default gen_random_uuid(), owner_vehicle_id uuid not null references public.owner_vehicles(id) on delete cascade,
  service_date date not null, service_type varchar(50) not null, service_title varchar(200) not null,
  service_description text, workshop_name varchar(200), workshop_verified boolean not null default false,
  mileage_at_service integer, service_cost numeric(10,2), invoice_number varchar(50), invoice_url varchar(500),
  documents jsonb not null default '[]'::jsonb, photos jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists ownership_service_vehicle_date_idx on public.ownership_service_records(owner_vehicle_id, service_date desc);

create table if not exists public.ownership_reminders (
  id uuid primary key default gen_random_uuid(), owner_vehicle_id uuid not null references public.owner_vehicles(id) on delete cascade,
  reminder_type varchar(50) not null, title varchar(200) not null, description text, due_date date not null,
  due_mileage integer, is_recurring boolean not null default false, recurrence_interval varchar(20),
  status varchar(20) not null default 'pending', completed_at timestamptz, completed_service_record_id uuid,
  notify_days_before integer not null default 7, notified boolean not null default false, last_notification_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists ownership_reminders_vehicle_due_idx on public.ownership_reminders(owner_vehicle_id, due_date);

create table if not exists public.ownership_expenses (
  id uuid primary key default gen_random_uuid(), owner_vehicle_id uuid not null references public.owner_vehicles(id) on delete cascade,
  expense_date date not null, expense_type varchar(50) not null, description varchar(200), amount numeric(10,2) not null check (amount > 0),
  category varchar(50), receipt_url varchar(500), is_recurring boolean not null default false, recurring_interval varchar(20),
  created_at timestamptz not null default now()
);
create index if not exists ownership_expenses_vehicle_date_idx on public.ownership_expenses(owner_vehicle_id, expense_date desc);

create table if not exists public.ownership_documents (
  id uuid primary key default gen_random_uuid(), owner_vehicle_id uuid not null references public.owner_vehicles(id) on delete cascade,
  document_type varchar(50) not null, title varchar(200) not null, description text, file_name varchar(200), file_type varchar(50),
  file_url varchar(500), file_size integer, is_verified boolean not null default false, verified_at timestamptz,
  status varchar(20) not null default 'active', issue_date date, expiry_date date,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists ownership_documents_vehicle_idx on public.ownership_documents(owner_vehicle_id);

create table if not exists public.travel_logs (
  id uuid primary key default gen_random_uuid(), owner_vehicle_id uuid not null references public.owner_vehicles(id) on delete cascade,
  trip_date date not null, odometer_start integer not null, odometer_end integer not null,
  distance_km numeric(10,2) not null check (distance_km >= 0), fuel_litres numeric(8,2), fuel_cost numeric(10,2), fuel_efficiency numeric(8,2),
  origin varchar(200), destination varchar(200), route_notes text, purpose varchar(50), created_at timestamptz not null default now()
);
create index if not exists travel_logs_vehicle_date_idx on public.travel_logs(owner_vehicle_id, trip_date desc);

create table if not exists public.ownership_alerts (
  id uuid primary key default gen_random_uuid(), owner_vehicle_id uuid not null references public.owner_vehicles(id) on delete cascade,
  alert_type varchar(50) not null, title varchar(200) not null, message text not null,
  severity varchar(10) not null default 'info', action_url varchar(500), action_label varchar(100),
  status varchar(20) not null default 'unread', read_at timestamptz, created_at timestamptz not null default now()
);
create index if not exists ownership_alerts_vehicle_idx on public.ownership_alerts(owner_vehicle_id, created_at desc);

create table if not exists public.value_tracking (
  id uuid primary key default gen_random_uuid(), owner_vehicle_id uuid not null references public.owner_vehicles(id) on delete cascade,
  market_value numeric(12,2) not null, wholesale_value numeric(12,2), retail_value numeric(12,2),
  depreciation_from_purchase numeric(12,2), depreciation_pct numeric(5,2), comparable_count integer not null default 0,
  demand_score numeric(5,2) not null default 50, similar_listings_count integer not null default 0, avg_price_similar numeric(12,2),
  best_time_to_sell varchar(50), sell_now_estimate numeric(12,2), calculated_at timestamptz not null default now()
);
create index if not exists value_tracking_vehicle_date_idx on public.value_tracking(owner_vehicle_id, calculated_at desc);

create table if not exists public.vehicle_timeline (
  id uuid primary key default gen_random_uuid(), passport_id uuid not null references public.vehicle_passports(id) on delete cascade,
  event_type varchar(50) not null, event_category varchar(30), event_title varchar(200) not null, event_description text,
  event_date date not null, event_time time, is_verified boolean not null default false, verified_source varchar(100), reference_number varchar(100),
  evidence_urls jsonb not null default '[]'::jsonb, related_inspection_id uuid, related_auction_id uuid, related_listing_id uuid,
  related_service_id uuid, related_ownership_id uuid, performed_by uuid, performed_by_name varchar(100), created_at timestamptz not null default now()
);
create index if not exists vehicle_timeline_passport_date_idx on public.vehicle_timeline(passport_id, event_date desc);

create table if not exists public.ownership_history (
  id uuid primary key default gen_random_uuid(), passport_id uuid not null references public.vehicle_passports(id) on delete cascade,
  ownership_number integer not null, ownership_start date not null, ownership_end date, ownership_type varchar(30) not null,
  owner_reference_hash varchar(64), owner_display_name varchar(100), transfer_method varchar(30), transfer_amount numeric(12,2),
  transfer_currency varchar(3) not null default 'KES', is_verified boolean not null default false, verified_at timestamptz,
  verification_documents jsonb not null default '[]'::jsonb, is_current boolean not null default false, created_at timestamptz not null default now(),
  unique(passport_id, ownership_number)
);
create unique index if not exists ownership_history_one_current_idx on public.ownership_history(passport_id) where is_current;

create table if not exists public.inspection_history (
  id uuid primary key default gen_random_uuid(), passport_id uuid not null references public.vehicle_passports(id) on delete cascade,
  inspection_id uuid, inspection_report_id uuid, inspection_date date not null, inspection_type varchar(50), provider_id uuid, provider_name varchar(200),
  overall_score integer, overall_grade varchar(5), mechanical_score integer, safety_score integer, body_score integer, interior_score integer, electrical_score integer,
  critical_defects integer not null default 0, major_defects integer not null default 0, minor_defects integer not null default 0,
  is_verified boolean not null default true, report_verification_code varchar(50), created_at timestamptz not null default now()
);
create index if not exists inspection_history_passport_date_idx on public.inspection_history(passport_id, inspection_date desc);

create table if not exists public.service_history (
  id uuid primary key default gen_random_uuid(), passport_id uuid not null references public.vehicle_passports(id) on delete cascade,
  service_date date not null, service_type varchar(50) not null, service_title varchar(200) not null, service_description text,
  workshop_id uuid, workshop_name varchar(200), workshop_verified boolean not null default false, mileage_at_service integer,
  service_cost numeric(12,2), currency varchar(3) not null default 'KES', invoice_number varchar(50), invoice_url varchar(500),
  evidence_urls jsonb not null default '[]'::jsonb, is_verified boolean not null default false, verified_at timestamptz, created_at timestamptz not null default now()
);
create index if not exists service_history_passport_date_idx on public.service_history(passport_id, service_date desc);

create table if not exists public.accident_history (
  id uuid primary key default gen_random_uuid(), passport_id uuid not null references public.vehicle_passports(id) on delete cascade,
  accident_date date not null, accident_type varchar(30) not null, description text, location varchar(200), police_report_number varchar(50), insurance_claim_number varchar(50),
  estimated_damage numeric(12,2), currency varchar(3) not null default 'KES', repair_completed boolean not null default false, repair_cost numeric(12,2),
  is_verified boolean not null default false, verification_documents jsonb not null default '[]'::jsonb, created_at timestamptz not null default now()
);

create table if not exists public.auction_history (
  id uuid primary key default gen_random_uuid(), passport_id uuid not null references public.vehicle_passports(id) on delete cascade,
  auction_date date not null, auction_organizer varchar(200), organizer_verified boolean not null default false, auction_type varchar(50), lot_number varchar(50),
  reserve_met boolean, sold boolean, selling_price numeric(12,2), currency varchar(3) not null default 'KES', winning_bidder_display varchar(100),
  inspection_id uuid, listing_id uuid, replay_url varchar(500), is_verified boolean not null default false, verification_documents jsonb not null default '[]'::jsonb, created_at timestamptz not null default now()
);

create table if not exists public.finance_history (
  id uuid primary key default gen_random_uuid(), passport_id uuid not null references public.vehicle_passports(id) on delete cascade,
  event_date date not null, event_type varchar(50) not null, financial_institution varchar(200), institution_verified boolean not null default false,
  loan_amount numeric(12,2), loan_currency varchar(3) not null default 'KES', loan_term_months integer, interest_rate numeric(5,2),
  is_active boolean not null default false, clearance_date date, clearance_certificate_url varchar(500), is_verified boolean not null default false, created_at timestamptz not null default now()
);

create table if not exists public.marketplace_history (
  id uuid primary key default gen_random_uuid(), passport_id uuid not null references public.vehicle_passports(id) on delete cascade,
  listing_id uuid, listing_date date, listing_price numeric(12,2), listing_currency varchar(3) not null default 'KES', event_type varchar(50) not null,
  event_date date not null, view_count integer not null default 0, save_count integer not null default 0, inquiry_count integer not null default 0,
  inspection_requests integer not null default 0, sold_price numeric(12,2), sold_date date, is_verified boolean not null default true, created_at timestamptz not null default now()
);

create table if not exists public.vehicle_documents (
  id uuid primary key default gen_random_uuid(), passport_id uuid not null references public.vehicle_passports(id) on delete cascade,
  document_type varchar(50) not null, document_title varchar(200) not null, document_description text, file_url varchar(500), file_type varchar(50), file_size integer,
  is_verified boolean not null default false, verified_at timestamptz, verified_by varchar(100), visibility varchar(20) not null default 'public', related_timeline_id uuid references public.vehicle_timeline(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists vehicle_documents_passport_idx on public.vehicle_documents(passport_id, created_at desc);

create table if not exists public.verification_badges (
  id uuid primary key default gen_random_uuid(), passport_id uuid not null references public.vehicle_passports(id) on delete cascade,
  badge_code varchar(50) not null, badge_name varchar(100), badge_description text, criteria_met jsonb not null default '{}'::jsonb,
  awarded_at timestamptz not null default now(), awarded_by varchar(100), is_active boolean not null default true, expires_at timestamptz,
  supporting_evidence jsonb not null default '[]'::jsonb, unique(passport_id, badge_code)
);

create table if not exists public.passport_audit_log (
  id uuid primary key default gen_random_uuid(), passport_id uuid not null references public.vehicle_passports(id) on delete cascade,
  action_type varchar(50) not null, action_description text, entity_type varchar(30), entity_id uuid, performed_by uuid, performed_by_name varchar(100),
  performed_by_type varchar(30), ip_address varchar(50), user_agent text, previous_state jsonb, new_state jsonb, checksum varchar(64), created_at timestamptz not null default now()
);
create index if not exists passport_audit_passport_date_idx on public.passport_audit_log(passport_id, created_at desc);

-- Defense in depth: the custom KAYAD API uses server-side service credentials.
-- Direct browser Data API access is not part of this domain contract.
do $$ declare t text; begin
  foreach t in array array['vehicle_passports','owner_profiles','owner_vehicles','ownership_service_records','ownership_reminders','ownership_expenses','ownership_documents','travel_logs','ownership_alerts','value_tracking','vehicle_timeline','ownership_history','inspection_history','service_history','accident_history','auction_history','finance_history','marketplace_history','vehicle_documents','verification_badges','passport_audit_log'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from anon, authenticated', t);
    execute format('grant all on table public.%I to service_role', t);
  end loop;
end $$;
