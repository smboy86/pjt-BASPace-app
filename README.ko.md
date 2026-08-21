# 노크

[English](./README.md)

노크는 욕실 리모델링 견적 협업을 위한 React Native·Expo 앱입니다. 고객이 요청을 접수하면 관리자가 참여 업체를 배정하고, 고객과 업체가 견적 버전과 코멘트를 주고받은 뒤 최종 컨펌합니다.

## 기술 스택

- Expo 55, React Native 0.83
- Expo Router
- TypeScript strict mode
- Zustand, TanStack Query
- NativeWind
- React Hook Form, Zod
- Supabase Postgres와 `@supabase/supabase-js`를 영속 데이터 기술로 사용 예정
- Vitest, ESLint, Prettier

## Codex 하네스

하네스 문서와 실행 산출물은 다음 네 위치로 구분합니다.

| 경로              | 역할                                     |
| ----------------- | ---------------------------------------- |
| `AGENTS.md`       | 프로젝트 공통 규칙과 품질 게이트         |
| `.codex/agents/`  | 역할별 Codex 에이전트 프로필             |
| `.agents/skills/` | 반복 가능한 작업 프로세스                |
| `_workspace/`     | 단계 간 인수인계 산출물과 현재 진행 상태 |

### 에이전트 역할

| 역할               | 책임                                          |
| ------------------ | --------------------------------------------- |
| `idea-researcher`  | 시장·경쟁 서비스 조사                         |
| `product-planner`  | PRD, 유저 스토리, KPI, 모듈 맵                |
| `spec-planner`     | 기능별 task 분해와 진행 추적                  |
| `design-architect` | 디자인 시스템과 화면 설계                     |
| `feature-builder`  | FSD 모듈 구성                                 |
| `api-integrator`   | Supabase 데이터, 상태, 보안 저장소, 평점 정책 |
| `ui-developer`     | Expo Router 화면과 NativeWind UI              |
| `qa-reviewer`      | 타입·린트·FSD·보안·정책 검증                  |
| `app-inspector`    | 기능·UX·접근성·런타임 검수                    |
| `loop-engineer`    | 출시 후 한 슬라이스 단위 개선                 |

### 스킬

- `ideate`
- `plan-app`
- `design-system`
- `create-feature`
- `create-entity`
- `create-screen`
- `inspect-app`
- `sim-use`
- `orchestrate`
- `iterate-app`

## 전체 개발 프로세스

```text
사전 범위 확정
  → 아이디어 조사
  → 제품 기획
  → 기능별 스펙
  → 디자인
  → Feature/Supabase/UI 구현
  → 코드 QA와 앱 검수
  → 수정 루프
  → 배포
```

각 단계는 이전 단계의 `_workspace/` 산출물을 읽고 결과를 다시 기록합니다. 상세 프로세스는 `.agents/skills/orchestrate/SKILL.md`에 있습니다.

## 프로젝트 구조

```text
app/                     Expo Router 라우트
src/core/                앱 Provider와 초기화
src/widgets/             조합형 UI 블록
src/features/            사용자 행동과 비즈니스 기능
src/entities/            도메인 모델과 상태
src/shared/              공통 API, 설정, 라이브러리, 저장소, UI
supabase/                SQL migration과 로컬 Supabase 설정
docs/specs/              기능별 작업 스펙
_workspace/              기획·디자인·QA·진행 산출물
.codex/agents/           Codex 역할 프로필
.agents/skills/          Codex 작업 스킬
plugins/                 Expo config plugin
```

FSD 의존 방향:

```text
app → widgets → features → entities → shared
```

## 실행

Node v24.15.0을 사용합니다.

```bash
nvm use
npm install
npm start
```

플랫폼 실행:

```bash
npm run ios
npm run android
```

## 품질 게이트

구현 변경 후:

```bash
npm run typecheck
npm run lint
npm test
```

코드 스타일이 바뀌면:

```bash
npm run format
```

필수 임계값과 보안 규칙은 `AGENTS.md`를 따릅니다.

## 빌드와 배포

EAS profile은 `eas.json`에 정의되어 있습니다. 게시 전 대상 profile, runtime version, update channel, 앱 식별자와 생성 artifact를 확인합니다.

빌드 문제 해결은 `docs/troubleshooting.md`와 `.agents/skills/orchestrate/references/deploy-build-troubleshooting.md`를 참고합니다.

Supabase는 향후 영속 데이터 계층의 기준입니다. DB 변경은 SQL migration으로 버전 관리하고, 클라이언트가 접근하는 테이블에는 RLS를 적용하며, 생성된 DB 타입을 feature repository에서 FSD domain entity로 변환합니다. 자세한 시작 방법은 공식 [Supabase Expo React Native 가이드](https://supabase.com/docs/guides/getting-started/quickstarts/expo-react-native)를 참고합니다.
