alter table if exists public.tasks
  add column if not exists reminder_profile text not null default 'standard'
  check (reminder_profile in ('standard', 'focus', 'quiet', 'mute'));

create index if not exists idx_tasks_user_reminder_profile on public.tasks(user_id, reminder_profile);
