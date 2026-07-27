# Supabase 이메일 가입·DB 연동 확인 가이드

## 현재 앱 범위

`app/(auth)`의 로그인·회원가입·이메일 확인 화면은 실제 Supabase Auth에 연결되어 있다.
공개 회원가입은 고객 전용이며 활성 고객은 고객 탭, 운영자가 생성한 활성 관리자는 관리자
운영 홈으로 진입한다. 관리자가 업체 등록 화면에서 생성한 활성 업체 담당자는 연결 업체를
확인하는 업체 담당자 홈으로 진입한다.

아래 절차는 앱 화면, 원격 Auth 설정, `auth.users` → `public.profiles` 트리거, 역할별
진입과 RLS가 정상 동작하는지 확인한다.

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

다른 사용자와 겹치지 않는 실제 수신 가능한 이메일을 준비한다. 비밀번호는 앱 정책에
맞게 영문 소문자와 특수문자를 포함한 8자 이상을 사용한다.

저장소 루트에서 다음 명령을 실행한다.

```bash
set -a
source .env.local
set +a

export TEST_EMAIL='실제_수신_가능한_이메일'
export TEST_PASSWORD='영문_소문자와_특수문자를_포함한_8자_이상'
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

## 6. 최초 관리자 계정 생성과 검증

관리자는 공개 회원가입으로 만들지 않는다. Supabase Dashboard → Authentication → Users에서
`smboy86@naver.com` 사용자를 직접 생성하고 이메일 확인 상태와 강한 임시 비밀번호를
설정한다. 비밀번호는 문서, 환경 파일, 명령 기록 또는 Git에 저장하지 않는다.
이미 같은 이메일의 사용자가 있으면 삭제하거나 중복 생성하지 말고, 본인 소유와 이메일
확인 상태를 검증한 뒤 기존 프로필을 관리자 역할로 승격한다.

사용자 생성 후 SQL Editor에서 이메일과 대상 ID를 먼저 확인한다.

```sql
select
  u.id,
  u.email,
  u.email_confirmed_at,
  p.role,
  p.status,
  p.display_name
from auth.users u
join public.profiles p on p.id = u.id
where lower(u.email) = lower('smboy86@naver.com');
```

정확한 한 행임을 확인한 다음 같은 SQL Editor에서 관리자 프로필로 승격한다.

```sql
update public.profiles as p
set
  role = 'admin',
  status = 'active',
  display_name = '바스페이스 관리자'
from auth.users as u
where p.id = u.id
  and lower(u.email) = lower('smboy86@naver.com')
returning p.id, u.email, p.role, p.status, p.display_name;
```

기대 결과:

- 수정된 행이 정확히 1개
- `email_confirmed_at`이 `null`이 아님
- `role = admin`
- `status = active`
- 앱 로그인 후 `/(admin)/dashboard` 진입
- 관리자 운영 홈에서 이름·이메일·관리자 배지와 준비 중 기능 카드가 표시됨
- 로그아웃 후 로그인 화면으로 복귀

공개 가입 트리거는 클라이언트 메타데이터의 역할 값을 무시하고 항상 `customer`를
생성한다. 앱에 service-role key를 추가하거나 클라이언트에서 관리자 역할을 변경하는
기능을 만들지 않는다.

## 7. 업체와 대표 담당자 계정 등록 검증

관리자 계정으로 앱에 로그인해 `업체 관리 → 업체 추가`로 이동한다. 업체명,
사업자등록번호, 업체 대표 이메일, 패스워드, 담당자 이름, 담당자 연락처를 입력하고
`업체 등록`을 누른다. 사업자등록증과 비고는 선택 항목이다.

기대 결과:

- 업체가 `partners`에 `approved` 상태로 생성됨
- 대표 이메일의 Auth 사용자가 이메일 확인 완료 상태로 생성됨
- 같은 사용자 ID의 `profiles`가 `partner_staff / active`로 변경됨
- `partner_members`에 해당 업체의 `active / is_manager = true` 멤버로 연결됨
- `partner_login_accounts`에는 로그인 이메일만 저장되고 비밀번호는 저장되지 않음
- 같은 사업자등록번호 또는 같은 로그인 이메일은 다시 등록되지 않음
- 대표 이메일과 입력한 패스워드로 로그인하면 `/(partner)/dashboard`에 진입함

SQL Editor에서 연결을 확인한다.

```sql
select
  p.company_name,
  p.business_number,
  pla.login_email,
  profile.role,
  profile.status,
  pm.status as member_status,
  pm.is_manager
from public.partners p
join public.partner_login_accounts pla on pla.partner_id = p.id
join public.profiles profile on profile.id = pla.user_id
join public.partner_members pm
  on pm.partner_id = p.id
 and pm.user_id = pla.user_id
where lower(pla.login_email) = lower('등록한_업체_대표_이메일');
```

`create-partner-account` Edge Function만 service-role 환경을 사용한다. 앱 번들에는
service-role key를 넣지 않으며 Edge Function은 호출자의 활성 관리자 역할을 다시
검증하고 비밀번호를 로그·DB·응답에 남기지 않는다.

## 8. 테스트 고객 계정 정리

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

## 추가 E2E 검증

1. 고객 가입 → 이메일 확인 → 로그인 → 고객 탭 진입
2. 관리자 로그인 → 관리자 운영 홈 진입 → 앱 재실행 후 관리자 세션 복원
3. 고객이 관리자 경로에 접근할 때 고객 탭으로 복귀
4. 관리자가 고객 탭 경로에 접근할 때 관리자 운영 홈으로 복귀
5. 업체 담당자 프로필 로그인 거절과 로컬 세션 정리
6. `baspace://auth/callback` route와 PKCE code exchange
7. 실제 계정으로 견적 요청 생성과 RLS 검증
