-- makeup-scheduler-supabase schema
-- Run in Supabase SQL Editor after creating your project.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------

create table if not exists public.makeup_schedules (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  student_name text not null,
  class_name text,
  date date not null,
  start_time time,
  end_time time,
  reason text,
  absence_progress text,
  memo text,
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint makeup_schedules_status_check
    check (status in ('scheduled', 'completed', 'cancelled'))
);

create index if not exists makeup_schedules_owner_id_idx
  on public.makeup_schedules (owner_id);

create index if not exists makeup_schedules_owner_date_idx
  on public.makeup_schedules (owner_id, date);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------

create or replace function public.set_makeup_schedules_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists makeup_schedules_set_updated_at on public.makeup_schedules;

create trigger makeup_schedules_set_updated_at
  before update on public.makeup_schedules
  for each row
  execute function public.set_makeup_schedules_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security (RLS)
-- ---------------------------------------------------------------------------

alter table public.makeup_schedules enable row level security;

-- SELECT: logged-in users can read only their own rows
drop policy if exists "makeup_schedules_select_own" on public.makeup_schedules;
create policy "makeup_schedules_select_own"
  on public.makeup_schedules
  for select
  to authenticated
  using (owner_id = auth.uid());

-- INSERT: owner_id must match the current user
drop policy if exists "makeup_schedules_insert_own" on public.makeup_schedules;
create policy "makeup_schedules_insert_own"
  on public.makeup_schedules
  for insert
  to authenticated
  with check (owner_id = auth.uid());

-- UPDATE: only own rows; owner_id must remain the current user
drop policy if exists "makeup_schedules_update_own" on public.makeup_schedules;
create policy "makeup_schedules_update_own"
  on public.makeup_schedules
  for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- DELETE: only own rows
drop policy if exists "makeup_schedules_delete_own" on public.makeup_schedules;
create policy "makeup_schedules_delete_own"
  on public.makeup_schedules
  for delete
  to authenticated
  using (owner_id = auth.uid());
