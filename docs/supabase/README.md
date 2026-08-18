# BASpace Supabase 연결

## 프로젝트

- Organization: `NALDA_company`
- Project name: `baspace-dev`
- Project ref: `kfvfamzyyjsktnbuvqnh`
- Project URL: `https://kfvfamzyyjsktnbuvqnh.supabase.co`
- Region: Seoul (`ap-northeast-2`)
- App scheme: `baspace`
- Auth callback: `baspace://auth/callback`

Database password, secret key, `service_role` key는 저장소와 앱 번들에 넣지 않는다.
클라이언트에는 Project URL과 publishable key만 사용한다.

이메일 가입부터 `profiles` 생성과 RLS 조회까지의 재현 절차는
[`verification.md`](./verification.md)를 따른다.

## 인증 정책

- 고객: 이메일·비밀번호 자가가입, 이메일 확인 필수
- 업체 담당자: 승인된 업체에 관리자가 초대
- 관리자: 직접 가입을 허용하지 않고 운영자가 역할을 승격
- Google 로그인: 고객만 허용, 기존 이메일 identity와 자동 연결 금지
- Kakao 로그인: 고객만 허용, 기존 이메일 identity와 자동 연결 금지
- 휴대폰·기타 소셜 로그인: 현재 범위에서 제외
- 세션: 앱 연동 시 `expo-secure-store` 기반 Supabase storage adapter 사용
- Redirect URL: Supabase Dashboard의 Authentication → URL Configuration에
  `baspace://auth/callback`을 추가한다.

### Google OAuth 설정

1. Google Cloud Console에서 OAuth 동의 화면과 Web application OAuth client를 만든다.
2. Google client의 Authorized redirect URI에
   `https://<현재-project-ref>.supabase.co/auth/v1/callback`을 등록한다.
3. Supabase Dashboard의 Authentication → Sign In / Providers → Google에 client ID와
   secret을 입력하고 활성화한다.
4. Supabase Authentication → URL Configuration → Redirect URLs에
   `baspace://auth/callback`을 등록한다. Expo 개발 URL로 시험할 때만 실행 시 출력되는
   `exp://.../--/auth/callback`도 추가한다.
5. 현재 프로젝트에 `npx supabase link --project-ref <현재-project-ref>`를 실행한 뒤
   `npx supabase db push`로 Google identity 연결 차단 Migration을 적용한다.

Google client secret은 Supabase Dashboard에만 저장한다. 앱에는 기존 Supabase URL과
publishable key 외의 Google secret이 필요하지 않다.

### Kakao OAuth 설정

1. Kakao Developers에서 애플리케이션을 만들고 제품 설정 → 카카오 로그인에서 활성화한다.
2. Web 플랫폼 사이트 도메인과 Redirect URI에 Supabase Dashboard의 Kakao provider 화면에
   표시되는 callback URL을 등록한다. 기본 형식은
   `https://<현재-project-ref>.supabase.co/auth/v1/callback`이다.
3. Kakao Developers의 REST API 키와 Client Secret을 Supabase Dashboard의
   Authentication → Sign In / Providers → Kakao에 입력하고 활성화한다.
4. 앱 복귀 URL은 Google과 동일하게 Supabase Redirect URLs의
   `baspace://auth/callback`을 사용한다.

Kakao REST API 키와 Client Secret은 Supabase Dashboard에만 저장하고 앱 번들에 넣지 않는다.

## 로컬 CLI 연결

이 저장소의 표준 런타임인 Node v24.15.0 환경에서 실행한다.

```bash
npx supabase login
npx supabase link --project-ref kfvfamzyyjsktnbuvqnh
npx supabase db push --dry-run
```

`db push`는 dry-run 결과와 Migration을 검토한 다음 실행한다. 이 저장소의
Migration은 원격 프로젝트에 자동 적용되지 않는다.

## 최초 관리자 등록

Migration 적용 후 Supabase Dashboard의 Authentication → Users에서
`smboy86@naver.com` 사용자를 초대하거나 생성한다. 가입이 완료되어
`public.profiles` 행이 생성된 것을 확인한 뒤 SQL Editor에서 다음 쿼리를
한 번만 실행한다.

```sql
update public.profiles
set role = 'admin',
    status = 'active'
where id = (
  select id
  from auth.users
  where email = 'smboy86@naver.com'
);
```

관리자 이메일과 비밀번호는 앱 코드, Migration, seed에 넣지 않는다.

## Migration 순서

1. `20260724000100_identity_and_partners.sql`
   - Auth profile, 역할, 업체, 업체 담당자, 기본 RLS
2. `20260724000200_core_quote_workflow.sql`
   - 카탈로그, 요청, 업체 배정, 견적 버전, 상담 메시지
3. `20260724000300_rls_and_storage.sql`
   - 고객·업체 담당자·관리자 RLS와 비공개 사진 버킷
4. `20260724000400_enforce_request_limits.sql`
   - 요청당 사진 최대 5장과 관리자 전용 담당자 재배정 강제

여러 업체가 같은 요청에 참여해도 견적과 상담 메시지는
`request_assignments.id` 기준으로 격리된다.

## 앱 연결 전에 필요한 값

`.env.local`에 아래 값을 설정한다.

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://kfvfamzyyjsktnbuvqnh.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<Supabase Connect 화면의 publishable key>
```

publishable key는 클라이언트용이지만 실제 값은 로컬 환경이나 EAS 환경
변수에서 관리한다. `service_role`과 DB password는 절대 클라이언트에
노출하지 않는다.
