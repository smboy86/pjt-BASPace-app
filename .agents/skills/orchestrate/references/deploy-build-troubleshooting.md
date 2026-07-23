# Deploy & Build Troubleshooting (on-demand reference)

배포(Phase 7 / `/store-deploy`)·빌드 단계에서만 필요한 절차와 트러블슈팅 모음이다. 항상 적용되는 빌드 순서와 앱 이름 일관성 규칙은 `AGENTS.md`를 따른다.

> 전체 배포 파이프라인은 현재 활성화된 `store-deploy` 워크플로와 `AGENTS.md` 규칙을 따른다.

## 빌드 아카이브 최적화 (.easignore)

EAS 클라우드 빌드 시 불필요한 파일이 업로드되면 아카이브 크기가 커지고 업로드 시간이 증가한다. `.easignore` 파일을 반드시 설정한다:

```
node_modules/
assets/store-screenshots/
assets/store-listing/
fastlane/
screenshots/
docs/
scripts/
build-output/
_workspace/
.agents/
.codex/
plugins/
.git/
.idea/
.vscode/
.playwright-mcp/
.DS_Store
*.md
*.tsbuildinfo
```

## 앱 크기 최적화 체크리스트

배포 전 아래 항목을 확인한다:

| 항목 | 방법 | 효과 |
|------|------|------|
| 이미지 최적화 | PNG → WebP 변환, 해상도 적정화 | 에셋 크기 50%+ 감소 |
| 미사용 폰트 제거 | 사용하지 않는 `@expo-google-fonts/*` 삭제 | 폰트당 0.5-2MB 절감 |
| 미사용 의존성 제거 | `npm ls --all` 확인 후 미사용 패키지 삭제 | 번들 크기 감소 |
| Lottie 애니메이션 최적화 | 파일 크기 확인, 불필요한 레이어 제거 | 1-5MB 절감 가능 |
| 네이티브 디버그 심볼 | `eas.json`에서 production 프로필 확인 | 앱 크기 직접 영향 없음 |
| ProGuard/R8 (Android) | 자동 적용됨, 매핑 파일 경고 무시 가능 | 코드 크기 감소 |
| Bitcode (iOS) | Expo managed에서 자동 처리 | - |

## 배포 전 필수 준비 항목

| 항목 | 설명 |
|------|------|
| 개인정보처리방침 URL | GitHub Pages 등에 호스팅, 4개 언어 권장 |
| 앱 아이콘 | iOS: 1024x1024, Android: 512x512 (adaptive icon) |
| 스크린샷 | iOS: iPhone 6.7"/6.5", iPad 12.9". Android: 1080x1920 phone |
| 그래픽 이미지 (Android) | 1024x500 feature graphic |
| 스토어 메타데이터 | `fastlane/metadata/` 구조로 title, description, release notes 준비 |
| **릴리즈 노트** | **Android changelogs는 반드시 500 bytes 이내**. Google Play API 제한. iOS release_notes는 4000자까지 가능하지만, 동일 내용을 Android에도 사용하므로 **500 bytes 기준으로 작성** |
| 앱 버전 관리 | ASC/Play 기존 버전보다 높은 version 설정 필수 |
| `.easignore` 설정 | 빌드 아카이브에 불필요한 파일 제외 |
| **런타임 트리거 배선** | **게시 후엔 코드로만 수정 가능.** 빌드 직전 확인: `ux.store_review=true`면 평점 트리거(`maybeRequest`)가 가치-순간 화면 성공 콜백에 최소 1곳 배선됐는지와 KPI 이벤트 배선 여부를 확인한다. (시뮬레이터·dev·TestFlight에선 검증 불가 → 코드로만 판정) |
| **배포 게이트** | 앱 이름 일치 / 권한↔사용설명 일치(미사용 권한 미선언) / 데이터 안전 라벨↔수집 SDK 일치 / 미해결 HIGH QA 이슈 0 / EAS Secrets 주입 |

## 네이티브 설정 변경 → 재빌드 무효화 (재검증 규칙)

`app.config.ts` · config plugin · 네이티브 의존성 · `infoPlist` · 권한 · 앱 이름(`withLocalizedAppName`) 등 **네이티브 레이어에 영향을 주는 변경은 JS 핫리로드로 반영되지 않는다.** 변경 후 반드시 재검증한다:

1. `npx expo prebuild --clean` (ios/android 재생성 — 이전 네이티브 산출물 폐기)
2. `npm run typecheck && npm run lint`
3. `eas build --local` 또는 development build로 1회 구동 검증

