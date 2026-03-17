create table if not exists public.support_escalation_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  contact_channel text not null,
  contact_destination text not null,
  share_summary boolean not null default true,
  share_recommendations boolean not null default true,
  message_preview text,
  consent_text text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_support_escalation_user_created on public.support_escalation_consents(user_id, created_at desc);

create table if not exists public.burnout_telemetry_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  event_key text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(user_id, event_key)
);

create index if not exists idx_burnout_telemetry_user_created on public.burnout_telemetry_events(user_id, created_at desc);

alter table public.support_escalation_consents enable row level security;
alter table public.burnout_telemetry_events enable row level security;

drop policy if exists "support_escalation_consents_select_own" on public.support_escalation_consents;
create policy "support_escalation_consents_select_own"
  on public.support_escalation_consents
  for select
  using (auth.uid() = user_id);

drop policy if exists "support_escalation_consents_insert_own" on public.support_escalation_consents;
create policy "support_escalation_consents_insert_own"
  on public.support_escalation_consents
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "burnout_telemetry_events_select_own" on public.burnout_telemetry_events;
create policy "burnout_telemetry_events_select_own"
  on public.burnout_telemetry_events
  for select
  using (auth.uid() = user_id);

drop policy if exists "burnout_telemetry_events_insert_own" on public.burnout_telemetry_events;
create policy "burnout_telemetry_events_insert_own"
  on public.burnout_telemetry_events
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "burnout_telemetry_events_update_own" on public.burnout_telemetry_events;
create policy "burnout_telemetry_events_update_own"
  on public.burnout_telemetry_events
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
