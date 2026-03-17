-- Repair missing uniqueness used by ON CONFLICT / upsert flows
-- and ensure all auth users have required bootstrap rows.

-- 1) Deduplicate streaks by user_id (keep newest)
with ranked as (
  select ctid, row_number() over (
    partition by user_id
    order by updated_at desc nulls last, ctid desc
  ) as rn
  from public.streaks
)
delete from public.streaks s
using ranked r
where s.ctid = r.ctid
  and r.rn > 1;

-- 2) Deduplicate user_presence by user_id (keep newest)
with ranked as (
  select ctid, row_number() over (
    partition by user_id
    order by updated_at desc nulls last, ctid desc
  ) as rn
  from public.user_presence
)
delete from public.user_presence p
using ranked r
where p.ctid = r.ctid
  and r.rn > 1;

-- 3) Add uniqueness required by ON CONFLICT(user_id)
create unique index if not exists ux_streaks_user_id on public.streaks(user_id);
create unique index if not exists ux_user_presence_user_id on public.user_presence(user_id);

-- 4) Backfill bootstrap rows for existing auth users
insert into public.profiles (id, email, full_name, avatar_url)
select
  u.id,
  coalesce(u.email, ''),
  coalesce(u.raw_user_meta_data ->> 'full_name', split_part(coalesce(u.email, ''), '@', 1), 'Student'),
  u.raw_user_meta_data ->> 'avatar_url'
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

insert into public.streaks (user_id, current_streak, longest_streak)
select u.id, 0, 0
from auth.users u
left join public.streaks s on s.user_id = u.id
where s.user_id is null;

insert into public.user_presence (user_id, status, current_activity, updated_at)
select u.id, 'offline', null, now()
from auth.users u
left join public.user_presence up on up.user_id = u.id
where up.user_id is null;

-- 5) Recreate bootstrap function (safe + explicit)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1), 'Student'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  insert into public.streaks (user_id, current_streak, longest_streak)
  values (new.id, 0, 0)
  on conflict (user_id) do nothing;

  insert into public.user_presence (user_id, status, current_activity, updated_at)
  values (new.id, 'offline', null, now())
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
