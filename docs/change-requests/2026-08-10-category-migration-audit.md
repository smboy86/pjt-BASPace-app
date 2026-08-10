# 카테고리 전환 P3-02 읽기 전용 감사 및 복구·검증표

> 조사일: 2026-08-10
>
> 상태: 원격 카탈로그 전환 적용 완료 · 과거 요청 실제 화면 로딩 검증 대기
>
> 적용 migration: `20260810000100_transition_quote_option_catalog.sql`

## 1. 결론

- 유지 코드는 `TILE`, `BASIN_TOILET`, `BATHTUB`, `BATHROOM_CABINET`이다.
- 전환 후 삭제 대상 코드는 `WATER_TANK`, `ZENDAI`, `MASONRY_WALL`, `CEILING`,
  `INDIRECT_LIGHTING`이며, 연결된 `quote_option_products`도 함께 삭제 대상이다.
- 신규 코드는 `FAUCET_DRAIN`, `ZENDAI_PARTITION`, `CEILING_LIGHT_VENT`, `GROUT`이다.
- 카탈로그 삭제는 `selection_snapshots`와 견적 업무 데이터를 자동 삭제하지 않는다. 현재 제출
  RPC는 당시 카테고리명·제품명·가격·코드·이미지 경로를 스냅샷 값으로 보존하고, 상세 조회도
  현재 카탈로그에 조인하지 않는다.
- 따라서 과거 요청은 우선 보존한다. 실제 로딩 실패가 확인되고 안전하게 복구할 수 없을 때만
  `P3-07`에서 해당 요청 단위의 종속 업무 데이터를 조건부로 정리한다.
- 제품 이미지 경로는 DB 문자열일 뿐 Storage 객체와 FK로 연결되지 않는다. 적용 migration은
  경로·객체 존재 여부를 `private` 백업 테이블에 기록하고 실제 Storage 파일은 삭제하지 않았다.

## 2. 조사 범위와 원격 상태

로컬 migration, RPC, repository와 mapper를 대조한 뒤 사용자 승인에 따라 linked Supabase에
`20260810000100`을 적용했다. 환경에서 dry-run을 수행할 수 없어 사용자가 원격 적용을 명시적으로
승인했으며, migration 내부의 예상 코드 검증·transaction 백업·결과 코드 검증으로 대체했다.
원격 통계의 행 수는 Postgres 추정치이지만 migration의 사전·사후 검증은 실제 행을 기준으로 한다.

| 테이블 | 적용 전 → 적용 후 원격 행 수 | 비고 |
|---|---:|---|
| `quote_option_masters` | 9 → 8 | migration 사후 코드·순서 검증 통과 |
| `quote_option_products` | 12 → 7 | 삭제된 5개 마스터의 제품 cascade |
| `quote_option_images` | 0 → 0 | 제품형 전환 후 남은 레거시 테이블 |
| `quote_option_image_cleanup_queue` | 1 → 1 | migration이 새 삭제 경로를 넣지 않음 |
| `selection_snapshots` | 34 → 34 | 과거 선택값 유지 |
| `remodel_requests` | 8 → 8 | 요청 원본 유지 |
| `request_assignments` | 7 → 7 | 배정 유지 |
| `consultation_messages` | 5 → 5 | 상담 유지 |
| `quotes` / `quote_line_items` | 0 / 0 → 0 / 0 | 현재 견적 행 없음 |
| `catalog_items` / `catalog_options` / `catalog_price_history` | 0 / 0 / 0 | 현재 옵션 카탈로그와 별개인 레거시 |

적용 후 `db lint --linked --level warning`은 `No schema errors found`로 통과했다. 실제 Storage
바이너리를 외부로 다운로드하지는 않았으며 migration은 해당 객체를 삭제하지 않고 원격에
그대로 보존했다.

## 3. 데이터 관계와 삭제 영향

| 부모/원본 | 종속 데이터 | 삭제 동작 | 전환 원칙 |
|---|---|---|---|
| `quote_option_masters` | `quote_option_products`, `quote_option_images` | `CASCADE` | 대상 마스터·제품·이미지 메타데이터 백업 후 삭제 |
| `quote_option_products.image_path` | Storage 실제 객체 | FK 없음 | 경로 목록과 바이너리를 별도 백업하고 cleanup queue와 대조 |
| `catalog_items` | `selection_snapshots.catalog_item_id` | `SET NULL` | 이번 전환 대상 아님 |
| 현재 옵션 카탈로그 | `selection_snapshots.selected_options` | 직접 FK 없음 | 스냅샷 유지, JSON 완전성 검증 |
| `remodel_requests` | 선택·사진·배정·견적·상담 | `CASCADE` | P3-07 조건을 만족하기 전 삭제 금지 |
| `request_assignments` | 연결 견적·상담 | `CASCADE` | 요청 보존 시 함께 보존 |
| `quotes` | `quote_line_items` | `CASCADE` | 요청 보존 시 함께 보존 |
| `quotes` | `consultation_messages.quote_id` | `SET NULL` | 메시지 자체는 요청 관계에 따라 보존 |
| 계정·프로필·업체 | 요청·업무 데이터 일부 | 기본 `NO ACTION` | 전환 및 P3-07에서도 삭제 금지 |

신규 고객 제출 스냅샷은 다음 값을 당시 값으로 저장한다.

