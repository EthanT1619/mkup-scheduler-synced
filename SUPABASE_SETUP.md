# Supabase 설정 가이드

보강 스케줄러(`makeup-scheduler-supabase`)를 Supabase와 Google 로그인으로 연동하는 방법입니다.

## 1. Supabase 프로젝트 생성

1. [Supabase](https://supabase.com) 에 로그인
2. **New Project** 로 프로젝트 생성
3. 프로젝트가 준비될 때까지 대기

## 2. API 키 확인

**Project Settings → API** 에서 다음을 확인합니다.

| 항목 | 용도 |
|------|------|
| **Project URL** | `js/supabase-config.js` 의 `url` |
| **publishable key** (anon key) | `js/supabase-config.js` 의 `publishableKey` |

> **주의:** `service_role` key, secret key, DB 비밀번호는 클라이언트 코드나 GitHub에 넣지 마세요.

### supabase-config.js 설정

```bash
# 예시 파일을 복사한 뒤 값을 채웁니다.
cp js/supabase-config.example.js js/supabase-config.js
```

`js/supabase-config.js` 예시:

```js
const SUPABASE_CONFIG = {
  url: 'https://xxxxxxxx.supabase.co',
  publishableKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
};
```

## 3. 데이터베이스 스키마 적용

1. Supabase Dashboard → **SQL Editor**
2. `supabase/schema.sql` 내용을 붙여넣기
3. **Run** 실행

테이블 `makeup_schedules` 와 RLS 정책(SELECT / INSERT / UPDATE / DELETE 각각 분리)이 생성됩니다.

## 4. Google OAuth 설정

### 4-1. Google Cloud Console

1. [Google Cloud Console](https://console.cloud.google.com/) → 프로젝트 선택/생성
2. **APIs & Services → Credentials**
3. **Create Credentials → OAuth client ID**
4. Application type: **Web application**

**Authorized JavaScript origins**

```
http://localhost:5500
http://127.0.0.1:5500
http://localhost:8080
http://127.0.0.1:8080
https://ethant1619.github.io
```

> 로컬에서 사용하는 포트가 다르면 해당 origin 을 추가하세요.

**Authorized redirect URIs**

```
https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
```

`YOUR_PROJECT_REF` 는 Supabase Project URL 의 서브도메인입니다.

5. **Client ID** 와 **Client Secret** 을 복사 (Secret 은 Supabase에만 입력, GitHub에 올리지 않음)

### 4-2. Supabase Auth — Google Provider

1. Supabase Dashboard → **Authentication → Providers**
2. **Google** 활성화
3. Google Cloud 에서 받은 **Client ID**, **Client Secret** 입력
4. 저장

### 4-3. Site URL 및 Redirect URLs

**Authentication → URL Configuration**

| 설정 | 값 |
|------|-----|
| **Site URL** | `https://ethant1619.github.io/teacher-toolkit/makeup-scheduler/` |

**Redirect URLs** (allow list) — 아래를 모두 등록:

```
http://localhost:5500/makeup-scheduler-supabase/
http://localhost:5500/makeup-scheduler-supabase/index.html
http://127.0.0.1:5500/makeup-scheduler-supabase/
http://127.0.0.1:5500/makeup-scheduler-supabase/index.html
http://localhost:8080/makeup-scheduler-supabase/
http://127.0.0.1:8080/makeup-scheduler-supabase/
https://ethant1619.github.io/teacher-toolkit/makeup-scheduler/
https://ethant1619.github.io/teacher-toolkit/makeup-scheduler/index.html
```

> 폴더를 `teacher-toolkit` 밖으로 옮긴 경우, 실제 GitHub Pages 배포 경로에 맞게 URL 을 수정하세요.
>
> 앱은 `redirectTo: window.location.origin + window.location.pathname` 을 사용하므로, **실제 접속 URL 과 Redirect URLs 가 일치**해야 합니다.

## 5. localhost 테스트

정적 파일 서버로 실행합니다 (파일을 직접 열면 OAuth 리다이렉트가 동작하지 않을 수 있습니다).

```bash
# VS Code Live Server, 또는:
npx serve makeup-scheduler-supabase -p 5500
```

브라우저에서 접속:

```
http://localhost:5500/
```

1. `supabase-config.js` 값이 채워져 있는지 확인
2. Google 로그인 클릭
3. 로그인 후 일정 추가·새로고침·다른 브라우저에서 동일 계정 로그인 테스트

## 6. GitHub Pages 배포 후 확인

1. 저장소에 `makeup-scheduler-supabase` (또는 `teacher-toolkit/makeup-scheduler`) 배포
2. Supabase Redirect URLs 에 배포 URL 등록 (위 4-3 참고)
3. 배포 URL 접속 → Google 로그인
4. PC에서 일정 추가 → 휴대폰 동일 계정으로 확인

## 7. localStorage migration

기존 `makeup-scheduler-schedules` localStorage 데이터가 있으면 로그인 후 상단에 가져오기 안내가 표시됩니다.

- **가져오기:** 현재 Google 계정 Supabase 로 일정 삽입
- **나중에 / 취소:** 이번 세션에서 안내 숨김 (localStorage 원본은 유지)
- migration 완료 키: `makeup-scheduler-migration-completed-{userId}`

## 8. 문제 해결

| 증상 | 확인 사항 |
|------|-----------|
| 로그인 후 빈 화면 | Redirect URL 이 Supabase allow list 와 일치하는지 |
| 설정 필요 화면 | `supabase-config.js` 의 url / publishableKey |
| 일정 로드 실패 | `schema.sql` 실행 여부, RLS 정책, 네트워크 |
| Google 로그인 오류 | Google OAuth redirect URI = `https://xxx.supabase.co/auth/v1/callback` |
