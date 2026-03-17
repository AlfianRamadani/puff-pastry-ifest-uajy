create or replace function public.handle_study_log_streak()
returns trigger
language plpgsql
security definer
as $$
declare
  streak_row public.streaks%rowtype;
  new_current_streak int;
begin
  select *
  into streak_row
  from public.streaks
  where user_id = new.user_id
  for update;

  if not found then
    insert into public.streaks (user_id, current_streak, longest_streak, last_study_date, updated_at)
    values (new.user_id, 1, 1, current_date, now());
    return new;
  end if;

  if streak_row.last_study_date = current_date then
    update public.streaks
    set updated_at = now()
    where user_id = new.user_id;
    return new;
  elsif streak_row.last_study_date = current_date - 1 then
    new_current_streak := coalesce(streak_row.current_streak, 0) + 1;
  else
    new_current_streak := 1;
  end if;

  update public.streaks
  set
    current_streak = new_current_streak,
    longest_streak = greatest(coalesce(streak_row.longest_streak, 0), new_current_streak),
    last_study_date = current_date,
    updated_at = now()
  where user_id = new.user_id;

  return new;
end;
$$;

drop trigger if exists trg_handle_study_log_streak on public.study_logs;

create trigger trg_handle_study_log_streak
after insert on public.study_logs
for each row execute function public.handle_study_log_streak();
