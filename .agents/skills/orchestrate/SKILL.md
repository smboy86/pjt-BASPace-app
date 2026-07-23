---
name: orchestrate
description: BASpace 앱의 사전 범위 확정부터 기획, 스펙, 디자인, 구현, QA, 개선, 배포까지 전체 개발 파이프라인을 운영한다. "앱 전체 개발", "전체 파이프라인", "orchestrate" 요청 시 사용한다.
---

# Orchestrate — Full App Lifecycle

## 목적

각 단계의 결과를 `_workspace/`에 남기고 다음 단계가 그 결과를 읽도록 하여 긴 개발 작업을 일관되게 운영한다.

## 공통 원칙

1. 모든 작업은 `AGENTS.md`를 우선한다.
2. 각 단계 시작 전에 `_workspace/spec.md`와 이전 단계 산출물을 읽는다.
3. 생성 역할과 검증 역할을 분리한다.
4. 구현 단계마다 `npm run typecheck`와 `npm run lint`를 실행한다.
5. 실패한 검증은 우회하지 않고 수정 후 다시 실행한다.
6. 사용자 승인이나 외부 권한이 필요한 작업은 상태를 기록하고 필요한 입력만 요청한다.
7. 단계가 끝날 때 `_workspace/pipeline-status.md`를 갱신한다.

## Workspace

```text
_workspace/
├── spec.md
├── pipeline-status.md
├── idea/
│   └── app-concepts.md
├── plan/
│   ├── prd.md
│   ├── kpis.md
│   ├── user-stories.md
│   └── fsd-module-map.md
├── design/
│   ├── design-system.md
│   └── screen-layouts.md
├── implementation/
│   ├── sprint-contract-4a.md
│   ├── sprint-contract-4b.md
│   ├── sprint-contract-4c.md
│   └── sprint-contract-4d.md
├── qa/
│   ├── code-review.md
│   ├── inspection-report.md
│   └── unresolved.md
└── iterate/
    ├── backlog.md
    └── cycle-{N}.md
```

## Phase 0 — Pre-flight

프로젝트 목표와 구현 경계를 `_workspace/spec.md`에 확정한다.

필수 확인 항목:

- 프로젝트 이름, 한 줄 설명, 핵심 사용자
- 현재 문제와 성공 조건
- iOS/Android 대상
- 인증 방식과 역할
- 로컬 데이터 또는 백엔드
- 사진·파일 처리
- 필요한 네이티브 권한
- 온보딩, 언어, 테마
- Supabase 프로젝트와 데이터 전환 범위
- 스토어 리뷰 사용 여부
- 배포 채널과 목표
- 무인 실행 여부

모호한 선택은 사용자에게 영향을 설명하고 확인한다. `execution.unattended=true`이면 `on_ambiguity` 정책을 따른다.

통과 조건:

- 필수 항목이 비어 있지 않다.
- 범위와 비목표가 명시되어 있다.
- 사용자가 결과를 승인했거나 무인 실행 정책으로 확정되었다.

## Phase 1 — Ideation

담당: `idea-researcher`

입력:

- `_workspace/spec.md`
- 사용자 문제와 참고 서비스

출력:

- `_workspace/idea/app-concepts.md`

통과 조건:

- 시장과 경쟁 앱 근거가 있다.
- 구현 가능한 아이디어가 비교되어 있다.
- 선택한 방향이 spec 경계 안에 있다.

## Phase 2 — Product Planning

담당: `product-planner`

출력:

- `_workspace/plan/prd.md`
- `_workspace/plan/kpis.md`
- `_workspace/plan/user-stories.md`
- `_workspace/plan/fsd-module-map.md`

PRD 필수 항목:

- 문제, 사용자, 핵심 가치
- MVP와 비목표
- 유저 스토리와 인수 조건
- 화면 흐름
- FSD 모듈 맵
- Supabase 데이터 모델, 관계, RLS 초안
- 북극성 지표
- 획득·활성·유지 KPI와 산정 데이터
- 보안·개인정보 경계

## Phase 2.5 — Spec Planning

담당: `spec-planner`

