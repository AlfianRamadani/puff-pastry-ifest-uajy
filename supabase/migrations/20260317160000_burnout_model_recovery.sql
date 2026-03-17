create table if not exists public.burnout_model_weights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  active_task_weight numeric(5,2) not null default 0.30,
  overdue_task_weight numeric(5,2) not null default 0.50,
  credit_weight numeric(5,2) not null default 0.03,
  sleep_penalty_weight numeric(5,2) not null default 6.00,
  energy_penalty_weight numeric(5,2) not null default 5.00,
  mood_penalty_weight numeric(5,2) not null default 5.00,
  last_alert_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(user_id)
);

create table if not exists public.burnout_recovery_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  generated_at timestamptz not null default now(),
  plan_days int not null default 3,
  before_score numeric(6,2) not null,
  after_score numeric(6,2) not null,
  plan_payload jsonb not null default '{}'::jsonb
);

create index if not exists idx_burnout_recovery_plans_user_generated on public.burnout_recovery_plans(user_id, generated_at desc);

alter table public.burnout_model_weights enable row level security;
alter table public.burnout_recovery_plans enable row level security;

drop policy if exists "burnout_model_weights_select_own" on public.burnout_model_weights;
create policy "burnout_model_weights_select_own"
  on public.burnout_model_weights for select using (auth.uid() = user_id);

drop policy if exists "burnout_model_weights_insert_own" on public.burnout_model_weights;
create policy "burnout_model_weights_insert_own"
  on public.burnout_model_weights for insert with check (auth.uid() = user_id);

drop policy if exists "burnout_model_weights_update_own" on public.burnout_model_weights;
create policy "burnout_model_weights_update_own"
  on public.burnout_model_weights for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "burnout_recovery_plans_select_own" on public.burnout_recovery_plans;
create policy "burnout_recovery_plans_select_own"
  on public.burnout_recovery_plans for select using (auth.uid() = user_id);

drop policy if exists "burnout_recovery_plans_insert_own" on public.burnout_recovery_plans;
create policy "burnout_recovery_plans_insert_own"
  on public.burnout_recovery_plans for insert with check (auth.uid() = user_id);
