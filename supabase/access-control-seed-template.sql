-- =============================================================================
-- ⚠️  경고 — 이 파일을 그대로 실행하지 마세요  ⚠️
-- =============================================================================
--
-- REPLACE_WITH_EMAIL_* placeholder 를 실제 교사 Gmail (소문자)로 바꾼 뒤에만 실행하세요.
--
-- 실행 순서 (기존 프로젝트):
--   1) access-control-setup.sql        ← 테이블·함수 생성 (먼저)
--   2) 이 파일 (실제 이메일로 교체 후)  ← allowlist 등록
--   3) allowlist 등록 확인 (아래 SELECT)
--   4) access-control-policies.sql     ← RLS 강화 (마지막)
--
-- policies.sql 을 seed 전에 실행하면 모든 사용자가 차단됩니다.
-- setup.sql 전에 이 seed 를 실행하면 테이블이 없어 실패합니다.
--
-- =============================================================================

insert into public.allowed_scheduler_users
  (email, display_name, role, active)
values
  ('REPLACE_WITH_EMAIL_1', 'REPLACE_WITH_NAME_1', 'teacher', true),
  ('REPLACE_WITH_EMAIL_2', 'REPLACE_WITH_NAME_2', 'manager', true)
on conflict (email)
do update set
  display_name = excluded.display_name,
  role = excluded.role,
  active = excluded.active,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 등록 확인 (SQL Editor에서 실행 — 클라이언트 앱에서는 이 테이블을 읽을 수 없음)
-- ---------------------------------------------------------------------------
-- active_user_count 가 0 이면 policies.sql 을 실행하지 마세요.
--
-- select
--   count(*) filter (where active = true) as active_user_count,
--   email, display_name, role, active
-- from public.allowed_scheduler_users
-- group by email, display_name, role, active
-- order by email;
--
-- 또는 간단 확인:
-- select email, display_name, role, active
-- from public.allowed_scheduler_users
-- order by email;
