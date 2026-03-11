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
- **Spec naming and structure must be context-first.** Use doc-type file names (for example `OVERVIEW.md`, `SPEC.md`) and do not repeat project prefixes in file names. Use descriptive labels in markdown links — `[SDK Overview](./OVERVIEW.md)` not `[OVERVIEW.md](./OVERVIEW.md)` — so the link text is meaningful without folder context.
- **No singleton spec folders.** Do not create a folder that exists only to hold one markdown file; keep single docs at the nearest meaningful project/shared root.
- **Workstream spec names are fixed.** Under `workstreams/<scope>/`, use `SPEC.md` (context + implementation in one file); use `SPEC-<TOPIC>.md` only when multiple implementation specs are needed in that same folder.
- **Use the two-layer spec model.** `INDEX.md` and `OVERVIEW.md` are stable project context. Each workstream `SPEC.md` is durable context plus backlog. PR execution lives in `workstreams/<scope>/plans/<BACKLOG-ID>-<slug>.md`.
- **Test value over mock wiring.** Prefer tests that validate behavior. Avoid tests that only assert mocks were called unless that is the behavior being validated.
- **PR size target:** 1k–3k LOC changed. Smaller is fine for focused fixes. If >3k, add a brief justification for why it can’t be split.
- **No generated artifacts in source PRs.** Do not commit build outputs or generated assets unless the build system requires them for runtime or distribution.
- **Each chunk = one PR.** Don't bundle chunks into mega PRs. Keeps reviews fast, reverts clean, and progress visible.
- **TypeScript is the primary surface area.** All core logic (proving machine, state machines, stores, UI) lives in TypeScript in the WebView. Kotlin and Swift exist only for hardware access (NFC, camera, biometrics), OS-level APIs (keychain, lifecycle), and crypto signing/key-gen. Before writing any native code, ask: "Can this run in the WebView?" If yes or maybe, it belongs in TypeScript.
- **Maximize code reuse through `mobile-sdk-alpha`.** Before adding code to `webview-app`, `kmp-sdk`, or `app/`, check if `mobile-sdk-alpha` already has it or should have it. Types, interfaces, constants, parsing, validation, formatting, state machines, and stores belong in the SDK. Migrate shared code to `mobile-sdk-alpha` before building WebView UI that needs it.
- **Bridge protocol is the only coupling.** Native shells and the WebView share a JSON contract, not code. New native handlers must follow the bridge protocol exactly — no custom messaging, no side channels, no platform-specific extensions. The WebView must not know which native shell it's running inside.
- **Adapter interfaces are the coupling layer.** WebView code imports adapter interfaces from SDK core. Native shells implement bridge handlers. Nobody imports code across the bridge boundary.
- **Fail closed on security-critical boundaries.** Default-deny for protocol compatibility, remote bundle loading, and verification session lifecycle. Reject unknown protocol versions, block remote `devServerUrl` in production.
- **No regressions in the RN app.** Every change to `mobile-sdk-alpha` must be backwards-compatible with the existing Self Wallet app.
- **Specs stay current.** When implementation deviates from the spec, update the spec. A stale spec is worse than no spec.
- **Constraint tie-breaker.** If rules conflict: correctness and security first, then scope/clarity (small PRs, small files), then reuse. Document the tradeoff in the spec.

## Specs & Planning

**Every feature — even minor ones — uses the spec system.** Before implementing, read the relevant specs, write a plan to disk, then execute. No exceptions. A plan that only exists in session memory is a plan that will be lost.

### Spec System (`specs/`)

| File                                             | Purpose                                     | When to Read             |
| ------------------------------------------------ | ------------------------------------------- | ------------------------ |
| [Specs README](./specs/README.md)                | Table of contents, reading order            | First. Always.           |
| [Templates](./specs/framework/TEMPLATES.md)      | Copy-paste templates for all three tiers    | When creating a new spec |
| [SDK Overview](./specs/projects/sdk/OVERVIEW.md) | Architecture, bridge protocol, module table | For system-level context |

Workstream specs live in `specs/projects/sdk/workstreams/*/` with `SPEC.md` (living implementation details).

### Spec-Reading Protocol (for chunk execution)

To execute a chunk:

1. Read `specs/projects/sdk/INDEX.md` — find your workstream
2. Read the workstream `SPEC.md` — find your chunk
3. If you need architecture context, read the project `OVERVIEW.md`

That's it. Do not read framework docs unless you are writing a new spec.

### Planning Protocol

1. **Read** the relevant workstream specs and this file's Key Rules — understand the current state and constraints
2. **Write a plan to disk** — use the appropriate tier from `specs/framework/TEMPLATES.md`:
   - **Large features / new workstreams:** Create a full implementation spec (`specs/projects/sdk/workstreams/<scope>/SPEC.md`)
   - **Medium features / multi-chunk work:** Create a plan file in `workstreams/<scope>/plans/` named `<BACKLOG-ID>-<slug>.md` and link it from the backlog in the relevant `SPEC.md`
   - **Small features / single-chunk fixes:** Create a minimal plan file in `workstreams/<scope>/plans/` named `<BACKLOG-ID>-<slug>.md` or add the chunk to an existing active plan
3. **Include in every plan:** scope of work, files modified, I/O examples, validation command, definition of done
4. **Then implement** — update chunk status as you complete work
5. **After completion:** Mark chunks done in SPEC.md status tables. Review status checklists at session start — if something is marked "Done" that isn't, or "Pending" that's in progress, fix it first.

### Spec-Writing Guidelines

When writing specs, follow these principles so they work as AI agent prompts:

- **Use second person.** "You are making X portable" not "X should be made portable."
- **Be explicit about constraints.** "You will NOT modify..." not just "Focus on..."
- **Provide exact file paths with line numbers.** `src/proving/provingMachine.ts:543` not "the proving machine file."
- **State the validation command.** Agents will run it. If it's not there, they'll skip validation.
- **One chunk = one self-contained prompt.** The chunk must include enough context to execute without reading the full spec.
- **One PR = one plan file.** A plan file is the execution handoff. It must be self-contained enough that a new agent can pick it up after session loss.
- **Use `--remote` for M and L chunks.** Medium and large chunks benefit from `claude --remote` so work continues in the background.

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
