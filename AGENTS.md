# AGENTS.md

This file provides Codex guidance for this repository.

## Project Overview

React Native + Expo template with Feature-Sliced Design (FSD) architecture and an AI agent harness for full lifecycle app development.

## Tech Stack

- Framework: React Native 0.83 + Expo 55
- Routing: Expo Router
- State: Zustand for client state, TanStack Query for server state
- Styling: NativeWind
- Forms and validation: React Hook Form + Zod
- Backend and database: Supabase Postgres via `@supabase/supabase-js`
- Server state: TanStack Query
- TypeScript: strict mode

## Codex Harness Rules

Codex agent profiles live in `.codex/agents/`, and reusable workflow skills live in `.agents/skills/`.

When a task maps to a harness role, use the matching Codex agent profile:

| Task Type | Reference |
| --- | --- |
| Idea and market research | `.codex/agents/idea-researcher.toml` |
| Product planning and PRD | `.codex/agents/product-planner.toml` |
| Specs and task breakdown | `.codex/agents/spec-planner.toml` |
| Design system and theme | `.codex/agents/design-architect.toml` |
| FSD module scaffolding | `.codex/agents/feature-builder.toml` |
| API and state integration | `.codex/agents/api-integrator.toml` |
| UI and screens | `.codex/agents/ui-developer.toml` |
| Code quality review | `.codex/agents/qa-reviewer.toml` |
| Functional and UX inspection | `.codex/agents/app-inspector.toml` |

Use Codex skills when they are available for the same workflow:

| Workflow | Codex Skill |
| --- | --- |
| App ideation | `ideate` |
| App planning | `plan-app` |
| Design system | `design-system` |
| FSD feature creation | `create-feature` |
| Entity creation | `create-entity` |
| Screen creation | `create-screen` |
| Screen definition maintenance | `maintain-screen-definition` |
| App inspection | `inspect-app` |
| Full lifecycle app development | `orchestrate` |
| Store deployment | `store-deploy` |

For full app development, follow this pipeline and do not skip QA:

1. Ideation
2. Product planning (must define a north-star metric plus acquisition, activation, and retention KPIs)
3. Spec planning and task breakdown
4. Design
5. Implementation
   - 5a feature scaffolding
   - 5b Supabase data integration
   - 5c UI screens
6. QA and app inspection
7. Iteration, up to 3 fix loops
8. Deployment through `store-deploy`

Use `_workspace/` for handoff artifacts between phases. Before moving to a later phase, read the previous phase outputs from `_workspace/` and continue from them.

## Integrated Planning And Screen Definition

`docs/screen-definition.md` is the single source of truth for BASpace screen planning and behavior.
It is organized by `Common`, `Customer`, `Partner Staff`, and `Administrator`; reusable screens
belong under `Common`.

For every feature addition or modification that can affect a screen, button, input, copy, role,
permission, state, navigation, or data behavior:

1. Use `maintain-screen-definition`.
2. Read the affected screen IDs before implementation.
3. Update the definition before implementation when the requested behavior is missing or conflicts
   with the document.
4. Implement within the documented scope.
5. Reconcile the summary table and detailed definition with the actual code after implementation.
6. Run:

```bash
node .agents/skills/maintain-screen-definition/scripts/validate-screen-definition.mjs
```

Do not mark work complete when code and `docs/screen-definition.md` disagree. Do not describe local
Zustand state or a prototype interaction as persisted backend behavior.

## Hard Thresholds

These are fail conditions:

| Check | Threshold |
| --- | --- |
| `npm run typecheck` errors | 0 |
| `npm run lint` errors | 0 |
| `any` types in production code | 0 |
| FSD layer dependency violations | 0 |
| Missing safe area handling in screens | 0 |
| Missing barrel exports | 0 |
| Implemented screens missing or stale in `docs/screen-definition.md` | 0 |
| Broken NativeWind setup | 0 |
| `toISOString().split('T')[0]` for local date | 0 |
| Tokens or secrets stored in AsyncStorage/MMKV/plaintext | 0 |
| `requestReview()` calls bypassing the policy engine | 0 |