특히 `withLocalizedAppName`(홈화면 다국어 이름) · plugin 추가/제거 · 권한·Info.plist 문구 변경은 clean prebuild 없이는 **반영 안 된 채 빌드가 성공**해 출시 후에야 발견된다. 변경이 네이티브에 닿는지 애매하면 clean prebuild를 기본값으로 한다.

## Android 특수 고려사항

- **lintOptions/lint 구문**: AGP 8+ 에서 `lintOptions`는 `lint`로 변경됨. Expo config plugin 작성 시 주의
- **ACTIVITY_RECOGNITION 권한**: `expo-sensors` 사용 시 자동 포함됨. Play Console "건강 앱" 질문에서 용도 설명 필요
- **Draft App 제한**: 앱 설정 미완료 시 Google Play API(fastlane supply 포함) 커밋이 실패함. Play Console 웹에서 앱 설정을 먼저 완료해야 함
- **첫 번째 제출**: EAS Submit / fastlane이 아닌 Play Console 웹에서 수동으로 첫 AAB 업로드 필요

## iOS 특수 고려사항

- **ASC App ID**: `eas.json`의 `ascAppId`에 실제 App Store Connect 앱 ID 설정 필수 (기본값 변경)
- **버전 충돌**: ASC에 이미 높은 버전이 있으면 낮은 버전 업로드 불가. `app.config.ts`에서 버전 확인
- **ITSAppUsesNonExemptEncryption**: 암호화 미사용 시 `Info.plist`에 `false` 설정으로 수출 규정 팝업 스킵
- **비대화식 제출 (ASC API Key)**: `eas submit --non-interactive`로 자동 제출하려면 `eas.json`의 `submit.production.ios`에 `appleId` 외에 다음을 추가한다:
  ```json
  "ascApiKeyPath": "./fastlane/keys/AuthKey_XXXXXXXXXX.p8",
  "ascApiKeyId": "XXXXXXXXXX",
  "ascApiKeyIssuerId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
  ```
  `appleId`만 설정된 상태에서는 앱 별 암호 입력을 요구하므로 CI/자동 파이프라인이 멈춘다.

## iOS 빌드 트러블슈팅

| 증상 | 원인 | 해결 |
|------|------|------|
| `xcodebuild -showBuildSettings` 타임아웃 (fastlane 단계) | Apple Silicon + RN 0.81 + SPM 의존성 해석 시간 초과. 기본 3초 4회 retry로 부족 | 빌드 명령 앞에 `FASTLANE_XCODEBUILD_SETTINGS_TIMEOUT=120 FASTLANE_XCODEBUILD_SETTINGS_RETRIES=8` 환경변수 설정 |
| "Multiple commands produce .../InfoPlist.strings" | `app.config.ts`의 `locales` 필드와 `withLocalizedAppName` plugin이 둘 다 PBXVariantGroup을 등록 | `AGENTS.md`의 앱 이름 일관성 항목 참고. plugin은 `locales` 사용 시 자동으로 iOS 처리를 생략함. 각 언어 JSON에 `CFBundleDisplayName` 추가 |
| `eas submit` "You've already submitted this version" | 동일 `expo.version`이 이미 ASC에 업로드됨 (TestFlight도 동일 version+build 조합 거부) | `app.config.ts`의 `APP_VERSION` 패치(예: 1.0.2 → 1.0.3) 후 재빌드 |

## Android 빌드 트러블슈팅

| 증상 | 원인 | 해결 |
|------|------|------|
| `react-native-reanimated:buildCMakeRelWithDebInfo` 단계에서 `libworklets.so missing and no known rule to make it` | 로컬 `node_modules/react-native-{reanimated,worklets}/android/.cxx` 캐시가 이전 빌드의 절대 경로를 참조 | `cd android && ./gradlew --stop && cd ..` 후 `rm -rf android node_modules/react-native-reanimated/android/{.cxx,build} node_modules/react-native-worklets/android/{.cxx,build}` 실행. EAS가 prebuild를 다시 수행하면서 일관된 경로로 빌드함 |
| "Specified value for android.package is ignored because an android directory was detected" | 로컬에 `android/` 폴더가 이미 있음 (이전 prebuild 결과) | 의도한 동작이라면 무시. `app.config.ts`의 `android.package` 변경을 반영하려면 `android/` 삭제 후 재빌드 |
