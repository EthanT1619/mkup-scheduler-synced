# 보안 체크리스트

Supabase 연동 후 아래 항목을 직접 확인하세요.

## RLS (Row Level Security)

- [ ] `makeup_schedules` 테이블에 RLS 가 **활성화**되어 있다
- [ ] SELECT 정책: `owner_id = auth.uid()` 인 행만 조회 가능
- [ ] INSERT 정책: `owner_id = auth.uid()` 일 때만 삽입 가능
- [ ] UPDATE 정책: 본인 행만 수정, 수정 후에도 `owner_id = auth.uid()`
- [ ] DELETE 정책: 본인 행만 삭제 가능
- [ ] SELECT / INSERT / UPDATE / DELETE 가 **각각 별도 정책**으로 존재한다 (FOR ALL 단일 정책 아님)

## anon(비로그인) 사용자 차단

- [ ] 로그아웃 상태에서 앱 본체(달력·일정)가 보이지 않는다
- [ ] Supabase SQL Editor 또는 REST 로 anon key 만으로 `makeup_schedules` SELECT 시 **빈 결과 또는 권한 오류**

```sql
-- authenticated 세션이 없으면 RLS 로 행이 보이지 않아야 함
select * from public.makeup_schedules;
```

## 사용자 A / B 데이터 분리

- [ ] Google 계정 A 로 로그인 → A 의 일정만 표시
- [ ] Google 계정 B 로 로그인 → B 의 일정만 표시 (A 데이터 미노출)
- [ ] A 로그인 상태에서 B 의 일정 UUID 로 UPDATE 시도 → **실패** (0 rows 또는 오류)
- [ ] A 로그인 상태에서 B 의 일정 UUID 로 DELETE 시도 → **실패**

> 브라우저 개발자 도구 Network 탭에서 Supabase API 응답을 확인하거나, 다른 계정으로 교차 테스트하세요.

## 키·비밀 노출 방지

- [ ] 클라이언트 코드에 `service_role` key 없음
- [ ] 클라이언트 코드에 secret key 없음
- [ ] Google OAuth **client secret** 이 GitHub 저장소에 없음
- [ ] DB 비밀번호가 저장소에 없음

```bash
# 저장소에서 secret 검색 (로컬에서 실행)
git grep -i "service_role"
git grep -i "client_secret"
git grep -i "SUPABASE.*SECRET"
```

## 로그아웃 후 접근 차단

- [ ] 로그아웃 후 일정 목록이 화면에서 사라진다
- [ ] 로그아웃 후 API 로 일정 조회가 되지 않는다
- [ ] 로그아웃 후 로그인 화면만 표시된다

## 프런트엔드 필터만으로 보안하지 않음

- [ ] 일정 조회가 Supabase RLS 에 의존한다 (클라이언트 `filter(owner_id)` 만으로 차단하지 않음)
- [ ] INSERT 시 `owner_id` 는 repository 에서 설정하되, RLS `with check` 로 타인 owner_id 삽입이 거부된다

## migration 관련

- [ ] migration 성공 후에도 localStorage 원본(`makeup-scheduler-schedules`)이 **자동 삭제되지 않음**
- [ ] migration 완료 키로 중복 가져오기 방지
- [ ] fingerprint 로 동일 일정 중복 삽입 최소화

## 배포 URL

- [ ] Supabase Redirect URLs 에 실제 GitHub Pages / localhost URL 이 등록됨
- [ ] OAuth `redirectTo` 가 현재 페이지 URL 과 일치

## 점검 완료 기록

| 날짜 | 점검자 | 결과 |
|------|--------|------|
|      |        |      |
