-- KAYAD AI decision-support governance.
-- The engine is explainable/rule-based today; no autonomous transactional execution.
create table if not exists public.ai_decision_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  engine_code text not null,
  decision_type text not null,
  input_scope jsonb not null default '{}'::jsonb,
  output_summary jsonb not null default '{}'::jsonb,
  confidence numeric(5,2),
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_decision_runs_user_created
  on public.ai_decision_runs(user_id, created_at desc);
create index if not exists idx_ai_decision_runs_type_created
  on public.ai_decision_runs(decision_type, created_at desc);

alter table public.ai_decision_runs enable row level security;

drop policy if exists ai_decision_runs_owner_select on public.ai_decision_runs;
create policy ai_decision_runs_owner_select on public.ai_decision_runs
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists ai_decision_runs_service_insert on public.ai_decision_runs;
create policy ai_decision_runs_service_insert on public.ai_decision_runs
  for insert to authenticated
  with check (user_id = auth.uid());
