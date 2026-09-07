-- Enterprise Control Plane: authoritative operational state, alerts and safe remediation.
create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(), title text not null, description text not null,
  severity text not null default 'medium' check (severity in ('low','medium','high','critical')),
  status text not null default 'open' check (status in ('open','investigating','mitigated','resolved','closed')),
  service text, created_by uuid references public.profiles(id) on delete set null,
  owner_id uuid references public.profiles(id) on delete set null, metadata jsonb not null default '{}'::jsonb,
  resolved_at timestamptz, closed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(), title text not null, message text not null,
  severity text not null default 'medium' check (severity in ('low','medium','high','critical')),
  status text not null default 'open' check (status in ('open','acknowledged','resolved')),
  service text, source text not null default 'manual', created_by uuid references public.profiles(id) on delete set null,
  acknowledged_by uuid references public.profiles(id) on delete set null, resolved_by uuid references public.profiles(id) on delete set null,
  acknowledged_at timestamptz, resolved_at timestamptz, metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.health_checks (
  id uuid primary key default gen_random_uuid(), service text not null, status text not null,
  latency_ms integer not null default 0, details jsonb not null default '{}'::jsonb, checked_at timestamptz not null default now()
);
create table if not exists public.self_healing_actions (
  id uuid primary key default gen_random_uuid(), action_type text not null, target_id uuid not null,
  requested_by uuid references public.profiles(id) on delete set null, status text not null default 'requested',
  started_at timestamptz, completed_at timestamptz, result jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create index if not exists incidents_status_created_idx on public.incidents(status, created_at desc);
create index if not exists alerts_status_created_idx on public.alerts(status, created_at desc);
create index if not exists health_checks_service_checked_idx on public.health_checks(service, checked_at desc);
create index if not exists self_healing_created_idx on public.self_healing_actions(created_at desc);

alter table public.incidents enable row level security;
alter table public.alerts enable row level security;
alter table public.health_checks enable row level security;
alter table public.self_healing_actions enable row level security;

drop policy if exists ecp_incidents_select on public.incidents;
create policy ecp_incidents_select on public.incidents for select to authenticated using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('admin','superadmin','engineer','manager')));
drop policy if exists ecp_incidents_write on public.incidents;
create policy ecp_incidents_write on public.incidents for all to authenticated using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('admin','superadmin','engineer'))) with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('admin','superadmin','engineer')));
drop policy if exists ecp_alerts_select on public.alerts;
create policy ecp_alerts_select on public.alerts for select to authenticated using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('admin','superadmin','engineer','manager')));
drop policy if exists ecp_alerts_write on public.alerts;
create policy ecp_alerts_write on public.alerts for all to authenticated using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('admin','superadmin','engineer'))) with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('admin','superadmin','engineer')));
drop policy if exists ecp_health_select on public.health_checks;
create policy ecp_health_select on public.health_checks for select to authenticated using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('admin','superadmin','engineer','manager')));
drop policy if exists ecp_healing_select on public.self_healing_actions;
create policy ecp_healing_select on public.self_healing_actions for select to authenticated using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('admin','superadmin','engineer')));