### Secure Storage And Sensitive Data

`AsyncStorage` and `MMKV` write to plaintext stores that are readable on rooted/jailbroken devices. Auth tokens and any other sensitive data must live in iOS Keychain / Android Keystore-backed encrypted storage. Use `expo-secure-store` as the standard.

Install:

```bash
npx expo install expo-secure-store
```

Storage boundary:

| Class | Examples | Storage |
| --- | --- | --- |
| Sensitive | access token, refresh token, OAuth/session tokens, API secret keys, passwords/PINs, PII-bound tokens | `expo-secure-store` |
| Semi-sensitive | push tokens, device secrets, recoverable user pseudo-IDs | `expo-secure-store` |
| Non-sensitive | UI theme, locale, last-visited screen, onboarding flags, non-identifying cache, non-sensitive Zustand slices | `@react-native-async-storage/async-storage` or `react-native-mmkv` |

Forbidden:

- Persisting tokens through Redux/Zustand `persist` into `AsyncStorage`. `persist` is only for non-sensitive slices.
- Putting secrets in `app.config.ts` `extra`, `.env` files shipped to the client bundle, or plaintext JSON.
- Logging tokens or PII to console or remote diagnostics — mask even in `__DEV__`.

FSD layout:

```text
src/shared/secure-storage/
├── client.ts        # expo-secure-store wrapper
├── keys.ts          # SECURE_KEYS constants + TSecureKey
├── types/index.ts
└── index.ts         # barrel export
```

Required wrapper pattern (`src/shared/secure-storage/client.ts`):

```ts
import * as SecureStore from 'expo-secure-store';
import { SECURE_KEYS, TSecureKey } from './keys';

const DEFAULT_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export const setSecureItem = (key: TSecureKey, value: string) =>
  SecureStore.setItemAsync(key, value, DEFAULT_OPTIONS);

export const getSecureItem = (key: TSecureKey) =>
  SecureStore.getItemAsync(key, DEFAULT_OPTIONS);

export const deleteSecureItem = (key: TSecureKey) =>
  SecureStore.deleteItemAsync(key, DEFAULT_OPTIONS);

export const clearAllSecure = () =>
  Promise.all(Object.values(SECURE_KEYS).map(deleteSecureItem));
```

Keys catalog (`src/shared/secure-storage/keys.ts`):

```ts
export const SECURE_KEYS = {
  ACCESS_TOKEN: 'auth.access_token',
  REFRESH_TOKEN: 'auth.refresh_token',
  BIOMETRIC_ENABLED: 'auth.biometric_enabled',
} as const;

export type TSecureKey = (typeof SECURE_KEYS)[keyof typeof SECURE_KEYS];
```

Integration rules:

- Token state in `features/auth/store/` lives in memory. Its persist adapter must be a `SecureStore`-backed custom storage passed to Zustand `persist` via `createJSONStorage`.
- Axios interceptor in `src/shared/api/client.ts` reads tokens from memory or `SecureStore`. Never from `AsyncStorage`.
- On logout or token expiry, call `clearAllSecure()` to wipe every secret key.
- Default iOS option: `WHEN_UNLOCKED_THIS_DEVICE_ONLY` — excludes iCloud/local backups.
- Android: `expo-secure-store` uses Keystore-backed `EncryptedSharedPreferences` automatically. No extra wiring required.

Biometric gating (optional, for high-risk tokens like payment, health, financial):

```ts
await SecureStore.setItemAsync(key, value, {
  keychainAccessible: SecureStore.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
  requireAuthentication: true,
  authenticationPrompt: 'Authenticate to continue',
});
```

Hard thresholds for Secure Storage:

| Check | Threshold |
| --- | --- |
| Tokens/secrets stored in `AsyncStorage`/`MMKV`/`localStorage`/plaintext | 0 |
| Code touching tokens outside `@/shared/secure-storage` wrapper | 0 |
| Zustand `persist` writing a token slice to `AsyncStorage` | 0 |
| Tokens or PII appearing in logs or remote diagnostics | 0 |
| Client-side secrets in `app.config.ts` `extra` or `.env` | 0 |

