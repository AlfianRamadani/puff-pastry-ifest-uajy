alter table if exists public.tasks
  add column if not exists recurrence_rule jsonb,
  add column if not exists recurrence_series_id uuid,
  add column if not exists recurrence_parent_id uuid references public.tasks(id) on delete set null,
  add column if not exists recurrence_active boolean not null default false,
  add column if not exists recurrence_end_date date,
  add column if not exists reminder_offsets int[] not null default '{24,6,1}',
  add column if not exists reminder_muted boolean not null default false,
  add column if not exists reminder_snooze_until timestamptz,
  add column if not exists reminder_last_overdue_notified_at timestamptz;

create index if not exists idx_tasks_recurrence_active on public.tasks(user_id, recurrence_active);
create index if not exists idx_tasks_recurrence_series on public.tasks(recurrence_series_id);
create unique index if not exists idx_tasks_recurrence_parent_due_unique on public.tasks(recurrence_parent_id, due_date) where recurrence_parent_id is not null;

create table if not exists public.task_subtasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  status text not null default 'pending' check (status in ('pending','in_progress','done')),
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  order_index integer not null check (order_index > 0),
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(task_id, order_index)
);

create index if not exists idx_task_subtasks_task on public.task_subtasks(task_id, order_index);
create index if not exists idx_task_subtasks_user on public.task_subtasks(user_id, created_at desc);

alter table public.task_subtasks enable row level security;

drop policy if exists "task_subtasks_select_own" on public.task_subtasks;
create policy "task_subtasks_select_own" on public.task_subtasks
  for select using (auth.uid() = user_id);

drop policy if exists "task_subtasks_insert_own" on public.task_subtasks;
create policy "task_subtasks_insert_own" on public.task_subtasks
  for insert with check (auth.uid() = user_id);

drop policy if exists "task_subtasks_update_own" on public.task_subtasks;
create policy "task_subtasks_update_own" on public.task_subtasks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "task_subtasks_delete_own" on public.task_subtasks;
create policy "task_subtasks_delete_own" on public.task_subtasks
  for delete using (auth.uid() = user_id);

create or replace function public.sync_parent_task_status_from_subtasks()
returns trigger
language plpgsql
security definer
as $$
declare
  v_task_id uuid;
  v_user_id uuid;
  v_total integer;
  v_done integer;
  v_in_progress integer;
begin
  v_task_id := coalesce(new.task_id, old.task_id);
  v_user_id := coalesce(new.user_id, old.user_id);

  select count(*),
         count(*) filter (where status = 'done'),
         count(*) filter (where status = 'in_progress')
  into v_total, v_done, v_in_progress
  from public.task_subtasks
  where task_id = v_task_id;

  if v_total = 0 then
    return coalesce(new, old);
  end if;

  if v_done = v_total then
    update public.tasks
      set status = 'done', updated_at = now()
      where id = v_task_id and user_id = v_user_id;
  elsif v_in_progress > 0 or (v_done > 0 and v_done < v_total) then
    update public.tasks
      set status = 'in_progress', updated_at = now()
      where id = v_task_id and user_id = v_user_id and status <> 'done';
  else
    update public.tasks
      set status = 'not_started', updated_at = now()
      where id = v_task_id and user_id = v_user_id and status <> 'done';
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trigger_sync_parent_task_status_from_subtasks on public.task_subtasks;
create trigger trigger_sync_parent_task_status_from_subtasks
after insert or update of status, progress or delete
on public.task_subtasks
for each row
execute function public.sync_parent_task_status_from_subtasks();

create table if not exists public.task_reminder_dispatches (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  dispatch_key text not null unique,
  reminder_type text not null,
  scheduled_for timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_task_reminder_dispatches_task on public.task_reminder_dispatches(task_id, created_at desc);
create index if not exists idx_task_reminder_dispatches_user on public.task_reminder_dispatches(user_id, created_at desc);

alter table public.task_reminder_dispatches enable row level security;

drop policy if exists "task_reminder_dispatches_select_own" on public.task_reminder_dispatches;
create policy "task_reminder_dispatches_select_own" on public.task_reminder_dispatches
  for select using (auth.uid() = user_id);

drop policy if exists "task_reminder_dispatches_insert_own" on public.task_reminder_dispatches;
create policy "task_reminder_dispatches_insert_own" on public.task_reminder_dispatches
  for insert with check (auth.uid() = user_id);
