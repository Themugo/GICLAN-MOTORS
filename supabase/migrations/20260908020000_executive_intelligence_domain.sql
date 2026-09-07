-- Executive Intelligence: authoritative aggregate/report layer. No PII is stored in reports.
create table if not exists public.intelligence_reports (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('executive','sales')),
  title text not null,
  period_days integer not null check (period_days between 7 and 365),
  status text not null default 'generated' check (status in ('generated','archived')),
  payload jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create table if not exists public.intelligence_scheduled_reports (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('executive','sales')),
  title text not null,
  frequency text not null check (frequency in ('daily','weekly','monthly')),
  active boolean not null default true,
  next_run_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists intelligence_reports_created_idx on public.intelligence_reports(created_at desc);
create index if not exists intelligence_scheduled_owner_idx on public.intelligence_scheduled_reports(created_by, active, next_run_at);
alter table public.intelligence_reports enable row level security;
alter table public.intelligence_scheduled_reports enable row level security;
drop policy if exists intelligence_reports_staff on public.intelligence_reports;
create policy intelligence_reports_staff on public.intelligence_reports for select to authenticated using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('admin','superadmin','executive')));
drop policy if exists intelligence_reports_write on public.intelligence_reports;
create policy intelligence_reports_write on public.intelligence_reports for insert to authenticated with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('admin','superadmin','executive')) and created_by=auth.uid());
drop policy if exists intelligence_scheduled_owner on public.intelligence_scheduled_reports;
create policy intelligence_scheduled_owner on public.intelligence_scheduled_reports for select to authenticated using (created_by=auth.uid() or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('admin','superadmin')));
drop policy if exists intelligence_scheduled_write on public.intelligence_scheduled_reports;
create policy intelligence_scheduled_write on public.intelligence_scheduled_reports for insert to authenticated with check (created_by=auth.uid() and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('admin','superadmin','executive')));
