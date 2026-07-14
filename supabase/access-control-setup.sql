-- makeup-scheduler-supabase: Phase 1 access control — 1단계 (setup)
--
-- 실행 순서 (기존 프로젝트):
--   1) 이 파일 (access-control-setup.sql)
--   2) access-control-seed-template.sql (실제 이메일로 교체 후)
--   3) allowlist 등록 확인
--   4) access-control-policies.sql
--
-- 이 단계에서는 makeup_schedules RLS 정책을 변경하지 않습니다.
-- 기존 사용자는 policies.sql 적용 전까지 기존과 동일하게 접근합니다.

-- ---------------------------------------------------------------------------
-- allowed_scheduler_users
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
-- updated_at trigger
-- ---------------------------------------------------------------------------

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
-- RLS: 클라이언트 직접 접근 차단 (정책 없음 = authenticated/anon 모두 거부)
-- ---------------------------------------------------------------------------

alter table public.allowed_scheduler_users enable row level security;

-- intentionally no SELECT/INSERT/UPDATE/DELETE policies for anon or authenticated

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
