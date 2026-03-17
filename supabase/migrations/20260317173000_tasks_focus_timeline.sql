create table if not exists public.task_activities (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  action_type text not null,
  detail text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_task_activities_task_created on public.task_activities(task_id, created_at desc);
create index if not exists idx_task_activities_user_created on public.task_activities(user_id, created_at desc);

alter table public.task_activities enable row level security;

drop policy if exists "task_activities_select_own" on public.task_activities;
create policy "task_activities_select_own"
  on public.task_activities for select using (auth.uid() = user_id);

drop policy if exists "task_activities_insert_own" on public.task_activities;
create policy "task_activities_insert_own"
  on public.task_activities for insert with check (auth.uid() = user_id);

drop policy if exists "task_activities_update_own" on public.task_activities;
create policy "task_activities_update_own"
  on public.task_activities for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "task_activities_delete_own" on public.task_activities;
create policy "task_activities_delete_own"
  on public.task_activities for delete using (auth.uid() = user_id);

create table if not exists public.task_prioritization_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  suggestion_score numeric(7,3) not null,
  suggested_priority text not null,
  decision text not null check (decision in ('accepted','rejected')),
  created_at timestamptz not null default now()
);

create index if not exists idx_task_prioritization_feedback_user_created
  on public.task_prioritization_feedback(user_id, created_at desc);

alter table public.task_prioritization_feedback enable row level security;

drop policy if exists "task_prioritization_feedback_select_own" on public.task_prioritization_feedback;
create policy "task_prioritization_feedback_select_own"
  on public.task_prioritization_feedback for select using (auth.uid() = user_id);

drop policy if exists "task_prioritization_feedback_insert_own" on public.task_prioritization_feedback;
create policy "task_prioritization_feedback_insert_own"
  on public.task_prioritization_feedback for insert with check (auth.uid() = user_id);
