-- KAYAD Communications + OTP control plane
-- Canonical delivery ledger and server-side OTP challenges.

create table if not exists public.communication_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  channel text not null check (channel in ('in_app','email','sms','whatsapp')),
  event_type text not null,
  template_code text,
  recipient text not null,
  recipient_hash text not null,
  provider text not null,
  status text not null default 'queued' check (status in ('queued','sending','sent','delivered','failed','bounced','read')),
  provider_message_id text,
  provider_event_id text,
  metadata jsonb not null default '{}'::jsonb,
  last_error text,
  sent_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_comm_delivery_user_created
  on public.communication_deliveries(user_id, created_at desc);
create index if not exists idx_comm_delivery_provider_message
  on public.communication_deliveries(provider, provider_message_id)
  where provider_message_id is not null;
create index if not exists idx_comm_delivery_status
  on public.communication_deliveries(status, created_at desc);

alter table public.communication_deliveries enable row level security;

create policy "communication_deliveries_owner_read"
  on public.communication_deliveries
  for select to authenticated
  using ((select auth.uid()) = user_id);

create table if not exists public.otp_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  purpose text not null,
  channel text not null check (channel in ('email','sms','whatsapp')),
  recipient text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  max_attempts integer not null default 5,
  status text not null default 'pending' check (status in ('pending','verified','expired','locked','delivery_failed')),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_otp_user_purpose_created
  on public.otp_challenges(user_id, purpose, created_at desc);
create index if not exists idx_otp_expiry
  on public.otp_challenges(status, expires_at);

alter table public.otp_challenges enable row level security;
create policy "otp_challenges_owner_read"
  on public.otp_challenges
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- No client insert/update policies: OTP issuance and mutation remain backend-only.
revoke insert, update, delete on public.communication_deliveries from anon, authenticated;
revoke insert, update, delete on public.otp_challenges from anon, authenticated;