- `category`: 당시 옵션 마스터 이름
- `item_name`: 당시 제품 이름
- `base_price_snapshot`: 당시 제품 가격
- `selected_options`: `optionCode`, `optionId`, `productId`, `productName`, `imagePath`,
  `unitPrice`

## 4. 삭제 대상 표

| 분류 | 코드 | 처리 |
|---|---|---|
| 유지 | `TILE`, `BASIN_TOILET`, `BATHTUB`, `BATHROOM_CABINET` | UUID와 제품을 유지하고 순서·표시명을 목표안에 맞춤 |
| 기존 삭제 | `WATER_TANK` | 신규 `FAUCET_DRAIN` 생성 후 대상 제품과 함께 삭제 |
| 기존 삭제 | `ZENDAI`, `MASONRY_WALL` | 신규 `ZENDAI_PARTITION` 생성 후 대상 제품과 함께 삭제 |
| 기존 삭제 | `CEILING`, `INDIRECT_LIGHTING` | 신규 `CEILING_LIGHT_VENT` 생성 후 대상 제품과 함께 삭제 |
| 신규 생성 | `GROUT` | 새 마스터와 초기 제품 정책 반영 |
| 보존 | 요청·선택·견적·상담·배정 | 카탈로그 전환만으로 삭제하지 않음 |
| 영구 보존 | 인증 계정·프로필·업체 | 어떤 전환 경로에서도 삭제하지 않음 |

## 5. 백업·복구 검증표

전환 전 전체 카탈로그를 앱에서 접근할 수 없는 `private` 스키마에 원래 UUID 그대로 보존했다.
이 문서에는 고객 행 원문이나 개인정보를 남기지 않는다.

| 대상 | 백업/검증 내용 | 현재 상태 | 적용 승인 조건 |
|---|---|---|---|
| migration 이력 | 로컬·원격 버전 일치 | 통과 | 적용 직전 재확인 |
| 대상 마스터 | UUID, code, name, type, order 전체 원형 | 완료 — 9건 | `private.quote_option_masters_backup_20260810` |
| 대상 제품 | UUID, master UUID, 이름, 가격, 순서, `image_path` | 완료 — 12건 | `private.quote_option_products_backup_20260810` |
| 레거시 이미지 메타 | `quote_option_images` 대상 행 | 완료 — 0건 | `private.quote_option_images_backup_20260810` |
| Storage | 제품 경로, 객체 존재·cleanup 대기 여부 | 완료 — 경로 4건 | `private.quote_option_storage_backup_20260810`; 바이너리는 원위치 보존 |
| cleanup queue | 새 경로 등록 여부 | 완료 | 적용 전후 1건으로 동일 |
| 선택 스냅샷 | 적용 전후 행 수 | 완료 — 34건 유지 | 세부 JSON 완전성과 화면 표시는 P3-06 검증 |
| 요청 업무 데이터 | 요청·배정·견적·상담 수 | 완료 | 적용 전후 수량 동일 |
| DB 타입 | public 스키마 계약 변화 여부 | 완료 — 변화 없음 | 데이터 전환과 private 백업 테이블만 추가 |
| 화면 로딩 | 고객·관리자·업체 과거 요청 상세 | `P3-06` 대기 | 역할별 실제 로딩 성공 |

복원 순서는 `quote_option_masters`를 기존 UUID로 복원한 뒤 제품·레거시 이미지 메타데이터를
기존 UUID로 복원하고, Storage 파일을 원래 경로에 재업로드하는 순서다. 같은 경로가 cleanup
queue에 있으면 실제 삭제 작업 전에 항목 제거 또는 처리 중단 여부를 검토한다.

## 6. P3-04 dry-run 대체 및 적용 후 검증

dry-run은 환경 제약과 사용자의 명시적 승인으로 생략했다. 대신 migration transaction과 적용 후
검증으로 다음을 확인했다.

1. 적용 전 실제 코드가 예상한 기존 9개와 다르면 transaction 중단
2. 전환 전 마스터 9건·제품 12건·이미지 경로 4건을 private 백업으로 보존
3. 전환 후 마스터가 목표 8개 코드·순서와 다르면 transaction 중단
4. 적용 후 요청·선택·배정·상담 행 수가 적용 전과 동일함을 원격 통계로 확인
5. migration 이력 `20260810000100` 일치와 linked DB lint 통과

스냅샷 JSON 키 완전성과 역할별 과거 상세 화면 표시는 `P3-06`에서 실제 로딩으로 검증한다.

## 7. Go / No-Go 기준

| 기준 | 판정 |
|---|---|
| 로컬·원격 migration 이력 일치 | `PASS` |
| FK와 snapshot 저장·조회 관계 조사 | `PASS` |
| 원격 테이블 규모 참고치 확보 | `PASS` — 추정치 |
| 목표 8개 코드·순서 | `PASS` — migration 사후 조건 |
| DB 행 백업과 복원 데이터 | `PASS` — private 백업 4종 |
| Storage 실제 파일 | `PARTIAL` — 경로·객체 존재 상태 4건 기록, 삭제하지 않음; 별도 외부 사본과 화면 표시는 미검증 |
| linked DB lint | `PASS` — 오류 0건 |
| 과거 요청 역할별 로딩 | `PENDING` — P3-06 |

현재 결론은 `카탈로그 원격 전환 완료`, `과거 요청 삭제 금지`, `P3-06 실제 로딩 검증 필요`다.