### Date and Time Handling

Use `dayjs` for all date and time operations. `dayjs()` returns device local time, which is correct for user-facing dates. Never use `new Date().toISOString().split('T')[0]` as a local date — it returns UTC, which is wrong in UTC+N timezones between midnight and the offset hours.

| Use case | Correct | Forbidden |
| --- | --- | --- |
| Today (YYYY-MM-DD) | `dayjs().format('YYYY-MM-DD')` | `new Date().toISOString().split('T')[0]` |
| N days ago | `dayjs().subtract(N, 'day').format('YYYY-MM-DD')` | Manual Date arithmetic |
| Current hour | `dayjs().hour()` | `new Date().getUTCHours()` |
| Timestamp storage | `new Date().toISOString()` | Local time strings |

Store dates in Zustand as `YYYY-MM-DD` strings or ISO timestamps. Never persist `Date` objects.

After implementation changes, run:

```bash
npm run typecheck
npm run lint
```

Run formatting when code style changes:

```bash
npm run format
```

## iOS Simulator Runbook

The local-mock flow supports Expo Go. Use a development build when validating native integrations:

```bash
npx expo run:ios --port 8083
```

Before running iOS:

```bash
node -v
```

Use Node v24.15.0. The repository pins this version in `.nvmrc`:

```bash
nvm use
```

Check Metro port conflicts:

```bash
lsof -i :8081 | grep LISTEN
```

If 8081 is busy, keep using `--port 8083`.

Check the booted simulator:

```bash
xcrun simctl list devices booted
```

If no simulator is booted, boot an available simulator:

```bash
xcrun simctl boot "iPhone 16 Pro"
```

The `npx expo run:ios --port 8083` command runs prebuild, CocoaPods install, native build, simulator install, and Metro startup.

### iOS Troubleshooting

If the app builds as `x86_64` and fails to install on an arm64 simulator, inspect `ios/Podfile` and generated Pod xcconfig files for `EXCLUDED_ARCHS[sdk=iphonesimulator*] = arm64`. Remove the arm64 simulator exclusion when the pods support arm64 simulator builds, then run:

```bash
cd ios
pod install
cd ..
npx expo run:ios --port 8083
```

If MLKit pods from `expo-face-detector` block simulator builds, investigate whether `expo-face-detector` is required for the current run. Do not remove the feature permanently without confirming product impact.

If `RNGoogleMobileAdsModule not found` appears, the app was likely opened in Expo Go. Use `npx expo run:ios` instead.

For a running simulator screenshot:

```bash
xcrun simctl io booted screenshot /tmp/screenshot.png
```

For static checks without building:

```bash
npm run typecheck
npm run lint
```

## ESLint 9 And FlashList v2

- Use ESLint 9 flat config in `eslint.config.js`.
- Do not use `--ext` in the lint script.
- Do not add `estimatedItemSize` to FlashList v2 unless the installed type definitions require it.
- Exclude `_workspace/`, `.agents/`, `.codex/`, and `plugins/` from lint and typecheck when they are not production source.

## NativeWind Required Setup

NativeWind requires all of these files to stay aligned:

| File | Required Setting |
| --- | --- |
| `babel.config.js` | `babel-preset-expo` with `jsxImportSource: 'nativewind'`, plus `nativewind/babel` |
| `metro.config.js` | `withNativeWind(config, { input: './global.css' })` |
| `tailwind.config.js` | `presets: [require('nativewind/preset')]`, content paths for `app/` and `src/` |
| `global.css` | Tailwind base, components, utilities imports |
| Root `_layout.tsx` | `import '../global.css';` |
| `nativewind-env.d.ts` | `/// <reference types="nativewind/types" />` |

## Architecture

Use Feature-Sliced Design:

```text
src/
├── core/
├── features/
├── entities/
├── widgets/
└── shared/
    ├── api/
    ├── config/
    ├── lib/
    ├── types/
    └── ui/
```

