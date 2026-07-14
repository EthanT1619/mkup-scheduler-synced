-- makeup-scheduler-supabase: Phase 1 access control 롤백
-- makeup_schedules 기존 데이터는 삭제·변경하지 않습니다.
--
-- 권장 롤백 순서:
--   1) 이 파일 실행 (정책 복원 → 함수 제거)
--   2) 프론트엔드를 allowlist 이전 버전으로 되돌림
--   3) (선택) 아래 주석 해제로 setup 객체 정리

-- ---------------------------------------------------------------------------
-- 1) makeup_schedules RLS 를 owner-only 정책으로 복원
-- ---------------------------------------------------------------------------

drop policy if exists "makeup_schedules_select_own" on public.makeup_schedules;
create policy "makeup_schedules_select_own"
  on public.makeup_schedules
  for select
  to authenticated
  using (owner_id = auth.uid());

drop policy if exists "makeup_schedules_insert_own" on public.makeup_schedules;
create policy "makeup_schedules_insert_own"
  on public.makeup_schedules
  for insert
  to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "makeup_schedules_update_own" on public.makeup_schedules;
create policy "makeup_schedules_update_own"
  on public.makeup_schedules
  for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "makeup_schedules_delete_own" on public.makeup_schedules;
create policy "makeup_schedules_delete_own"
  on public.makeup_schedules
  for delete
  to authenticated
  using (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 2) RPC 함수 제거
-- ---------------------------------------------------------------------------

revoke execute on function public.is_scheduler_user() from authenticated;
drop function if exists public.is_scheduler_user();

-- ---------------------------------------------------------------------------
-- 3) (선택) setup.sql 에서 생성한 객체 정리
--     allowlist 이메일 목록도 함께 삭제됩니다.
-- ---------------------------------------------------------------------------

-- drop trigger if exists allowed_scheduler_users_set_updated_at on public.allowed_scheduler_users;
-- drop table if exists public.allowed_scheduler_users;
-- drop function if exists public.set_allowed_scheduler_users_updated_at();
