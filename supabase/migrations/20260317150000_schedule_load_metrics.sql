create table if not exists public.schedule_load_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  peak_blocks int not null default 0,
  avg_daily_load numeric(6,2) not null default 0,
  overload_windows jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, week_start)
);

create index if not exists idx_schedule_load_metrics_user_week on public.schedule_load_metrics(user_id, week_start desc);

alter table public.schedule_load_metrics enable row level security;

drop policy if exists "schedule_load_metrics_select_own" on public.schedule_load_metrics;
create policy "schedule_load_metrics_select_own"
  on public.schedule_load_metrics
  for select
  using (auth.uid() = user_id);

drop policy if exists "schedule_load_metrics_insert_own" on public.schedule_load_metrics;
create policy "schedule_load_metrics_insert_own"
  on public.schedule_load_metrics
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "schedule_load_metrics_update_own" on public.schedule_load_metrics;
create policy "schedule_load_metrics_update_own"
  on public.schedule_load_metrics
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "schedule_load_metrics_delete_own" on public.schedule_load_metrics;
create policy "schedule_load_metrics_delete_own"
  on public.schedule_load_metrics
  for delete
  using (auth.uid() = user_id);