Dependency direction:

```text
app -> widgets -> features -> entities -> shared
```

Upper layers may reference lower layers only. Lower layers must not import from upper layers.

Feature structure:

```text
features/{name}/
├── api/
├── hooks/
├── store/
├── types/
├── ui/
└── index.ts
```

## Code Conventions

- Do not use `any` in production code.
- Use safe area handling on all screens.
- Prefix interfaces with `I`, type aliases with `T`, and enums with `E`.
- Keep interfaces, types, and enums in separate files when they are shared.
- Use the `@/` alias for app imports.
- Keep public imports behind barrel exports where the local module pattern expects it.

## Supabase Data Layer

Supabase Postgres is the backend and database target for persisted BASpace entities.

Standard stack:

- Supabase Postgres
- `@supabase/supabase-js`
- SQL migrations under `supabase/migrations/`
- generated database types
- Row Level Security for every client-accessible table
- TanStack Query for server state

FSD boundary:

```text
src/shared/supabase/
├── client.ts
├── config.ts
├── database.types.ts
└── index.ts

src/entities/{entity}/
├── types/
├── model/
└── index.ts

src/features/{feature}/api/
└── repository.ts
```

Rules:

- Initialize the Supabase client only in `@/shared/supabase`.
- Feature repositories perform queries and map database rows to domain entities.
- UI components and screens never query Supabase directly.
- Treat generated database types as the persistence contract; do not duplicate table row types manually.
- Keep domain behavior in FSD entities and features rather than database helpers.
- Every schema change requires a versioned SQL migration and regenerated types.
- Enable RLS before exposing a table to the client.
- Write explicit policies for customer, partner, and administrator access.
- Never ship a service-role key in the app bundle.
- Only the project URL and publishable client key may be exposed to the client.
- Store session tokens through the project SecureStore adapter.
- Use storage buckets only when remote file persistence is explicitly added to the product scope.

Hard thresholds:

| Check | Threshold |
| --- | --- |
| Direct Supabase client initialization outside `@/shared/supabase` | 0 |
| Supabase queries from screens or UI components | 0 |
| Client-accessible tables without RLS | 0 |
| Service-role key in client code or configuration | 0 |
| Schema changes without a migration | 0 |
| Manually duplicated database row types | 0 |

## In-App Store Review Prompts

Ratings should fire at the moment users feel value, not at first launch. Bad timing produces 1-star reviews. All review prompts go through a single policy engine — no direct calls from screens.

Standard stack:

- `expo-store-review` (wraps iOS `SKStoreReviewController` and Android Play In-App Review API)
- Non-sensitive counters persisted via AsyncStorage or MMKV (no SecureStore needed)

Install:

```bash
npx expo install expo-store-review
```

Platform limits to know:

- iOS displays at most 3 prompts per app per 365 days. The system decides actual display, not the developer.
- Android Play In-App Review also has its own quota and silently throttles.
- Calling the API is free, but burning quota means losing meaningful opportunities. Use the policy engine to call rarely.

Trigger policy (all gates must pass before `requestReview()` runs):

| Gate | Default | Rationale |
| --- | --- | --- |
| Days since install | ≥ 3 | Never ask brand-new users |
| Launch count | ≥ 5 | User has actually returned |
| Key-action completions | ≥ 3 | Repeated value, not one-time activation |
| Days since last request | ≥ 90 | Protect iOS system quota |
| Already asked this session | false | One per session |
| Error/crash in last 5 min | false | Block negative context |

Anti-patterns (immediate FAIL):

- Prompting during onboarding or first launch
- Prompting after payment failures, network errors, or permission denials
- Stacking the prompt over an existing modal
- UI copy that suggests a star count (e.g. "please give 5 stars") — violates App Store guidelines
- Dark patterns that gate features behind ratings
- Calling `StoreReview.requestReview()` from anywhere except the policy-engine hook

FSD layout:

