create table if not exists public.task_breakdowns (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_model text not null,
  input_context jsonb not null default '{}'::jsonb,
  objective text not null,
  assumptions jsonb not null default '[]'::jsonb,
  estimated_total_hours numeric(6,2) not null default 0,
  risk_level text not null default 'medium' check (risk_level in ('low','medium','high')),
  confidence numeric(4,3) not null default 0.7 check (confidence >= 0 and confidence <= 1),
  follow_up_questions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_task_breakdowns_task_id on public.task_breakdowns(task_id);
create index if not exists idx_task_breakdowns_user_id on public.task_breakdowns(user_id);

create table if not exists public.task_breakdown_steps (
  id uuid primary key default gen_random_uuid(),
  task_breakdown_id uuid not null references public.task_breakdowns(id) on delete cascade,
  order_index integer not null check (order_index > 0),
  title text not null,
  details text not null default '',
  estimated_minutes integer not null default 30 check (estimated_minutes > 0),
  acceptance_criteria text not null default '',
  status text not null default 'pending' check (status in ('pending','done')),
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(task_breakdown_id, order_index)
);

create index if not exists idx_task_breakdown_steps_breakdown_id on public.task_breakdown_steps(task_breakdown_id);

alter table public.task_breakdowns enable row level security;
alter table public.task_breakdown_steps enable row level security;

drop policy if exists "task_breakdowns_select_own" on public.task_breakdowns;
create policy "task_breakdowns_select_own"
  on public.task_breakdowns for select using (auth.uid() = user_id);
drop policy if exists "task_breakdowns_insert_own" on public.task_breakdowns;
create policy "task_breakdowns_insert_own"
  on public.task_breakdowns for insert with check (auth.uid() = user_id);
drop policy if exists "task_breakdowns_update_own" on public.task_breakdowns;
create policy "task_breakdowns_update_own"
  on public.task_breakdowns for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "task_breakdowns_delete_own" on public.task_breakdowns;
create policy "task_breakdowns_delete_own"
  on public.task_breakdowns for delete using (auth.uid() = user_id);

drop policy if exists "task_breakdown_steps_select_own" on public.task_breakdown_steps;
create policy "task_breakdown_steps_select_own"
  on public.task_breakdown_steps
  for select
  using (
    exists (
      select 1 from public.task_breakdowns b
      where b.id = task_breakdown_steps.task_breakdown_id and b.user_id = auth.uid()
    )
  );
drop policy if exists "task_breakdown_steps_insert_own" on public.task_breakdown_steps;
create policy "task_breakdown_steps_insert_own"
  on public.task_breakdown_steps
  for insert
  with check (
    exists (
      select 1 from public.task_breakdowns b
      where b.id = task_breakdown_steps.task_breakdown_id and b.user_id = auth.uid()
    )
  );
drop policy if exists "task_breakdown_steps_update_own" on public.task_breakdown_steps;
create policy "task_breakdown_steps_update_own"
  on public.task_breakdown_steps
  for update
  using (
    exists (
      select 1 from public.task_breakdowns b
      where b.id = task_breakdown_steps.task_breakdown_id and b.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.task_breakdowns b
      where b.id = task_breakdown_steps.task_breakdown_id and b.user_id = auth.uid()
    )
  );
drop policy if exists "task_breakdown_steps_delete_own" on public.task_breakdown_steps;
create policy "task_breakdown_steps_delete_own"
  on public.task_breakdown_steps
  for delete
  using (
    exists (
      select 1 from public.task_breakdowns b
      where b.id = task_breakdown_steps.task_breakdown_id and b.user_id = auth.uid()
    )
  );

create or replace function public.sync_task_done_from_subtasks()
returns trigger
language plpgsql
security definer
as $$
declare
  v_task_id uuid;
  v_user_id uuid;
  v_total integer;
  v_done integer;
begin
  select b.task_id, b.user_id
  into v_task_id, v_user_id
  from public.task_breakdowns b
  where b.id = new.task_breakdown_id;

  select count(*),
         count(*) filter (where s.status = 'done')
  into v_total, v_done
  from public.task_breakdown_steps s
  where s.task_breakdown_id = new.task_breakdown_id;

  if v_total > 0 and v_total = v_done then
    if to_regclass('public.tasks') is not null then
      update public.tasks
      set status = 'done'
      where id = v_task_id and user_id = v_user_id;
    end if;

    if to_regclass('public.notifications') is not null then
      insert into public.notifications (user_id, type, title, body, reference_id, reference_type)
      values (
        v_user_id,
        'task',
        'Task completed from subtasks',
        'All subtasks are done, so the parent task is marked as completed.',
        v_task_id,
        'task'
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trigger_sync_task_done_from_subtasks on public.task_breakdown_steps;
create trigger trigger_sync_task_done_from_subtasks
after insert or update of status, progress
on public.task_breakdown_steps
for each row
execute function public.sync_task_done_from_subtasks();
