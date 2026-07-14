-- makeup-scheduler-supabase schema (신규 설치용)
-- Run in Supabase SQL Editor after creating your project.
--
-- 기존 프로젝트 업데이트에는 3단계 파일을 사용하세요:
--   access-control-setup.sql → seed → access-control-policies.sql
--   (자세한 순서: ACCESS_CONTROL_SETUP.md)
--
-- ⚠️  신규 설치 주의:
--   schema.sql 은 allowlist + 강화 RLS 를 한 번에 적용합니다.
--   schema.sql 실행 후 allowlist seed 를 넣기 전까지
--   모든 사용자의 앱·DB 접근이 차단됩니다.
--   seed 등록이 끝난 뒤에 앱 테스트를 시작하세요.

-- ---------------------------------------------------------------------------
-- makeup_schedules
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
-- allowed_scheduler_users (allowlist)
-- ---------------------------------------------------------------------------

create table if not exists public.allowed_scheduler_users (
  email text primary key,
  display_name text,
  role text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint allowed_scheduler_users_email_normalized
    check (email = lower(trim(email)) and length(trim(email)) > 0)
);

create index if not exists allowed_scheduler_users_active_idx
  on public.allowed_scheduler_users (active)
  where active = true;

-- ---------------------------------------------------------------------------
-- updated_at triggers
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

create or replace function public.set_allowed_scheduler_users_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists allowed_scheduler_users_set_updated_at on public.allowed_scheduler_users;

create trigger allowed_scheduler_users_set_updated_at
  before update on public.allowed_scheduler_users
  for each row
  execute function public.set_allowed_scheduler_users_updated_at();

-- ---------------------------------------------------------------------------
-- is_scheduler_user()
-- ---------------------------------------------------------------------------

create or replace function public.is_scheduler_user()
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  user_email text;
begin
  user_email := lower(trim(coalesce(auth.jwt() ->> 'email', '')));

  if user_email = '' then
    return false;
  end if;

  return exists (
    select 1
    from public.allowed_scheduler_users
    where email = user_email
      and active = true
  );
end;
$$;

revoke all on function public.is_scheduler_user() from public;
revoke all on function public.is_scheduler_user() from anon;
grant execute on function public.is_scheduler_user() to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.makeup_schedules enable row level security;
alter table public.allowed_scheduler_users enable row level security;

-- allowed_scheduler_users: 클라이언트 직접 접근 정책 없음 (Dashboard SQL Editor로만 관리)

-- makeup_schedules: allowlist + owner_id

drop policy if exists "makeup_schedules_select_own" on public.makeup_schedules;
create policy "makeup_schedules_select_own"
  on public.makeup_schedules
  for select
  to authenticated
  using (
    public.is_scheduler_user()
    and owner_id = auth.uid()
  );

drop policy if exists "makeup_schedules_insert_own" on public.makeup_schedules;
create policy "makeup_schedules_insert_own"
  on public.makeup_schedules
  for insert
  to authenticated
  with check (
    public.is_scheduler_user()
    and owner_id = auth.uid()
  );

drop policy if exists "makeup_schedules_update_own" on public.makeup_schedules;
create policy "makeup_schedules_update_own"
  on public.makeup_schedules
  for update
  to authenticated
  using (
    public.is_scheduler_user()
    and owner_id = auth.uid()
  )
  with check (
    public.is_scheduler_user()
    and owner_id = auth.uid()
  );

drop policy if exists "makeup_schedules_delete_own" on public.makeup_schedules;
create policy "makeup_schedules_delete_own"
  on public.makeup_schedules
  for delete
  to authenticated
  using (
    public.is_scheduler_user()
    and owner_id = auth.uid()
  );
