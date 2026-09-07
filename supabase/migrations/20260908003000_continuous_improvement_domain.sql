-- Continuous Improvement domain: authoritative operational workflow.
-- No synthetic KPIs or experimental results are stored; analytics are derived
-- from submitted improvements, ideas and experiments.

create table if not exists public.improvements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 3 and 180),
  description text not null check (length(trim(description)) between 10 and 5000),
  category text not null check (category in ('product','marketplace','customer_experience','ux','performance','revenue','technical_debt','security','operations','other')),
  priority text not null default 'medium' check (priority in ('low','medium','high','critical')),
  status text not null default 'submitted' check (status in ('submitted','triaged','approved','in_progress','blocked','completed','rejected')),
  impact_score integer not null default 3 check (impact_score between 1 and 5),
  effort_score integer not null default 3 check (effort_score between 1 and 5),
  owner_id uuid references public.users(id) on delete set null,
  created_by uuid not null references public.users(id) on delete restrict,
  due_at timestamptz,
  completed_at timestamptz,
  evidence jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists improvements_status_priority_idx on public.improvements(status, priority, created_at desc);
create index if not exists improvements_category_idx on public.improvements(category, created_at desc);
create index if not exists improvements_owner_idx on public.improvements(owner_id, status);

create table if not exists public.improvement_events (
  id uuid primary key default gen_random_uuid(),
  improvement_id uuid not null references public.improvements(id) on delete cascade,
  actor_id uuid references public.users(id) on delete set null,
  event_type text not null,
  from_status text,
  to_status text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists improvement_events_improvement_idx on public.improvement_events(improvement_id, created_at desc);

create table if not exists public.experiments (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 3 and 180),
  hypothesis text not null check (length(trim(hypothesis)) between 10 and 5000),
  metric text not null check (length(trim(metric)) between 2 and 180),
  status text not null default 'draft' check (status in ('draft','planned','running','paused','completed','cancelled')),
  owner_id uuid references public.users(id) on delete set null,
  created_by uuid not null references public.users(id) on delete restrict,
  started_at timestamptz,
  stopped_at timestamptz,
  result_summary text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists experiments_status_idx on public.experiments(status, created_at desc);

create table if not exists public.innovation_ideas (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 3 and 180),
  description text not null check (length(trim(description)) between 10 and 5000),
  category text not null default 'product',
  status text not null default 'submitted' check (status in ('submitted','under_review','accepted','planned','implemented','rejected')),
  created_by uuid not null references public.users(id) on delete restrict,
  vote_count integer not null default 0 check (vote_count >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists innovation_ideas_status_votes_idx on public.innovation_ideas(status, vote_count desc, created_at desc);

create table if not exists public.innovation_idea_votes (
  idea_id uuid not null references public.innovation_ideas(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (idea_id, user_id)
);

alter table public.improvements enable row level security;
alter table public.improvement_events enable row level security;
alter table public.experiments enable row level security;
alter table public.innovation_ideas enable row level security;
alter table public.innovation_idea_votes enable row level security;

-- Backend uses the service key; browser clients have no direct mutation path.
drop policy if exists improvements_authenticated_select on public.improvements;
create policy improvements_authenticated_select on public.improvements for select to authenticated using (true);
drop policy if exists experiments_authenticated_select on public.experiments;
create policy experiments_authenticated_select on public.experiments for select to authenticated using (true);
drop policy if exists ideas_authenticated_select on public.innovation_ideas;
create policy ideas_authenticated_select on public.innovation_ideas for select to authenticated using (true);
drop policy if exists idea_votes_owner_select on public.innovation_idea_votes;
create policy idea_votes_owner_select on public.innovation_idea_votes for select to authenticated using (user_id = auth.uid());

create or replace function public.kayad_vote_innovation_idea_atomic(p_idea uuid, p_user uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_count integer; v_added boolean := false;
begin
  if p_idea is null or p_user is null then raise exception 'Idea and user are required'; end if;
  insert into innovation_idea_votes(idea_id,user_id) values(p_idea,p_user) on conflict do nothing;
  get diagnostics v_added = row_count;
  if v_added then
    update innovation_ideas set vote_count = vote_count + 1, updated_at=now() where id=p_idea;
  end if;
  select vote_count into v_count from innovation_ideas where id=p_idea;
  if v_count is null then raise exception 'Idea not found'; end if;
  return jsonb_build_object('ideaId',p_idea,'voteCount',v_count,'voted',v_added);
end; $$;
revoke all on function public.kayad_vote_innovation_idea_atomic(uuid,uuid) from public;

create or replace function public.kayad_change_improvement_status_atomic(
  p_id uuid, p_actor uuid, p_to_status text, p_owner uuid default null, p_due_at timestamptz default null
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_old text; v_updated improvements%rowtype;
begin
  if p_id is null or p_actor is null then raise exception 'Improvement and actor are required'; end if;
  select status into v_old from improvements where id=p_id for update;
  if v_old is null then raise exception 'Improvement not found'; end if;
  if p_to_status not in ('submitted','triaged','approved','in_progress','blocked','completed','rejected') then raise exception 'Invalid improvement status'; end if;
  if v_old = p_to_status then raise exception 'Improvement is already in that status'; end if;
  if v_old='completed' and p_to_status <> 'completed' then raise exception 'Completed improvements are immutable'; end if;
  if v_old='rejected' and p_to_status <> 'triaged' then raise exception 'Rejected improvements must return to triage'; end if;
  update improvements set status=p_to_status, owner_id=coalesce(p_owner,owner_id), due_at=coalesce(p_due_at,due_at), completed_at=case when p_to_status='completed' then now() else completed_at end, updated_at=now() where id=p_id returning * into v_updated;
  insert into improvement_events(improvement_id,actor_id,event_type,from_status,to_status,details) values(p_id,p_actor,'status_changed',v_old,p_to_status,jsonb_build_object('ownerId',p_owner,'dueAt',p_due_at));
  return to_jsonb(v_updated);
end; $$;
revoke all on function public.kayad_change_improvement_status_atomic(uuid,uuid,text,uuid,timestamptz) from public;
