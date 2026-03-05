# Claude Code Instructions

## Repository Overview

Yarn v4 monorepo for Self — identity verification using passport NFC + zero-knowledge proofs. Two major surfaces:

1. **React Native app** (`app/`) — Self Wallet, production mobile app
2. **SDK packages** (`packages/`) — Embeddable verification SDK (WebView engine + native shells)

## Quick Setup

```bash
nvm use && corepack enable && yarn install
```

## Key Rules

- **Package manager:** Yarn (never npm or pnpm)
- **Keep the codebase DRY.** Before writing new code, search for existing utilities/components/flows and reuse or refactor to shared modules. Create new code only if a reusable option does not exist.
- **Extract repeated UI.** If the same UI sub-structure appears in 2+ places, extract a shared component.
- **Reusable UI belongs in shared libraries.** If a UI primitive is broadly reusable, add it to a shared library (e.g., `@selfxyz/euclid` or another shared package) instead of duplicating in feature code.
- **Keep files small.** Aim for <800 LOC per file. If a file approaches 800 LOC, split it into smaller modules.
- **Move static data out of UI.** Large static maps/lookups/constants do not belong in screen/components; move them to `utils/` or `data/` modules.
- **Prefer design tokens over hex.** Use shared color/font/spacing tokens instead of raw hex values in UI code.
- **No `react-native` imports in SDK core.** `packages/mobile-sdk-alpha/src/` must be platform-agnostic outside of `src/adapters/react-native/`.
- **Native handlers are thin wrappers.** No business logic in Kotlin or Swift. All logic lives in TypeScript.
- **Keychain is always native-managed.** No web fallbacks for secure storage. This is a security boundary.
- **No “slop comments.”** Only add comments when they convey non-obvious intent or constraints. Never add generic or chatty comments.
- **Signal over praise in docs/reviews.** Remove feel-good or back-patting text that does not change decisions or actions. Keep only actionable content: concrete issues, risks, decisions, owners, next steps, and validation evidence.
- **Spec naming and structure must be context-first.** Inside `specs/projects/<project>/`, use doc-type file names (for example `OVERVIEW.md`, `PLAN.md`, `STATUS.md`) and do not repeat project prefixes in file names. Use descriptive labels in markdown links — `[SDK Overview](./OVERVIEW.md)` not `[OVERVIEW.md](./OVERVIEW.md)` — so the link text is meaningful without folder context.
- **No singleton spec folders.** Do not create a folder that exists only to hold one markdown file; keep single docs at the nearest meaningful project/shared root.
- **Workstream spec names are fixed.** Under `workstreams/<scope>/`, use `OVERVIEW.md` and `SPEC.md`; use `SPEC-<TOPIC>.md` only when multiple implementation specs are needed in that same folder.
- **Test value over mock wiring.** Prefer tests that validate behavior. Avoid tests that only assert mocks were called unless that is the behavior being validated.
- **PR size target:** 1k–3k LOC changed. Smaller is fine for focused fixes. If >3k, add a brief justification for why it can’t be split.
- **No generated artifacts in source PRs.** Do not commit build outputs or generated assets unless the build system requires them for runtime or distribution.

## Specs & Planning

**Every feature — even minor ones — uses the spec system.** Before implementing, read the relevant specs, write a plan to disk, then execute. No exceptions. A plan that only exists in session memory is a plan that will be lost.

### Spec System (`specs/`)

| File                                                    | Purpose                                                                       | When to Read                            |
| ------------------------------------------------------- | ----------------------------------------------------------------------------- | --------------------------------------- |
| [Specs README](./specs/README.md)                          | Table of contents, reading order                                              | First. Always.                          |
| [Spec Guide](./specs/framework/SPEC-GUIDE.md)              | How to write specs (three-tier system, review checklist, AI agent guidelines) | Before writing or reviewing any spec    |
| [Templates](./specs/framework/TEMPLATES.md)                 | Copy-paste templates for all three tiers                                      | When creating a new spec                |
| [Project Rules](./specs/framework/PROJECT-RULES.md)         | Project-specific rules and guardrails                                         | Before starting any implementation work |
| [SDK Overview](./specs/projects/sdk/OVERVIEW.md)             | Architecture, bridge protocol, module table, decision matrix                  | For system-level context                |

Workstream specs live in `specs/projects/sdk/workstreams/*/` with `OVERVIEW.md` (stable orientation) and `SPEC.md` (living implementation details).

### Planning Protocol

1. **Read** `specs/framework/PROJECT-RULES.md` and the relevant workstream specs — understand the current state and constraints
2. **Write a plan to disk** — use the appropriate tier from `specs/framework/TEMPLATES.md`:
   - **Large features / new workstreams:** Create a full implementation spec (`specs/projects/<project>/workstreams/<scope>/SPEC.md`)
   - **Medium features / multi-chunk work:** Create a session plan file in the project folder or update the relevant SPEC.md
   - **Small features / single-chunk fixes:** Add a chunk to an existing SPEC.md, or create a minimal plan in the spec folder
3. **Include in every plan:** scope of work, files modified, I/O examples, validation command, definition of done
4. **Then implement** — update chunk status as you complete work
5. **After completion:** Mark chunks done in both SPEC.md and OVERVIEW.md status checklists

Quick-start prompts for creating new specs are in [SPEC-GUIDE.md](./specs/framework/SPEC-GUIDE.md#quick-start).

### Why Even Minor Features

- Prevents scope creep — writing "files NOT modified" forces focus
- Survives session loss — API errors, context overflow, `/clear` won't destroy the plan
- Enables parallel work — multiple agents can pick up chunks from the same plan
- Creates audit trail — what was planned vs what was built

## Validation Commands

```bash
# SDK core
cd packages/mobile-sdk-alpha && yarn test && yarn types

# Bridge
cd packages/webview-bridge && yarn build && yarn test

# WebView app
cd packages/webview-app && yarn build

# KMP
cd packages/kmp-sdk && ./gradlew :shared:jvmTest

# Full repo
yarn lint && yarn types && yarn build
```

## Workspace-Specific Instructions

- `app/AGENTS.md` — Mobile app development, E2E testing, deployment
- `packages/mobile-sdk-alpha/AGENTS.md` — SDK development, testing guidelines
- `noir/AGENTS.md` — Noir circuit development