```text
src/shared/store-review/
├── client.ts          # expo-store-review wrapper
├── policy.ts          # canRequestReview gate engine
├── store.ts           # Zustand persist — counters and timestamps
├── triggers.ts        # REVIEW_TRIGGERS constants
├── hooks/
│   └── useStoreReview.ts  # maybeRequest(triggerId)
├── types/index.ts
└── index.ts
```

Trigger catalog (`triggers.ts`):

```ts
export const REVIEW_TRIGGERS = {
  AFTER_PHOTO_SAVE: 'after_photo_save',
  AFTER_TASK_COMPLETE: 'after_task_complete',
  AFTER_QUOTE_CONFIRM: 'after_quote_confirm',
} as const;

export type TReviewTrigger = (typeof REVIEW_TRIGGERS)[keyof typeof REVIEW_TRIGGERS];
```

Hook contract (`useStoreReview.ts`):

```ts
import * as StoreReview from 'expo-store-review';
import { useReviewStore } from '../store';
import { canRequestReview } from '../policy';
import type { TReviewTrigger } from '../triggers';

export const useStoreReview = () => {
  const state = useReviewStore();
  return {
    maybeRequest: async (trigger: TReviewTrigger) => {
      if (!(await StoreReview.isAvailableAsync())) return false;
      if (!canRequestReview(state)) return false;
      state.markRequested();
      await StoreReview.requestReview();
      return true;
    },
  };
};
```

Call rules:

- Code outside `@/shared/store-review` never calls `expo-store-review` directly.
- Trigger IDs come only from `REVIEW_TRIGGERS`. No magic strings.
- Call from the success callback of a positive action, after the UI is idle (toast dismissed, navigation settled).
- Never call from `onError`, `catch`, or boundary handlers.

Automatic counters:

- Root `_layout.tsx` calls `reviewStore.recordLaunch()` on app start.
- A global error boundary calls `reviewStore.recordError()`.
- `recordKeyAction()` is invoked from screen success callbacks by ui-developer.

Hard thresholds for store review:

| Check | Threshold |
| --- | --- |
| Direct `expo-store-review` calls outside the wrapper | 0 |
| `requestReview()` calls that bypass `canRequestReview` | 0 |
| Magic-string trigger IDs (not from `REVIEW_TRIGGERS`) | 0 |
| Review prompts inside error/crash handlers | 0 |
| Review prompts during onboarding, first launch, or after failure | 0 |
| UI copy that suggests a star count | 0 |

Agent responsibilities:

- product-planner: lists candidate review triggers in the PRD with thresholds.
- api-integrator: builds the `src/shared/store-review/` module (wrapper, policy, store, triggers, hook).
- ui-developer: wires `useStoreReview().maybeRequest(...)` and `recordKeyAction()` into screen success callbacks.
- qa-reviewer: enforces anti-patterns and hard thresholds.

## Build And Store Deployment

Use `store-deploy` for store deployment work. Do not use unrelated deployment tooling unless the user explicitly changes this rule.

For production builds:

1. Run a local EAS build first.
2. If local build succeeds, run the cloud EAS build.
3. If cloud credits are unavailable, use the local artifact where appropriate.

Keep `.easignore` configured to exclude unnecessary build archive content such as `node_modules/`, screenshots, generated store assets, docs, scripts, build outputs, Git metadata, IDE metadata, and TypeScript build info.

Store app names and home screen names must match by locale:

- `app.config.ts` `name`
- `app.config.ts` `withLocalizedAppName` plugin values
- `fastlane/metadata/ios/{lang}/name.txt`
- `fastlane/metadata/android/{lang}/title.txt`

Android changelogs must stay within 500 bytes. iOS release notes can be longer, but prefer the Android-safe copy when sharing metadata across stores.

For store deployment key paths, package ID rules, localized app names, privacy/support pages, Fastlane conventions, and commit message rules, follow the active `store-deploy` workflow.

## Branch Strategy

```text
main       <- production
devel      <- development
feature/*  <- feature work
```

## Common Commands

```bash
npm install
npm start
npm run ios
npm run android
npm run lint
npm run typecheck
npm run format
```
