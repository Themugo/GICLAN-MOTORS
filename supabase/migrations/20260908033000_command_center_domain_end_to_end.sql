-- KAYAD Enterprise Command Center domain
-- User-scoped layout + controlled war-room state. No synthetic telemetry.

create table if not exists public.command_center_widget_layouts (
  id uuid primary key references auth.users(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  layout jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint command_center_widget_layouts_layout_array check (jsonb_typeof(layout) = 'array')
);

create table if not exists public.command_center_war_rooms (
  id text primary key,
  status text not null default 'inactive' check (status in ('inactive','active')),
  purpose text,
  activated_by uuid references auth.users(id),
  activated_at timestamptz,
  deactivated_by uuid references auth.users(id),
  deactivated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint command_center_war_rooms_singleton check (id = 'active')
);

insert into public.command_center_war_rooms (id, status)
values ('active','inactive')
on conflict (id) do nothing;

alter table public.command_center_widget_layouts enable row level security;
alter table public.command_center_war_rooms enable row level security;

-- Layouts are private to the authenticated owner; server role enforcement remains
-- the authoritative gate for the command-center API.
drop policy if exists command_center_widget_layouts_select on public.command_center_widget_layouts;
create policy command_center_widget_layouts_select on public.command_center_widget_layouts
for select to authenticated using (user_id = auth.uid());

drop policy if exists command_center_widget_layouts_insert on public.command_center_widget_layouts;
create policy command_center_widget_layouts_insert on public.command_center_widget_layouts
for insert to authenticated with check (user_id = auth.uid() and id = auth.uid());

drop policy if exists command_center_widget_layouts_update on public.command_center_widget_layouts;
create policy command_center_widget_layouts_update on public.command_center_widget_layouts
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and id = auth.uid());

-- War-room state is deliberately not writable from the browser. The backend
-- service role performs the authorized mutation after role checks + audit log.
drop policy if exists command_center_war_rooms_select on public.command_center_war_rooms;
create policy command_center_war_rooms_select on public.command_center_war_rooms
for select to authenticated using (true);

drop policy if exists command_center_war_rooms_no_client_insert on public.command_center_war_rooms;
create policy command_center_war_rooms_no_client_insert on public.command_center_war_rooms
for insert to authenticated with check (false);

drop policy if exists command_center_war_rooms_no_client_update on public.command_center_war_rooms;
create policy command_center_war_rooms_no_client_update on public.command_center_war_rooms
for update to authenticated using (false) with check (false);

drop policy if exists command_center_war_rooms_no_client_delete on public.command_center_war_rooms;
create policy command_center_war_rooms_no_client_delete on public.command_center_war_rooms
for delete to authenticated using (false);

create index if not exists idx_command_center_widget_layouts_user on public.command_center_widget_layouts(user_id);
