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

## 인증 정책

- 고객: 이메일·비밀번호 자가가입, 이메일 확인 필수
- 업체 담당자: 승인된 업체에 관리자가 초대
- 관리자: 직접 가입을 허용하지 않고 운영자가 역할을 승격
- 휴대폰·소셜 로그인: MVP 범위에서 제외
- 세션: 앱 연동 시 `expo-secure-store` 기반 Supabase storage adapter 사용
- Redirect URL: Supabase Dashboard의 Authentication → URL Configuration에
  `baspace://**`를 추가한다.

## 로컬 CLI 연결

Node 20 이상 환경에서 실행한다.

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
