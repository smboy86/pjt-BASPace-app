# BASpace

[한국어](./README.ko.md)

BASpace is a React Native and Expo application for bathroom-remodeling quote collaboration. Customers submit a request, administrators assign participating partners, and customers and partners exchange versioned quotes and comments until final confirmation.

## Stack

- Expo 55 and React Native 0.83
- Expo Router
- TypeScript strict mode
- Zustand and TanStack Query
- NativeWind
- React Hook Form and Zod
- Axios
- Firebase Analytics and Crashlytics adapters
- Vitest, ESLint, and Prettier

## Codex Harness

The repository keeps Codex guidance and reusable workflows in four locations.

| Path | Responsibility |
| --- | --- |
| `AGENTS.md` | Project-wide rules and quality gates |
| `.codex/agents/` | Role-specific Codex agent profiles |
| `.agents/skills/` | Reusable workflow skills |
| `_workspace/` | Phase handoff artifacts and current pipeline state |

### Agent Roles

| Role | Responsibility |
| --- | --- |
| `idea-researcher` | Market and competitor research |
| `product-planner` | PRD, user stories, KPIs, and module map |
| `spec-planner` | Feature task decomposition and progress tracking |
| `design-architect` | Design system and screen layouts |
| `feature-builder` | FSD module scaffolding |
| `api-integrator` | API, state, secure storage, measurement, and review policy |
| `ui-developer` | Expo Router screens and NativeWind UI |
| `qa-reviewer` | Type, lint, FSD, security, and policy verification |
| `app-inspector` | Functional, UX, accessibility, and runtime inspection |
| `loop-engineer` | Post-release single-slice improvement loop |

### Skills

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

## Development Pipeline

```text
Pre-flight
  → Ideation
  → Product planning
  → Feature specs
  → Design
  → Feature/API/UI/measurement implementation
  → Code QA and app inspection
  → Fix loop
  → Deployment
```

Each phase reads the previous artifacts and records its result under `_workspace/`. Detailed orchestration rules live in `.agents/skills/orchestrate/SKILL.md`.

## Project Structure

```text
app/                     Expo Router routes
src/core/                App providers and initialization
src/widgets/             Composed UI blocks
src/features/            User actions and business features
src/entities/            Domain models and state
src/shared/              Shared API, config, libraries, storage, and UI
docs/specs/              Feature task specifications
_workspace/              Planning, design, QA, and pipeline artifacts
.codex/agents/           Codex role profiles
.agents/skills/          Codex workflow skills
plugins/                 Expo config plugins
firebase/                Local Firebase setup instructions
```

FSD dependency direction:

```text
app → widgets → features → entities → shared
```

## Getting Started

Use Node 22.

```bash
npm install
npm start
```

Platform commands:

```bash
npm run ios
npm run android
```

## Quality Gates

After implementation changes:

```bash
npm run typecheck
npm run lint
npm test
```

Run formatting when code style changes:

```bash
npm run format
```

The required thresholds and security rules are defined in `AGENTS.md`.

## Build And Deployment

EAS profiles are defined in `eas.json`. Before publishing, verify the target profile, runtime version, update channel, application identifiers, and generated artifact.

Build troubleshooting is documented in `docs/troubleshooting.md` and `.agents/skills/orchestrate/references/deploy-build-troubleshooting.md`.
