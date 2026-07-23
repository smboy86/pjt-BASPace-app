# Create Entity Skill

FSD 아키텍처의 entity(도메인 모델) 레이어에 새 엔티티를 생성하는 스킬.

## Trigger

- "엔티티 만들어줘", "entity 추가", "도메인 모델 추가"
- `/create-entity {name}`

## Input

- `name`: 엔티티 이름 (kebab-case, 예: `product`)
- `with-store`: UI 전용 Zustand store 포함 여부 (default: false)

## Steps

### Step 1: 이름 검증
- kebab-case 형식 확인
- 기존 entity와 이름 중복 확인 (`src/entities/` 검색)

### Step 2: 디렉토리 구조 생성

```
src/entities/{name}/
├── model/
│   ├── {name}.mapper.ts
│   └── index.ts
├── types/
│   ├── {name}.types.ts
│   └── index.ts
├── store/                   # optional, UI/domain state only
│   ├── {name}.store.ts
│   └── index.ts
└── index.ts
```

### Step 3: 파일 생성

#### `types/{name}.types.ts`
```typescript
export interface I{Name} {
  id: string;
  createdAt: string;
  updatedAt: string;
}

```

#### `model/{name}.mapper.ts`
```typescript
import type { I{Name} } from '../types';
import type { Database } from '@/shared/supabase';

type T{Name}Row = Database['public']['Tables']['{table_name}']['Row'];

export const map{Name}Row = (row: T{Name}Row): I{Name} => {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};
```

#### `index.ts`
```typescript
export * from './types';
export * from './model';
```

### Step 4: QA 검증
- `npm run typecheck` 실행
- FSD 의존성 규칙 확인 (entities는 shared만 참조 가능)
- generated database row type과 domain entity type이 mapper로 분리되었는지 확인
- Supabase query가 entity 또는 UI에 직접 포함되지 않았는지 확인

## Agent Delegation

| Step | Agent |
|------|-------|
| 1-3 | feature-builder |
| 4 | qa-reviewer |
