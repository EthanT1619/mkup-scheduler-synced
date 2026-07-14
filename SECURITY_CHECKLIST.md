# 보안 체크리스트

Supabase 연동 및 Phase 1 allowlist 적용 후 아래 항목을 직접 확인하세요.

## RLS (Row Level Security) — makeup_schedules

- [ ] `makeup_schedules` 테이블에 RLS 가 **활성화**되어 있다
- [ ] SELECT 정책: `is_scheduler_user()` **AND** `owner_id = auth.uid()`
- [ ] INSERT 정책: `is_scheduler_user()` **AND** `owner_id = auth.uid()`
- [ ] UPDATE 정책: using + with check 모두 위 조건
- [ ] DELETE 정책: `is_scheduler_user()` **AND** `owner_id = auth.uid()`
- [ ] SELECT / INSERT / UPDATE / DELETE 가 **각각 별도 정책** (FOR ALL 단일 정책 아님)

## Allowlist (allowed_scheduler_users)

- [ ] `allowed_scheduler_users` 테이블 RLS **활성화**
- [ ] anon/authenticated 에 대한 **SELECT/INSERT/UPDATE/DELETE 정책 없음** (클라이언트 직접 접근 불가)
- [ ] `is_scheduler_user()` 함수가 **SECURITY DEFINER** + `search_path = public`
- [ ] `is_scheduler_user()` — **authenticated** 만 EXECUTE, **anon/public 권한 없음**
- [ ] allowlist 이메일이 **lowercase** 로 저장됨
- [ ] `active = false` 사용자 DB 접근 차단

## anon(비로그인) 사용자 차단

- [ ] 로그아웃 상태에서 앱 본체(달력·일정)가 보이지 않는다
- [ ] anon key 만으로 `makeup_schedules` SELECT 시 **빈 결과 또는 권한 오류**

## 허용 / 미허용 사용자

- [ ] allowlist 등록 교사 → 앱·CRUD 정상
- [ ] allowlist 미등록 Google 계정 → **사용 권한이 없습니다** 화면
- [ ] 미허용 사용자 → 일정 load·migration·CRUD **미실행**
- [ ] 미허용 사용자 RPC `is_scheduler_user` → `false`
- [ ] 미허용 사용자 REST로 `makeup_schedules` 직접 호출 → RLS 차단

## 사용자 A / B 데이터 분리 (둘 다 allowlist 등록)

- [ ] Google 계정 A 로 로그인 → A 의 일정만 표시
- [ ] Google 계정 B 로 로그인 → B 의 일정만 표시 (A 데이터 미노출)
- [ ] A 로그인 상태에서 B 의 일정 UUID 로 UPDATE 시도 → **실패**
- [ ] A 로그인 상태에서 B 의 일정 UUID 로 DELETE 시도 → **실패**

## 키·비밀 노출 방지

- [ ] 클라이언트 코드에 `service_role` key 없음
- [ ] 클라이언트 코드에 secret key 없음
- [ ] Google OAuth **client secret** 이 GitHub 저장소에 없음
- [ ] **교사 이메일 목록**이 소스코드·Git에 하드코딩되지 않음 (seed는 SQL Editor에서만)

```bash
git grep -i "service_role"
git grep -i "client_secret"
git grep -i "@gmail.com"
```

## 로그아웃 후 접근 차단

- [ ] 로그아웃 후 일정 목록이 화면에서 사라진다
- [ ] 로그아웃 후 API 로 일정 조회가 되지 않는다
- [ ] access-denied 화면에서 로그아웃 → 로그인 화면으로 이동

## 프런트엔드 필터만으로 보안하지 않음

- [ ] 일정 조회가 Supabase RLS 에 의존한다
- [ ] App 의 RPC 검사는 UX 용도, **RLS가 최종 보안 경계**

## migration 관련

- [ ] migration 성공 후에도 localStorage 원본이 **자동 삭제되지 않음**
- [ ] 미허용 사용자에게 migration UI·실행 **미노출**

## Phase 1 한계 (Phase 2 전)

- [ ] 미허용 Google 계정도 Supabase Auth `auth.users` 행이 **생성될 수 있음** (Hook 미적용)
- [ ] 그러나 `makeup_schedules` 데이터 접근·CRUD는 **차단됨**

## 배포 URL

- [ ] Supabase Redirect URLs 에 실제 GitHub Pages / localhost URL 이 등록됨

## 점검 완료 기록

| 날짜 | 점검자 | 결과 |
|------|--------|------|
|      |        |      |
