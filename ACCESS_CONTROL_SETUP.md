# 접근 제어(Allowlist) 설정 가이드



보강 스케줄러 Phase 1 — **개별 이메일 allowlist** 로 허용된 교사만 앱과 데이터에 접근합니다.



## 어떤 SQL 파일을 쓰나요?



| 상황 | 사용 파일 |

|------|-----------|

| **신규 Supabase 프로젝트** | `supabase/schema.sql` + seed |

| **이미 운영 중인 프로젝트** | 3단계: `setup` → `seed` → `policies` |



> `schema.sql` 과 `access-control-setup.sql` 을 **둘 다** 실행하지 마세요.



---



## 기존 프로젝트 — 안전한 적용 순서



```

1) access-control-setup.sql      테이블·함수 생성 (RLS 정책은 아직 그대로)

2) access-control-seed-template  실제 이메일로 교체 후 실행

3) allowlist 등록 확인           active 사용자 ≥ 1

4) access-control-policies.sql   makeup_schedules RLS 강화

5) 앱 테스트

```



### 왜 3단계인가?



| 잘못된 순서 | 문제 |

|-------------|------|

| seed → setup | 테이블이 없어 seed 실패 |

| policies → seed | allowlist 비어 있어 **모든 사용자 차단** |

| setup + policies 한 번에 (seed 없이) | 동일하게 전원 차단 |



---



## 1단계: access-control-setup.sql



Supabase Dashboard → **SQL Editor** → `supabase/access-control-setup.sql` 실행



생성 내용:



- `public.allowed_scheduler_users` 테이블

- `public.is_scheduler_user()` 함수 (authenticated RPC)

- allowlist 테이블 RLS (클라이언트 직접 접근 차단)



**이 단계 후:** `makeup_schedules` 정책은 **변경되지 않음** → 기존 사용자 정상 접근 유지.



---



## 2단계: allowlist seed



1. `supabase/access-control-seed-template.sql` 복사

2. `REPLACE_WITH_EMAIL_*` 를 **실제 Google 로그인 이메일**(소문자)로 교체

3. SQL Editor에서 실행



```sql

insert into public.allowed_scheduler_users

  (email, display_name, role, active)

values

  ('teacher1@gmail.com', '홍길동', 'teacher', true)

on conflict (email)

do update set

  display_name = excluded.display_name,

  role = excluded.role,

  active = excluded.active,

  updated_at = now();

```



### 이메일 규칙



- **소문자** (`teacher@gmail.com`)

- Google OAuth 로그인 이메일과 **정확히 일치**

- `active = false` → 접근 차단 (데이터 삭제 없음)



---



## 3단계: allowlist 등록 확인



```sql

select

  count(*) filter (where active = true) as active_user_count,

  email, display_name, role, active

from public.allowed_scheduler_users

group by email, display_name, role, active

order by email;

```



**`active_user_count` 가 0이면 4단계 실행 시 자동 중단됩니다** (`raise exception`).



---



## 4단계: access-control-policies.sql



등록 확인 후 `supabase/access-control-policies.sql` 실행.



- `makeup_schedules` RLS 4정책을 `is_scheduler_user() AND owner_id = auth.uid()` 로 교체

- **active 사용자 0명이면 `raise exception`으로 전체 트랜잭션 중단** (정책 변경 없음)

- 참고용 COUNT 쿼리는 파일 내 주석으로 제공



**이 단계 후:** allowlist 미등록 사용자는 DB·앱 접근 차단.



---



## 신규 설치 (schema.sql)



1. `supabase/schema.sql` 실행 (테이블 + allowlist + 강화 RLS 한 번에 적용)

2. **즉시** seed 로 허용 사용자 등록

3. seed 완료 전까지 **모든 사용자 차단** 상태임을 인지

4. 앱 테스트



---



## 프론트엔드 배포



GitHub Pages에 포함:



- `js/access-manager.js`

- 수정된 `js/app.js`, `js/auth-manager.js`, `index.html`



---



## 사용자 추가·비활성화



SQL Editor에서만 관리:



```sql

-- 추가

insert into public.allowed_scheduler_users (email, display_name, role, active)

values ('newteacher@gmail.com', '이름', 'teacher', true);



-- 비활성화

update public.allowed_scheduler_users

set active = false, updated_at = now()

where email = 'oldteacher@gmail.com';

```



---



## 롤백



`supabase/access-control-rollback.sql`:



1. `makeup_schedules` RLS → owner-only 복원

2. `is_scheduler_user()` 함수 제거

3. (선택) trigger·테이블 정리 — 파일 하단 주석 참고



프론트엔드도 allowlist 이전 버전으로 되돌려야 합니다.



---



## Phase 2 (이번 범위 아님)



- Before User Created Auth Hook

- Phase 1 한계: 미허용 Google도 `auth.users` 행 생성 가능 (데이터 접근은 RLS 차단)



---



## 문제 해결



| 증상 | 확인 |

|------|------|

| 허용 사용자도 차단 | 이메일 일치·`active=true`·policies.sql 적용 여부 |

| policies 후 전원 차단 | seed 누락 — allowlist 확인 후 policies 재적용 |

| seed 실패 (테이블 없음) | setup.sql 먼저 실행했는지 |

| 함수 미설정 오류 | setup.sql 미실행 |



자세한 테스트: `TEST_PLAN.md` 섹션 9

