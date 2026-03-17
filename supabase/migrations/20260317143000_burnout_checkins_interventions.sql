create table if not exists public.burnout_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  checkin_date date not null default current_date,
  mood smallint not null check (mood between 1 and 5),
  energy smallint not null check (energy between 1 and 5),
  sleep_hours numeric(3,1) not null check (sleep_hours >= 0 and sleep_hours <= 24),
  focus_quality smallint not null check (focus_quality between 1 and 5),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, checkin_date)
);

create index if not exists idx_burnout_checkins_user_date on public.burnout_checkins(user_id, checkin_date desc);

create table if not exists public.intervention_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recommendation_key text not null,
  recommendation_text text not null,
  status text not null default 'suggested' check (status in ('suggested', 'accepted', 'completed')),
  accepted_at timestamptz,
  completed_at timestamptz,
  outcome_3d numeric(6,2),
  outcome_7d numeric(6,2),
  outcome_14d numeric(6,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, recommendation_key)
);

create index if not exists idx_intervention_events_user on public.intervention_events(user_id);

alter table public.burnout_checkins enable row level security;
alter table public.intervention_events enable row level security;

drop policy if exists "burnout_checkins_select_own" on public.burnout_checkins;
create policy "burnout_checkins_select_own"
  on public.burnout_checkins
  for select
  using (auth.uid() = user_id);

drop policy if exists "burnout_checkins_insert_own" on public.burnout_checkins;
create policy "burnout_checkins_insert_own"
  on public.burnout_checkins
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "burnout_checkins_update_own" on public.burnout_checkins;
create policy "burnout_checkins_update_own"
  on public.burnout_checkins
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "burnout_checkins_delete_own" on public.burnout_checkins;
create policy "burnout_checkins_delete_own"
  on public.burnout_checkins
  for delete
  using (auth.uid() = user_id);

drop policy if exists "intervention_events_select_own" on public.intervention_events;
create policy "intervention_events_select_own"
  on public.intervention_events
  for select
  using (auth.uid() = user_id);

drop policy if exists "intervention_events_insert_own" on public.intervention_events;
create policy "intervention_events_insert_own"
  on public.intervention_events
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "intervention_events_update_own" on public.intervention_events;
create policy "intervention_events_update_own"
  on public.intervention_events
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "intervention_events_delete_own" on public.intervention_events;
create policy "intervention_events_delete_own"
  on public.intervention_events
  for delete
  using (auth.uid() = user_id);
