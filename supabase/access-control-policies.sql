-- makeup-scheduler-supabase: Phase 1 access control — 3단계 (policies)
--
-- ⚠️  실행 전 필수 확인  ⚠️
--
-- 1. access-control-setup.sql 이 이미 실행되었는지
-- 2. access-control-seed-template.sql 로 현재 정상 사용자가 등록되었는지
-- 3. 아래 강제 중단 검증을 통과해야 정책 교체가 진행됨 (active 사용자 0명이면 전체 중단)
--
-- allowlist가 비어 있는 상태에서 이 파일을 실행하면
-- 모든 authenticated 사용자의 makeup_schedules 접근이 차단됩니다.
-- 기존 makeup_schedules 데이터는 삭제·변경하지 않습니다.

-- ---------------------------------------------------------------------------
-- 사전 검증 (강제 중단) — active 사용자 0명이면 정책 교체를 실행하지 않음
-- ---------------------------------------------------------------------------

begin;

do $$
begin
  if not exists (
    select 1
    from public.allowed_scheduler_users
    where active = true
  ) then
    raise exception 'Access-control deployment aborted: no active allowed users are registered.';
  end if;
end
$$;

-- 참고용 확인 쿼리 (별도 실행 시):
-- select
--   count(*) filter (where active = true) as active_user_count,
--   count(*) as total_user_count
-- from public.allowed_scheduler_users;

-- ---------------------------------------------------------------------------
-- makeup_schedules RLS 강화 (allowlist + owner_id)
-- ---------------------------------------------------------------------------

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

commit;
