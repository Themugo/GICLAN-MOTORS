create table if not exists public.communication_templates (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  category text not null default 'transactional' check (category in ('transactional','marketing','otp','system')),
  channel text not null check (channel in ('email','sms','whatsapp','in_app')),
  subject_template text,
  body_template text not null,
  variables jsonb not null default '[]'::jsonb,
  enabled boolean not null default true,
  version integer not null default 1,
  created_by uuid references public.users(id) on delete set null,
  updated_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_comm_templates_category_channel on public.communication_templates(category, channel, enabled);
alter table public.communication_templates enable row level security;
drop policy if exists "communication_templates_admin_read" on public.communication_templates;
create policy "communication_templates_admin_read" on public.communication_templates for select to authenticated using (exists (select 1 from public.users u where u.id = (select auth.uid()) and u.role in ('admin','superadmin')));
revoke insert, update, delete on public.communication_templates from anon, authenticated;

create table if not exists public.communication_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  email_transactional boolean not null default true,
  sms_transactional boolean not null default false,
  whatsapp_transactional boolean not null default false,
  email_marketing boolean not null default false,
  sms_marketing boolean not null default false,
  whatsapp_marketing boolean not null default false,
  quiet_hours_start time,
  quiet_hours_end time,
  timezone text not null default 'Africa/Nairobi',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists idx_comm_preferences_user on public.communication_preferences(user_id);
alter table public.communication_preferences enable row level security;
drop policy if exists "communication_preferences_owner_read" on public.communication_preferences;
drop policy if exists "communication_preferences_owner_update" on public.communication_preferences;
create policy "communication_preferences_owner_read" on public.communication_preferences for select to authenticated using ((select auth.uid()) = user_id);
create policy "communication_preferences_owner_update" on public.communication_preferences for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke insert, delete on public.communication_preferences from anon, authenticated;

alter table public.communication_deliveries add column if not exists category text not null default 'transactional';
alter table public.communication_deliveries add column if not exists retry_count integer not null default 0;
alter table public.communication_deliveries add column if not exists next_retry_at timestamptz;
alter table public.communication_deliveries add column if not exists last_attempt_at timestamptz;
alter table public.communication_deliveries add column if not exists failed_at timestamptz;
alter table public.communication_deliveries add column if not exists correlation_id text;
alter table public.communication_deliveries add column if not exists source_event_id text;
create index if not exists idx_comm_delivery_retry on public.communication_deliveries(status, next_retry_at) where status = 'failed';
create index if not exists idx_comm_delivery_category on public.communication_deliveries(category, created_at desc);

alter table public.otp_challenges add column if not exists resend_count integer not null default 0;
alter table public.otp_challenges add column if not exists last_sent_at timestamptz;
alter table public.otp_challenges add column if not exists ip_hash text;
alter table public.otp_challenges add column if not exists user_agent_hash text;
create index if not exists idx_otp_abuse_ip on public.otp_challenges(ip_hash, created_at desc);
create index if not exists idx_otp_abuse_recipient on public.otp_challenges(recipient, created_at desc);

insert into public.communication_templates (code,name,description,category,channel,subject_template,body_template,variables)
values
('account_welcome_email','Account Welcome','Welcome email after successful registration','transactional','email','Welcome to KAYAD','Welcome to KAYAD, {{name}}. Your account is ready.','["name"]'),
('account_verification_email','Email Verification','Email verification message','otp','email','Verify your KAYAD email','Your KAYAD verification code is {{code}}. It expires in {{minutes}} minutes.','["code","minutes"]'),
('phone_verification_sms','Phone Verification','Phone verification OTP','otp','sms',null,'Your KAYAD verification code is {{code}}. It expires in {{minutes}} minutes. Do not share it.','["code","minutes"]'),
('phone_verification_whatsapp','Phone Verification WhatsApp','Phone verification OTP via WhatsApp','otp','whatsapp',null,'Your KAYAD verification code is {{code}}. It expires in {{minutes}} minutes. Do not share it.','["code","minutes"]'),
('payment_receipt_email','Payment Receipt','Payment confirmation','transactional','email','KAYAD payment receipt','Payment received: {{amount}} for {{reference}}.','["amount","reference"]'),
('marketing_vehicle_alert','Vehicle Marketing Alert','Marketing vehicle opportunity','marketing','email','A KAYAD vehicle you may like','A vehicle matching your interests is available: {{vehicle}}.','["vehicle"]')
on conflict (code) do nothing;
