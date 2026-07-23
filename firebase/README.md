# Firebase 설정 파일 위치

Firebase Analytics를 사용하려면 아래 두 파일을 이 디렉토리에 배치한 뒤 EAS 빌드를 다시 실행한다.

- iOS: `GoogleService-Info.plist`
  - Firebase Console → 프로젝트 설정 → iOS 앱(번들 ID) → 설정파일 다운로드
- Android: `google-services.json`
  - Firebase Console → 프로젝트 설정 → Android 앱(패키지명) → 설정파일 다운로드

두 파일은 `.gitignore`에 등록되어 있어 커밋되지 않는다.

EAS 빌드 환경에서는 환경변수 `GOOGLE_SERVICE_INFO_PLIST` / `GOOGLE_SERVICES_JSON`로 경로를 오버라이드할 수 있다 (`eas secret` + `eas.json`의 `env.file` 조합).

## Firebase Analytics 사용 목적

Firebase Analytics는 견적 요청 제출, 업체 매칭, 견적 발송, 고객 최종 컨펌 등 핵심 상담 흐름을 측정할 때 사용한다.

## 빌드 호환성 메모

`@react-native-firebase`를 iOS 정적 프레임워크로 사용할 때는 Firebase 모듈의 링크 설정을 맞춰야 한다.

`app.config.ts`의 `expo-build-properties` 플러그인에 다음이 설정되어 있어야 한다:

```ts
ios: {
  useFrameworks: 'static',
  forceStaticLinking: ['RNFBApp', 'RNFBAnalytics'],
}
```

또한 iOS는 `jsEngine: 'jsc'`로 오버라이드한다 (Android는 Hermes 유지). Firebase pod의 Swift interop 호환성 확보용.

## 처음 한 번만 — Firebase Console 설정

1. https://console.firebase.google.com → 프로젝트 생성 (또는 기존 프로젝트 선택)
2. iOS 앱 추가 → 번들 ID 입력 (`app.config.ts`의 `bundleIdentifier`와 동일하게)
3. `GoogleService-Info.plist` 다운로드 → 이 디렉토리에 배치
4. Android 앱 추가 → 패키지명 입력 (`app.config.ts`의 `android.package`와 동일하게)
5. `google-services.json` 다운로드 → 이 디렉토리에 배치
