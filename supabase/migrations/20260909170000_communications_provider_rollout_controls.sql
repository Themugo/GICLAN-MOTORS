-- KAYAD communications launch controls.
-- Fail-closed event/channel gating lets admins roll services out gradually.
create table if not exists public.communication_channel_controls (
  id uuid primary key default gen_random_uuid(),
  channel text not null unique check (channel in ('email','sms','whatsapp')),
  enabled boolean not null default false,
  canonical_provider text not null,
  updated_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.communication_event_controls (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  channel text not null check (channel in ('email','sms','whatsapp')),
  enabled boolean not null default false,
  updated_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(event_type, channel)
);

create index if not exists idx_comm_event_controls_event on public.communication_event_controls(event_type, channel, enabled);
create index if not exists idx_comm_event_controls_channel on public.communication_event_controls(channel, enabled);

alter table public.communication_channel_controls enable row level security;
alter table public.communication_event_controls enable row level security;

drop policy if exists "communication_channel_controls_admin_read" on public.communication_channel_controls;
create policy "communication_channel_controls_admin_read" on public.communication_channel_controls
for select to authenticated
using (exists (select 1 from public.users u where u.id = (select auth.uid()) and u.role in ('admin','superadmin')));

drop policy if exists "communication_event_controls_admin_read" on public.communication_event_controls;
create policy "communication_event_controls_admin_read" on public.communication_event_controls
for select to authenticated
using (exists (select 1 from public.users u where u.id = (select auth.uid()) and u.role in ('admin','superadmin')));

revoke insert, update, delete on public.communication_channel_controls from anon, authenticated;
revoke insert, update, delete on public.communication_event_controls from anon, authenticated;

insert into public.communication_channel_controls(channel, enabled, canonical_provider)
values
  ('email', true, 'resend'),
  ('sms', true, 'africastalking'),
  ('whatsapp', false, 'twilio_whatsapp')
on conflict (channel) do update set canonical_provider = excluded.canonical_provider;

insert into public.communication_event_controls(event_type, channel, enabled)
select e.event_type, c.channel,
  case
    when c.channel = 'email' and e.event_type in (
      'registration.completed', 'account.email_verification', 'dealer.submitted', 'dealer.verified',
      'dealer.subscription_activated', 'support.case_created', 'support.case_updated', 'security.alert'
    ) then true
    when c.channel = 'sms' and e.event_type in ('account.phone_verification', 'security.alert') then true
    else false
  end
from (values
  ('registration.completed'), ('account.email_verification'), ('account.phone_verification'),
  ('auction.bid_placed'), ('auction.bid_confirmed'), ('auction.outbid'), ('auction.started'),
  ('auction.extended'), ('auction.ending_soon'), ('auction.won'), ('auction.lost'),
  ('payment.succeeded'), ('payment.failed'), ('payment.receipt_issued'),
  ('escrow.created'), ('escrow.funded'), ('escrow.released'), ('escrow.refunded'), ('escrow.delivery_confirmed'),
  ('inspection.booked'), ('inspection.assigned'), ('inspection.started'), ('inspection.completed'),
  ('dispute.opened'), ('dispute.updated'), ('dispute.resolved'),
  ('dealer.submitted'), ('dealer.verified'), ('dealer.subscription_activated'),
  ('dealer.subscription_expiring'), ('dealer.subscription_expired'),
  ('support.case_created'), ('support.case_updated'), ('admin.action'),
  ('marketplace.saved_search_match'), ('system.reminder'), ('support.contact_form'), ('security.alert')
) e(event_type)
cross join (values ('email'), ('sms'), ('whatsapp')) c(channel)
on conflict (event_type, channel) do nothing;
