# Create Screen Skill

Expo Router 규칙에 맞는 새 스크린을 추가하는 스킬.

## Trigger

- "스크린 추가해줘", "화면 만들어줘", "페이지 추가"
- `/create-screen {name}`

## Input

- `name`: 스크린 이름 (kebab-case, 예: `settings`)
- `group`: 라우트 그룹 (예: `(tabs)`, `(auth)`, `(modal)`)
- `layout`: 레이아웃 타입 (`stack` | `tabs` | `none`)

## Steps

### Step 0: 통합 화면정의 확인
- `maintain-screen-definition`을 사용한다.
- `docs/screen-definition.md`에서 역할과 관련 화면 ID를 확인한다.
- 새 화면이면 구현 전에 화면 ID, 목적, 예정 경로, 액션, 상태를 추가한다.

### Step 1: 라우트 구조 확인
- `app/` 디렉토리의 기존 라우트 구조 분석
- 지정된 group 존재 여부 확인, 없으면 생성

### Step 2: 스크린 파일 생성

#### `app/{group}/{name}.tsx`
```typescript
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text } from 'react-native';

export default function {Name}Screen() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-4">
        <Text className="text-lg font-bold">{Name}</Text>
      </View>
    </SafeAreaView>
  );
}
```

### Step 3: 레이아웃 업데이트
- 해당 group의 `_layout.tsx`에 새 스크린 등록
- 탭 그룹이면 탭 아이콘 설정 포함

### Step 4: 네비게이션 연결 (optional)
- 기존 스크린에서의 이동 링크 추가
- `expo-router`의 `Link` 또는 `router.push()` 사용

### Step 5: QA 검증
- SafeAreaView 적용 확인
- NativeWind className 사용 확인
- TypeScript 타입 체크

### Step 6: 통합 화면정의 동기화
- 실제 경로, 구현 파일, 버튼, 상태, 내비게이션을 `docs/screen-definition.md`와 대조한다.
- 계획 화면은 실제 구현 수준에 맞는 상태로 변경한다.
- `node .agents/skills/maintain-screen-definition/scripts/validate-screen-definition.mjs`를 실행한다.

## Agent Delegation

| Step | Agent |
|------|-------|
| 1-4 | ui-developer |
| 5 | qa-reviewer |