PRD의 기능을 `docs/specs/{NN}-{feature}/` 아래 phase/task로 분해한다. `docs/specs/README.md`는 실제 체크박스와 동일한 진행률을 표시해야 한다.

각 task는 다음을 포함한다.

- 목표
- 수정 파일 또는 모듈
- 완료 조건
- 검증 명령
- 의존 task

## Phase 3 — Design

담당: `design-architect`

출력:

- `_workspace/design/design-system.md`
- `_workspace/design/screen-layouts.md`
- `tailwind.config.js`
- 필요한 theme/UI 파일

디자인 작업 전 NativeWind 설정을 확인한다. 모든 화면은 Safe Area, 로딩, 빈 상태, 오류 상태, 접근성을 고려한다.

## Phase 4 — Implementation

Phase 4는 의존성 순서대로 진행한다.

### Phase 4a — Feature Structure

담당: `feature-builder`

- entity, feature, widget 구조 생성
- 타입과 public barrel export 작성
- FSD 의존 방향 검증

### Phase 4b — Supabase Data And State

담당: `api-integrator`

- Supabase client와 generated database types
- SQL migration과 RLS 정책
- feature repository와 query/mutation 훅
- database row와 domain entity mapper
- Zustand 상태
- SecureStore 기반 토큰 저장
- Store Review 정책 모듈

### Phase 4c — UI

담당: `ui-developer`

- Expo Router 화면
- NativeWind UI
- Safe Area와 접근성
- 성공·오류·빈 상태
- repository와 상태 배선

각 하위 단계 시작 전에 `_workspace/implementation/sprint-contract-4{x}.md`를 작성한다.

```markdown
# Sprint Contract

## 목표
## 변경 범위
## 완료 조건
## 검증 명령
## 예상 산출물
```

각 단계 완료 후 Quick QA:

```bash
npm run typecheck
npm run lint
```

## Phase 5 — QA

두 검증을 독립적으로 수행한다.

### Code QA

담당: `qa-reviewer`

출력: `_workspace/qa/code-review.md`

- TypeScript와 ESLint
- FSD 의존성
- `any`와 barrel export
- 보안 저장소와 민감정보 로그
- 날짜 처리
- Supabase migration·RLS·generated type과 Store Review 정책
- 관련 테스트

### Functional And UX Inspection

담당: `app-inspector`

출력: `_workspace/qa/inspection-report.md`

- PRD 유저 스토리
- 역할별 핵심 플로우
- Safe Area와 접근성
- 로딩·빈 상태·오류 상태
- 실제 시뮬레이터 또는 기기 동작
- 기존 기능 회귀

두 검증이 모두 PASS여야 다음 단계로 이동한다.

## Phase 6 — Fix Loop

HIGH 또는 FAIL 항목을 우선 수정한다.

1. 원인과 영향 범위를 확인한다.
2. 담당 구현 역할이 수정한다.
3. QA를 다시 실행한다.
4. 최대 3회 반복한다.
5. 남은 항목은 `_workspace/qa/unresolved.md`에 기록한다.

## Phase 7 — Deployment

배포 전 확인:

- typecheck, lint, test 통과
- 미해결 HIGH 이슈 없음
- 앱 이름과 식별자 일치
- 권한과 사용 설명 일치
- Supabase service-role key가 client 코드와 설정에 없음
- EAS profile, runtime, channel 확인
- 릴리즈 노트와 스토어 메타데이터 확인

세부 빌드 문제는 `references/deploy-build-troubleshooting.md`를 참고한다.

## Post-launch Iteration

전체 파이프라인을 다시 실행하지 않는다. `iterate-app`으로 다음 한 슬라이스만 진행한다.

```text
Assess → Recommend → Develop → Verify → Reflect
```

상세 기준은 `references/loop-engineering.md`를 참고한다.

## Error Handling

오류가 발생하면 해당 단계 아래에 기록한다.

```text
_workspace/{phase}/error.md
```

기록 항목:

- 실패한 명령이나 외부 단계
- 실제 오류 메시지
- 이미 시도한 해결책
- 필요한 사용자 입력 또는 외부 권한
- 안전하게 재개할 위치
