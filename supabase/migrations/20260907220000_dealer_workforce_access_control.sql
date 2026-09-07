-- KAYAD Dealer Workforce & Access Control
-- Canonical organization membership, invitations, delegated permissions.

create table if not exists public.dealer_teams (
  id uuid primary key default gen_random_uuid(),
  dealer uuid not null references public.users(id) on delete cascade,
  member uuid references public.users(id) on delete set null,
  role text not null default 'sales_agent' check (role in ('manager','sales_agent','lot_agent','finance_officer','viewer')),
  permissions jsonb not null default '{}'::jsonb,
  status text not null default 'invited' check (status in ('invited','active','suspended','removed')),
  invite_email text not null,
  invite_token_hash text,
  invite_expires_at timestamptz,
  invited_by uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists dealer_teams_dealer_email_uq on public.dealer_teams(dealer, invite_email);
create unique index if not exists dealer_teams_dealer_member_uq on public.dealer_teams(dealer, member) where member is not null and status <> 'removed';
create unique index if not exists dealer_teams_invite_token_hash_uq on public.dealer_teams(invite_token_hash) where invite_token_hash is not null;
create index if not exists dealer_teams_member_status_idx on public.dealer_teams(member, status);
create index if not exists dealer_teams_dealer_status_idx on public.dealer_teams(dealer, status);

create or replace function public.kayad_touch_dealer_team_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists dealer_teams_updated_at on public.dealer_teams;
create trigger dealer_teams_updated_at before update on public.dealer_teams for each row execute function public.kayad_touch_dealer_team_updated_at();

alter table public.dealer_teams enable row level security;

drop policy if exists dealer_teams_owner_select on public.dealer_teams;
create policy dealer_teams_owner_select on public.dealer_teams for select using (auth.uid() = dealer or auth.uid() = member);
drop policy if exists dealer_teams_owner_insert on public.dealer_teams;
create policy dealer_teams_owner_insert on public.dealer_teams for insert with check (auth.uid() = dealer);
drop policy if exists dealer_teams_owner_update on public.dealer_teams;
create policy dealer_teams_owner_update on public.dealer_teams for update using (auth.uid() = dealer or auth.uid() = member) with check (auth.uid() = dealer or auth.uid() = member);
drop policy if exists dealer_teams_owner_delete on public.dealer_teams;
create policy dealer_teams_owner_delete on public.dealer_teams for delete using (auth.uid() = dealer);

comment on table public.dealer_teams is 'Canonical dealer workforce membership, invitation and delegated permission records.';
