---
name: plan-app
description: "앱 기획서(PRD)를 작성하는 스킬. 유저 스토리, 기능 목록, 화면 구조, FSD 모듈 맵, Supabase 데이터 모델을 정의한다. '기획해줘', 'PRD 작성', '기능 정의해줘', '화면 흐름 설계해줘', '앱 설계' 요청 시 반드시 이 스킬을 사용할 것."
---

# Plan App — 앱 기획/PRD 작성 스킬

앱 아이디어를 구체적인 제품 요구사항 문서(PRD)로 변환하는 스킬.

## Trigger
- "기획해줘", "PRD 작성", "기능 정의"
- "화면 구조 설계", "유저 스토리 작성"
- "앱 설계", "앱 구조 잡아줘"

## Input
- 아이디어 리서치 보고서 (`_workspace/idea/baspace-domain-research.md`) 또는 사용자 직접 설명

## Steps

### Step 1: 요구사항 분석
- 앱의 핵심 가치 정의
- 타겟 사용자 페르소나 작성
- 핵심 기능 vs 부가 기능 분류

### Step 2: 유저 스토리 작성
- "사용자로서, ~하기 위해 ~할 수 있다" 형식
- 우선순위 태그: P0(필수), P1(중요), P2(개선)
- 인수 조건(Acceptance Criteria) 포함

### Step 3: 화면 구조 설계
- Expo Router 그룹 구조로 매핑
  - `(auth)/` — 인증 흐름
  - `(tabs)/` — 메인 탭 네비게이션
  - `(modal)/` — 모달 화면
  - `(stack)/` — 스택 네비게이션
- 각 화면의 주요 UI 요소 목록

### Step 4: FSD 모듈 맵
- features: 비즈니스 기능 단위
- entities: 도메인 모델 단위
- widgets: 독립 UI 블록
- 모듈 간 의존성 관계 정의
- 각 모듈에 포함될 파일 목록 (api, hooks, types, store)

### Step 5: Supabase 데이터 설계
- Postgres table과 relation 초안
- 고객·업체 담당자·관리자 역할별 RLS 경계
- generated database type과 FSD entity mapping
- feature repository의 query/mutation 계약
- SQL migration 단위 정의

### Step 6: MVP 범위 결정
- 1차 출시 기능 목록 (P0만)
- 2차 확장 기능 목록 (P1)
- `_workspace/plan/prd.md`에 저장

## Agent Delegation
| Step | Agent |
|------|-------|
| 1-6 | product-planner |
