# Supabase 이메일 가입·DB 연동 확인 가이드

## 현재 앱 범위

`app/(auth)`의 로그인·회원가입·이메일 확인 화면은 UI 프로토타입이다. 화면에서 입력한
이메일과 비밀번호는 아직 `useSignup` 또는 `useLogin`에 연결되지 않으므로 앱 화면만
조작해서는 실제 Supabase 가입이나 로그인을 검증할 수 없다.

아래 절차는 현재 구현된 `authApi`, 원격 Auth 설정, `auth.users` → `public.profiles`
트리거, RLS가 정상 동작하는지 백엔드 경계에서 확인한다.

## 1. 사전 확인

Node와 Supabase 연결 상태를 확인한다.

```bash
nvm use
node -v
npx supabase projects list
npx supabase migration list --linked
npx supabase db lint --linked --level warning
```

기대 결과:

- Node `v24.15.0`
- `baspace-dev` 프로젝트가 `linked: true`
- 로컬과 원격 Migration 버전이 모두 일치
- `No schema errors found`

`.env.local`에는 클라이언트 공개 값만 설정한다.

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://kfvfamzyyjsktnbuvqnh.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key>
```

`service_role` key와 Database password는 이 테스트에 사용하지 않는다.

## 2. 테스트 고객 가입

다른 사용자와 겹치지 않는 실제 수신 가능한 이메일을 준비한다. 비밀번호는 원격 정책에
맞게 영문 대문자·소문자·숫자를 포함한 8자 이상을 사용한다.

저장소 루트에서 다음 명령을 실행한다.

```bash
set -a
source .env.local
set +a

export TEST_EMAIL='실제_수신_가능한_이메일'
export TEST_PASSWORD='영문_대소문자_숫자를_포함한_8자_이상'
export TEST_NAME='BASpace 테스트 고객'

node --input-type=module <<'NODE'
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: false } },
);

const { data, error } = await supabase.auth.signUp({
  email: process.env.TEST_EMAIL,
  password: process.env.TEST_PASSWORD,
  options: {
    data: { display_name: process.env.TEST_NAME },
    emailRedirectTo: 'baspace://auth/callback',
  },
});

if (error) throw error;
console.log({
  userCreated: Boolean(data.user),
  email: data.user?.email,
  sessionBeforeEmailConfirmation: Boolean(data.session),
});
NODE
```

기대 결과:

- `userCreated: true`
- 이메일 확인 필수 정책이므로 `sessionBeforeEmailConfirmation: false`
- Supabase Dashboard → Authentication → Users에 사용자가 표시됨
- 입력한 이메일로 확인 메일이 도착함

> 테스트 이메일과 비밀번호는 명령 실행 전에 현재 셸의 환경 변수로만 보관하고, 파일이나
> Git에 저장하지 않는다.

## 3. 이메일 확인

수신한 Supabase 확인 메일에서 링크를 연다. 현재 앱에는
`baspace://auth/callback` code-exchange route가 아직 없으므로 딥링크 화면 전환은
검증 대상이 아니다. 링크를 연 뒤 Dashboard → Authentication → Users에서
`Last Sign In` 또는 이메일 확인 상태가 갱신됐는지 확인한다.

메일이 오지 않으면 다음을 확인한다.

- 스팸함
- 입력 이메일 오타
- Auth Logs의 발송 오류
- 동일 주소 재가입 제한 또는 이메일 발송 rate limit

## 4. `profiles` 자동 생성 확인

Supabase Dashboard → SQL Editor에서 다음 읽기 전용 쿼리를 실행한다.

```sql
select
  u.id,
  u.email,
  u.email_confirmed_at,
  p.display_name,
  p.role,
  p.status,
  p.created_at
from auth.users u
join public.profiles p on p.id = u.id
where u.email = '테스트_이메일';
```

기대 결과:

- `auth.users.id`와 `public.profiles.id`가 동일
- `email_confirmed_at`이 `null`이 아님
- `display_name`이 가입 시 전달한 이름
- `role = customer`
- `status = active`

행이 없으면 Database → Logs에서 `private.handle_new_user()` 또는
`on_auth_user_created` 오류를 확인한다.

## 5. 로그인과 RLS 조회 확인

이메일 확인 후 같은 셸에서 실행한다.

```bash
node --input-type=module <<'NODE'
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: false } },
);

const { data: login, error: loginError } = await supabase.auth.signInWithPassword({
  email: process.env.TEST_EMAIL,
  password: process.env.TEST_PASSWORD,
});
if (loginError) throw loginError;

const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select('id, display_name, role, status')
  .eq('id', login.user.id)
  .single();
if (profileError) throw profileError;

console.log({
  loggedIn: Boolean(login.session),
  profile,
});

await supabase.auth.signOut();
NODE
```

기대 결과:

- `loggedIn: true`
- 로그인 사용자와 같은 `profiles.id`
- 고객 역할과 활성 상태 조회 성공
- publishable key만으로 동작하며 RLS를 우회하지 않음

## 6. 테스트 계정 정리

Dashboard → Authentication → Users에서 테스트 사용자만 정확히 선택해 삭제한다.
`public.profiles.id`는 `auth.users.id`에 `on delete cascade`로 연결되어 있으므로 다음
쿼리 결과가 0행인지 확인한다.

```sql
select p.*
from public.profiles p
join auth.users u on u.id = p.id
where u.email = '테스트_이메일';
```

운영 사용자나 다른 테스트 사용자는 삭제하지 않는다.

## 앱 E2E 연결 후 추가할 검증

실제 앱 화면 기반 E2E 검증 전에는 다음 구현이 필요하다.

1. 회원가입 화면을 `useSignup()`에 연결
2. 로그인 화면을 `useLogin()`에 연결
3. 로딩·오류·이메일 재전송 상태 연결
4. `baspace://auth/callback` route와 PKCE code exchange 구현
5. 확인 완료 후 세션 복원 및 고객 탭 진입 검증
6. 실제 계정으로 견적 요청 생성과 RLS 검증
